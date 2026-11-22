import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'hr_agent.db');

let db: Database.Database;

export function getDB(): Database.Database {
  if (!db) {
    // 确保 data 目录存在
    const fs = require('fs');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    -- 员工表（HR 维护档案：部门、角色等）
    -- 主键 employee_id 取「工号」，无工号时用姓名兜底
    CREATE TABLE IF NOT EXISTS employees (
      employee_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT DEFAULT '',
      role TEXT DEFAULT 'employee',
      created_at TEXT NOT NULL
    );

    -- 培训课程表
    CREATE TABLE IF NOT EXISTS trainings (
      title TEXT PRIMARY KEY,
      type TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    -- 评价记录表（即评价历史）
    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      trainee_name TEXT NOT NULL,
      employee_id TEXT DEFAULT '',
      training_title TEXT NOT NULL,
      content TEXT NOT NULL,
      total_score REAL NOT NULL,
      dimensions_json TEXT NOT NULL,
      feedback_summary TEXT NOT NULL,
      suggestions_json TEXT NOT NULL,
      tone_level TEXT NOT NULL,
      is_exception INTEGER DEFAULT 0,
      exception_reason TEXT,
      exception_status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    -- 索引
    CREATE INDEX IF NOT EXISTS idx_evaluations_trainee ON evaluations(trainee_name);
    CREATE INDEX IF NOT EXISTS idx_evaluations_employee ON evaluations(employee_id);
    CREATE INDEX IF NOT EXISTS idx_evaluations_created ON evaluations(created_at);
    CREATE INDEX IF NOT EXISTS idx_evaluations_exception ON evaluations(is_exception, exception_status);
    CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
  `);

  backfillEmployees(db);
  backfillTrainings(db);
  migrateEmployeesRole(db);
  seedHRRoles(db);
}

/**
 * 迁移：老库的 employees 表可能没有 role 列，补上（默认 employee）
 */
function migrateEmployeesRole(db: Database.Database): void {
  const cols = db.prepare('PRAGMA table_info(employees)').all() as { name: string }[];
  if (!cols.some((c) => c.name === 'role')) {
    db.exec(`ALTER TABLE employees ADD COLUMN role TEXT DEFAULT 'employee'`);
  }
}

/**
 * 引导：从 HR_EMPLOYEE_IDS（逗号分隔工号）标记 HR 角色
 */
function seedHRRoles(db: Database.Database): void {
  const ids = (process.env.HR_EMPLOYEE_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return;

  const stmt = db.prepare('UPDATE employees SET role = ? WHERE employee_id = ?');
  for (const id of ids) {
    stmt.run('hr', id);
  }
}

/**
 * 迁移：从既有 evaluations 回填员工表
 * 幂等（INSERT OR IGNORE），重复执行不产生重复数据
 */
function backfillEmployees(db: Database.Database): void {
  // 归一化：历史里无工号的评价，用姓名作为身份键，与 resolveEmployeeKey 保持一致
  db.exec(`UPDATE evaluations SET employee_id = trainee_name WHERE employee_id = '' OR employee_id IS NULL`);

  const rows = db
    .prepare(
      'SELECT trainee_name, employee_id, MIN(created_at) as first_seen FROM evaluations GROUP BY trainee_name, employee_id'
    )
    .all() as { trainee_name: string; employee_id: string; first_seen: string }[];

  const stmt = db.prepare(
    'INSERT OR IGNORE INTO employees (employee_id, name, department, created_at) VALUES (?, ?, ?, ?)'
  );
  for (const r of rows) {
    const key = r.employee_id || r.trainee_name;
    stmt.run(key, r.trainee_name, '', r.first_seen);
  }
}

/**
 * 迁移：从既有 evaluations 回填培训课程表
 */
function backfillTrainings(db: Database.Database): void {
  const rows = db
    .prepare(
      'SELECT training_title, MIN(created_at) as first_seen FROM evaluations GROUP BY training_title'
    )
    .all() as { training_title: string; first_seen: string }[];

  const stmt = db.prepare(
    'INSERT OR IGNORE INTO trainings (title, type, created_at) VALUES (?, ?, ?)'
  );
  for (const r of rows) {
    stmt.run(r.training_title, '', r.first_seen);
  }
}

export function closeDB(): void {
  if (db) {
    db.close();
  }
}
