/**
 * ChromaDB 向量库访问层
 *
 * 采用 client-server 架构：
 *   - 服务端：Python chromadb（`chroma run --path <dir> --port 8000`）
 *   - 客户端：chromadb JS 包（本模块），走 HTTP 连接
 *
 * 之所以用 client-server 而非嵌入式，是为了贴近生产部署形态，
 * 也让"向量库独立服务 + 应用服务"的分层在面试里讲得清楚。
 */
import { ChromaClient } from 'chromadb';
import type { KnowledgeDocument } from './documents';

const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';
const CHROMA_PORT = Number(process.env.CHROMA_PORT || 8000);

const COLLECTION_NAME = 'evaluation_knowledge';

let client: ChromaClient | null = null;
let collection: any = null;

/**
 * 获取 Chroma 客户端（惰性单例）
 */
export function getChromaClient(): ChromaClient {
  if (!client) {
    client = new ChromaClient({ host: CHROMA_HOST, port: CHROMA_PORT });
  }
  return client;
}

/**
 * 获取知识库集合（惰性单例）
 * embeddingFunction 传 null：向量由我们自己通过 text-embedding-v3 计算，
 * 不依赖 Chroma 内置的本地 embedding 模型。
 */
export async function getCollection() {
  if (!collection) {
    const c = getChromaClient();
    collection = await c.getOrCreateCollection({
      name: COLLECTION_NAME,
      embeddingFunction: null,
      metadata: { 'hnsw:space': 'cosine' },
    });
  }
  return collection;
}

/**
 * 批量 upsert 文档（按 id 幂等，重复构建不产生重复数据）
 */
export async function upsertDocuments(
  docs: KnowledgeDocument[],
  embeddings: number[][]
): Promise<void> {
  if (docs.length !== embeddings.length) {
    throw new Error('文档数与向量数不一致');
  }
  const col = await getCollection();
  await col.upsert({
    ids: docs.map((d) => d.id),
    embeddings,
    metadatas: docs.map((d) => d.metadata),
    documents: docs.map((d) => d.text),
  });
}

export interface RetrievedChunk {
  id: string;
  text: string;
  metadata: Record<string, string | number | boolean>;
  distance: number; // cosine 距离，越小越相关
}

/**
 * 按向量检索 top-k 相似文档
 */
export async function queryByEmbedding(
  embedding: number[],
  nResults = 5
): Promise<RetrievedChunk[]> {
  const col = await getCollection();
  const result = await col.query({
    queryEmbeddings: [embedding],
    nResults,
    include: ['documents', 'metadatas', 'distances'],
  });

  const ids: string[] = result.ids?.[0] ?? [];
  const documents: (string | null)[] = result.documents?.[0] ?? [];
  const metadatas: (Record<string, string | number | boolean> | null)[] =
    result.metadatas?.[0] ?? [];
  const distances: number[] = result.distances?.[0] ?? [];

  return ids.map((id, i) => ({
    id,
    text: documents[i] ?? '',
    metadata: metadatas[i] ?? {},
    distance: distances[i] ?? 1,
  }));
}
