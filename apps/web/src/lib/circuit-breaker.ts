import { getStore } from "@/lib/distributed-store";

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitConfig {
  threshold: number;
  cooldownMs: number;
  halfOpenMaxRequests: number;
}

function key(name: string): string {
  return `circuit:${name}`;
}

export async function recordSuccess(name: string): Promise<void> {
  const store = getStore();
  await store.set(key(name), JSON.stringify({
    status: "CLOSED" as CircuitState,
    failureCount: 0,
    halfOpenRequests: 0,
    nextAttemptTime: 0,
  }), 86_400_000); // 24h TTL so stale keys self-clean
}

export async function recordFailure(name: string, config?: Partial<CircuitConfig>): Promise<CircuitState> {
  const cfg: CircuitConfig = {
    threshold: config?.threshold ?? 5,
    cooldownMs: config?.cooldownMs ?? 30_000,
    halfOpenMaxRequests: config?.halfOpenMaxRequests ?? 1,
  };

  const store = getStore();
  const raw = await store.get(key(name));
  const state = raw ? JSON.parse(raw) : { status: "CLOSED", failureCount: 0, halfOpenRequests: 0, nextAttemptTime: 0 };

  state.failureCount = (state.failureCount ?? 0) + 1;
  state.lastFailureTime = Date.now();

  if (state.failureCount >= cfg.threshold) {
    state.status = "OPEN";
    state.nextAttemptTime = Date.now() + cfg.cooldownMs;
  }

  await store.set(key(name), JSON.stringify(state), 86_400_000);
  return state.status as CircuitState;
}

export async function getCircuitStatus(name: string): Promise<CircuitState> {
  const store = getStore();
  const raw = await store.get(key(name));
  if (!raw) return "CLOSED";

  const state = JSON.parse(raw);
  if (state.status === "OPEN" && Date.now() >= (state.nextAttemptTime ?? 0)) {
    state.status = "HALF_OPEN";
    state.halfOpenRequests = 0;
    await store.set(key(name), JSON.stringify(state), 86_400_000);
  }

  if (state.status === "HALF_OPEN" && (state.halfOpenRequests ?? 0) >= 1) {
    return "OPEN";
  }

  if (state.status === "HALF_OPEN") {
    state.halfOpenRequests = (state.halfOpenRequests ?? 0) + 1;
    await store.set(key(name), JSON.stringify(state), 86_400_000);
  }

  return state.status as CircuitState;
}

export async function resetCircuitBreaker(name: string): Promise<void> {
  const store = getStore();
  await store.set(key(name), JSON.stringify({
    status: "CLOSED",
    failureCount: 0,
    nextAttemptTime: 0,
    halfOpenRequests: 0,
  }), 86_400_000);
}
