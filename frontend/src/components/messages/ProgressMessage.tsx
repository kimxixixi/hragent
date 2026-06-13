import React from 'react';
import type { BatchProgress } from '../../types/chat';

interface ProgressMessageProps {
  progress: BatchProgress;
  content: string;
}

export const ProgressMessage: React.FC<ProgressMessageProps> = ({ progress, content }) => {
  const percent =
    progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  return (
    <div className="progress-message">
      <div className="progress-content">
        <span className="progress-spinner">⏳</span>
        <div className="progress-info">
          <p className="progress-text">{content}</p>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="progress-percent">
            {progress.completed}/{progress.total} ({percent}%)
          </span>
        </div>
      </div>
    </div>
  );
};
