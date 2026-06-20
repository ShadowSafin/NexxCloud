import Redis from "ioredis";
import { config } from "../config";

export function createRedisConnection(): Redis {
  return new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

class NativeCacheClient {
  private readonly values = new Map<string, { value: string; expiresAt?: number }>();
  private readonly lists = new Map<string, string[]>();

  private read(key: string): string | null {
    const item = this.values.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      this.values.delete(key);
      return null;
    }
    return item.value;
  }

  async get(key: string): Promise<string | null> {
    return this.read(key);
  }

  async set(key: string, value: string, mode?: string, ttl?: number): Promise<"OK"> {
    this.values.set(key, {
      value,
      expiresAt: mode === "EX" && ttl ? Date.now() + ttl * 1000 : undefined,
    });
    return "OK";
  }

  async keys(pattern: string): Promise<string[]> {
    const expression = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
    return Array.from(this.values.keys()).filter((key) => this.read(key) !== null && expression.test(key));
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    keys.forEach((key) => {
      if (this.values.delete(key)) removed++;
      if (this.lists.delete(key)) removed++;
    });
    return removed;
  }

  async incr(key: string): Promise<number> {
    const nextValue = Number(this.read(key) || "0") + 1;
    await this.set(key, String(nextValue));
    return nextValue;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const value = this.read(key);
    if (value === null && !this.lists.has(key)) return 0;
    if (value !== null) this.values.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const item = this.values.get(key);
    if (!item?.expiresAt) return item || this.lists.has(key) ? -1 : -2;
    return Math.max(0, Math.ceil((item.expiresAt - Date.now()) / 1000));
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.lists.get(key) || [];
    return list.slice(start, stop + 1);
  }

  async lrem(key: string, _count: number, value: string): Promise<number> {
    const list = this.lists.get(key) || [];
    const filtered = list.filter((item) => item !== value);
    this.lists.set(key, filtered);
    return list.length - filtered.length;
  }

  async lpush(key: string, value: string): Promise<number> {
    const list = this.lists.get(key) || [];
    list.unshift(value);
    this.lists.set(key, list);
    return list.length;
  }

  async ltrim(key: string, start: number, stop: number): Promise<"OK"> {
    this.lists.set(key, (this.lists.get(key) || []).slice(start, stop + 1));
    return "OK";
  }

  async ping(): Promise<string> {
    return "PONG";
  }

  async publish(_channel: string, _message: string): Promise<number> {
    return 0;
  }

  async quit(): Promise<"OK"> {
    this.values.clear();
    this.lists.clear();
    return "OK";
  }
}

// Shared connection for caching (not BullMQ)
let _cacheClient: Redis | NativeCacheClient | null = null;
export function getCacheClient(): Redis | NativeCacheClient {
  if (!_cacheClient) {
    _cacheClient = config.nativeRuntime
      ? new NativeCacheClient()
      : new Redis(config.redisUrl, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
        });
  }
  return _cacheClient;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await getCacheClient().get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: any, ttl: number = 300): Promise<void> {
  try {
    await getCacheClient().set(key, JSON.stringify(value), "EX", ttl);
  } catch {}
}

export async function cacheInvalidate(pattern: string): Promise<void> {
  try {
    const keys = await getCacheClient().keys(pattern);
    if (keys.length > 0) await getCacheClient().del(...keys);
  } catch {}
}
