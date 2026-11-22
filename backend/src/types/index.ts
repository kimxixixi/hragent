import { z } from 'zod';

// ── 心得输入 ──
export const TraineeInfoSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  employeeId: z.string().optional(),
});

export const ReflectionInputSchema = z.object({
  trainee: TraineeInfoSchema,
  trainingTitle: z.string().min(1, '培训主题不能为空'),
  trainingDate: z.string().optional(),
  content: z.string().min(10, '心得内容至少10个字'),
  trainingType: z.enum(['心得', '案例分析', '行动计划', '学习总结']).default('心得'),
});

export type TraineeInfo = z.infer<typeof TraineeInfoSchema>;
export type ReflectionInput = z.infer<typeof ReflectionInputSchema>;

// ── 语气级别 ──
export type ToneLevel = 'celebratory' | 'sandwich' | 'gentle_redirect';

// ── 评价维度 ──
export interface DimensionScore {
  name: string;
  label: string;
  score: number;       // 0-10
  weight: number;      // 0-1
  comment: string;
}

export interface EvaluationResult {
  id: string;
  trainee: TraineeInfo;
  trainingTitle: string;
  content: string;
  totalScore: number;          // 0-10 加权总分
  dimensions: DimensionScore[];
  feedbackSummary: string;     // 评价总结
  suggestions: string[];       // 改进建议
  toneLevel: 'celebratory' | 'sandwich' | 'gentle_redirect';
  isException: boolean;        // 是否需要人工复核
  exceptionReason?: string;    // 异常原因
  createdAt: string;
}

// ── 对话消息 ──
export type MessageType =
  | 'text'
  | 'evaluation_card'
  | 'exception_card'
  | 'progress'
  | 'system'
  | 'batch_summary';

export interface ChatMessage {
  id: string;
  type: MessageType;
  role: 'user' | 'agent' | 'system';
  content: string;
  payload?: EvaluationResult | EvaluationResult[] | BatchProgress | ExceptionInfo;
  timestamp: string;
}

export interface BatchProgress {
  total: number;
  completed: number;
  currentTrainee?: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
}

export interface ExceptionInfo {
  evaluationId: string;
  traineeName: string;
  score: number;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  suggestedFeedback: string;
}

// ── API 请求/响应 ──
export interface ChatRequest {
  message: string;
  attachments?: ReflectionInput[];
}

export interface EvaluateRequest {
  reflections: ReflectionInput[];
}

export interface ExceptionUpdateRequest {
  evaluationId: string;
  action: 'approve' | 'modify' | 'dismiss';
  modifiedFeedback?: string;
}

// ── 数据库行类型 ──
export interface EvaluationRow {
  id: string;
  trainee_name: string;
  employee_id: string;
  training_title: string;
  content: string;
  total_score: number;
  dimensions_json: string;
  feedback_summary: string;
  suggestions_json: string;
  tone_level: string;
  is_exception: number;
  exception_reason: string | null;
  exception_status: string | null;
  created_at: string;
}

// ── 员工学习画像 ──
export type ScoreTrend = 'first_time' | 'rising' | 'declining' | 'stable';

export interface DimensionAverage {
  name: string;   // 维度内部名（content_completeness 等）
  label: string;  // 维度标签（内容完整性 等）
  avg: number;    // 历史均分
}

export interface EmployeeProfile {
  employeeId: string;
  name: string;
  department: string;
  evaluationCount: number;
  averageScore: number;
  trend: ScoreTrend;
  weakDimensions: string[];          // 薄弱维度标签（历史均分 < 6）
  dimensionAverages: DimensionAverage[];
  recentScores: { title: string; score: number; date: string }[];
}
