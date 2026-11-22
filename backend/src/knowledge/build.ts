/**
 * 知识库构建 — 把能力模型 / 评价模板 / 样例心得向量化后写入 ChromaDB
 *
 * 独立脚本：`npm run kb:build`（见 package.json）
 * 幂等：按文档 id upsert，重复执行只刷新内容、不产生重复条目。
 */
import 'dotenv/config';
import { buildKnowledgeDocuments } from './documents';
import { embedTexts } from './embedding';
import { upsertDocuments, getCollection } from './vectorStore';

export async function buildKnowledgeBase(): Promise<number> {
  const docs = buildKnowledgeDocuments();
  console.log(`[知识库] 共 ${docs.length} 条文档，开始向量化...`);

  const embeddings = await embedTexts(docs.map((d) => d.text));
  console.log(`[知识库] 向量化完成，${embeddings.length} 条，维度 ${embeddings[0]?.length ?? 0}`);

  await upsertDocuments(docs, embeddings);

  const col = await getCollection();
  const count = await col.count();
  console.log(`[知识库] 入库完成，集合内共 ${count} 条`);
  return count;
}

// 直接执行时作为 CLI 脚本运行
if (require.main === module) {
  buildKnowledgeBase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[知识库] 构建失败:', err);
      process.exit(1);
    });
}
