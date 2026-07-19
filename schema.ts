import type { ConfigFieldMeta } from "@tokenring-ai/app/config/metadata";
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
  agentType: z.string().meta({ description: "Type of agent spawned to process items in this queue" } satisfies ConfigFieldMeta),
  concurrency: z
    .number()
    .int()
    .positive()
    .optional()
    .meta({ description: "Maximum number of agents working this queue at once" } satisfies ConfigFieldMeta),
  maxSize: z
    .number()
    .int()
    .positive()
    .nullish()
    .meta({ description: "Cap on pending (unstarted) items", advanced: true } satisfies ConfigFieldMeta),
  maxResults: z
    .number()
    .int()
    .positive()
    .nullish()
    .meta({ description: "Cap on completed items retained as results", advanced: true } satisfies ConfigFieldMeta),
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
export const QueueServiceConfigSchema = z
  .object({
    defaultAgentType: z
      .string()
      .default("code")
      .meta({ description: "Agent type used by the default queue" } satisfies ConfigFieldMeta),
    defaultConcurrency: z
      .number()
      .int()
      .positive()
      .default(1)
      .meta({ description: "Concurrency used by the default queue" } satisfies ConfigFieldMeta),
    maxResults: z
      .number()
      .int()
      .positive()
      .default(100)
      .meta({ description: "Default cap on completed items retained as results", advanced: true } satisfies ConfigFieldMeta),
    pollIntervalMs: z
      .number()
      .int()
      .positive()
      .default(500)
      .meta({ unit: "ms", description: "How often queues are polled for new work", advanced: true } satisfies ConfigFieldMeta),
    queues: z
      .record(z.string(), QueueConfigSchema)
      .prefault({})
      .meta({ label: "Named Queues", description: "Additional queues beyond the default, keyed by name" } satisfies ConfigFieldMeta),
  })
  .meta({ label: "Queue", description: "App-level work queue for dispatching tasks to pools of agents" } satisfies ConfigFieldMeta);

export type ParsedQueueConfig = z.output<typeof QueueServiceConfigSchema>;
