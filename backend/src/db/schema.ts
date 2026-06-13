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
    -- 评价记录表
    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      trainee_name TEXT NOT NULL,
      trainee_department TEXT DEFAULT '',
      trainee_position TEXT DEFAULT '',
      is_management INTEGER DEFAULT 0,
      employee_id TEXT DEFAULT '',
      training_title TEXT NOT NULL,
      training_date TEXT DEFAULT '',
      training_type TEXT DEFAULT '心得',
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
    CREATE INDEX IF NOT EXISTS idx_evaluations_created ON evaluations(created_at);
    CREATE INDEX IF NOT EXISTS idx_evaluations_exception ON evaluations(is_exception, exception_status);
    CREATE INDEX IF NOT EXISTS idx_evaluations_department ON evaluations(trainee_department);
  `);
}

export function closeDB(): void {
  if (db) {
    db.close();
  }
}
