import React, { useEffect, useState } from 'react';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { HRPanel } from './HRPanel';
import { useChat } from '../hooks/useChat';
import { streamEvaluate } from '../services/api';
import type { ReflectionInput, Identity } from '../types/chat';

interface ChatViewProps {
  identity: Identity;
  onLogout: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ identity, onLogout }) => {
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
  } = useChat(identity);

  const [showHRPanel, setShowHRPanel] = useState(false);
  const isHR = identity.role === 'hr';

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  /**
   * 批量评价处理
   */
  const handleBatchEvaluate = (reflections: ReflectionInput[]) => {
    if (reflections.length === 0) return;

    // 自动附带登录身份
    const enriched = reflections.map((r) => ({
      ...r,
      trainee: {
        name: r.trainee.name || identity.name,
        employeeId: r.trainee.employeeId || identity.employeeId,
      },
    }));

    // 即时添加用户消息
    const fileNames = enriched.map((r) => `《${r.trainingTitle}》`).join('、');
    addMessage({
      id: `user-${Date.now()}`,
      type: 'text',
      role: 'user',
      content: enriched.length === 1
        ? enriched[0].content
        : `📁 上传了 ${enriched.length} 个文件：${fileNames}`,
      timestamp: new Date().toISOString(),
    });

    setIsLoading(true);

    streamEvaluate(
      { reflections: enriched },
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
            {identity.name}（工号 {identity.employeeId}）· {isHR ? 'HR' : '员工'}
          </p>
        </div>
        {isHR && (
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
        )}
        <button className="logout-btn" onClick={onLogout} title="退出登录">
          退出
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
      {showHRPanel && isHR && (
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
