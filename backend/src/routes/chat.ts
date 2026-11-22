import { Router, Request, Response } from 'express';
import { evaluateReflection } from '../agent/evaluator';
import { getStats, getRecentEvaluations, getExceptions } from '../db/queries';
import {
  getEmployeeProfile,
  getEmployeeRole,
  ensureEmployee,
  listEmployees,
} from '../db/profile';
import { parseIdentity } from '../util/identity';
import type { ChatMessage, ChatRequest, ReflectionInput, Role } from '../types';
import { v4 } from '../agent/uuid';

const router = Router();

interface ChatContext {
  /** 已识别身份（姓名 + 工号） */
  identity: { name: string; employeeId: string } | null;
  role: Role;
  /** 本次消息本身就是"姓名 工号"（报到），而非从请求携带的工号反查 */
  isOnboarding: boolean;
}

/**
 * POST /api/chat
 * 对话式交互入口，按角色分流能力：
 *   - 员工：提交心得、查看自己的历史/画像
 *   - HR：审核异常、看统计、看全员画像
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, attachments, employeeId } = req.body as ChatRequest;

    // 身份解析：优先取请求携带的工号，其次从消息文本解析（报到场景）
    const parsed = parseIdentity(message || '');
    let identity = parsed;
    if (!identity && employeeId) {
      // 后续消息没带姓名，从档案反查姓名
      const profile = getEmployeeProfile(employeeId);
      identity = { name: profile.name || employeeId, employeeId };
    }
    if (parsed) {
      ensureEmployee(parsed.employeeId, parsed.name);
    }

    const role: Role = identity ? getEmployeeRole(identity.employeeId) : 'employee';
    const ctx: ChatContext = { identity, role, isOnboarding: !!parsed };

    // 有附件 = 提交心得评价（员工与 HR 均可）
    if (attachments && attachments.length > 0) {
      const results: any[] = [];
      for (const reflection of attachments) {
        const result = await evaluateReflection(reflection as ReflectionInput);
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

      res.json({
        messages: replyMessages,
        identity: identity ? { ...identity, role } : undefined,
      });
      return;
    }

    // 无附件 = 意图识别 + 角色分流
    const reply = await handleNaturalLanguage(message || '', ctx);
    res.json({
      messages: reply.messages,
      identity: identity ? { ...identity, role } : undefined,
    });
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
 * 自然语言意图识别 + 角色分流
 */
async function handleNaturalLanguage(
  message: string,
  ctx: ChatContext
): Promise<{ messages: ChatMessage[] }> {
  const msg = message.toLowerCase();
  const now = new Date().toISOString();
  const { identity, role, isOnboarding } = ctx;

  // 报到：本次消息本身就是"姓名 工号"
  if (isOnboarding && identity) {
    return { messages: [welcome(identity, role, now)] };
  }

  // ── 统计（HR 专属）──
  if (
    msg.includes('统计') || msg.includes('报告') || msg.includes('汇总') ||
    msg.includes('平均分') || msg.includes('多少篇')
  ) {
    if (role !== 'hr') return { messages: [deny(now)] };
    return { messages: [statsMessage(now)] };
  }

  // ── 异常审核（HR 专属）──
  if (msg.includes('异常') || msg.includes('复核') || msg.includes('待处理')) {
    if (role !== 'hr') return { messages: [deny(now)] };
    return { messages: exceptionsMessage(now) };
  }

  // ── 最近 / 历史：HR 看全部，员工看自己的 ──
  if (msg.includes('最近') || msg.includes('历史') || msg.includes('查看')) {
    if (role === 'hr') return { messages: [recentAllMessage(now)] };
    if (identity) return { messages: [recentMineMessage(identity, now)] };
    return { messages: [askOnboard(now)] };
  }

  // ── 画像：HR 看全员（或指定某人），员工看自己 ──
  if (msg.includes('画像') || msg.includes('趋势') || msg.includes('薄弱')) {
    if (role === 'hr') return { messages: profileHRMessage(message, now) };
    if (identity) return { messages: [profileMineMessage(identity, now)] };
    return { messages: [askOnboard(now)] };
  }

  // ── 默认：角色化帮助 ──
  return { messages: [help(role, now)] };
}

// ── 消息构造 ────────────────────────────────────────────────

function welcome(identity: { name: string; employeeId: string }, role: Role, now: string): ChatMessage {
  if (role === 'hr') {
    return {
      id: v4(), type: 'system', role: 'agent',
      content: `✅ 已识别：**${identity.name}**（工号 ${identity.employeeId}）· **HR**\n\n你可以：\n- 输入「异常」查看并审核待复核评价\n- 输入「统计」看全量评分概览\n- 输入「画像」看全员学习画像`,
      timestamp: now,
    };
  }
  return {
    id: v4(), type: 'system', role: 'agent',
    content: `✅ 已记住！**${identity.name}**（工号 ${identity.employeeId}），现在可以直接粘贴你的培训心得，我会给你反馈～\n\n也可以输入「我的画像」或「最近」查看自己的历史记录。`,
    timestamp: now,
  };
}

function help(role: Role, now: string): ChatMessage {
  if (role === 'hr') {
    return {
      id: v4(), type: 'text', role: 'agent',
      content: `👋 你好，HR～\n\n- 输入「异常」审核待复核评价\n- 输入「统计」看评分概览\n- 输入「画像」看全员学习画像`,
      timestamp: now,
    };
  }
  return {
    id: v4(), type: 'text', role: 'agent',
    content: `👋 你好，我是培小评～\n\n先告诉我你的**姓名和工号**（比如 \`张三 S001\`），然后直接粘贴培训心得，我就会给你反馈～`,
    timestamp: now,
  };
}

function askOnboard(now: string): ChatMessage {
  return {
    id: v4(), type: 'text', role: 'agent',
    content: `请先告诉我你的**姓名和工号**（比如 \`张三 S001\`），我才能帮你查记录哦～`,
    timestamp: now,
  };
}

function deny(now: string): ChatMessage {
  return {
    id: v4(), type: 'text', role: 'agent',
    content: `🔒 这是 HR 专属功能，你没有权限访问哦～`,
    timestamp: now,
  };
}

function statsMessage(now: string): ChatMessage {
  const stats = getStats();
  return {
    id: v4(), type: 'text', role: 'agent',
    content: `📊 **评价统计概览**\n\n- 累计评价：**${stats.totalEvaluations}** 篇\n- 平均得分：**${stats.averageScore}** 分\n- 待处理异常：**${stats.pendingExceptions}** 个\n\n${stats.distribution.length > 0 ? '**得分分布：**\n' + stats.distribution.map((d: any) => `- ${d.level}: ${d.count} 篇`).join('\n') : ''}`,
    timestamp: now,
  };
}

function exceptionsMessage(now: string): ChatMessage[] {
  const exceptions = getExceptions('pending');
  if (exceptions.length === 0) {
    return [{
      id: v4(), type: 'text', role: 'agent',
      content: '✅ 当前没有待处理的异常评价。',
      timestamp: now,
    }];
  }
  return exceptions.map((e) => ({
    id: v4(), type: 'exception_card' as any, role: 'agent' as const,
    content: `⚠️ ${e.trainee.name} — 评分 ${e.totalScore}分 — ${e.exceptionReason || '需复核'}`,
    payload: e,
    timestamp: now,
  }));
}

function recentAllMessage(now: string): ChatMessage {
  const recent = getRecentEvaluations(10);
  if (recent.length === 0) {
    return { id: v4(), type: 'text', role: 'agent', content: '📭 还没有评价记录。', timestamp: now };
  }
  const summary = recent
    .map((r, i) => `${i + 1}. ${r.trainee.name} — 《${r.trainingTitle}》 — **${r.totalScore}分** (${r.createdAt.slice(0, 10)})`)
    .join('\n');
  return { id: v4(), type: 'text', role: 'agent', content: `📋 **最近评价记录**\n\n${summary}`, timestamp: now };
}

function recentMineMessage(identity: { name: string; employeeId: string }, now: string): ChatMessage {
  const p = getEmployeeProfile(identity.employeeId);
  if (p.evaluationCount === 0) {
    return { id: v4(), type: 'text', role: 'agent', content: '📭 你还没有评价记录，直接粘贴心得即可～', timestamp: now };
  }
  const summary = p.recentScores
    .map((s, i) => `${i + 1}. 《${s.title}》 — **${s.score}分** (${s.date})`)
    .join('\n');
  return {
    id: v4(), type: 'text', role: 'agent',
    content: `📋 **你的历史评价（共 ${p.evaluationCount} 次，均分 ${p.averageScore}，趋势 ${trendLabel(p.trend)}）**\n\n${summary}`,
    timestamp: now,
  };
}

function profileMineMessage(identity: { name: string; employeeId: string }, now: string): ChatMessage {
  const p = getEmployeeProfile(identity.employeeId);
  if (p.evaluationCount === 0) {
    return { id: v4(), type: 'text', role: 'agent', content: '你还没有评价记录，暂无画像哦～', timestamp: now };
  }
  const weak = p.weakDimensions.length > 0 ? p.weakDimensions.join('、') : '无';
  const dims = p.dimensionAverages.map((d) => `${d.label} ${d.avg}`).join(' · ');
  return {
    id: v4(), type: 'text', role: 'agent',
    content: `👤 **你的学习画像**\n\n- 部门：${p.department || '未维护'}\n- 历史评价：${p.evaluationCount} 次，均分 **${p.averageScore}**\n- 趋势：${trendLabel(p.trend)}\n- 薄弱维度：${weak}\n- 维度均分：${dims}`,
    timestamp: now,
  };
}

function profileHRMessage(message: string, now: string): ChatMessage[] {
  // 尝试从消息里找具体工号/姓名
  const idMatch = message.match(/[A-Za-z0-9\-]{2,10}/);
  const target = idMatch ? idMatch[0] : null;

  if (target && getEmployeeProfile(target).evaluationCount > 0) {
    const p = getEmployeeProfile(target);
    const weak = p.weakDimensions.length > 0 ? p.weakDimensions.join('、') : '无';
    return [{
      id: v4(), type: 'text', role: 'agent',
      content: `👤 **${p.name}（${p.employeeId}）**\n\n- 部门：${p.department || '未维护'} · 角色：${p.role === 'hr' ? 'HR' : '员工'}\n- 评价：${p.evaluationCount} 次，均分 ${p.averageScore}\n- 趋势：${trendLabel(p.trend)}\n- 薄弱维度：${weak}`,
      timestamp: now,
    }];
  }

  const emps = listEmployees();
  if (emps.length === 0) {
    return [{ id: v4(), type: 'text', role: 'agent', content: '还没有员工档案。', timestamp: now }];
  }
  const list = emps
    .slice(0, 20)
    .map((e, i) => `${i + 1}. ${e.name}（${e.employee_id}）· ${e.department || '部门未维护'} · ${e.role === 'hr' ? 'HR' : '员工'}`)
    .join('\n');
  return [{ id: v4(), type: 'text', role: 'agent', content: `👥 **员工档案（${emps.length} 人）**\n\n${list}\n\n输入「画像 工号」查看某人详情。`, timestamp: now }];
}

function trendLabel(trend: string): string {
  return {
    first_time: '首次评价',
    rising: '稳步上升',
    declining: '有所回落',
    stable: '整体平稳',
  }[trend] || trend;
}

export default router;
