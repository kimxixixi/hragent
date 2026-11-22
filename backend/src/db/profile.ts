/**
 * 员工学习画像 — 从 evaluations 历史聚合出得分趋势与薄弱维度
 *
 * 供「个性化反馈」使用：评分 Agent 据此针对薄弱维度给建议、参考趋势调整措辞。
 */
import { getDB } from './schema';
import type {
  EmployeeProfile,
  DimensionAverage,
  ScoreTrend,
  DimensionScore,
  EvaluationRow,
  Role,
} from '../types';

// 10 分制下，维度历史均分低于该阈值视为"薄弱"
const WEAK_THRESHOLD = 6;

/**
 * 获取员工角色（默认 employee）
 */
export function getEmployeeRole(employeeId: string): Role {
  const db = getDB();
  const row = db
    .prepare('SELECT role FROM employees WHERE employee_id = ?')
    .get(employeeId) as { role: string } | undefined;
  return row?.role === 'hr' ? 'hr' : 'employee';
}

/**
 * 设置员工角色（HR 操作 / 引导）
 */
export function setEmployeeRole(employeeId: string, role: Role): void {
  const db = getDB();
  db.prepare('UPDATE employees SET role = ? WHERE employee_id = ?').run(role, employeeId);
}

/**
 * 报到登记：确保员工存在于档案（默认 employee 角色）
 */
export function ensureEmployee(employeeId: string, name: string): void {
  const db = getDB();
  db.prepare(
    `INSERT INTO employees (employee_id, name, department, role, created_at)
     VALUES (?, ?, '', 'employee', ?)
     ON CONFLICT(employee_id) DO UPDATE SET name = excluded.name`
  ).run(employeeId, name, new Date().toISOString());
}

/**
 * 设置员工登录密码哈希
 */
export function setEmployeePassword(employeeId: string, passwordHash: string): void {
  const db = getDB();
  db.prepare('UPDATE employees SET password_hash = ? WHERE employee_id = ?').run(passwordHash, employeeId);
}

/**
 * 读取员工登录凭证（含密码哈希）
 */
export function getEmployeeCredentials(employeeId: string):
  | { employee_id: string; name: string; role: string; password_hash: string | null }
  | undefined {
  const db = getDB();
  return db
    .prepare('SELECT employee_id, name, role, password_hash FROM employees WHERE employee_id = ?')
    .get(employeeId) as
    | { employee_id: string; name: string; role: string; password_hash: string | null }
    | undefined;
}

/**
 * 获取员工学习画像
 * @param employeeId 员工身份键（工号，无工号时用姓名）
 */
export function getEmployeeProfile(employeeId: string): EmployeeProfile {
  const db = getDB();

  const emp = db
    .prepare('SELECT * FROM employees WHERE employee_id = ?')
    .get(employeeId) as
    | { employee_id: string; name: string; department: string; role: string; created_at: string }
    | undefined;

  // 该员工全部评价，按时间升序
  const rows = db
    .prepare('SELECT * FROM evaluations WHERE employee_id = ? ORDER BY created_at ASC')
    .all(employeeId) as EvaluationRow[];

  if (rows.length === 0) {
    return {
      employeeId,
      name: emp?.name || employeeId,
      department: emp?.department || '',
      role: emp?.role === 'hr' ? 'hr' : 'employee',
      evaluationCount: 0,
      averageScore: 0,
      trend: 'first_time',
      weakDimensions: [],
      dimensionAverages: [],
      recentScores: [],
    };
  }

  // 总分平均
  const total = rows.reduce((s, r) => s + r.total_score, 0);
  const averageScore = Math.round((total / rows.length) * 10) / 10;

  // 各维度历史均分
  const dimMap = new Map<string, { name: string; label: string; sum: number; count: number }>();
  for (const r of rows) {
    const dims = JSON.parse(r.dimensions_json) as DimensionScore[];
    for (const d of dims) {
      const cur = dimMap.get(d.name) || { name: d.name, label: d.label, sum: 0, count: 0 };
      cur.sum += d.score;
      cur.count += 1;
      dimMap.set(d.name, cur);
    }
  }
  const dimensionAverages: DimensionAverage[] = [...dimMap.values()].map((v) => ({
    name: v.name,
    label: v.label,
    avg: Math.round((v.sum / v.count) * 10) / 10,
  }));

  // 薄弱维度：历史均分 < 阈值，按从低到高排序
  const weakDimensions = dimensionAverages
    .filter((d) => d.avg < WEAK_THRESHOLD)
    .sort((a, b) => a.avg - b.avg)
    .map((d) => d.label);

  // 得分趋势：末次相对首次的涨跌
  const first = rows[0].total_score;
  const last = rows[rows.length - 1].total_score;
  let trend: ScoreTrend = 'stable';
  if (last - first >= 0.5) trend = 'rising';
  else if (first - last >= 0.5) trend = 'declining';

  const recentScores = rows.slice(-5).map((r) => ({
    title: r.training_title,
    score: r.total_score,
    date: r.created_at.slice(0, 10),
  }));

  return {
    employeeId,
    name: emp?.name || rows[0].trainee_name,
    department: emp?.department || '',
    role: emp?.role === 'hr' ? 'hr' : 'employee',
    evaluationCount: rows.length,
    averageScore,
    trend,
    weakDimensions,
    dimensionAverages,
    recentScores,
  };
}

/**
 * 维护员工部门（HR 操作）
 */
export function updateEmployeeDepartment(employeeId: string, department: string): void {
  const db = getDB();
  db.prepare('UPDATE employees SET department = ? WHERE employee_id = ?').run(department, employeeId);
}

/**
 * 列出全部员工档案
 */
export function listEmployees(): { employee_id: string; name: string; department: string; role: string; created_at: string }[] {
  const db = getDB();
  return db
    .prepare('SELECT employee_id, name, department, role, created_at FROM employees ORDER BY created_at DESC')
    .all() as { employee_id: string; name: string; department: string; role: string; created_at: string }[];
}
