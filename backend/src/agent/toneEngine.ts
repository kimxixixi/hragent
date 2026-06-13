import type { ToneLevel } from '../types';

/**
 * 语气调节规则引擎
 * 根据总分和学员身份，自动确定应使用的语气级别
 */

export function determineToneLevel(
  totalScore: number,
  isManagement: boolean
): ToneLevel {
  let tone: ToneLevel;

  if (totalScore >= 8) {
    tone = 'celebratory';
  } else if (totalScore >= 5) {
    tone = 'sandwich';
  } else {
    tone = 'gentle_redirect';
  }

  // 高管/管理岗语气升级一档
  if (isManagement) {
    if (tone === 'sandwich') return 'celebratory';
    if (tone === 'gentle_redirect') return 'sandwich';
  }

  return tone;
}

/**
 * 判断是否触发异常（需要人工复核）
 */
export function shouldFlagException(
  totalScore: number,
  isManagement: boolean
): { isException: boolean; reason?: string } {
  // 低于5分触发通知HR
  if (totalScore < 5) {
    return {
      isException: true,
      reason: `评分低于5分（${totalScore}分），已通知HR复核`,
    };
  }

  // 高管/管理岗 + 中低分触发
  if (isManagement && totalScore < 7) {
    return {
      isException: true,
      reason: '学员为管理岗位且评分偏低，请复核反馈措辞是否恰当',
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
