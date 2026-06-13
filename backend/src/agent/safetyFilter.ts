/**
 * 红线保护 — 安全过滤器
 * 确保 AI 生成的反馈不会包含不当措辞
 */

// 禁用词汇列表（含模糊匹配）
const BLOCKED_WORDS = [
  '差', '糟糕', '不合格', '敷衍', '不用心', '能力不足',
  '太差', '很差', '极差', '太糟糕', '不行', '不够格',
  '水平低', '素质差', '态度不端正', '不认真', '糊弄',
  '应付', '敷衍了事', '不努力', '懒惰', '散漫',
];

// 敏感短语模式（正则）
const SENSITIVE_PATTERNS = [
  /你.{0,2}(不行|不够|不足|很差)/,
  /(完全|根本).{0,2}(没有|没).{0,5}(思考|用心|努力)/,
  /(能力|水平|素质).{0,2}(差|低|弱|不够)/,
  /(毫无|没有任何)(价值|意义|用处)/,
];

/**
 * 检查文本是否包含禁用词汇
 * @returns 命中的禁用词列表
 */
export function detectBlockedWords(text: string): string[] {
  return BLOCKED_WORDS.filter((word) => text.includes(word));
}

/**
 * 检查文本是否命中敏感模式
 * @returns 命中的模式描述
 */
export function detectSensitivePatterns(text: string): string[] {
  return SENSITIVE_PATTERNS.filter((pattern) => pattern.test(text)).map(
    (p) => `敏感模式匹配: ${p.source}`
  );
}

/**
 * 安全过滤主函数
 * @returns { passed: boolean, issues: string[] }
 */
export function safetyCheck(text: string): {
  passed: boolean;
  issues: string[];
} {
  const blocked = detectBlockedWords(text);
  const sensitive = detectSensitivePatterns(text);
  const issues = [
    ...blocked.map((w) => `禁用词: "${w}"`),
    ...sensitive,
  ];

  return {
    passed: issues.length === 0,
    issues,
  };
}

/**
 * 对 AI 生成的反馈进行安全后处理
 * 如果发现不当措辞，尝试温和化替换
 */
const SOFT_REPLACEMENTS: Record<string, string> = {
  '差': '有提升空间',
  '很差': '还有较大提升空间',
  '糟糕': '不够理想',
  '不合格': '暂未达到预期标准',
  '敷衍': '可以更深入',
  '不用心': '可以更细致',
  '能力不足': '在该领域还需要更多积累',
};

export function sanitizeFeedback(text: string): string {
  let sanitized = text;
  for (const [bad, good] of Object.entries(SOFT_REPLACEMENTS)) {
    sanitized = sanitized.replaceAll(bad, good);
  }
  return sanitized;
}
