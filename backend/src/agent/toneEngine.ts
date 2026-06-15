import type { ToneLevel } from '../types';

/**
 * 语气调节规则引擎
 */
export function determineToneLevel(totalScore: number): ToneLevel {
  if (totalScore >= 8) return 'celebratory';
  if (totalScore >= 5) return 'sandwich';
  return 'gentle_redirect';
}

/**
 * 判断是否触发异常通知
 */
export function shouldFlagException(
  totalScore: number
): { isException: boolean; reason?: string } {
  if (totalScore < 5) {
    return {
      isException: true,
      reason: `评分低于5分（${totalScore}分），已通知HR复核`,
    };
  }
  return { isException: false };
}

/**
 * 根据语气级别生成建议数量
 */
export function getSuggestionCount(toneLevel: ToneLevel): number {
  switch (toneLevel) {
    case 'celebratory': return 1;
    case 'sandwich': return 2;
    case 'gentle_redirect': return 3;
    default: return 2;
  }
}
