/**
 * 向量化工具 — 阿里云通义千问 text-embedding-v3
 *
 * 复用 .env 中的 LLM_API_KEY / LLM_BASE_URL，走 OpenAI 兼容 /embeddings 端点。
 * 返回 1024 维 float 向量，供 ChromaDB 入库与检索使用。
 *
 * .env 配置：
 *   EMBEDDING_MODEL — 默认 text-embedding-v3
 */

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-v3';

// 单次请求最多文本条数（text-embedding-v3 服务端单次上限为 10）
const BATCH_SIZE = 10;

export interface EmbeddingResponse {
  object: string;
  data: { object: string; index: number; embedding: number[] }[];
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
}

/**
 * 单条文本向量化
 */
export async function embedText(text: string): Promise<number[]> {
  const results = await embedTexts([text]);
  return results[0];
}

/**
 * 批量文本向量化（内部按 BATCH_SIZE 分批请求）
 * 保持输入顺序，返回与输入一一对应的向量
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error('未配置 LLM_API_KEY，无法调用 embedding 接口');
  }
  const baseUrl = process.env.LLM_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: batch,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Embedding API 调用失败 (${response.status}): ${err}`);
    }

    const data = (await response.json()) as EmbeddingResponse;
    // 服务端可能乱序返回，按 index 归位
    const sorted = data.data
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);

    allEmbeddings.push(...sorted);
  }

  return allEmbeddings;
}
