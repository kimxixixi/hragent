import type {
  ChatRequest,
  ChatResponse,
  EvaluateRequest,
  EvaluationResult,
  ExceptionInfo,
  Identity,
  LoginResponse,
} from '../types/chat';

const API_BASE = '/api';
const TOKEN_KEY = 'hragent.token';
const IDENTITY_KEY = 'hragent.identity';

// ── 会话存储 ──
export function setAuth(auth: LoginResponse): void {
  localStorage.setItem(TOKEN_KEY, auth.token);
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(auth.identity));
}

export function getToken(): string | undefined {
  return localStorage.getItem(TOKEN_KEY) || undefined;
}

export function getStoredIdentity(): Identity | null {
  const raw = localStorage.getItem(IDENTITY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Identity;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(IDENTITY_KEY);
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// ── 认证 ──
export async function login(employeeId: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '登录失败');
  }
  return res.json();
}

export async function setPassword(
  employeeId: string,
  name: string,
  password: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/set-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, name, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '设置密码失败');
  }
  return res.json();
}

/**
 * 发送对话消息
 */
export async function sendChatMessage(
  request: ChatRequest
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `请求失败 (${res.status})`);
  }
  return res.json();
}

/**
 * 批量评价 — SSE 流式
 */
export function streamEvaluate(
  request: EvaluateRequest,
  onEvent: (event: any) => void,
  onComplete: () => void,
  onError: (err: Error) => void
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/evaluate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(request),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `请求失败 (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              onComplete();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              onEvent(parsed);
            } catch {
              // 跳过无法解析的行
            }
          }
        }
      }
      onComplete();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err);
      }
    });

  return controller;
}

/**
 * 获取异常列表
 */
export async function getExceptions(
  status?: string
): Promise<EvaluationResult[]> {
  const params = status ? `?status=${status}` : '';
  const res = await fetch(`${API_BASE}/exceptions${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('获取异常列表失败');
  return res.json();
}

/**
 * 处理异常
 */
export async function handleException(
  evaluationId: string,
  action: 'approve' | 'modify' | 'dismiss',
  modifiedFeedback?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/exceptions/${evaluationId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ evaluationId, action, modifiedFeedback }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '处理异常失败');
  }
  return res.json();
}
