import { getStore } from "@/lib/distributed-store";

const LOOP_THRESHOLD = 10;
const LOOP_WINDOW_MS = 5 * 60 * 1000;
const LOOP_BLOCK_TTL_MS = 60 * 60 * 1000;

export async function checkLoop(
  conversationId: string,
): Promise<{ isLoop: boolean; count: number }> {
  const store = getStore();
  const key = `loop:${conversationId}`;

  const raw = await store.get(key);
  const now = Date.now();

  if (!raw) {
    await store.set(key, JSON.stringify([now]), LOOP_WINDOW_MS);
    return { isLoop: false, count: 1 };
  }

  const timestamps: number[] = JSON.parse(raw);
  const recent = timestamps.filter((t) => now - t < LOOP_WINDOW_MS);
  recent.push(now);
  const count = recent.length;

  if (count > LOOP_THRESHOLD) {
    await store.set(key, JSON.stringify(recent), LOOP_BLOCK_TTL_MS);
    return { isLoop: true, count };
  }

  await store.set(key, JSON.stringify(recent), LOOP_WINDOW_MS);
  return { isLoop: false, count };
}

export async function resetLoopCounter(conversationId: string): Promise<void> {
  const store = getStore();
  await store.del(`loop:${conversationId}`);
}
