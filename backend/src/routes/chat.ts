import { Router, Request, Response } from 'express';
import { evaluateReflection } from '../agent/evaluator';
import { getStats, getRecentEvaluations, getExceptions } from '../db/queries';
import type { ChatMessage, ChatRequest, ReflectionInput } from '../types';
import { v4 } from '../agent/uuid';

const router = Router();

/**
 * POST /api/chat
 * 对话式交互入口
 * HR 发送自然语言消息，Agent 理解意图并返回相应结果
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, attachments } = req.body as ChatRequest;

    // 如果没有附件，尝试理解自然语言意图
    if (!attachments || attachments.length === 0) {
      const reply = await handleNaturalLanguage(message);
      res.json(reply);
      return;
    }

    // 有附件 = 提交心得进行评价
    const results = [];
    for (const reflection of attachments) {
      const result = await evaluateReflection(reflection);
      results.push(result);
    }

    const replyMessages: ChatMessage[] = [
      {
        id: v4(),
        type: 'system',
        role: 'system',
        content: `收到 ${attachments.length} 篇心得，评价完成`,
        timestamp: new Date().toISOString(),
      },
      ...results.map((r) => ({
        id: v4(),
        type: (r.isException ? 'exception_card' : 'evaluation_card') as any,
        role: 'agent' as const,
        content: r.isException
          ? `⚠️ ${r.trainee.name} — ${r.exceptionReason}`
          : `✅ ${r.trainee.name} — ${r.totalScore}分`,
        payload: r,
        timestamp: new Date().toISOString(),
      })),
    ];

    res.json({ messages: replyMessages });
  } catch (err: any) {
    console.error('Chat error:', err);
    res.status(500).json({
      messages: [
        {
          id: v4(),
          type: 'system',
          role: 'system',
          content: `处理失败：${err.message}`,
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }
});

/**
 * 自然语言意图识别
 * 简单关键词匹配 + 规则（可升级为 LLM 意图分类）
 */
async function handleNaturalLanguage(message: string): Promise<{ messages: ChatMessage[] }> {
  const msg = message.toLowerCase();
  const now = new Date().toISOString();

  // 统计查询
  if (
    msg.includes('统计') ||
    msg.includes('报告') ||
    msg.includes('汇总') ||
    msg.includes('平均分') ||
    msg.includes('多少篇') ||
    msg.includes('今天') ||
    msg.includes('本周')
  ) {
    const stats = getStats();
    const reply: ChatMessage = {
      id: v4(),
      type: 'text',
      role: 'agent',
      content: `📊 **评价统计概览**

- 累计评价：**${stats.totalEvaluations}** 篇
- 平均得分：**${stats.averageScore}** 分
- 待处理异常：**${stats.pendingExceptions}** 个

${stats.distribution.length > 0 ? '\n**得分分布：**\n' + stats.distribution.map((d: any) => `- ${d.level}: ${d.count} 篇`).join('\n') : ''}`,
      timestamp: now,
    };
    return { messages: [reply] };
  }

  // 异常查询
  if (msg.includes('异常') || msg.includes('复核') || msg.includes('待处理')) {
    const exceptions = getExceptions('pending');
    if (exceptions.length === 0) {
      return {
        messages: [
          {
            id: v4(),
            type: 'text',
            role: 'agent',
            content: '✅ 当前没有待处理的异常评价。',
            timestamp: now,
          },
        ],
      };
    }

    const cards: ChatMessage[] = exceptions.map((e) => ({
      id: v4(),
      type: 'exception_card' as any,
      role: 'agent' as const,
      content: `⚠️ ${e.trainee.name} — 评分 ${e.totalScore}分 — ${e.exceptionReason || '需复核'}`,
      payload: e,
      timestamp: now,
    }));

    return { messages: cards };
  }

  // 最近评价
  if (msg.includes('最近') || msg.includes('历史') || msg.includes('查看')) {
    const recent = getRecentEvaluations(10);
    if (recent.length === 0) {
      return {
        messages: [
          {
            id: v4(),
            type: 'text',
            role: 'agent',
            content: '📭 还没有评价记录。你可以直接粘贴培训心得，我来帮你评价。',
            timestamp: now,
          },
        ],
      };
    }

    const summary = recent
      .map((r, i) => `${i + 1}. ${r.trainee.name} — 《${r.trainingTitle}》 — **${r.totalScore}分** (${r.createdAt.slice(0, 10)})`)
      .join('\n');

    return {
      messages: [
        {
          id: v4(),
          type: 'text',
          role: 'agent',
          content: `📋 **最近评价记录**\n\n${summary}`,
          timestamp: now,
        },
      ],
    };
  }

  // 帮助 / 默认
  return {
    messages: [
      {
        id: v4(),
        type: 'text',
        role: 'agent',
        content: `👋 你好，我是培小评～

先告诉我你的**姓名和工号**（比如 \`张三 S001\`），然后直接粘贴培训心得，我就会给你反馈～`,
        timestamp: now,
      },
    ],
  };
}

export default router;
