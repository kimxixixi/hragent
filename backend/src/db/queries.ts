import { getDB } from './schema';
import type { EvaluationResult, EvaluationRow } from '../types';

export function saveEvaluation(result: EvaluationResult): void {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO evaluations
    (id, trainee_name, employee_id, training_title, content,
     total_score, dimensions_json, feedback_summary, suggestions_json,
     tone_level, is_exception, exception_reason, exception_status, created_at)
    VALUES
    (@id, @trainee_name, @employee_id, @training_title, @content,
     @total_score, @dimensions_json, @feedback_summary, @suggestions_json,
     @tone_level, @is_exception, @exception_reason, @exception_status, @created_at)
  `);

  stmt.run({
    id: result.id,
    trainee_name: result.trainee.name,
    employee_id: result.trainee.employeeId || '',
    training_title: result.trainingTitle,
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

export function getStats(): any {
  const db = getDB();

  const total = db.prepare('SELECT COUNT(*) as count FROM evaluations').get() as any;
  const avgScore = db.prepare('SELECT AVG(total_score) as avg FROM evaluations').get() as any;
  const distribution = db.prepare(`
    SELECT
      CASE
        WHEN total_score >= 8 THEN '优秀(8-10)'
        WHEN total_score >= 6 THEN '良好(6-8)'
        WHEN total_score >= 4 THEN '一般(4-6)'
        ELSE '需改进(<4)'
      END as level,
      COUNT(*) as count
    FROM evaluations
    GROUP BY level
    ORDER BY MIN(total_score) DESC
  `).all() as any[];

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

export function getRecentEvaluations(limit = 20): EvaluationResult[] {
  const db = getDB();
  const rows = db.prepare(
    'SELECT * FROM evaluations ORDER BY created_at DESC LIMIT ?'
  ).all(limit) as EvaluationRow[];
  return rows.map(rowToResult);
}

function rowToResult(row: EvaluationRow): EvaluationResult {
  return {
    id: row.id,
    trainee: {
      name: row.trainee_name,
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
