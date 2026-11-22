import type { ReflectionInput, EvaluationResult, DimensionScore, ToneLevel, EmployeeProfile } from '../types';
import type { RetrievedChunk } from '../knowledge/vectorStore';

/**
 * 解析 Agent 产出 — 从心得中提取的结构化上下文
 * 该结构同时是 RAG 检索（改进项 4）的 query 来源
 */
export interface ParseContext {
  trainingTopic: string;   // 培训主题
  keyPoints: string[];     // 关键知识点 / 模型
  quotes: string[];        // 原文关键句
}

/**
 * 评分 Agent 产出 — 未经语气/安全/异常处理的原始评分
 */
export interface RawScore {
  totalScore: number;
  dimensions: DimensionScore[];
  feedbackSummary: string;
  suggestions: string[];
  toneLevel: string;
}

/**
 * Reviewer 产出 — Reflection 自审结果
 */
export interface ReviewResult {
  passed: boolean;
  issues: string[];        // 未通过时的问题清单
  feedback?: string;       // 未通过时给评分 Agent 的修正意见
}

/**
 * StateGraph 全局状态
 * 各节点读写同一份 state，通过 state 传递数据
 */
export interface EvaluationState {
  input: ReflectionInput;

  // 解析 Agent 产出
  context?: ParseContext;

  // 检索 Agent 产出（RAG 检索到的参考知识）
  retrievedChunks?: RetrievedChunk[];

  // 画像节点产出（员工学习画像，供个性化反馈）
  profile?: EmployeeProfile;

  // 评分 Agent 产出
  rawScore?: RawScore;

  // 语气 + 安全节点产出
  tone?: ToneLevel;
  feedbackSummary?: string;   // 安全过滤后的总结
  suggestions?: string[];
  isException?: boolean;
  exceptionReason?: string;

  // Reviewer 产出
  review?: ReviewResult;
  retryCount: number;         // Reflection 重评计数，防死循环

  // 终态
  result?: EvaluationResult;
}
