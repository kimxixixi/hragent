/**
 * 评测脚本 — 跑标注集、算 MAE / 档位准确率 / 异常 F1
 *
 * 用法：npm run eval
 * 前置：.env 已配 LLM_API_KEY / LLM_MODEL / LLM_BASE_URL
 *
 * 评测模式下禁用异常通知，避免低分样例触发真实邮件。
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
// 必须在调用 evaluateReflection 之前生效（notifyHRException 在运行时读取该开关）
process.env.NOTIFY_DISABLED = '1';

import { EVAL_CASES, deriveTotalScore, DIMENSION_ORDER } from './dataset';
import { summarize, type EvalReport } from './metrics';
import { evaluateReflection } from '../agent/evaluator';
import type { ReflectionInput, EvaluationResult } from '../types';

const CONCURRENCY = Number(process.env.EVAL_CONCURRENCY || 4);

interface ItemResult {
  test: (typeof EVAL_CASES)[number];
  result?: EvaluationResult;
  error?: string;
}

/** 简易并发池：避免并发过高触发限流 */
async function runPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let idx = 0;
  async function loop() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await worker(items[i]);
    }
  }
  const threads = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: threads }, loop));
  return results;
}

async function main() {
  const model = process.env.LLM_MODEL || 'unknown';
  console.log(`\n┌─────────────────────────────────────────────`);
  console.log(`│  评分 Agent 评测  ·  模型 ${model}`);
  console.log(`│  样本 ${EVAL_CASES.length} 篇  ·  并发 ${CONCURRENCY}`);
  console.log(`└─────────────────────────────────────────────\n`);

  const t0 = Date.now();
  const results = await runPool(EVAL_CASES, CONCURRENCY, async (test): Promise<ItemResult> => {
    const input: ReflectionInput = {
      trainee: test.trainee,
      trainingTitle: test.trainingTitle,
      trainingType: test.trainingType,
      content: test.content,
    };
    try {
      const result = await evaluateReflection(input);
      return { test, result };
    } catch (e: any) {
      return { test, error: e.message };
    }
  });

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const ok = results.filter((r): r is ItemResult & { result: EvaluationResult } => !!r.result);
  const failed = results.filter((r) => r.error);

  console.log(`\n完成 ${ok.length}/${EVAL_CASES.length}，耗时 ${elapsed}s`);
  if (failed.length > 0) {
    console.log(`失败 ${failed.length} 条：`);
    failed.forEach((f) => console.log(`  - ${f.test.id}: ${f.error}`));
  }

  const report = summarize(
    ok.map((r) => ({ test: r.test, result: r.result })),
    model
  );

  printReport(report);
  writeReport(report);
}

function printReport(report: EvalReport): void {
  const e = report.exception;
  console.log('\n════════════ 核心指标 ════════════');
  console.log(`  总分 MAE      : ${report.totalMAE}`);
  console.log(`  档位准确率     : ${(report.bandAccuracy * 100).toFixed(1)}%`);
  console.log(`  异常 F1       : ${e.f1}（P=${e.precision} R=${e.recall}）`);

  console.log('\n  维度 MAE:');
  for (const d of report.perDimMAE) {
    console.log(`    ${d.label.padEnd(6, '　')} ${d.mae}`);
  }

  console.log('\n════════════ 逐条明细 ════════════');
  const header = ['id'.padEnd(9), '主题'.padEnd(8, '　'), 'gold', 'agent', 'Δ', '档位', '异常'].join('  ');
  console.log('  ' + header);
  for (const c of report.cases) {
    const band = c.bandCorrect ? '✓' : `✗(${c.goldBand}→${c.agentBand})`;
    const ex = c.exceptionCorrect ? '✓' : '✗';
    console.log(
      `  ${c.id.padEnd(9)}  ${c.title.slice(0, 6).padEnd(8, '　')}  ${String(c.goldTotal).padEnd(4)}  ${String(c.agentTotal).padEnd(5)}  ${String(c.diff).padEnd(3)}  ${band.padEnd(10, '　')}  ${ex}`
    );
  }
  console.log('');
}

function writeReport(report: EvalReport): void {
  const e = report.exception;
  const lines: string[] = [];
  lines.push('# 评分 Agent 评测报告');
  lines.push('');
  lines.push(`- 模型：\`${report.model}\``);
  lines.push(`- 样本数：${report.total}`);
  lines.push(`- 生成时间：${new Date().toISOString()}`);
  lines.push('');
  lines.push('## 核心指标');
  lines.push('');
  lines.push('| 指标 | 值 |');
  lines.push('|------|-----|');
  lines.push(`| 总分 MAE | ${report.totalMAE} |`);
  lines.push(`| 档位准确率 | ${(report.bandAccuracy * 100).toFixed(1)}% |`);
  lines.push(`| 异常 F1 | ${e.f1}（P=${e.precision} R=${e.recall}） |`);
  lines.push('');
  lines.push('## 维度 MAE');
  lines.push('');
  lines.push('| 维度 | MAE |');
  lines.push('|------|-----|');
  for (const d of report.perDimMAE) lines.push(`| ${d.label} | ${d.mae} |`);
  lines.push('');
  lines.push('## 逐条明细');
  lines.push('');
  lines.push('| id | 主题 | gold | agent | Δ | 档位 | 异常 |');
  lines.push('|----|------|------|-------|---|------|------|');
  for (const c of report.cases) {
    const band = c.bandCorrect ? '✓' : `✗ ${c.goldBand}→${c.agentBand}`;
    const ex = c.exceptionCorrect ? '✓' : '✗';
    lines.push(`| ${c.id} | ${c.title} | ${c.goldTotal} | ${c.agentTotal} | ${c.diff} | ${band} | ${ex} |`);
  }
  lines.push('');

  const outPath = path.join(__dirname, '..', '..', 'data', 'eval-report.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
  console.log(`报告已写入: ${outPath}\n`);
}

main().catch((err) => {
  console.error('评测失败:', err);
  process.exit(1);
});
