import { CloudEventEmitter } from "./EventEmitter";
import { registerDefaultHandlers } from "./handlers";

let instance: CloudEventEmitter | null = null;

export function getEventEmitter(): CloudEventEmitter {
  if (!instance) {
    instance = new CloudEventEmitter();
    registerDefaultHandlers(instance);
  }
  return instance;
}

export { CloudEventEmitter } from "./EventEmitter";
export * from "./types";
