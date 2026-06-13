/**
 * 培训评价模板库
 * 用于为不同类型的培训提供评价侧重点参考
 */

export interface EvaluationTemplate {
  trainingType: string;
  keywords: string[];
  focusDimensions: string[];
  sampleFeedback: string;
}

export const EVALUATION_TEMPLATES: EvaluationTemplate[] = [
  {
    trainingType: '心得',
    keywords: ['感受', '收获', '启发', '体会', '认识'],
    focusDimensions: ['理解深度', '反思深度', '内容完整性'],
    sampleFeedback: '你对培训内容的理解比较到位，特别对XXX模块有独到见解。建议在实践应用方面进一步思考，将所学与具体工作场景结合。',
  },
  {
    trainingType: '案例分析',
    keywords: ['案例', '分析', '问题', '方案', '解决'],
    focusDimensions: ['实践结合', '内容完整性', '理解深度'],
    sampleFeedback: '你的案例分析逻辑清晰，对问题的拆解和归因分析得当。建议引入更多量化指标来验证方案的有效性。',
  },
  {
    trainingType: '行动计划',
    keywords: ['计划', '行动', '目标', '步骤', '执行', '时间'],
    focusDimensions: ['实践结合', '表达结构', '内容完整性'],
    sampleFeedback: '行动计划详实具体，SMART原则运用得当。建议增加风险预案和关键里程碑的检查标准。',
  },
  {
    trainingType: '学习总结',
    keywords: ['总结', '回顾', '关键', '要点', '框架'],
    focusDimensions: ['内容完整性', '表达结构', '理解深度'],
    sampleFeedback: '总结全面，对培训的知识体系梳理清晰。建议在每个模块下补充个人应用设想。',
  },
];

/**
 * 根据培训类型匹配评价模板
 */
export function matchTemplate(trainingType: string): EvaluationTemplate | undefined {
  return EVALUATION_TEMPLATES.find(
    (t) => t.trainingType === trainingType
  );
}

/**
 * 获取所有模板的类型列表
 */
export function getTemplateTypes(): string[] {
  return EVALUATION_TEMPLATES.map((t) => t.trainingType);
}
