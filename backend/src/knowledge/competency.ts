/**
 * 岗位能力素质模型
 * 模拟数据 — 实际使用时可由 HR 配置或对接公司系统
 */

export interface CompetencyDimension {
  name: string;
  description: string;
  levels: {
    level: number;
    label: string;
    description: string;
    expectedBehaviors: string[];
  }[];
}

export interface PositionProfile {
  position: string;
  department: string;
  isManagement: boolean;
  keyCompetencies: string[];
}

/**
 * 通用能力素质维度
 */
export const COMPETENCY_DIMENSIONS: CompetencyDimension[] = [
  {
    name: '逻辑思维',
    description: '分析和解决问题的能力，结构化思考',
    levels: [
      {
        level: 1,
        label: '基础',
        description: '能按照既定框架进行分析',
        expectedBehaviors: ['能识别问题的基本要素', '能按模板整理信息'],
      },
      {
        level: 3,
        label: '熟练',
        description: '能独立进行多维度分析',
        expectedBehaviors: ['能从多个角度看问题', '能提出数据支撑的结论'],
      },
      {
        level: 5,
        label: '专家',
        description: '能构建新的分析框架',
        expectedBehaviors: ['能创新性地拆解复杂问题', '能指导他人建立分析框架'],
      },
    ],
  },
  {
    name: '沟通表达',
    description: '清晰、结构化地表达观点',
    levels: [
      {
        level: 1,
        label: '基础',
        description: '能表达清楚基本观点',
        expectedBehaviors: ['观点基本清晰', '能用简单结构组织语言'],
      },
      {
        level: 3,
        label: '熟练',
        description: '能结构化地传递复杂信息',
        expectedBehaviors: ['逻辑清晰、层次分明', '能根据受众调整表达方式'],
      },
      {
        level: 5,
        label: '专家',
        description: '能通过表达影响和激励他人',
        expectedBehaviors: ['表达有感染力和说服力', '能驾驭高难度沟通场景'],
      },
    ],
  },
  {
    name: '学习转化',
    description: '将培训所学应用到实际工作的能力',
    levels: [
      {
        level: 1,
        label: '基础',
        description: '能复述培训要点',
        expectedBehaviors: ['能准确复述培训内容', '知道理论上的应用场景'],
      },
      {
        level: 3,
        label: '熟练',
        description: '能制定具体行动计划',
        expectedBehaviors: ['能结合岗位制定可执行的行动计划', '能在工作中尝试新方法'],
      },
      {
        level: 5,
        label: '专家',
        description: '能将学习成果转化为团队能力',
        expectedBehaviors: ['能总结方法论并分享给团队', '能推动组织层面的改进'],
      },
    ],
  },
];

/**
 * 典型岗位画像
 */
export const POSITION_PROFILES: PositionProfile[] = [
  {
    position: '销售经理',
    department: '销售部',
    isManagement: true,
    keyCompetencies: ['逻辑思维', '沟通表达', '学习转化'],
  },
  {
    position: '技术主管',
    department: '技术部',
    isManagement: true,
    keyCompetencies: ['逻辑思维', '学习转化'],
  },
  {
    position: 'HR专员',
    department: '人力资源部',
    isManagement: false,
    keyCompetencies: ['沟通表达', '学习转化'],
  },
  {
    position: '市场专员',
    department: '市场部',
    isManagement: false,
    keyCompetencies: ['逻辑思维', '沟通表达'],
  },
];

/**
 * 根据岗位查找能力画像
 */
export function findPositionProfile(position: string): PositionProfile | undefined {
  return POSITION_PROFILES.find(
    (p) => p.position === position
  );
}
