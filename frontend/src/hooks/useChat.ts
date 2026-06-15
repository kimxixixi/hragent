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
      content: `👋 你好，我是培小评～

请先告诉我你的**姓名和工号**，比如：\`张三 S001\``,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [exceptionCount, setExceptionCount] = useState(0);
  const [pendingExceptions, setPendingExceptions] = useState<any[]>([]);
  const [employeeInfo, setEmployeeInfo] = useState<{
    name: string;
    employeeId: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 灵活检测姓名+工号格式
  const parseEmployeeInfo = useCallback((text: string) => {
    const t = text.trim();
    // 匹配: 中文名(2-4字) + 分隔符(空格/逗号/冒号/无) + 工号(数字或字母数字2-10位)
    const patterns = [
      /^([一-鿿]{2,4})[\s,，：:]+([A-Za-z0-9\-]{2,10})$/,
      /^([一-鿿]{2,4})(\d{3,8})$/,
      /^([A-Za-z0-9\-]{2,10})[\s,，：:]+([一-鿿]{2,4})$/,
      /^(\d{3,8})\s*[\s,，：:]?\s*([一-鿿]{2,4})$/,
    ];
    for (const p of patterns) {
      const m = t.match(p);
      if (m) {
        const a = m[1], b = m[2];
        return /[一-鿿]/.test(a)
          ? { name: a, employeeId: b }
          : { name: b, employeeId: a };
      }
    }
    return null;
  }, []);

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
   * 发送文本消息（含员工报到检测）
   */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // 短文本提示
      if (text.startsWith('[SYSTEM_HINT:TOO_SHORT]')) {
        const content = text.replace('[SYSTEM_HINT:TOO_SHORT]', '');
        addMessage({
          id: `user-${Date.now()}`,
          type: 'text',
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
        });
        addMessage({
          id: `hint-${Date.now()}`,
          type: 'system',
          role: 'agent',
          content: `😊 你的心得太简短了（不足 20 字），我没法给出有意义的反馈哦～\n\n试试多写一点，比如：\n- 培训中学到了什么具体的知识或方法？\n- 对你有什么启发或改变？\n- 打算怎么用到工作中？\n\n写好了再发给我吧！`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        type: 'text',
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      };
      addMessage(userMsg);

      // 检测是否在报到（输入姓名工号）
      if (!employeeInfo) {
        const info = parseEmployeeInfo(text);
        if (info) {
          setEmployeeInfo(info);
          addMessage({
            id: `confirm-${Date.now()}`,
            type: 'system',
            role: 'agent',
            content: `✅ 已记住！**${info.name}**（工号 ${info.employeeId}），现在可以提交你的培训心得了～`,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

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
    [addMessage, addMessages, employeeInfo, parseEmployeeInfo]
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

    if (!ex) return;

    if (customFeedback) {
      // HR 驳回并编辑 → 员工看到 HR 写的反馈
      addMessage({
        id: `hr-feedback-${Date.now()}`,
        type: 'text',
        role: 'agent',
        content: customFeedback,
        timestamp: new Date().toISOString(),
      });
    } else {
      // HR 直接通过 → 员工看到 AI 评价卡片（和正常高分流程一样）
      addMessage({
        id: ex.id,
        type: 'evaluation_card',
        role: 'agent',
        content: `✅ 你的心得评价出来啦！总分 **${ex.totalScore}分**，下面是详细反馈～`,
        payload: ex,
        timestamp: new Date().toISOString(),
      });
    }
  }, [addMessage, pendingExceptions]);

  return {
    messages,
    isLoading,
    setIsLoading,
    employeeInfo,
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
