import type { ReflectionInput } from '../types';

/**
 * 模拟培训心得数据 — 用于演示和测试
 */
export const SAMPLE_REFLECTIONS: ReflectionInput[] = [
  {
    trainee: {
      name: '张伟',
      department: '销售部',
      position: '销售代表',
      isManagement: false,
      employeeId: 'S001',
    },
    trainingTitle: '高效沟通技巧',
    trainingDate: '2026-06-10',
    content: `通过本次高效沟通培训，我收获很大。讲师从沟通的基本模型讲起，让我明白了发送者和接收者之间可能存在的信息失真问题。

在实践环节，我们分组练习了"积极倾听"的技巧，我发现自己以前在与客户沟通时经常打断对方，这会严重影响信任建立。今后我会刻意练习"先听完、再确认、后回应"的三步法。

行动计划：
1. 下周开始，每天至少练习一次完整倾听
2. 在周会上分享本次培训的核心技巧给团队
3. 一个月后回顾自己的改善情况`,
    trainingType: '心得',
  },
  {
    trainee: {
      name: '李芳',
      department: '人力资源部',
      position: 'HR专员',
      isManagement: false,
      employeeId: 'H002',
    },
    trainingTitle: '项目管理实战',
    trainingDate: '2026-06-11',
    content: `参加了项目管理实战培训，收获颇丰。老师讲的项目生命周期（启动→规划→执行→监控→收尾）让我对项目管理有了系统的认识。

印象最深的是WBS工作分解结构，以前我做招聘项目时总是遗漏一些环节，现在知道可以用WBS把工作拆解到最小的可交付单元。

不过坦白说，有些内容比如挣值管理我还不太理解，需要再花时间消化。

计划：
- 在下次校招项目中应用WBS
- 学习EVM相关补充资料`,
    trainingType: '心得',
  },
  {
    trainee: {
      name: '王建国',
      department: '技术部',
      position: '技术总监',
      isManagement: true,
      employeeId: 'T003',
    },
    trainingTitle: '领导力发展',
    trainingDate: '2026-06-09',
    content: `这次领导力培训让我对"管理"和"领导"的区别有了更深的体会。管理是把事情做对，领导是做对的事情。

作为一个技术出身的管理者，我发现自己过于关注技术细节而忽略了团队成员的成长需求。培训中的"情境领导"模型让我意识到需要根据下属的不同发展阶段调整领导风格。

我计划从下周开始，每周与团队成员进行一次一对一沟通，关注他们的职业发展目标而不仅仅是项目进度。`,
    trainingType: '心得',
  },
  {
    trainee: {
      name: '陈小明',
      department: '市场部',
      position: '市场专员',
      isManagement: false,
      employeeId: 'M004',
    },
    trainingTitle: '数据分析基础',
    trainingDate: '2026-06-12',
    content: `培训内容比较多，有些没完全听懂。感觉数据分析挺重要的，但是实际操作起来有点难。希望以后能多练习。`,
    trainingType: '心得',
  },
  {
    trainee: {
      name: '赵雪梅',
      department: '财务部',
      position: '财务经理',
      isManagement: true,
      employeeId: 'F005',
    },
    trainingTitle: '跨部门协作',
    trainingDate: '2026-06-10',
    content: `跨部门协作培训让我意识到财务部门在与其他部门沟通时存在很多信息壁垒。我们习惯于用财务术语说话，却忽略了其他部门的同事可能不理解这些专业概念。

培训中的"同理心地图"工具非常实用，我在与市场部讨论预算时尝试使用，效果立竿见影——对方第一次说"终于听懂财务在说什么了"。

这让我反思：协作的本质不是让别人适应我们，而是找到双方都能理解的表达方式。

下一步计划：
1. 梳理财务部高频使用的专业术语，制作"白话版"对照表
2. 每个季度主动约一个兄弟部门做非正式交流
3. 在公司内部分享这次培训的收获`,
    trainingType: '心得',
  },
];
