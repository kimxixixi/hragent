import React, { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types/chat';
import { TextMessage } from './messages/TextMessage';
import { EvaluationCard } from './messages/EvaluationCard';
import { ExceptionCard } from './messages/ExceptionCard';
import { ProgressMessage } from './messages/ProgressMessage';

interface MessageListProps {
  messages: ChatMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, messagesEndRef }) => {
  return (
    <div className="message-list">
      {messages.length === 0 && (
        <div className="message-empty">
          <div className="message-empty-icon">🤖</div>
          <p>发送消息开始对话</p>
        </div>
      )}

      {messages.map((msg) => {
        switch (msg.type) {
          case 'text':
          case 'system':
            return <TextMessage key={msg.id} content={msg.content} role={msg.role} />;

          case 'evaluation_card':
            return msg.payload ? (
              <div key={msg.id} className="message-row message-row-left">
                <div className="message-avatar">🤖</div>
                <EvaluationCard result={msg.payload} />
              </div>
            ) : null;

          case 'exception_card':
            return msg.payload ? (
              <div key={msg.id} className="message-row message-row-left">
                <div className="message-avatar">🤖</div>
                <ExceptionCard result={msg.payload} />
              </div>
            ) : null;

          case 'progress':
            return msg.payload ? (
              <ProgressMessage
                key={msg.id}
                progress={msg.payload}
                content={msg.content}
              />
            ) : (
              <div key={msg.id} className="message-row message-row-left">
                <div className="message-avatar">🤖</div>
                <div className="message-bubble message-system">
                  <p>{msg.content}</p>
                </div>
              </div>
            );

          default:
            return (
              <TextMessage key={msg.id} content={msg.content} role={msg.role} />
            );
        }
      })}

      <div ref={messagesEndRef} />
    </div>
  );
};
