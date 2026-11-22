/**
 * 标注样本集 — 用于评估评分 Agent 的准确性
 *
 * 每篇心得都带一组「gold 标签」，由项目自己的评分标尺（SCORE_SYSTEM_PROMPT 里的分数段规则）推导：
 *   - 8~10：复述具体知识点 + 有自己的反思 + 可操作的行动计划 + 结构清晰
 *   - 5~7 ：提到一些培训内容、有简单反思，但缺具体行动或深度不够
 *   - 2~4 ：只有笼统感受，无具体内容、无反思、无行动
 *   - 0~1 ：仅一句话表态
 *
 * 说明：这是开发侧构造的测试基准（benchmark），gold 分数按标尺人工判定，
 * 不是真实 HR 专家标注，也不代表任何真实员工数据。评分维度顺序固定为
 * [内容完整性, 理解深度, 实践结合, 表达结构, 反思深度]，权重与评分 Agent 一致。
 */
import type { DimensionScore } from '../types';

// 维度权重（与 SCORE_SYSTEM_PROMPT 一致）
export const DIMENSION_WEIGHTS: Record<string, number> = {
  content_completeness: 0.3,
  understanding_depth: 0.25,
  practice_integration: 0.25,
  expression_structure: 0.1,
  reflection_depth: 0.1,
};

export const DIMENSION_ORDER: { name: string; label: string }[] = [
  { name: 'content_completeness', label: '内容完整性' },
  { name: 'understanding_depth', label: '理解深度' },
  { name: 'practice_integration', label: '实践结合' },
  { name: 'expression_structure', label: '表达结构' },
  { name: 'reflection_depth', label: '反思深度' },
];

export interface EvalCase {
  id: string;
  trainee: { name: string; employeeId: string };
  trainingTitle: string;
  trainingType: '心得' | '案例分析' | '行动计划' | '学习总结';
  content: string;
  /** gold：五维分数，顺序见 DIMENSION_ORDER */
  goldDims: [number, number, number, number, number];
}

/** 由 gold 五维分加权推导总分（与评分 Agent 的加权口径一致） */
export function deriveTotalScore(goldDims: [number, number, number, number, number]): number {
  const weights = [0.3, 0.25, 0.25, 0.1, 0.1];
  const total = goldDims.reduce((sum, s, i) => sum + s * weights[i], 0);
  return Math.round(total * 10) / 10;
}

/** 档位：优秀 ≥8，良好 6~7.9，一般 4~5.9，需改进 <4 */
export function bandOf(score: number): '优秀' | '良好' | '一般' | '需改进' {
  if (score >= 8) return '优秀';
  if (score >= 6) return '良好';
  if (score >= 4) return '一般';
  return '需改进';
}

/** 异常：总分 < 5（与 shouldFlagException 一致） */
export function isExceptionScore(score: number): boolean {
  return score < 5;
}

/** 生成 gold 维度对象 */
export function toGoldDimensions(goldDims: [number, number, number, number, number]): DimensionScore[] {
  return DIMENSION_ORDER.map((d, i) => ({
    name: d.name,
    label: d.label,
    score: goldDims[i],
    weight: DIMENSION_WEIGHTS[d.name],
    comment: '',
  }));
}

// ── 样本集 ──────────────────────────────────────────────────

export const EVAL_CASES: EvalCase[] = [
  // ── 优秀（≥8）：知识点 + 反思 + 行动 + 结构 ──
  {
    id: 'case-01',
    trainee: { name: '测试员A', employeeId: 'E001' },
    trainingTitle: '高效沟通技巧',
    trainingType: '心得',
    content: `通过本次高效沟通培训，我系统学习了沟通的基本模型，第一次意识到信息从发送者到接收者之间会经历编码、传递、解码三个环节，任何一环失真都会造成误解。\n\n实践环节让我印象最深的是"积极倾听"三步法。反思自己过去和客户沟通，我经常在对方还没说完时就急着给方案，这正是信息失真的一种表现。\n\n行动计划：\n1. 下周起每天至少完整练习一次"先听完、再复述确认、后回应"\n2. 用"我信息"句式（我看到/我感到/我需要）记录一次真实沟通\n3. 一个月后复盘，对比打断次数是否下降`,
    goldDims: [9, 8, 9, 8, 8],
  },
  {
    id: 'case-02',
    trainee: { name: '测试员B', employeeId: 'E002' },
    trainingTitle: '项目管理实战',
    trainingType: '心得',
    content: `这次项目管理培训最大的收获是 WBS（工作分解结构）。以前我接到任务习惯直接上手，结果总是遗漏关键环节；现在理解了要把交付物逐层拆到"最小可交付单元"，做到 100% 覆盖不重叠。\n\n老师讲的项目生命周期（启动→规划→执行→监控→收尾）帮我建立了全局视角。坦白讲，挣值管理（EVM）部分我还没完全吃透，计划再找资料补。\n\n计划：下个校招项目就用 WBS 拆解，并尝试用甘特图跟踪关键里程碑，每周对照计划检视偏差。`,
    goldDims: [8, 9, 9, 7, 8],
  },
  {
    id: 'case-03',
    trainee: { name: '测试员C', employeeId: 'E003' },
    trainingTitle: '领导力发展',
    trainingType: '心得',
    content: `这次领导力培训让我真正分清了"管理"和"领导"：管理是把事情做对，领导是做对的事情。\n\n作为技术出身的管理者，我过去习惯盯技术细节，忽略了团队成员的成长需求。"情境领导"模型点醒了我——要根据下属的成熟度调整领导风格，而不是一刀切。\n\n反思：我之前对新人也是用对老员工的方式，导致新人不敢提问。行动计划：从下周起每周和每位成员做一次一对一沟通，只聊成长目标不聊进度，并记录每个人的情境领导象限。`,
    goldDims: [8, 8, 8, 8, 9],
  },
  {
    id: 'case-04',
    trainee: { name: '测试员D', employeeId: 'E004' },
    trainingTitle: '跨部门协作',
    trainingType: '心得',
    content: `跨部门协作培训让我看清了财务部门的一个盲区：我们习惯用财务术语和兄弟部门沟通，却默认对方听得懂，这本身就是协作的壁垒。\n\n培训里的"同理心地图"工具非常实用，我在和市场部讨论预算时试了一次——先站在对方视角列出"他们想什么、担心什么、需要什么"，再开口。效果立竿见影，对方第一次说"终于听懂财务在说什么了"。\n\n反思：协作的本质不是让别人适应我们，而是找到双方都能理解的语言。计划：梳理财务高频术语做一份"白话对照表"，并每季度主动约一个兄弟部门做非正式交流。`,
    goldDims: [9, 8, 9, 7, 9],
  },
  {
    id: 'case-05',
    trainee: { name: '测试员E', employeeId: 'E005' },
    trainingTitle: '时间管理',
    trainingType: '行动计划',
    content: `时间管理培训里最触动我的是"四象限法则"——把任务按重要/紧急分成四类，而我过去 80% 的时间都耗在了"紧急不重要"的事务上。\n\n反思：我每天看起来忙，其实是在用战术上的勤奋掩盖战略上的懒惰，很少停下来想什么才是真正重要的。\n\n行动计划：\n1. 每天早会前用 10 分钟把当天任务归类到四象限\n2. 优先处理"重要不紧急"，每天至少留 1 小时给它\n3. 每周五复盘：统计各类任务耗时占比，连续四周观察变化`,
    goldDims: [8, 8, 9, 8, 7],
  },

  // ── 良好（6~7.9）：有内容有反思，缺行动或深度 ──
  {
    id: 'case-06',
    trainee: { name: '测试员F', employeeId: 'E006' },
    trainingTitle: '数据分析基础',
    trainingType: '心得',
    content: `数据分析培训讲了数据的采集、清洗、分析、可视化四个环节，让我对数据分析的全流程有了概念。讲师演示了几个常用的分析方法，比如对比分析、趋势分析。\n\n我觉得数据分析确实很重要，能帮我们做更客观的决策。希望以后能在工作中多用数据说话，少拍脑袋。`,
    goldDims: [7, 6, 6, 6, 6],
  },
  {
    id: 'case-07',
    trainee: { name: '测试员G', employeeId: 'E007' },
    trainingTitle: '情绪管理',
    trainingType: '心得',
    content: `情绪管理培训讲了情绪 ABC 理论，让我知道不是事情本身、而是我们对事情的看法引发了情绪。这个观点挺颠覆我之前的认知。\n\n回想起来，我确实经常因为同事的一句话就情绪上头，其实换个角度看就没那么严重了。以后遇到冲突先让自己冷静一下。`,
    goldDims: [6, 7, 6, 6, 6],
  },
  {
    id: 'case-08',
    trainee: { name: '测试员H', employeeId: 'E008' },
    trainingTitle: '创新思维',
    trainingType: '心得',
    content: `创新思维培训介绍了头脑风暴、六顶思考帽、SCAMPER 等几个方法。老师讲得很生动，案例也很有意思。\n\n我觉得创新就是打破常规、多想一步。这些方法以后应该能用得上。`,
    goldDims: [7, 6, 5, 6, 6],
  },
  {
    id: 'case-09',
    trainee: { name: '测试员I', employeeId: 'E009' },
    trainingTitle: '团队协作',
    trainingType: '心得',
    content: `团队协作培训让我认识到团队沟通和信任很重要。老师讲了高效团队的特征，还带我们做了几个协作小游戏。\n\n我感受到一个团队如果大家都能坦诚沟通，效率会高很多。以后我会多和同事沟通，遇到问题及时同步。`,
    goldDims: [6, 6, 7, 5, 6],
  },
  {
    id: 'case-10',
    trainee: { name: '测试员J', employeeId: 'E010' },
    trainingTitle: '目标管理',
    trainingType: '学习总结',
    content: `目标管理培训主要讲了 SMART 原则：目标要具体、可衡量、可达成、相关、有时限。\n\n回顾我之前的年度目标，确实定得太空泛，比如"提升能力"这种就没法衡量。以后定目标会尽量用 SMART 来检查。`,
    goldDims: [6, 6, 6, 6, 6],
  },
  {
    id: 'case-11',
    trainee: { name: '测试员K', employeeId: 'E011' },
    trainingTitle: '沟通技巧',
    trainingType: '心得',
    content: `这次沟通技巧培训内容挺丰富的，从倾听、表达、提问到反馈都有涉及。讲师用几个案例串起了整个课程，结构很清晰，听起来不累。\n\n我最大的感受是要多听少说，先理解别人再表达自己。`,
    goldDims: [7, 6, 6, 8, 6],
  },

  // ── 一般（4~5.9）：边缘，缺实质内容 ──
  {
    id: 'case-12',
    trainee: { name: '测试员L', employeeId: 'E012' },
    trainingTitle: '项目管理',
    trainingType: '心得',
    content: `参加了项目管理培训，老师讲了一些项目管理的知识和方法。感觉项目管理挺复杂的，涉及的东西很多。\n\n以后做项目的时候可以试试老师讲的方法。`,
    goldDims: [5, 5, 6, 5, 5],
  },
  {
    id: 'case-13',
    trainee: { name: '测试员M', employeeId: 'E013' },
    trainingTitle: '领导力',
    trainingType: '心得',
    content: `领导力培训让我对领导力有了新的认识。领导要带好团队，要有担当，要会用人。\n\n我觉得自己在这方面还有不少要学的。`,
    goldDims: [5, 5, 5, 6, 5],
  },
  {
    id: 'case-14',
    trainee: { name: '测试员N', employeeId: 'E014' },
    trainingTitle: '时间管理',
    trainingType: '心得',
    content: `时间管理培训讲了一些提高效率的方法，比如做计划、列清单。感觉有道理，但真正做到不容易。\n\n我会尝试把工作列个清单，看看能不能更高效。`,
    goldDims: [6, 5, 5, 5, 4],
  },

  // ── 需改进（4~4.9）：只有笼统感受 ──
  {
    id: 'case-15',
    trainee: { name: '测试员O', employeeId: 'E015' },
    trainingTitle: '数据分析',
    trainingType: '心得',
    content: `培训内容挺多的，有些没完全听懂。感觉数据分析挺重要的，但是实际操作起来有点难。\n\n希望以后能多练习，把数据分析学好。`,
    goldDims: [5, 4, 4, 5, 4],
  },
  {
    id: 'case-16',
    trainee: { name: '测试员P', employeeId: 'E016' },
    trainingTitle: '跨部门协作',
    trainingType: '心得',
    content: `跨部门协作培训让我知道部门之间要互相理解、多沟通。大家都不容易，多一点理解会更好。\n\n以后遇到跨部门的事，我会多站在对方角度想想。`,
    goldDims: [5, 4, 4, 4, 4],
  },
  {
    id: 'case-17',
    trainee: { name: '测试员Q', employeeId: 'E017' },
    trainingTitle: '情绪管理',
    trainingType: '心得',
    content: `情绪管理培训挺好的，老师讲了很多关于情绪的知识。我觉得管理好情绪对工作有帮助，不容易和别人起冲突。\n\n以后遇到不顺心的事，尽量不发脾气。`,
    goldDims: [4, 5, 5, 4, 5],
  },

  // ── 需改进（<4）：敷衍 ──
  {
    id: 'case-18',
    trainee: { name: '测试员R', employeeId: 'E018' },
    trainingTitle: '沟通技巧',
    trainingType: '心得',
    content: `这次培训很有意义，我会努力的。`,
    goldDims: [1, 1, 1, 1, 1],
  },
  {
    id: 'case-19',
    trainee: { name: '测试员S', employeeId: 'E019' },
    trainingTitle: '项目管理',
    trainingType: '心得',
    content: `培训很重要，谢谢老师。`,
    goldDims: [1, 0, 0, 1, 0],
  },
  {
    id: 'case-20',
    trainee: { name: '测试员T', employeeId: 'E020' },
    trainingTitle: '领导力',
    trainingType: '心得',
    content: `很好。`,
    goldDims: [0, 0, 0, 0, 0],
  },
];
