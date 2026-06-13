import React, { useState } from 'react';
import type { EvaluationResult } from '../../types/chat';
import { handleException } from '../../services/api';

interface ExceptionCardProps {
  result: EvaluationResult;
}

export const ExceptionCard: React.FC<ExceptionCardProps> = ({ result }) => {
  const [expanded, setExpanded] = useState(false);
  const [action, setAction] = useState<'idle' | 'approving' | 'modifying' | 'dismissing'>('idle');
  const [modifiedFeedback, setModifiedFeedback] = useState(result.feedbackSummary);
  const [status, setStatus] = useState<'pending' | 'reviewed' | 'dismissed'>('pending');

  const handleAction = async (act: 'approve' | 'modify' | 'dismiss') => {
    const actionMap = {
      approve: 'approving' as const,
      modify: 'modifying' as const,
      dismiss: 'dismissing' as const,
    };
    setAction(actionMap[act]);

    try {
      await handleException(
        result.id,
        act,
        act === 'modify' ? modifiedFeedback : undefined
      );
      setStatus(act === 'dismiss' ? 'dismissed' : 'reviewed');
    } catch (err: any) {
      alert(`操作失败：${err.message}`);
    } finally {
      setAction('idle');
    }
  };

  if (status !== 'pending') {
    return (
      <div className="exception-card exception-resolved">
        <div className="exception-header">
          <span className="exception-icon">✅</span>
          <span className="exception-title">
            {result.trainee.name} — 已{status === 'reviewed' ? '处理' : '驳回'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="exception-card">
      {/* 头部 */}
      <div className="exception-header" onClick={() => setExpanded(!expanded)}>
        <span className="exception-icon">⚠️</span>
        <div className="exception-info">
          <div className="exception-title">
            {result.trainee.name}
            {result.trainee.isManagement && (
              <span className="eval-badge eval-badge-mgmt">管理岗</span>
            )}
            <span className="eval-badge eval-badge-warn">需复核</span>
          </div>
          <div className="exception-subtitle">
            评分 {result.totalScore}分 — {result.exceptionReason || '低分异常'}
          </div>
        </div>
        <div className="eval-card-expand">{expanded ? '▲' : '▼'}</div>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div className="exception-body">
          <div className="exception-feedback">
            <h4>📝 系统生成的反馈</h4>
            <div className="exception-feedback-text">
              <p>{result.feedbackSummary}</p>
              {result.suggestions.length > 0 && (
                <ul>
                  {result.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="exception-edit">
            <h4>✏️ 修改反馈（可选）</h4>
            <textarea
              className="exception-textarea"
              value={modifiedFeedback}
              onChange={(e) => setModifiedFeedback(e.target.value)}
              rows={4}
              placeholder="修改反馈内容..."
            />
          </div>

          <div className="exception-actions">
            <button
              className="btn btn-approve"
              onClick={() => handleAction('approve')}
              disabled={action !== 'idle'}
            >
              {action === 'approving' ? '处理中...' : '✅ 直接通过'}
            </button>
            <button
              className="btn btn-modify"
              onClick={() => handleAction('modify')}
              disabled={action !== 'idle'}
            >
              {action === 'modifying' ? '处理中...' : '✏️ 修改后发送'}
            </button>
            <button
              className="btn btn-dismiss"
              onClick={() => handleAction('dismiss')}
              disabled={action !== 'idle'}
            >
              {action === 'dismissing' ? '处理中...' : '↩️ 驳回重评'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
