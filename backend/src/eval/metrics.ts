/**
 * 评测指标 — MAE / 档位准确率 / 异常检测 F1
 */
import type { DimensionScore, EvaluationResult } from '../types';
import {
  EvalCase,
  deriveTotalScore,
  bandOf,
  isExceptionScore,
  DIMENSION_ORDER,
} from './dataset';

export interface PerCaseResult {
  id: string;
  title: string;
  goldTotal: number;
  agentTotal: number;
  diff: number;
  goldBand: string;
  agentBand: string;
  bandCorrect: boolean;
  goldException: boolean;
  agentException: boolean;
  exceptionCorrect: boolean;
}

export interface EvalReport {
  model: string;
  total: number;
  cases: PerCaseResult[];
  totalMAE: number;
  bandAccuracy: number;
  perDimMAE: { name: string; label: string; mae: number }[];
  exception: {
    precision: number;
    recall: number;
    f1: number;
    tp: number;
    fp: number;
    fn: number;
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * 计算单条样本的评测结果
 */
export function scoreCase(test: EvalCase, result: EvaluationResult): PerCaseResult {
  const goldTotal = deriveTotalScore(test.goldDims);
  const agentTotal = result.totalScore;

  const agentDimMap = new Map<string, number>();
  for (const d of result.dimensions) {
    agentDimMap.set(d.name, d.score);
  }

  const goldException = isExceptionScore(goldTotal);
  const agentException = result.isException;

  return {
    id: test.id,
    title: test.trainingTitle,
    goldTotal,
    agentTotal,
    diff: round2(Math.abs(agentTotal - goldTotal)),
    goldBand: bandOf(goldTotal),
    agentBand: bandOf(agentTotal),
    bandCorrect: bandOf(goldTotal) === bandOf(agentTotal),
    goldException,
    agentException,
    exceptionCorrect: goldException === agentException,
  };
}

/**
 * 汇总全部样本为一份评测报告
 */
export function summarize(
  cases: { test: EvalCase; result: EvaluationResult }[],
  model: string
): EvalReport {
  const perCase = cases.map(({ test, result }) => scoreCase(test, result));

  // 总分 MAE
  const totalMAE = round2(perCase.reduce((s, c) => s + c.diff, 0) / perCase.length);

  // 档位准确率
  const bandAccuracy = round2(perCase.filter((c) => c.bandCorrect).length / perCase.length);

  // 维度 MAE
  const perDimMAE = DIMENSION_ORDER.map((dim) => {
    let sum = 0;
    for (const { test, result } of cases) {
      const gold = test.goldDims[DIMENSION_ORDER.indexOf(dim)];
      const agent = result.dimensions.find((d) => d.name === dim.name)?.score ?? gold;
      sum += Math.abs(agent - gold);
    }
    return { name: dim.name, label: dim.label, mae: round2(sum / cases.length) };
  });

  // 异常检测 F1
  let tp = 0, fp = 0, fn = 0;
  for (const c of perCase) {
    if (c.goldException && c.agentException) tp++;
    else if (!c.goldException && c.agentException) fp++;
    else if (c.goldException && !c.agentException) fn++;
  }
  const precision = tp + fp > 0 ? round2(tp / (tp + fp)) : 0;
  const recall = tp + fn > 0 ? round2(tp / (tp + fn)) : 0;
  const f1 = precision + recall > 0 ? round2((2 * precision * recall) / (precision + recall)) : 0;

  return {
    model,
    total: perCase.length,
    cases: perCase,
    totalMAE,
    bandAccuracy,
    perDimMAE,
    exception: { precision, recall, f1, tp, fp, fn },
  };
}
