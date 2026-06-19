/** Abstraction layer for distributed state — uses Upstash Redis when available, falls back to in-memory */

interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  setnx(key: string, value: string, ttlMs: number): Promise<boolean>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlMs: number): Promise<void>;
}

class MemoryStore implements Store {
  private data = new Map<string, { value: string; expiry: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.data.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    this.data.set(key, { value, expiry: ttlMs ? Date.now() + ttlMs : Infinity });
  }

  async setnx(key: string, value: string, ttlMs: number): Promise<boolean> {
    if (this.data.has(key)) return false;
    this.data.set(key, { value, expiry: Date.now() + ttlMs });
    return true;
  }

  async del(key: string): Promise<void> {
    this.data.delete(key);
  }

  async incr(key: string): Promise<number> {
    const existing = await this.get(key);
    const next = (existing ? parseInt(existing, 10) : 0) + 1;
    await this.set(key, String(next), 60_000);
    const entry = this.data.get(key);
    if (entry && entry.expiry === Infinity) {
      entry.expiry = Date.now() + 60_000;
    }
    return next;
  }

  async expire(key: string, ttlMs: number): Promise<void> {
    const entry = this.data.get(key);
    if (entry) entry.expiry = Date.now() + ttlMs;
  }
}

function createRedisStore(): Store | null {
  try {
    // Dynamic require — only works if @upstash/redis is installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
    const client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    });
    if (!process.env.UPSTASH_REDIS_REST_URL) return null;
    return {
      get: (key: string) => client.get<string>(key),
      set: async (key: string, value: string, ttlMs?: number) => {
        if (ttlMs) { await client.set(key, value, { ex: Math.ceil(ttlMs / 1000) }); return; }
        await client.set(key, value);
      },
      setnx: async (key: string, value: string, ttlMs: number) => {
        const res = await client.set(key, value, { nx: true, ex: Math.ceil(ttlMs / 1000) });
        return res === "OK";
      },
      del: async (key: string) => { await client.del(key); },
      incr: (key: string) => client.incr(key),
      expire: async (key: string, ttlMs: number) => {
        await client.expire(key, Math.ceil(ttlMs / 1000));
      },
    };
  } catch {
    return null;
  }
}

let store: Store;

export function getStore(): Store {
  if (!store) {
    store = createRedisStore() ?? new MemoryStore();
  }
  return store;
}
