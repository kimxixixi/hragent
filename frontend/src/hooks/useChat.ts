import { useState, useCallback, useRef } from 'react';
import type { ChatMessage } from '../types/chat';
import { sendChatMessage } from '../services/api';

/**
 * 对话状态管理 Hook
 */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'system',
      role: 'agent',
      content: `👋 你好！我是**培小评**，你的培训成长伙伴～

参加了培训？把心得发给我吧，我会：
- 📝 认真读你的心得
- ⭐ 给你多维度的反馈
- 💡 提供具体的成长建议

**直接粘贴你的培训心得，我们开始吧！**`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [exceptionCount, setExceptionCount] = useState(0);
  const [pendingExceptions, setPendingExceptions] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const addMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages((prev) => [...prev, ...msgs]);
  }, []);

  // 更新/移除进度消息（兼容无 findLast 的浏览器）
  const upsertProgress = useCallback(
    (total: number, completed: number, traineeName: string) => {
      setMessages((prev) => {
        const batchId = `batch-progress`;
        const existing = prev.findIndex((m) => m.id === batchId);
        const msg: ChatMessage = {
          id: batchId,
          type: 'progress',
          role: 'system',
          content: `正在评价：${traineeName || ''} (${completed}/${total})`,
          payload: {
            total,
            completed,
            currentTrainee: traineeName,
            status: completed >= total ? 'completed' : 'processing',
          },
          timestamp: new Date().toISOString(),
        };

        if (existing !== -1) {
          const updated = [...prev];
          updated[existing] = msg;
          return updated;
        }
        return [...prev, msg];
      });
    },
    []
  );

  const removeProgress = useCallback(() => {
    setMessages((prev) => prev.filter((m) => m.id !== 'batch-progress'));
  }, []);

  /**
   * 发送文本消息
   */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        type: 'text',
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      };
      addMessage(userMsg);
      setIsLoading(true);

      try {
        const response = await sendChatMessage({ message: text });
        if (response.messages) {
          addMessages(response.messages);
        }
      } catch (err: any) {
        addMessage({
          id: `error-${Date.now()}`,
          type: 'system',
          role: 'system',
          content: `❌ 处理失败：${err.message}`,
          timestamp: new Date().toISOString(),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [addMessage, addMessages]
  );

  /**
   * 追加 SSE 流式事件的消息
   */
  const handleSSEEvent = useCallback(
    (event: any) => {
      if (event.type === 'progress') {
        upsertProgress(event.total, event.completed, event.currentTrainee || '');
      } else if (event.type === 'result' && event.result) {
        const r = event.result;
        // 更新进度条
        upsertProgress(event.total, event.completed, event.currentTrainee || '');

        if (r.isException) {
          // 异常 → 员工只看到确认消息，不展示评价卡片
          addMessage({
            id: r.id,
            type: 'text',
            role: 'agent',
            content: `📝 你的心得已收到！HR 正在复核中，稍后会将反馈发送给你～`,
            timestamp: new Date().toISOString(),
          });
          // HR 通知计数
          setExceptionCount((c) => c + 1);
          setPendingExceptions((prev) => [...prev, r]);
        } else {
          // 正常 → 员工直接看到完整反馈
          addMessage({
            id: r.id,
            type: 'evaluation_card',
            role: 'agent',
            content: `✅ 你的心得评价出来啦！总分 **${r.totalScore}分**，下面是详细反馈～`,
            payload: r,
            timestamp: new Date().toISOString(),
          });
        }
      } else if (event.type === 'complete') {
        removeProgress();
        if (event.total > 0) {
          if (event.total > 1) {
            addMessage({
              id: `complete-${Date.now()}`,
              type: 'system',
              role: 'system',
              content: `✅ 全部评价完成，共 ${event.completed} 篇心得。`,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    },
    [addMessage, upsertProgress, removeProgress]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const resolveException = useCallback((evalId: string, customFeedback?: string) => {
    const ex = pendingExceptions.find((e) => e.id === evalId);
    setPendingExceptions((prev) => prev.filter((e) => e.id !== evalId));
    setExceptionCount((c) => Math.max(0, c - 1));

    if (customFeedback && ex) {
      // HR 自定义反馈 → 作为 Agent 回复展示在对话中
      addMessage({
        id: `hr-feedback-${Date.now()}`,
        type: 'text',
        role: 'agent',
        content: customFeedback,
        timestamp: new Date().toISOString(),
      });
    } else {
      // 直接通过 → 展示系统评价
      addMessage({
        id: `hr-resolved-${Date.now()}`,
        type: 'system',
        role: 'system',
        content: `✅ 已通过系统评价并发送给员工。`,
        timestamp: new Date().toISOString(),
      });
    }
  }, [addMessage, pendingExceptions]);

  return {
    messages,
    isLoading,
    setIsLoading,
    exceptionCount,
    pendingExceptions,
    resolveException,
    sendMessage,
    addMessage,
    addMessages,
    handleSSEEvent,
    clearMessages,
    messagesEndRef,
  };
}
