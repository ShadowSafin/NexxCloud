import EventEmitter from "events";
import Redis from "ioredis";
import { config } from "../config";
import {
  CloudEventType,
  EventPayload,
  EventHandler,
  SerializedEvent,
  serializeEvent,
  deserializeEvent,
} from "./types";

const REDIS_PUBSUB_CHANNEL = "nexxcloud:events";

export class CloudEventEmitter {
  private localEmitter: EventEmitter;
  private pubSubClient: Redis | null = null;
  private subClient: Redis | null = null;
  private handlers: Map<CloudEventType, Set<EventHandler>> = new Map();
  private onceHandlers: Map<CloudEventType, Set<EventHandler>> = new Map();
  private isSubscribed = false;

  constructor() {
    this.localEmitter = new EventEmitter();
    this.localEmitter.setMaxListeners(100);
    if (!config.nativeRuntime) {
      this.initRedis();
    }
  }

  private async initRedis(): Promise<void> {
    try {
      this.pubSubClient = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
      });

      this.subClient = new Redis(config.redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });

      this.subClient.on("message", (_channel: string, message: string) => {
        try {
          const event = deserializeEvent(message);
          this.localEmitter.emit(event.type, event.data);
          const typeHandlers = this.handlers.get(event.type);
          if (typeHandlers) {
            typeHandlers.forEach((handler) => {
              try {
                handler(event.data);
              } catch (err) {
                console.error(`Error in Redis event handler for ${event.type}:`, err);
              }
            });
          }
          const onceTypeHandlers = this.onceHandlers.get(event.type);
          if (onceTypeHandlers) {
            onceTypeHandlers.forEach((handler) => {
              try {
                handler(event.data);
              } catch (err) {
                console.error(`Error in Redis once handler for ${event.type}:`, err);
              }
            });
            this.onceHandlers.delete(event.type);
          }
        } catch (err) {
          console.error("Error deserializing Redis event:", err);
        }
      });
    } catch (err) {
      console.error("Failed to initialize Redis pub/sub:", err);
    }
  }

  private async ensureSubscription(): Promise<void> {
    if (!this.isSubscribed && this.subClient) {
      try {
        await this.subClient.subscribe(REDIS_PUBSUB_CHANNEL);
        this.isSubscribed = true;
      } catch (err) {
        console.error("Failed to subscribe to Redis channel:", err);
      }
    }
  }

  async emit(type: CloudEventType, data: EventPayload): Promise<void> {
    const serialized = serializeEvent(type, data);

    this.localEmitter.emit(type, data);

    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      const promises: Promise<void>[] = [];
      typeHandlers.forEach((handler) => {
        try {
          const result = handler(data);
          if (result instanceof Promise) {
            promises.push(result.catch((err) => {
              console.error(`Error in event handler for ${type}:`, err);
            }));
          }
        } catch (err) {
          console.error(`Error in event handler for ${type}:`, err);
        }
      });
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
    }

    const onceTypeHandlers = this.onceHandlers.get(type);
    if (onceTypeHandlers) {
      const promises: Promise<void>[] = [];
      onceTypeHandlers.forEach((handler) => {
        try {
          const result = handler(data);
          if (result instanceof Promise) {
            promises.push(result.catch((err) => {
              console.error(`Error in once event handler for ${type}:`, err);
            }));
          }
        } catch (err) {
          console.error(`Error in once event handler for ${type}:`, err);
        }
      });
      this.onceHandlers.delete(type);
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
    }

    if (this.pubSubClient) {
      try {
        await this.pubSubClient.publish(REDIS_PUBSUB_CHANNEL, JSON.stringify(serialized));
      } catch (err) {
        console.error("Failed to publish event to Redis:", err);
      }
    }
  }

  on(type: CloudEventType, handler: EventHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    this.ensureSubscription().catch(() => {});
  }

  off(type: CloudEventType, handler: EventHandler): void {
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      typeHandlers.delete(handler);
    }
    const onceTypeHandlers = this.onceHandlers.get(type);
    if (onceTypeHandlers) {
      onceTypeHandlers.delete(handler);
    }
  }

  once(type: CloudEventType, handler: EventHandler): void {
    if (!this.onceHandlers.has(type)) {
      this.onceHandlers.set(type, new Set());
    }
    this.onceHandlers.get(type)!.add(handler);
    this.ensureSubscription().catch(() => {});
  }

  async destroy(): Promise<void> {
    this.handlers.clear();
    this.onceHandlers.clear();
    this.localEmitter.removeAllListeners();

    if (this.isSubscribed && this.subClient) {
      try {
        await this.subClient.unsubscribe(REDIS_PUBSUB_CHANNEL);
      } catch (err) {
        console.error("Error unsubscribing from Redis:", err);
      }
    }

    if (this.pubSubClient) {
      await this.pubSubClient.quit();
    }
    if (this.subClient) {
      await this.subClient.quit();
    }
  }
}
