/**
 * 鉴权中间件 — 从 Authorization: Bearer <token> 解析身份
 */
import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type TokenPayload } from './token';

export type AuthUser = TokenPayload;

/** 从请求里取已鉴权身份（由中间件挂载） */
export function getAuth(req: Request): AuthUser | undefined {
  return (req as any).auth as AuthUser | undefined;
}

/**
 * 必须登录：解析 Bearer token，挂到 req.auth
 */
export function authRequired(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  const user = token ? verifyToken(token) : null;
  if (!user) {
    res.status(401).json({ error: '未登录或登录已过期' });
    return;
  }
  (req as any).auth = user;
  next();
}

/**
 * 必须 HR：先登录，再校验角色
 */
export function hrRequired(req: Request, res: Response, next: NextFunction): void {
  authRequired(req, res, () => {
    const auth = getAuth(req);
    if (auth?.role !== 'hr') {
      res.status(403).json({ error: '仅 HR 可访问' });
      return;
    }
    next();
  });
}
