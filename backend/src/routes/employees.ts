import { Router, Request, Response } from 'express';
import { getEmployeeProfile, updateEmployeeDepartment, listEmployees } from '../db/profile';

const router = Router();

/**
 * GET /api/employees
 * 员工列表（含部门）
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    res.json(listEmployees());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/employees/:id/profile
 * 员工学习画像：得分趋势 + 薄弱维度
 */
router.get('/:id/profile', (req: Request, res: Response) => {
  try {
    const profile = getEmployeeProfile(String(req.params.id));
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/employees/:id/department
 * 维护员工部门（HR 操作）
 */
router.put('/:id/department', (req: Request, res: Response) => {
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

export default router;
