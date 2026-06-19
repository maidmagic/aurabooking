import { getStore } from "@/lib/distributed-store";

export async function checkRateLimit(
  key: string,
  maxRequests: number = 20,
  windowMs: number = 60_000
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const store = getStore();
  const redisKey = `ratelimit:${key}`;

  const count = await store.incr(redisKey);

  // On first increment, set TTL
  if (count === 1) {
    await store.expire(redisKey, windowMs);
  }

  const resetAt = Date.now() + windowMs;
  const remaining = Math.max(0, maxRequests - count);

  return { allowed: count <= maxRequests, remaining, resetAt };
}
