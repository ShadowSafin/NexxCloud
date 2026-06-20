import { EventEmitter } from "events";
import { Job, JobsOptions, Queue, Worker } from "bullmq";
import { createRedisConnection } from "./redis";
import { isNativeRuntime } from "./runtimeMode";

type Processor<T = any> = (job: Job<T>) => Promise<unknown>;

export interface RuntimeQueue {
  name: string;
  add(name: string, data: any, options?: JobsOptions): Promise<unknown>;
}

export interface RuntimeWorker {
  on(event: string, listener: (...args: any[]) => void): RuntimeWorker;
  close(): Promise<void>;
}

interface NativeRegistration {
  processor: Processor;
  concurrency: number;
  running: number;
  pending: Array<{ id: string; name: string; data: any }>;
  emitter: EventEmitter;
}

const nativeRegistrations = new Map<string, NativeRegistration>();
const nativeTimers = new Set<NodeJS.Timeout>();
let nextNativeJobId = 0;

function getNativeRegistration(queueName: string): NativeRegistration {
  let registration = nativeRegistrations.get(queueName);
  if (!registration) {
    registration = {
      processor: async () => undefined,
      concurrency: 1,
      running: 0,
      pending: [],
      emitter: new EventEmitter(),
    };
    nativeRegistrations.set(queueName, registration);
  }
  return registration;
}

function runNativeJobs(queueName: string): void {
  const registration = getNativeRegistration(queueName);
  while (registration.running < registration.concurrency && registration.pending.length > 0) {
    const pending = registration.pending.shift()!;
    registration.running++;
    const job = { id: pending.id, name: pending.name, data: pending.data } as Job;
    void registration.processor(job)
      .then((result) => registration.emitter.emit("completed", job, result))
      .catch((error) => registration.emitter.emit("failed", job, error))
      .finally(() => {
        registration.running--;
        runNativeJobs(queueName);
      });
  }
}

function repeatInterval(pattern: string): number {
  return pattern.startsWith("*/30 ") ? 30 * 60 * 1000 : 24 * 60 * 60 * 1000;
}

function delayUntilNextRun(pattern: string, now = new Date()): number {
  if (pattern.startsWith("*/30 ")) {
    const elapsed = (now.getMinutes() % 30) * 60 * 1000 + now.getSeconds() * 1000 + now.getMilliseconds();
    return 30 * 60 * 1000 - elapsed;
  }

  const daily = pattern.match(/^(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+\*$/);
  if (daily) {
    const next = new Date(now);
    next.setHours(Number(daily[2]), Number(daily[1]), 0, 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    return next.getTime() - now.getTime();
  }

  return repeatInterval(pattern);
}

class NativeQueue implements RuntimeQueue {
  constructor(public readonly name: string) {}

  async add(name: string, data: any, options?: JobsOptions): Promise<unknown> {
    if (options?.repeat?.pattern) {
      const pattern = options.repeat.pattern;
      const initialTimer = setTimeout(() => {
        nativeTimers.delete(initialTimer);
        void this.add(name, data);
        const repeatingTimer = setInterval(() => void this.add(name, data), repeatInterval(pattern));
        repeatingTimer.unref();
        nativeTimers.add(repeatingTimer);
      }, delayUntilNextRun(pattern));
      initialTimer.unref();
      nativeTimers.add(initialTimer);
      return { id: `repeat-${this.name}-${name}`, name, data };
    }

    const registration = getNativeRegistration(this.name);
    const id = `native-${++nextNativeJobId}`;
    registration.pending.push({ id, name, data });
    runNativeJobs(this.name);
    return { id, name, data };
  }
}

export function createRuntimeQueue(name: string, defaultJobOptions: JobsOptions): RuntimeQueue | Queue {
  if (isNativeRuntime()) return new NativeQueue(name);

  return new Queue(name, {
    connection: createRedisConnection(),
    defaultJobOptions,
  });
}

export function createRuntimeWorker<T>(
  queueName: string,
  processor: Processor<T>,
  concurrency: number
): RuntimeWorker | Worker {
  if (!isNativeRuntime()) {
    return new Worker(queueName, processor, {
      connection: createRedisConnection(),
      concurrency,
    });
  }

  const registration = getNativeRegistration(queueName);
  registration.processor = processor as Processor;
  registration.concurrency = concurrency;
  runNativeJobs(queueName);

  return {
    on(event: string, listener: (...args: any[]) => void) {
      registration.emitter.on(event, listener);
      return this;
    },
    async close() {
      registration.emitter.removeAllListeners();
      registration.pending.length = 0;
    },
  };
}

export async function closeNativeQueueRuntime(): Promise<void> {
  nativeTimers.forEach((timer) => clearInterval(timer));
  nativeTimers.clear();
  nativeRegistrations.clear();
}
