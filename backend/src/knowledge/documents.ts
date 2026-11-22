/**
 * 知识库文档构建 — 把三类领域知识拍平成可向量化的文本块
 *
 * 数据来源（均来自项目内既有资产，非外部编造）：
 *   1. 岗位能力素质模型（competency.ts）：能力维度分级 + 岗位画像
 *   2. 培训评价模板库（templates.ts）：不同培训类型的评价侧重点
 *   3. 样例培训心得（sample-reflections.ts）：作为历史参考心得
 *
 * 每个文档块带 id / text（向量化内容）/ metadata（元数据，供注入与过滤）。
 * Chroma 的 metadata 值只支持标量（string/number/boolean），数组需 join 成字符串。
 */
import { COMPETENCY_DIMENSIONS, POSITION_PROFILES } from './competency';
import { EVALUATION_TEMPLATES } from './templates';
import { SAMPLE_REFLECTIONS } from '../fixtures/sample-reflections';

export interface KnowledgeDocument {
  /** 稳定唯一 id，用 upsert 保证重复构建幂等 */
  id: string;
  /** 用于 embedding 的文本 */
  text: string;
  /** 元数据，仅标量值 */
  metadata: Record<string, string | number | boolean>;
}

/**
 * 能力素质维度 → 按层级拍平
 * 每个层级一个块：能力名 + 层级 + 描述 + 期望行为
 */
function buildCompetencyDocs(): KnowledgeDocument[] {
  const docs: KnowledgeDocument[] = [];

  for (const dim of COMPETENCY_DIMENSIONS) {
    for (const lv of dim.levels) {
      docs.push({
        id: `competency:${dim.name}:L${lv.level}`,
        text: `${dim.name}能力 · ${lv.label}级（L${lv.level}）：${lv.description}。期望行为：${lv.expectedBehaviors.join('；')}。`,
        metadata: {
          source: 'competency',
          kind: 'competency_level',
          dimension: dim.name,
          level: lv.level,
          label: lv.label,
        },
      });
    }
  }

  return docs;
}

/**
 * 岗位画像 → 每个岗位一个块
 */
function buildPositionDocs(): KnowledgeDocument[] {
  return POSITION_PROFILES.map((p) => ({
    id: `position:${p.position}`,
    text: `${p.position}（${p.department}${p.isManagement ? '，管理岗' : ''}）的核心能力要求：${p.keyCompetencies.join('、')}。`,
    metadata: {
      source: 'competency',
      kind: 'position_profile',
      position: p.position,
      department: p.department,
      isManagement: p.isManagement,
    },
  }));
}

/**
 * 评价模板 → 每个培训类型一个块
 */
function buildTemplateDocs(): KnowledgeDocument[] {
  return EVALUATION_TEMPLATES.map((t) => ({
    id: `template:${t.trainingType}`,
    text: `${t.trainingType}类培训的评价重点维度：${t.focusDimensions.join('、')}。参考评语示例：${t.sampleFeedback}`,
    metadata: {
      source: 'template',
      kind: 'evaluation_template',
      trainingType: t.trainingType,
      focusDimensions: t.focusDimensions.join('、'),
    },
  }));
}

/**
 * 样例心得 → 每篇一个块，作为历史参考心得
 */
function buildSampleDocs(): KnowledgeDocument[] {
  return SAMPLE_REFLECTIONS.map((r) => ({
    id: `sample:${r.trainee.employeeId || r.trainee.name}`,
    text: `历史培训心得参考。培训主题：${r.trainingTitle}。心得内容：${r.content}`,
    metadata: {
      source: 'sample',
      kind: 'sample_reflection',
      trainingTitle: r.trainingTitle,
      trainingType: r.trainingType,
      employeeId: r.trainee.employeeId || '',
    },
  }));
}

/**
 * 汇总全部知识库文档
 */
export function buildKnowledgeDocuments(): KnowledgeDocument[] {
  return [
    ...buildCompetencyDocs(),
    ...buildPositionDocs(),
    ...buildTemplateDocs(),
    ...buildSampleDocs(),
  ];
}
