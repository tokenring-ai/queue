export * as chatCommands from "./chatCommands.ts";
export * as tools from "./tools.ts";
export { default as WorkQueueService } from "./WorkQueueService.ts";

export const name = "@token-ring/queue" as const;
export const description = "Service that adds an in-memory work queue" as const;
export const version = "0.1.0" as const;
