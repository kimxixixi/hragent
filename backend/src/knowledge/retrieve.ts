/**
 * 检索入口 — 给定查询文本，返回知识库中最相关的若干块
 *
 * 供评分 Agent 在打分前获取参考知识（能力模型 / 评价模板 / 历史心得）。
 */
import { embedText } from './embedding';
import { queryByEmbedding, type RetrievedChunk } from './vectorStore';

export type { RetrievedChunk };

/**
 * 构建检索查询文本
 * 由解析 Agent 产出的培训主题 + 关键知识点拼接而成
 */
export function buildQuery(trainingTopic: string, keyPoints: string[]): string {
  const parts = [trainingTopic, ...keyPoints].filter(Boolean);
  return parts.join(' ');
}

/**
 * 检索与查询最相关的知识块
 * @param query 检索查询文本
 * @param nResults 返回条数
 */
export async function retrieveKnowledge(
  query: string,
  nResults = 5
): Promise<RetrievedChunk[]> {
  if (!query.trim()) return [];
  const embedding = await embedText(query);
  return queryByEmbedding(embedding, nResults);
}
