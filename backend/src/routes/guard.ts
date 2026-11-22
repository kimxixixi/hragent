/**
 * 接口鉴权辅助 — 从请求头 x-employee-id 解析身份，判断是否 HR
 *
 * 说明：聊天流走消息内解析身份（见 util/identity），
 * REST 接口没有消息文本，改由前端把已解析的工号放进 x-employee-id 头。
 */
import type { Request } from 'express';
import { getEmployeeRole } from '../db/profile';
import type { Role } from '../types';

export function roleFromRequest(req: Request): Role {
  const id = req.headers['x-employee-id'];
  if (typeof id !== 'string' || !id) return 'employee';
  return getEmployeeRole(id);
}

export function isHR(req: Request): boolean {
  return roleFromRequest(req) === 'hr';
}
