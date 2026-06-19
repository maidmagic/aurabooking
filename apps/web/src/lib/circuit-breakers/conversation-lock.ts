import { getStore } from "@/lib/distributed-store";

const LOCK_TTL_MS = 30_000;

export async function acquireConversationLock(
  conversationId: string,
): Promise<boolean> {
  const store = getStore();
  return store.setnx(`convo:lock:${conversationId}`, "1", LOCK_TTL_MS);
}

export async function releaseConversationLock(
  conversationId: string,
): Promise<void> {
  const store = getStore();
  await store.del(`convo:lock:${conversationId}`);
}

export async function queueMessage(
  conversationId: string,
  body: string,
): Promise<void> {
  const store = getStore();
  const key = `convo:queue:${conversationId}`;
  const existing = await store.get(key);
  const queue: string[] = existing ? JSON.parse(existing) : [];
  queue.push(body);
  await store.set(key, JSON.stringify(queue), LOCK_TTL_MS * 2);
}

export async function drainQueue(
  conversationId: string,
): Promise<string[]> {
  const store = getStore();
  const key = `convo:queue:${conversationId}`;
  const raw = await store.get(key);
  await store.del(key);
  return raw ? JSON.parse(raw) : [];
}
