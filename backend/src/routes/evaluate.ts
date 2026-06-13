import { Router, Request, Response } from 'express';
import { evaluateBatch } from '../agent/evaluator';
import { saveEvaluation } from '../db/queries';
import type { EvaluateRequest, ReflectionInput } from '../types';

const router = Router();

/**
 * POST /api/evaluate
 * 批量评价接口 — SSE 流式返回进度
 */
router.post('/', async (req: Request, res: Response) => {
  const { reflections } = req.body as EvaluateRequest;

  if (!reflections || !Array.isArray(reflections) || reflections.length === 0) {
    res.status(400).json({ error: '请至少提供一篇培训心得' });
    return;
  }

  // 设置 SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const batchIterator = evaluateBatch(reflections as ReflectionInput[]);

    for await (const event of batchIterator) {
      // 保存评价结果
      if (event.type === 'result' && event.result) {
        try {
          saveEvaluation(event.result);
        } catch (dbErr) {
          console.error('保存评价失败:', dbErr);
        }
      }

      // 推送 SSE 事件
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('批量评价失败:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/evaluate/single
 * 单篇评价（非流式）
 */
router.post('/single', async (req: Request, res: Response) => {
  try {
    const { evaluateReflection } = await import('../agent/evaluator');
    const result = await evaluateReflection(req.body as ReflectionInput);

    try {
      saveEvaluation(result);
    } catch (dbErr) {
      console.error('保存评价失败:', dbErr);
    }

    res.json(result);
  } catch (err: any) {
    console.error('单篇评价失败:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
