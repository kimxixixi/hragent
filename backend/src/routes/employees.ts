import { Router, Request, Response } from 'express';
import {
  getEmployeeProfile,
  updateEmployeeDepartment,
  listEmployees,
  setEmployeeRole,
} from '../db/profile';
import { authRequired, hrRequired, getAuth } from '../auth/middleware';
import type { Role } from '../types';

const router = Router();

/**
 * GET /api/employees
 * 员工列表（HR 专属）
 */
router.get('/', hrRequired, (_req: Request, res: Response) => {
  try {
    res.json(listEmployees());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/employees/:id/profile
 * 员工学习画像：HR 可看任意人，员工仅看自己
 */
router.get('/:id/profile', authRequired, (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const auth = getAuth(req)!;
    const isSelf = auth.employeeId === id;
    if (auth.role !== 'hr' && !isSelf) {
      res.status(403).json({ error: '仅 HR 或本人可查看该画像' });
      return;
    }
    res.json(getEmployeeProfile(id));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/employees/:id/department
 * 维护员工部门（HR 专属）
 */
router.put('/:id/department', hrRequired, (req: Request, res: Response) => {
  try {
    const { department } = req.body as { department?: string };
    if (typeof department !== 'string') {
      res.status(400).json({ error: 'department 必填' });
      return;
    }
    updateEmployeeDepartment(String(req.params.id), department);
    res.json({ success: true, employeeId: String(req.params.id), department });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/employees/:id/role
 * 设置员工角色（HR 专属）
 */
router.put('/:id/role', hrRequired, (req: Request, res: Response) => {
  try {
    const { role } = req.body as { role?: Role };
    if (role !== 'hr' && role !== 'employee') {
      res.status(400).json({ error: 'role 必须是 hr 或 employee' });
      return;
    }
    setEmployeeRole(String(req.params.id), role);
    res.json({ success: true, employeeId: String(req.params.id), role });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
