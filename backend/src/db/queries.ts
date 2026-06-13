import { getDB } from './schema';
import type { EvaluationResult, EvaluationRow } from '../types';

/**
 * 保存评价结果到数据库
 */
export function saveEvaluation(result: EvaluationResult): void {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO evaluations
    (id, trainee_name, trainee_department, trainee_position, is_management,
     employee_id, training_title, training_date, content,
     total_score, dimensions_json, feedback_summary, suggestions_json,
     tone_level, is_exception, exception_reason, exception_status, created_at)
    VALUES
    (@id, @trainee_name, @trainee_department, @trainee_position, @is_management,
     @employee_id, @training_title, @training_date, @content,
     @total_score, @dimensions_json, @feedback_summary, @suggestions_json,
     @tone_level, @is_exception, @exception_reason, @exception_status, @created_at)
  `);

  stmt.run({
    id: result.id,
    trainee_name: result.trainee.name,
    trainee_department: result.trainee.department || '',
    trainee_position: result.trainee.position || '',
    is_management: result.trainee.isManagement ? 1 : 0,
    employee_id: result.trainee.employeeId || '',
    training_title: result.trainingTitle,
    training_date: '',
    content: result.content,
    total_score: result.totalScore,
    dimensions_json: JSON.stringify(result.dimensions),
    feedback_summary: result.feedbackSummary,
    suggestions_json: JSON.stringify(result.suggestions),
    tone_level: result.toneLevel,
    is_exception: result.isException ? 1 : 0,
    exception_reason: result.exceptionReason || null,
    exception_status: result.isException ? 'pending' : null,
    created_at: result.createdAt,
  });
}

/**
 * 获取异常评价列表
 */
export function getExceptions(status?: string): EvaluationResult[] {
  const db = getDB();
  let rows: EvaluationRow[];
  if (status) {
    rows = db.prepare(
      'SELECT * FROM evaluations WHERE is_exception = 1 AND exception_status = ? ORDER BY created_at DESC'
    ).all(status) as EvaluationRow[];
  } else {
    rows = db.prepare(
      'SELECT * FROM evaluations WHERE is_exception = 1 ORDER BY created_at DESC'
    ).all() as EvaluationRow[];
  }
  return rows.map(rowToResult);
}

/**
 * 更新异常评价状态
 */
export function updateExceptionStatus(
  evaluationId: string,
  status: string,
  modifiedFeedback?: string
): void {
  const db = getDB();
  if (modifiedFeedback) {
    db.prepare(
      'UPDATE evaluations SET exception_status = ?, feedback_summary = ? WHERE id = ?'
    ).run(status, modifiedFeedback, evaluationId);
  } else {
    db.prepare(
      'UPDATE evaluations SET exception_status = ? WHERE id = ?'
    ).run(status, evaluationId);
  }
}

/**
 * 获取评价统计
 */
export function getStats(department?: string): any {
  const db = getDB();
  let whereClause = '';
  const params: any[] = [];

  if (department) {
    whereClause = 'WHERE trainee_department = ?';
    params.push(department);
  }

  const total = db.prepare(
    `SELECT COUNT(*) as count FROM evaluations ${whereClause}`
  ).get(...params) as any;

  const avgScore = db.prepare(
    `SELECT AVG(total_score) as avg FROM evaluations ${whereClause}`
  ).get(...params) as any;

  const distribution = db.prepare(`
    SELECT
      CASE
        WHEN total_score >= 8 THEN '优秀(8-10)'
        WHEN total_score >= 6 THEN '良好(6-8)'
        WHEN total_score >= 4 THEN '一般(4-6)'
        ELSE '需改进(<4)'
      END as level,
      COUNT(*) as count
    FROM evaluations ${whereClause}
    GROUP BY level
    ORDER BY MIN(total_score) DESC
  `).all(...params) as any[];

  const exceptionCount = db.prepare(
    `SELECT COUNT(*) as count FROM evaluations WHERE is_exception = 1 AND exception_status = 'pending'`
  ).get() as any;

  return {
    totalEvaluations: total.count,
    averageScore: avgScore.avg ? Math.round(avgScore.avg * 10) / 10 : 0,
    distribution,
    pendingExceptions: exceptionCount.count,
  };
}

/**
 * 获取最近评价列表
 */
export function getRecentEvaluations(limit = 20): EvaluationResult[] {
  const db = getDB();
  const rows = db.prepare(
    'SELECT * FROM evaluations ORDER BY created_at DESC LIMIT ?'
  ).all(limit) as EvaluationRow[];
  return rows.map(rowToResult);
}

/**
 * 数据库行 → EvaluationResult
 */
function rowToResult(row: EvaluationRow): EvaluationResult {
  return {
    id: row.id,
    trainee: {
      name: row.trainee_name,
      department: row.trainee_department,
      position: row.trainee_position,
      isManagement: row.is_management === 1,
      employeeId: row.employee_id,
    },
    trainingTitle: row.training_title,
    content: row.content,
    totalScore: row.total_score,
    dimensions: JSON.parse(row.dimensions_json),
    feedbackSummary: row.feedback_summary,
    suggestions: JSON.parse(row.suggestions_json),
    toneLevel: row.tone_level as any,
    isException: row.is_exception === 1,
    exceptionReason: row.exception_reason || undefined,
    createdAt: row.created_at,
  };
}
