import "./lib/bigintPatch";
import { startAllWorkers, stopAllWorkers } from "./workers";

console.log("Starting NexxCloud worker process...");

const workers = startAllWorkers();

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down workers...`);
  await stopAllWorkers(workers);
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});
