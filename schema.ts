import { z } from "zod";

/**
 * Configuration for a single named queue.
 *
 * - `agentType`: the type of agent spawned to process each item placed in the queue.
 * - `concurrency`: the maximum number of agents that may work the queue at any time.
 * - `maxSize`: optional cap on the number of pending (unstarted) items.
 * - `maxResults`: optional cap on the number of completed items retained as results.
 */
export const QueueConfigSchema = z.object({
  agentType: z.string(),
  concurrency: z.number().int().positive().optional(),
  maxSize: z.number().int().positive().nullish(),
  maxResults: z.number().int().positive().nullish(),
});

export type QueueConfig = {
  agentType: string;
  concurrency: number;
  maxSize: number | null;
  maxResults: number;
};

/**
 * Service-level configuration for the app-level work queue.
 *
 * A `default` queue is always created (using `defaultAgentType` and `defaultConcurrency` unless
 * overridden under `queues.default`). Additional named queues can be configured under `queues`.
 */
export const QueueServiceConfigSchema = z.object({
  defaultAgentType: z.string().default("code"),
  defaultConcurrency: z.number().int().positive().default(1),
  maxResults: z.number().int().positive().default(100),
  pollIntervalMs: z.number().int().positive().default(500),
  queues: z.record(z.string(), QueueConfigSchema).prefault({}),
});

export type ParsedQueueConfig = z.output<typeof QueueServiceConfigSchema>;
