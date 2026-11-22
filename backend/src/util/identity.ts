/**
 * 身份解析 — 从聊天消息里识别「姓名 + 工号」报到格式
 *
 * 与前端 useChat 的 parseEmployeeInfo 保持一致（后端作为权威解析）。
 * 支持：中文名(2-4字) + 工号(字母数字2-10位)，顺序可互换。
 */
export interface Identity {
  name: string;
  employeeId: string;
}

export function parseIdentity(text: string): Identity | null {
  const t = text.trim();

  const patterns = [
    /^([一-鿿]{2,4})[\s,，：:]+([A-Za-z0-9\-]{2,10})$/,
    /^([一-鿿]{2,4})(\d{3,8})$/,
    /^([A-Za-z0-9\-]{2,10})[\s,，：:]+([一-鿿]{2,4})$/,
    /^(\d{3,8})\s*[\s,，：:]?\s*([一-鿿]{2,4})$/,
  ];

  for (const p of patterns) {
    const m = t.match(p);
    if (m) {
      const a = m[1];
      const b = m[2];
      return /[一-鿿]/.test(a)
        ? { name: a, employeeId: b }
        : { name: b, employeeId: a };
    }
  }

  return null;
}
