import { Router, Request, Response } from 'express';
import { hashPassword, verifyPassword } from '../auth/password';
import { signToken } from '../auth/token';
import { authRequired, getAuth } from '../auth/middleware';
import { getEmployeeCredentials, setEmployeePassword, ensureEmployee } from '../db/profile';
import type { Role } from '../types';

const router = Router();

/**
 * POST /api/auth/set-password
 * 激活账号：给尚无密码的员工设置登录密码（首次登录前执行）
 * body: { employeeId, name?, password }
 */
router.post('/set-password', (req: Request, res: Response) => {
  try {
    const { employeeId, name, password } = req.body as {
      employeeId?: string;
      name?: string;
      password?: string;
    };
    if (!employeeId || !password || String(password).length < 6) {
      res.status(400).json({ error: '工号与至少 6 位密码必填' });
      return;
    }

    const existing = getEmployeeCredentials(employeeId);
    if (existing?.password_hash) {
      res.status(409).json({ error: '该账号已设置密码，请直接登录' });
      return;
    }

    // 不存在则建档（默认员工角色）
    if (!existing) {
      ensureEmployee(employeeId, name || employeeId);
    }

    setEmployeePassword(employeeId, hashPassword(String(password)));
    res.json({ success: true, employeeId, message: '密码已设置，请登录' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/login
 * 登录：校验密码，签发 JWT
 * body: { employeeId, password }
 */
router.post('/login', (req: Request, res: Response) => {
  try {
    const { employeeId, password } = req.body as { employeeId?: string; password?: string };
    if (!employeeId || !password) {
      res.status(400).json({ error: '工号与密码必填' });
      return;
    }

    const emp = getEmployeeCredentials(employeeId);
    if (!emp || !emp.password_hash) {
      res.status(401).json({ error: '工号不存在或尚未设置密码' });
      return;
    }
    if (!verifyPassword(String(password), emp.password_hash)) {
      res.status(401).json({ error: '密码错误' });
      return;
    }

    const role: Role = emp.role === 'hr' ? 'hr' : 'employee';
    const identity = { name: emp.name, employeeId: emp.employee_id, role };
    const token = signToken(identity);

    res.json({ token, identity });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/me
 * 用 token 换取当前身份
 */
router.get('/me', authRequired, (req: Request, res: Response) => {
  res.json(getAuth(req));
});

export default router;
