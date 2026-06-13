import { Router, Request, Response } from 'express';
import { getExceptions, updateExceptionStatus } from '../db/queries';
import type { ExceptionUpdateRequest } from '../types';

const router = Router();

/**
 * GET /api/exceptions
 * 获取异常评价列表
 * Query: ?status=pending|reviewed|dismissed
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const statusParam = req.query.status;
    const status: string | undefined =
      typeof statusParam === 'string' ? statusParam : undefined;
    const exceptions = getExceptions(status);
    res.json(exceptions);
  } catch (err: any) {
    console.error('获取异常列表失败:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/exceptions/:id
 * 处理异常评价（批准/修改/驳回）
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const body = req.body as ExceptionUpdateRequest;
    const action: string = body.action;
    const modifiedFeedback: string | undefined = body.modifiedFeedback;

    if (!['approve', 'modify', 'dismiss'].includes(action)) {
      res.status(400).json({ error: 'action 必须是 approve, modify 或 dismiss' });
      return;
    }

    const statusMap: Record<string, string> = {
      approve: 'reviewed',
      modify: 'reviewed',
      dismiss: 'dismissed',
    };

    const newStatus: string = statusMap[action];
    updateExceptionStatus(id, newStatus, modifiedFeedback);

    res.json({
      success: true,
      evaluationId: id,
      newStatus,
      message:
        action === 'approve'
          ? '已批准并发送'
          : action === 'modify'
          ? '已修改并发送'
          : '已驳回，将重新评价',
    });
  } catch (err: any) {
    console.error('处理异常失败:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
