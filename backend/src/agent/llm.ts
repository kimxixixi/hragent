/**
 * LLM 公共工具 — OpenAI 兼容 API 调用 + JSON 提取
 * 供解析 / 评分 / Reviewer 各 Agent 节点复用
 */

/**
 * OpenAI 兼容 API 调用
 * 支持千问 / DeepSeek / GPT / 等所有 OpenAI 兼容接口
 *
 * .env 配置:
 *   LLM_API_KEY   — API Key
 *   LLM_MODEL     — 模型名 (qwen-max / deepseek-chat / gpt-4o 等)
 *   LLM_BASE_URL  — API 地址 (默认阿里云 DashScope)
 */
export async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error('未配置 LLM_API_KEY，请在 .env 中设置');
  }

  const model = process.env.LLM_MODEL || 'qwen-max';
  const baseUrl = process.env.LLM_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.8,
      seed: Math.floor(Math.random() * 100000),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM API 调用失败 (${response.status}): ${err}`);
  }

  const data = await response.json() as any;
  return data.choices[0].message.content;
}

/**
 * 从 LLM 响应中提取 JSON
 * 依次尝试：直接解析 → markdown code block → 首尾花括号截取
 */
export function extractJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error(`无法从响应中提取 JSON: ${text.slice(0, 200)}...`);
  }
}

/**
 * 带 JSON 强制重试的 LLM 调用
 * 解析失败时追加 JSON 指令重试一次
 */
export async function callLLMForJSON(
  systemPrompt: string,
  userMessage: string
): Promise<any> {
  let raw = await callLLM(systemPrompt, userMessage);
  try {
    return extractJSON(raw);
  } catch {
    console.warn('首次 JSON 解析失败，重试中...');
    const retryUser = userMessage + '\n\n【重要提醒】请只返回 JSON，不要输出任何其他文字。';
    raw = await callLLM(systemPrompt, retryUser);
    return extractJSON(raw);
  }
}
