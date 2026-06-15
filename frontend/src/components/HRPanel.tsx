import React, { useState } from 'react';
import type { EvaluationResult } from '../types/chat';

interface HRPanelProps {
  exceptions: EvaluationResult[];
  exceptionCount: number;
  onResolve: (evalId: string, customFeedback?: string) => void;
  onClose: () => void;
}

function buildFeedbackTemplate(ex: EvaluationResult): string {
  return `感谢你提交《${ex.trainingTitle}》的培训心得！

你在心得中提到了「」，这一点很好。

同时，以下几个方面可以让你的心得更加充实：
1. 可以具体描述培训中学到的知识点或模型，比如……
2. 可以结合一个实际工作场景，说说你打算怎么应用
3. 可以反思一下自己当前的不足，以及这次的启发

期待你的补充和完善！`;
}

export const HRPanel: React.FC<HRPanelProps> = ({
  exceptions,
  exceptionCount,
  onResolve,
  onClose,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleStartEdit = (ex: EvaluationResult) => {
    setEditingId(ex.id);
    setEditText(buildFeedbackTemplate(ex));
  };

  const handleSendEdit = (evalId: string) => {
    onResolve(evalId, editText.trim());
    setEditingId(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  return (
    <div className="hr-panel-overlay" onClick={onClose}>
      <div className="hr-panel" onClick={(e) => e.stopPropagation()}>
        <div className="hr-panel-header">
          <div className="hr-panel-title">
            <span>📱</span>
            <span>HR 异常通知</span>
            {exceptionCount > 0 && (
              <span className="hr-badge">{exceptionCount}</span>
            )}
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="hr-panel-body">
          {exceptions.length === 0 ? (
            <div className="hr-empty">
              <span>✅</span>
              <p>没有待处理的异常</p>
            </div>
          ) : (
            <div className="hr-notification-list">
              {exceptions.map((ex) => (
                <div key={ex.id} className="hr-notification-card">
                  <div className="hr-notify-header">
                    <div className="hr-notify-avatar">
                      {ex.trainee.name.charAt(0)}
                    </div>
                    <div className="hr-notify-info">
                      <div className="hr-notify-name">
                        {ex.trainee.name}
                        {ex.trainee.employeeId && (
                          <span className="eval-badge">工号 {ex.trainee.employeeId}</span>
                        )}
                      </div>
                      <div className="hr-notify-dept">
                        {ex.trainingTitle}
                      </div>
                    </div>
                    <div className="hr-notify-score" style={{
                      background: ex.totalScore >= 5 ? '#eab308' : '#ef4444'
                    }}>
                      {ex.totalScore}
                    </div>
                  </div>

                  {editingId === ex.id ? (
                    <div className="hr-edit-area">
                      <div className="hr-edit-label">
                        ✏️ 编写反馈发送给 {ex.trainee.name}
                      </div>
                      <textarea
                        className="hr-edit-textarea"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={10}
                        autoFocus
                      />
                      <div className="hr-edit-actions">
                        <button
                          className="btn btn-approve btn-sm"
                          onClick={() => handleSendEdit(ex.id)}
                        >
                          📤 发送给员工
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={handleCancelEdit}
                          style={{ background: '#e2e8f0', color: '#334155' }}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="hr-notify-body">
                        <div className="hr-notify-reason">
                          ⚠️ {ex.exceptionReason || '低分异常，需复核'}
                        </div>
                        <div className="hr-notify-feedback">
                          <strong>系统建议反馈：</strong>
                          <p>{ex.feedbackSummary}</p>
                          {ex.suggestions.length > 0 && (
                            <ul>
                              {ex.suggestions.map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      <div className="hr-notify-actions">
                        <button
                          className="btn btn-approve btn-sm"
                          onClick={() => onResolve(ex.id)}
                        >
                          ✅ 直接通过
                        </button>
                        <button
                          className="btn btn-modify btn-sm"
                          onClick={() => handleStartEdit(ex)}
                        >
                          ✏️ 驳回并编辑
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
