// src/services/logger.ts

export type LogEntry = {
  timestamp: string;
  level: "info" | "error" | "warn";
  message: string;
  metadata?: object | string | number;
};

let logs: LogEntry[] = [];

export function logInfo(
  message: LogEntry["message"],
  metadata?: LogEntry["metadata"]
) {
  const entry: LogEntry = {
    timestamp: new Date().toLocaleString(),
    level: "info",
    message: String(message),
    metadata,
  };
  logs.push(entry);
  console.log("[INFO]", message, metadata);
}

export function logError(
  message: LogEntry["message"],
  metadata?: LogEntry["metadata"]
) {
  const entry: LogEntry = {
    timestamp: new Date().toLocaleString(),
    level: "error",
    message: String(message),
    metadata,
  };
  logs.push(entry);
  console.error("[ERROR]", message, metadata);
}

export function getLogs() {
  return logs;
}

export function clearLogs() {
  logs = [];
}
