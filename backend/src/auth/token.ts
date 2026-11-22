/**
 * JWT 签发与校验 — jsonwebtoken（HS256）
 *
 * .env 配置：
 *   JWT_SECRET — 签名密钥（必填，缺省时用开发密钥并在日志告警）
 *   JWT_EXPIRES_IN — 过期时间，默认 7d
 */
import jwt from 'jsonwebtoken';
import type { Role } from '../types';

export interface TokenPayload {
  employeeId: string;
  name: string;
  role: Role;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('[auth] 未配置 JWT_SECRET，使用开发密钥（生产必须配置）');
    return 'dev-secret-change-me';
  }
  return secret;
}

export function signToken(payload: TokenPayload): string {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, getSecret(), {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as jwt.JwtPayload & TokenPayload;
    return {
      employeeId: decoded.employeeId,
      name: decoded.name,
      role: decoded.role === 'hr' ? 'hr' : 'employee',
    };
  } catch {
    return null;
  }
}
