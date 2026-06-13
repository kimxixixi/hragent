import type {
  ChatRequest,
  ChatResponse,
  EvaluateRequest,
  EvaluationResult,
  ExceptionInfo,
} from '../types/chat';

const API_BASE = '/api';

/**
 * 发送对话消息
 */
export async function sendChatMessage(
  request: ChatRequest
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
 * @param onEvent 每收到一个 SSE 事件时的回调
 * @param onComplete 完成时的回调
 * @param onError 出错时的回调
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
    headers: { 'Content-Type': 'application/json' },
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
  const res = await fetch(`${API_BASE}/exceptions${params}`);
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evaluationId, action, modifiedFeedback }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '处理异常失败');
  }
  return res.json();
}
