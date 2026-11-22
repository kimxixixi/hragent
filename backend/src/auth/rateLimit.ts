/**
 * 内存 IP 限流 — 固定窗口计数，防单 IP 暴力枚举登录
 *
 * 说明：内存态，进程重启即清零，适合单体 demo；
 * 生产多实例应改用 Redis 等共享存储做分布式限流。
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60 * 1000; // 60 秒窗口
const MAX_PER_WINDOW = 10;   // 每窗口最多 10 次
const MAX_BUCKETS = 10000;   // 防内存膨胀上限

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  // 无记录或窗口已过期 → 重置
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    sweepIfLarge();
    return { allowed: true, retryAfterSec: 0 };
  }

  // 超出上限 → 拒绝
  if (bucket.count >= MAX_PER_WINDOW) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

/** 桶过多时清理过期项，避免内存持续增长 */
function sweepIfLarge(): void {
  if (buckets.size <= MAX_BUCKETS) return;
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k);
  }
}
