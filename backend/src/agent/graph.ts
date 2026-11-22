/**
 * LangGraph 多 Agent 评价图
 * 用 StateGraph 替换原固定管线，拆分为 5 个节点 + Reflection 回边
 *
 * 流程：解析 → 评分 → 语气安全 → Reviewer 自审 → 组装结果
 *       Reviewer 未通过时回退到评分重评（最多一次）
 */
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { v4 as uuidv4 } from './uuid';
import { callLLMForJSON } from './llm';
import { buildParseMessages, buildScoreMessages, buildReviewMessages } from './prompt';
import { determineToneLevel, shouldFlagException } from './toneEngine';
import { safetyCheck, sanitizeFeedback } from './safetyFilter';
import { notifyHRException } from '../services/notify';
import type { EvaluationState, ParseContext, RawScore, ReviewResult } from './state';
import type { ReflectionInput, EvaluationResult, DimensionScore, ToneLevel } from '../types';

// ── State 定义 ──────────────────────────────────────────────

const State = Annotation.Root({
  input: Annotation<ReflectionInput>(),
  context: Annotation<ParseContext | undefined>(),
  rawScore: Annotation<RawScore | undefined>(),
  tone: Annotation<ToneLevel | undefined>(),
  feedbackSummary: Annotation<string | undefined>(),
  suggestions: Annotation<string[] | undefined>(),
  isException: Annotation<boolean | undefined>(),
  exceptionReason: Annotation<string | undefined>(),
  review: Annotation<ReviewResult | undefined>(),
  retryCount: Annotation<number>({
    value: (x, y) => y ?? x,
    default: () => 0,
  }),
  result: Annotation<EvaluationResult | undefined>(),
});

type GraphState = typeof State.State;

// ── 节点 1：解析 Agent ──────────────────────────────────────

async function parseAgent(state: GraphState): Promise<Partial<EvaluationState>> {
  const { system, user } = buildParseMessages(state.input.content);
  const parsed = await callLLMForJSON(system, user);
  return {
    context: {
      trainingTopic: parsed.trainingTopic || '',
      keyPoints: parsed.keyPoints || [],
      quotes: parsed.quotes || [],
    },
  };
}

// ── 节点 2：评分 Agent ──────────────────────────────────────

async function scoreAgent(state: GraphState): Promise<Partial<EvaluationState>> {
  const { system, user } = buildScoreMessages(
    state.input.content,
    state.input.trainingTitle,
    state.input.trainee.name,
    state.context
  );

  // 重评场景：追加 Reviewer 的修正意见
  const isRetry = !!(state.review && !state.review.passed);
  const finalUser = isRetry && state.review?.feedback
    ? `${user}\n\n【上一轮质检反馈，请据此修正】\n${state.review.feedback}`
    : user;

  const parsed = await callLLMForJSON(system, finalUser);

  const dimensions: DimensionScore[] = (parsed.dimensions || []).map((d: any) => ({
    name: d.name,
    label: d.label,
    score: d.score,
    weight: d.weight,
    comment: d.comment,
  }));

  return {
    rawScore: {
      totalScore: parsed.totalScore,
      dimensions,
      feedbackSummary: parsed.feedbackSummary,
      suggestions: parsed.suggestions || [],
      toneLevel: parsed.toneLevel || '',
    },
    retryCount: isRetry ? state.retryCount + 1 : state.retryCount,
  };
}

// ── 节点 3：语气 + 安全（纯规则）─────────────────────────────

function toneSafetyAgent(state: GraphState): Partial<EvaluationState> {
  const raw = state.rawScore!;

  const expectedTone = determineToneLevel(raw.totalScore);
  const validTones: ToneLevel[] = ['celebratory', 'sandwich', 'gentle_redirect'];
  const actualTone = validTones.includes(raw.toneLevel as ToneLevel)
    ? (raw.toneLevel as ToneLevel)
    : expectedTone;

  const safetyResult = safetyCheck(raw.feedbackSummary);
  let feedbackSummary = raw.feedbackSummary;
  let suggestions = raw.suggestions;

  if (!safetyResult.passed) {
    console.warn(`安全过滤触发: ${safetyResult.issues.join(', ')}`);
    feedbackSummary = sanitizeFeedback(feedbackSummary);
    suggestions = suggestions.map(sanitizeFeedback);
  }

  const { isException, reason: exceptionReason } = shouldFlagException(raw.totalScore);

  return {
    tone: actualTone,
    feedbackSummary,
    suggestions,
    isException,
    exceptionReason,
  };
}

// ── 节点 4：Reviewer（Reflection 自审）───────────────────────

async function reviewerAgent(state: GraphState): Promise<Partial<EvaluationState>> {
  const { system, user } = buildReviewMessages(state.input.content, state.rawScore!);
  const parsed = await callLLMForJSON(system, user);
  return {
    review: {
      passed: !!parsed.passed,
      issues: parsed.issues || [],
      feedback: parsed.feedback,
    },
  };
}

// ── 条件路由：Reviewer 判定 ─────────────────────────────────

function routeAfterReview(state: GraphState): string {
  if (state.review?.passed) return 'finalize';
  if (state.retryCount < 1) return 'score';
  return 'finalize';
}

// ── 节点 5：组装结果（纯规则）───────────────────────────────

function finalizeAgent(state: GraphState): Partial<EvaluationState> {
  const input = state.input;
  const raw = state.rawScore!;

  const result: EvaluationResult = {
    id: uuidv4(),
    trainee: input.trainee,
    trainingTitle: input.trainingTitle,
    content: input.content,
    totalScore: raw.totalScore,
    dimensions: raw.dimensions,
    feedbackSummary: state.feedbackSummary!,
    suggestions: state.suggestions!,
    toneLevel: state.tone!,
    isException: state.isException!,
    exceptionReason: state.exceptionReason,
    createdAt: new Date().toISOString(),
  };

  if (state.isException) {
    notifyHRException(result).catch((err) =>
      console.error('HR 通知发送失败:', err)
    );
  }

  return { result };
}

// ── 组装图 ─────────────────────────────────────────────────

const graph = new StateGraph(State)
  .addNode('parse', parseAgent)
  .addNode('score', scoreAgent)
  .addNode('toneSafety', toneSafetyAgent)
  .addNode('reviewer', reviewerAgent)
  .addNode('finalize', finalizeAgent)
  .addEdge(START, 'parse')
  .addEdge('parse', 'score')
  .addEdge('score', 'toneSafety')
  .addEdge('toneSafety', 'reviewer')
  .addConditionalEdges('reviewer', routeAfterReview, {
    score: 'score',
    finalize: 'finalize',
  })
  .addEdge('finalize', END);

const app = graph.compile();

/**
 * 对外入口：运行多 Agent 评价图，返回最终评价结果
 */
export async function runEvaluationGraph(input: ReflectionInput): Promise<EvaluationResult> {
  const state = await app.invoke({ input, retryCount: 0 });
  return state.result!;
}
