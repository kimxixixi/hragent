import React, { useState } from 'react';
import type { EvaluationResult } from '../../types/chat';

interface EvaluationCardProps {
  result: EvaluationResult;
}

const TONE_LABELS: Record<string, string> = {
  celebratory: '🌟 真诚表扬',
  sandwich: '🥪 三明治反馈',
  gentle_redirect: '🌱 温和引导',
};

export const EvaluationCard: React.FC<EvaluationCardProps> = ({ result }) => {
  const [expanded, setExpanded] = useState(true);

  const scoreColor =
    result.totalScore >= 8
      ? '#22c55e'
      : result.totalScore >= 6
      ? '#eab308'
      : result.totalScore >= 4
      ? '#f97316'
      : '#ef4444';

  return (
    <div className="eval-card">
      {/* 头部：学员 + 总分 */}
      <div className="eval-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="eval-card-score" style={{ background: scoreColor }}>
          <span className="eval-score-num">{result.totalScore}</span>
          <span className="eval-score-total">/10</span>
        </div>
        <div className="eval-card-info">
          <div className="eval-card-name">
            {result.trainee.name}
          </div>
          <div className="eval-card-training">{result.trainingTitle}</div>
          <div className="eval-card-meta">
            <span className="eval-meta-tag">{TONE_LABELS[result.toneLevel] || result.toneLevel}</span>
          </div>
        </div>
        <div className="eval-card-expand">{expanded ? '▲' : '▼'}</div>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div className="eval-card-body">
          {/* 维度得分 */}
          <div className="eval-dimensions">
            <h4>📊 维度得分</h4>
            <div className="eval-dimension-list">
              {result.dimensions.map((dim) => (
                <div key={dim.name} className="eval-dimension-item">
                  <div className="eval-dim-header">
                    <span className="eval-dim-label">{dim.label}</span>
                    <span className="eval-dim-weight">{(dim.weight * 100).toFixed(0)}%</span>
                    <span className="eval-dim-score">{dim.score}/10</span>
                  </div>
                  <div className="eval-dim-bar">
                    <div
                      className="eval-dim-bar-fill"
                      style={{
                        width: `${(dim.score / 10) * 100}%`,
                        background:
                          dim.score >= 8
                            ? '#22c55e'
                            : dim.score >= 6
                            ? '#eab308'
                            : '#f97316',
                      }}
                    />
                  </div>
                  <p className="eval-dim-comment">{dim.comment}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 评价总结 */}
          <div className="eval-summary">
            <h4>💬 评价总结</h4>
            <p>{result.feedbackSummary}</p>
          </div>

          {/* 改进建议 */}
          {result.suggestions.length > 0 && (
            <div className="eval-suggestions">
              <h4>💡 改进建议</h4>
              <ul>
                {result.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 原始心得（折叠） */}
          <details className="eval-original">
            <summary>📝 查看原始心得</summary>
            <p className="eval-original-text">{result.content}</p>
          </details>
        </div>
      )}
    </div>
  );
};
