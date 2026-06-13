import React, { useEffect, useState } from 'react';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { HRPanel } from './HRPanel';
import { useChat } from '../hooks/useChat';
import { streamEvaluate } from '../services/api';
import type { ReflectionInput } from '../types/chat';

export const ChatView: React.FC = () => {
  const {
    messages,
    isLoading,
    setIsLoading,
    exceptionCount,
    pendingExceptions,
    resolveException,
    sendMessage,
    handleSSEEvent,
    addMessage,
    messagesEndRef,
  } = useChat();

  const [showHRPanel, setShowHRPanel] = useState(false);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  /**
   * 批量评价处理
   */
  const handleBatchEvaluate = (reflections: ReflectionInput[]) => {
    if (reflections.length === 0) return;

    // 即时添加用户消息
    addMessage({
      id: `user-${Date.now()}`,
      type: 'text',
      role: 'user',
      content: reflections.length === 1
        ? reflections[0].content
        : `提交了 ${reflections.length} 篇心得`,
      timestamp: new Date().toISOString(),
    });

    // 加载状态
    setIsLoading(true);

    // 启动 SSE 流式评价
    streamEvaluate(
      { reflections },
      handleSSEEvent,
      () => {
        setIsLoading(false);
      },
      (err) => {
        setIsLoading(false);
        addMessage({
          id: `error-${Date.now()}`,
          type: 'system',
          role: 'system',
          content: `❌ 评价失败：${err.message}`,
          timestamp: new Date().toISOString(),
        });
      }
    );
  };

  return (
    <div className="chat-view">
      {/* 顶部标题栏 */}
      <div className="chat-header">
        <div className="chat-header-icon">🤖</div>
        <div className="chat-header-info">
          <h1 className="chat-header-title">培小评</h1>
          <p className="chat-header-subtitle">
            你的培训成长伙伴 · 提交心得即可获得反馈
          </p>
        </div>
        <button
          className="hr-notify-btn"
          onClick={() => setShowHRPanel(true)}
          title="HR 异常通知"
        >
          🔔
          {exceptionCount > 0 && (
            <span className="hr-notify-dot">{exceptionCount}</span>
          )}
        </button>
      </div>

      {/* 消息列表 */}
      <MessageList messages={messages} messagesEndRef={messagesEndRef} />

      {/* 输入区域 */}
      <InputArea
        onSendMessage={sendMessage}
        onBatchEvaluate={handleBatchEvaluate}
        isLoading={isLoading}
      />

      {/* HR 异常通知面板 */}
      {showHRPanel && (
        <HRPanel
          exceptions={pendingExceptions}
          exceptionCount={exceptionCount}
          onResolve={resolveException}
          onClose={() => setShowHRPanel(false)}
        />
      )}
    </div>
  );
};
