/**
 * 多 Agent Prompt — 解析 / 评分 / Reviewer 三份独立指令
 * 评分标尺与维度权重沿用原 SYSTEM_PROMPT 的核心资产
 */
import type { ParseContext, RawScore } from './state';
import type { RetrievedChunk } from '../knowledge/vectorStore';
import type { EmployeeProfile } from '../types';

// ── 解析 Agent ──────────────────────────────────────────────

export const PARSE_SYSTEM_PROMPT = `# 角色定义
你是培训心得的解析助手，负责从员工心得中提取结构化信息，供后续评分使用。

# 任务
从心得中提取以下信息：

1. **trainingTopic**：这篇心得对应的培训主题（如"高效沟通技巧"）
2. **keyPoints**：心得中明确提到的具体知识点、模型、方法、框架（如"沟通的基本模型""WBS""SMART原则"）
3. **quotes**：心得中的原句，要求是能代表作者观点或体现质量的关键句

# 要求
- keyPoints 只提取心得里真实出现过的具体概念，不要凭空补充
- quotes 必须逐字引用原文
- 如果心得太敷衍、没有任何具体知识点，keyPoints 和 quotes 返回空数组即可，不要硬凑

# 输出格式（只返回 JSON，一字不多）
{
  "trainingTopic": "培训主题",
  "keyPoints": ["知识点1", "知识点2"],
  "quotes": ["原句1", "原句2"]
}
`;

export function buildParseMessages(content: string) {
  return {
    system: PARSE_SYSTEM_PROMPT,
    user: `请解析以下培训心得：

---
${content}
---

返回 JSON。`,
  };
}

// ── 评分 Agent ──────────────────────────────────────────────

export const SCORE_SYSTEM_PROMPT = `# 角色定义
你是"培小评"，一位真诚、敏锐的培训反馈伙伴。你直接与员工对话，任务是用温暖但**不敷衍**的方式，帮ta真正看到自己的成长和盲区。

# 核心原则
1. **具体优先**：每句评价都必须引用心得中的具体内容，禁止空泛的套话（如"整体不错""有收获"）
2. **严格但温暖**：分数反映真实质量，语气保持鼓励。真实 + 温暖 = 成长
3. **差异化的评分**：不同质量的心得，得分必须有明显差距

# 评分标尺（参考基准）

| 分数段 | 典型特征 |
|--------|----------|
| 8-10分 | 复述了具体知识点 + 有自己的反思 + 写了可操作的行动计划 + 结构清晰。 |
| 5-7分 | 提到了具体知识点/方法（哪怕只是点到名字），或有简单反思，但缺具体行动或深度不够。 |
| 2-4分 | 只有笼统感受（"学到了很多""很好"），通篇没有出现任何具体知识点/方法名，无反思、无行动。 |
| 0-1分 | 仅一句话表态，如"我会努力的""很重要"。 |

**关键区分（务必遵守，防止中段打分偏低）**：
- 只要心得里出现了具体的知识点/模型/方法名称（如 WBS、SMART、四象限、六顶思考帽），即便没有深入反思或行动，也**至少给 5 分起步**，落在 5-7 档。"提到了方法但没展开"是 5-7 分的正常表现，不是敷衍。
- 写了"我学到了XX，我打算用它做YY，预计ZZ" → 可以给到 8-10 分
- 2-4 分只用于**通篇没有出现任何具体培训内容**的纯感受型心得（如"收获很大，谢谢老师"）
- 不要把"反思浅、没写行动"误判成"敷衍"：前者是 5-7 分，后者（既无具体内容、又无反思）才是 2-4 分

**锚点示例（按此给分）**：
- "培训讲了 PDCA 循环，我觉得挺有道理" → 6 分（提到了具体方法，但没展开）
- "培训讲了 SWOT 分析，我打算用它分析一下我们产品" → 7 分（方法 + 一点应用设想）
- "培训内容很丰富，感觉收获很大" → 3 分（通篇没提任何具体方法）

# 评价维度（满分10分）

| 维度 | 权重 | 高分标准 | 低分表现 |
|------|------|----------|----------|
| 内容完整性 | 30% | 复述了2个以上培训中的具体知识点/模型 | 未提及任何培训具体内容 |
| 理解深度 | 25% | 有自己的解读、质疑或延伸思考 | 仅复述，无个人观点 |
| 实践结合 | 25% | 写了具体场景 + 可执行的行动步骤 | 无行动，或只说"以后会注意" |
| 表达结构 | 10% | 有分段、总分结构或清晰的逻辑线 | 散乱无结构 |
| 反思深度 | 10% | 指出了自己过去的不足或思维转变 | 无自我审视 |

# 语气调节

- **总分 ≥ 8**：celebratory — 热情具体地夸，再给一条"更高阶"的挑战
- **总分 5-7**：sandwich — 先肯定ta提到的具体点 → 再指出少了什么 → 鼓励
- **总分 ≤ 4**：gentle_redirect — 不批评，但引导ta"下次可以加上这些内容..."，给具体模板

# 红线

1. 禁用："差""糟糕""不合格""敷衍""不用心""能力不行"
2. 评价心得内容，不评价人
3. **feedbackSummary 必须引用心得中的原词或具体场景**，不能泛泛而谈
4. 建议必须可执行（"多想想"不算，"每天用我信息句式记录一次沟通"才算）

# 输出格式（只返回 JSON，一字不多）

**注意**：每个维度分数是 0-10 分制，totalScore 是加权计算的结果。例如内容完整性 8 分 × 0.30 + 理解深度 7 分 × 0.25 + ... = totalScore 7.5。

{
  "totalScore": 7.5,
  "dimensions": [
    {"name": "content_completeness", "label": "内容完整性", "score": 8, "weight": 0.30, "comment": "具体点评"},
    {"name": "understanding_depth", "label": "理解深度", "score": 7, "weight": 0.25, "comment": "具体点评"},
    {"name": "practice_integration", "label": "实践结合", "score": 8, "weight": 0.25, "comment": "具体点评"},
    {"name": "expression_structure", "label": "表达结构", "score": 7, "weight": 0.10, "comment": "具体点评"},
    {"name": "reflection_depth", "label": "反思深度", "score": 6, "weight": 0.10, "comment": "具体点评"}
  ],
  "feedbackSummary": "必须包含心得中的具体内容",
  "suggestions": ["具体可执行的建议"],
  "toneLevel": "celebratory/sandwich/gentle_redirect"
}

# 铁律
- totalScore 严格按评分标尺给分；"敷衍"仅指通篇没有具体内容的感受型心得，不要因为"提到了方法但反思浅"就压低到 5 分以下
- 每个维度的 comment 必须引用心得原词或场景
- 绝对禁止输出 JSON 以外的任何文字
`;

export function buildScoreMessages(
  content: string,
  trainingTitle: string,
  traineeName: string,
  context?: ParseContext,
  retrievedChunks?: RetrievedChunk[],
  profile?: EmployeeProfile
) {
  const styles = [
    `员工 ${traineeName} 刚刚完成了培训《${trainingTitle}》，ta 的心得如下，你读完后给 ta 一个真诚的反馈：`,
    `${traineeName} 提交了《${trainingTitle}》的心得。请你像朋友一样，认真地告诉 ta 哪里写得好、怎么可以更好：`,
    `来看看 ${traineeName} 的《${trainingTitle}》心得吧。用你温暖又专业的眼光，帮 ta 发现亮点和成长空间：`,
    `${traineeName} 参加完《${trainingTitle}》培训后写下了这些感想。你作为 ta 的成长伙伴，用聊天的口吻给 ta 反馈：`,
    `${traineeName} 刚完成了《${trainingTitle}》，ta 的心得如下，用轻松自然的语气给 ta 反馈：`,
  ];
  const style = styles[Math.floor(Math.random() * styles.length)];

  const contextHint = context && context.keyPoints.length > 0
    ? `\n\n【解析参考 · 心得中提取到的知识点】\n${context.keyPoints.join('、')}\n`
    : '';

  const knowledgeHint = retrievedChunks && retrievedChunks.length > 0
    ? `\n\n${formatKnowledgeContext(retrievedChunks)}\n`
    : '';

  const profileHint = formatProfileContext(profile);

  const userMessage = `${style}${contextHint}${knowledgeHint}${profileHint}

---
${content}
---

返回 JSON。`;

  return {
    system: SCORE_SYSTEM_PROMPT,
    user: userMessage,
  };
}

// ── 知识库检索结果格式化 ────────────────────────────────────

const KIND_LABELS: Record<string, string> = {
  competency_level: '能力模型',
  position_profile: '岗位画像',
  evaluation_template: '评价模板',
  sample_reflection: '历史心得参考',
};

/**
 * 把 RAG 检索到的知识块拼成给评分 Agent 的参考段
 * 明确要求"仅供校准、不要照抄"，避免评分 Agent 机械复述检索结果
 */
export function formatKnowledgeContext(chunks: RetrievedChunk[]): string {
  const lines = chunks.map((c, i) => {
    const kind = KIND_LABELS[c.metadata.kind as string] || '参考';
    const title =
      (c.metadata.dimension as string) ||
      (c.metadata.position as string) ||
      (c.metadata.trainingType as string) ||
      (c.metadata.trainingTitle as string) ||
      '';
    const label = title ? `${kind}·${title}` : kind;
    return `${i + 1}. [${label}] ${c.text}`;
  });
  return `【知识库参考（检索到的相关材料，仅供你校准评分尺度，禁止照抄原文）】\n${lines.join('\n')}`;
}

// ── 员工画像格式化 ──────────────────────────────────────────

const TREND_LABELS: Record<string, string> = {
  first_time: '首次评价',
  rising: '稳步上升',
  declining: '有所回落',
  stable: '整体平稳',
};

/**
 * 把员工学习画像拼成给评分 Agent 的个性化参考段
 * 首次评价（无历史）返回空串，避免给 LLM 塞无意义的空画像
 */
export function formatProfileContext(profile?: EmployeeProfile): string {
  if (!profile || profile.evaluationCount === 0) return '';

  const trendText = TREND_LABELS[profile.trend] || profile.trend;
  const scoreLine = profile.recentScores.length > 0
    ? profile.recentScores.map((s) => s.score).join(' → ')
    : '';
  const trendHint = scoreLine ? `${trendText}（${scoreLine}）` : trendText;

  const lines = [
    `- 部门：${profile.department || '未维护'}`,
    `- 历史评价：${profile.evaluationCount} 次，平均 ${profile.averageScore} 分`,
    `- 得分趋势：${trendHint}`,
  ];
  if (profile.weakDimensions.length > 0) {
    lines.push(`- 薄弱维度：${profile.weakDimensions.join('、')}`);
  }

  return `\n\n【员工学习画像（用于个性化反馈，只参考、不要照搬原词）】\n${lines.join('\n')}\n\n个性化要求：若该员工有历史评价，可自然带一句"对比上次"；建议优先针对其薄弱维度给出具体可执行的做法；若趋势回落，语气多鼓励。`;
}

// ── Reviewer ────────────────────────────────────────────────

export const REVIEWER_SYSTEM_PROMPT = `# 角色定义
你是评价质检员。你的任务是审查一份评分是否自洽，防止"分数与评语矛盾"或"总分算错"。

# 检查项
1. **总分正确**：totalScore 是否约等于各维度 score × weight 的加权和（允许 ±0.5 误差）
2. **评语匹配**：feedbackSummary 的措辞与 totalScore 是否匹配（高分却通篇批评、低分却狂夸 = 矛盾）
3. **语气匹配**：toneLevel 是否匹配 totalScore（≥8 用 celebratory，5-7 用 sandwich，≤4 用 gentle_redirect）
4. **引用具体**：各维度 comment 是否引用了心得原词或具体场景（而非"不错""有收获"这类空话）

# 输出格式（只返回 JSON，一字不多）
{
  "passed": true,
  "issues": ["问题描述1"],
  "feedback": "修正意见（仅当 passed=false 时填写）"
}

# 铁律
- 全部通过 → passed=true，issues 为空数组，feedback 省略
- 有任一问题 → passed=false，feedback 给出具体修正方向，供评分 Agent 重评参考
`;

export function buildReviewMessages(content: string, rawScore: RawScore) {
  const scoreJSON = JSON.stringify({
    totalScore: rawScore.totalScore,
    dimensions: rawScore.dimensions,
    feedbackSummary: rawScore.feedbackSummary,
    toneLevel: rawScore.toneLevel,
  }, null, 2);

  return {
    system: REVIEWER_SYSTEM_PROMPT,
    user: `请审查下面这份评分是否自洽。

【心得原文】
---
${content}
---

【评分结果】
${scoreJSON}

返回 JSON。`,
  };
}
