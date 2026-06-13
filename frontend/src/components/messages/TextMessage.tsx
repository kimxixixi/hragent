import React from 'react';
import ReactMarkdown from 'react-markdown';

interface TextMessageProps {
  content: string;
  role: 'user' | 'agent' | 'system';
}

export const TextMessage: React.FC<TextMessageProps> = ({ content, role }) => {
  const bubbleClass =
    role === 'user'
      ? 'message-bubble message-user'
      : role === 'system'
      ? 'message-bubble message-system'
      : 'message-bubble message-agent';

  return (
    <div className={`message-row ${role === 'user' ? 'message-row-right' : 'message-row-left'}`}>
      {role !== 'user' && (
        <div className="message-avatar">
          {role === 'system' ? '🔔' : '🤖'}
        </div>
      )}
      <div className={bubbleClass}>
        {role === 'user' ? (
          <p className="message-text">{content}</p>
        ) : (
          <div className="message-markdown">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
      {role === 'user' && (
        <div className="message-avatar message-avatar-user">👤</div>
      )}
    </div>
  );
};
