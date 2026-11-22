/**
 * Demo 脚本 — 命令行直接测试 Agent 评价能力
 * 用法: npx tsx src/demo.ts
 *
 * 前置条件: 在 .env 中配置 LLM_API_KEY 和 LLM_MODEL
 */
import 'dotenv/config';
import { evaluateReflection } from './agent/evaluator';
import { SAMPLE_REFLECTIONS } from './fixtures/sample-reflections';
import { saveEvaluation, getStats, resolveEmployeeKey } from './db/queries';
import { getEmployeeProfile } from './db/profile';

async function main() {
  console.log('═'.repeat(60));
  console.log('  🤖 HR 培训心得评价 Agent — Demo 测试');
  console.log('═'.repeat(60));
  console.log('');

  if (!process.env.LLM_API_KEY) {
    console.log('❌ 请先在 .env 中配置 LLM_API_KEY');
    process.exit(1);
  }

  const sample = SAMPLE_REFLECTIONS.slice(0, 2); // 先测2篇

  for (const reflection of sample) {
    console.log(`📝 正在评价: ${reflection.trainee.name} — 《${reflection.trainingTitle}》`);
    console.log('');

    try {
      const result = await evaluateReflection(reflection);

      console.log(`   总分: ${result.totalScore}/10`);
      console.log(`   语气: ${result.toneLevel}`);
      console.log(`   异常: ${result.isException ? `⚠️ ${result.exceptionReason}` : '✅ 无异常'}`);
      console.log('');

      // 维度得分
      console.log('   📊 维度得分:');
      for (const dim of result.dimensions) {
        const bar = '█'.repeat(Math.round(dim.score)) + '░'.repeat(10 - Math.round(dim.score));
        console.log(`   ${dim.label.padEnd(8)} ${bar} ${dim.score}/10`);
      }
      console.log('');
      console.log(`   💬 ${result.feedbackSummary}`);
      console.log('');

      if (result.suggestions.length > 0) {
        console.log('   💡 改进建议:');
        result.suggestions.forEach((s, i) => console.log(`   ${i + 1}. ${s}`));
        console.log('');
      }

      // 保存到数据库
      try {
        saveEvaluation(result);
        console.log('   💾 已保存到数据库');
      } catch (dbErr: any) {
        console.log(`   ⚠️ 数据库保存失败: ${dbErr.message}`);
      }

      console.log('');
      console.log('-'.repeat(60));
      console.log('');

    } catch (err: any) {
      console.log(`   ❌ 评价失败: ${err.message}`);
      console.log('');
    }
  }

  // 显示统计
  try {
    const stats = getStats();
    console.log('═'.repeat(60));
    console.log('  📊 数据库统计');
    console.log(`  总计: ${stats.totalEvaluations} 篇`);
    console.log(`  平均分: ${stats.averageScore}`);
    console.log(`  待处理异常: ${stats.pendingExceptions}`);
    console.log('═'.repeat(60));
  } catch {
    // 数据库可能未初始化
  }

  // 显示员工学习画像
  try {
    const key = resolveEmployeeKey(sample[0].trainee);
    const profile = getEmployeeProfile(key);
    console.log('');
    console.log('═'.repeat(60));
    console.log(`  👤 员工学习画像 — ${profile.name}（${profile.department || '部门未维护'}）`);
    console.log(`  历史评价: ${profile.evaluationCount} 次，平均 ${profile.averageScore} 分`);
    if (profile.evaluationCount > 0) {
      console.log(`  得分趋势: ${profile.trend}（${profile.recentScores.map((s) => s.score).join(' → ')}）`);
      if (profile.weakDimensions.length > 0) {
        console.log(`  薄弱维度: ${profile.weakDimensions.join('、')}`);
      } else {
        console.log(`  薄弱维度: 无`);
      }
    }
    console.log('═'.repeat(60));
  } catch {
    // 画像查询失败不影响主流程
  }
}

main().catch(console.error);
