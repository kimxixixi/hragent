import { v4 as uuidv4 } from './uuid';
import { buildEvaluationMessages } from './prompt';
import { determineToneLevel, shouldFlagException } from './toneEngine';
import { safetyCheck, sanitizeFeedback } from './safetyFilter';
import { notifyHRException } from '../services/notify';
import type { ReflectionInput, EvaluationResult, DimensionScore } from '../types';

/**
 * OpenAI 兼容 API 调用
 * 支持千问 / DeepSeek / GPT / 等所有 OpenAI 兼容接口
 *
 * .env 配置:
 *   LLM_API_KEY   — API Key
 *   LLM_MODEL     — 模型名 (qwen-max / deepseek-chat / gpt-4o 等)
 *   LLM_BASE_URL  — API 地址 (默认阿里云 DashScope)
 */
async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error('未配置 LLM_API_KEY，请在 .env 中设置');
  }

  const model = process.env.LLM_MODEL || 'qwen-max';
  const baseUrl = process.env.LLM_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.8,
      seed: Math.floor(Math.random() * 100000),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM API 调用失败 (${response.status}): ${err}`);
  }

  const data = await response.json() as any;
  return data.choices[0].message.content;
}

/**
 * 从 Claude 响应中提取 JSON
 */
function extractJSON(text: string): any {
  // 尝试直接解析
  try {
    return JSON.parse(text);
  } catch {
    // 尝试从 markdown code block 中提取
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // 尝试找到第一个 { 和最后一个 }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error(`无法从响应中提取 JSON: ${text.slice(0, 200)}...`);
  }
}

/**
 * 对单篇心得进行评价
 */
export async function evaluateReflection(
  input: ReflectionInput
): Promise<EvaluationResult> {
  const { trainee, trainingTitle, content } = input;

  // 1. 构建 prompt
  const { system, user } = buildEvaluationMessages(
    content,
    trainingTitle,
    trainee.name
  );

  // 2. 调用 LLM API
  let rawResponse = await callLLM(system, user);

  // 3. 解析结果（解析失败时重试一次，追加 JSON 强制指令）
  let parsed: any;
  try {
    parsed = extractJSON(rawResponse);
  } catch {
    console.warn('首次 JSON 解析失败，重试中...');
    const retryUser = user + '\n\n【重要提醒】请只返回 JSON，不要输出任何其他文字。';
    rawResponse = await callLLM(system, retryUser);
    parsed = extractJSON(rawResponse);
  }

  // 4. 应用语气引擎
  const expectedTone = determineToneLevel(parsed.totalScore);
  const actualTone = parsed.toneLevel || expectedTone;

  // 5. 安全过滤
  const safetyResult = safetyCheck(parsed.feedbackSummary);
  let feedbackSummary = parsed.feedbackSummary;
  let suggestions: string[] = parsed.suggestions || [];

  if (!safetyResult.passed) {
    console.warn(`安全过滤触发: ${safetyResult.issues.join(', ')}`);
    feedbackSummary = sanitizeFeedback(feedbackSummary);
    suggestions = suggestions.map(sanitizeFeedback);
  }

  // 6. 异常检测
  const { isException, reason: exceptionReason } = shouldFlagException(
    parsed.totalScore
  );

  // 7. 组装结果（先组装，用于通知）
  const id = uuidv4();
  const dimensions: DimensionScore[] = (parsed.dimensions || []).map((d: any) => ({
    name: d.name,
    label: d.label,
    score: d.score,
    weight: d.weight,
    comment: d.comment,
  }));

  const result: EvaluationResult = {
    id,
    trainee,
    trainingTitle,
    content,
    totalScore: parsed.totalScore,
    dimensions,
    feedbackSummary,
    suggestions,
    toneLevel: actualTone,
    isException,
    exceptionReason,
    createdAt: new Date().toISOString(),
  };

  // 8. 异常时通知 HR
  if (isException) {
    notifyHRException(result).catch((err) =>
      console.error('HR 通知发送失败:', err)
    );
  }

  return result;
}

/**
 * 批量评价多篇心得
 * 返回生成器，支持流式输出每篇的评价结果
 */
export async function* evaluateBatch(
  reflections: ReflectionInput[]
): AsyncGenerator<{
  type: 'progress' | 'result' | 'complete';
  completed: number;
  total: number;
  result?: EvaluationResult;
  currentTrainee?: string;
}> {
  const total = reflections.length;
  let completed = 0;

  for (const reflection of reflections) {
    yield {
      type: 'progress',
      completed,
      total,
      currentTrainee: reflection.trainee.name,
    };

    try {
      const result = await evaluateReflection(reflection);
      completed++;
      yield {
        type: 'result',
        completed,
        total,
        result,
        currentTrainee: reflection.trainee.name,
      };
    } catch (err: any) {
      console.error(`评价失败 [${reflection.trainee.name}]:`, err.message);
      completed++;
      yield {
        type: 'progress',
        completed,
        total,
        currentTrainee: `${reflection.trainee.name} (评价失败)`,
      };
    }
  }

  yield {
    type: 'complete',
    completed,
    total,
  };
}
