import { runEvaluationGraph } from './graph';
import type { ReflectionInput, EvaluationResult } from '../types';

/**
 * 对单篇心得进行评价
 * 内部走 LangGraph 多 Agent 图（解析 → 检索 → 评分 → 语气安全 → Reviewer 自审 → 组装）
 */
export async function evaluateReflection(
  input: ReflectionInput
): Promise<EvaluationResult> {
  return runEvaluationGraph(input);
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
