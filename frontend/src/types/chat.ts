// ── 消息类型 ──
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
  payload?: EvaluationResult | BatchProgress | ExceptionInfo | any;
  timestamp: string;
}

// ── 评价结果 ──
export interface TraineeInfo {
  name: string;
  employeeId?: string;
}

export interface DimensionScore {
  name: string;
  label: string;
  score: number;
  weight: number;
  comment: string;
}

export interface EvaluationResult {
  id: string;
  trainee: TraineeInfo;
  trainingTitle: string;
  content: string;
  totalScore: number;
  dimensions: DimensionScore[];
  feedbackSummary: string;
  suggestions: string[];
  toneLevel: 'celebratory' | 'sandwich' | 'gentle_redirect';
  isException: boolean;
  exceptionReason?: string;
  createdAt: string;
}

// ── 批量进度 ──
export interface BatchProgress {
  total: number;
  completed: number;
  currentTrainee?: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
}

// ── 异常信息 ──
export interface ExceptionInfo {
  evaluationId: string;
  traineeName: string;
  score: number;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  suggestedFeedback: string;
}

// ── 心得输入 ──
export interface ReflectionInput {
  trainee: TraineeInfo;
  trainingTitle: string;
  trainingDate?: string;
  content: string;
  trainingType?: string;
}

// ── API 请求/响应 ──
export interface ChatRequest {
  message: string;
  attachments?: ReflectionInput[];
}

export interface EvaluateRequest {
  reflections: ReflectionInput[];
}

export interface ChatResponse {
  messages: ChatMessage[];
}
