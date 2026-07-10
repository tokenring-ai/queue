import { AppStateSlice } from "@tokenring-ai/app/types";
import { z } from "zod";
import type { ParsedQueueConfig, QueueConfig } from "../schema.ts";
import { QueueConfigSchema } from "../schema.ts";

export const QueueItemStatusSchema = z.enum(["pending", "running"]);
export type QueueItemStatus = z.output<typeof QueueItemStatusSchema>;

export const ResultItemStatusSchema = z.enum(["completed", "failed", "cancelled"]);
export type ResultItemStatus = z.output<typeof ResultItemStatusSchema>;

const queueItemBase = {
  id: z.string(),
  queueName: z.string(),
  name: z.string(),
  input: z.string(),
  from: z.string(),
  createdAt: z.number(),
  startedAt: z.number().nullish(),
  agentId: z.string().nullish(),
  requestId: z.string().nullish(),
} as const;

export const QueueItemSchema = z.object({
  ...queueItemBase,
  status: QueueItemStatusSchema,
});
export type QueueItem = z.output<typeof QueueItemSchema>;

export const ResultItemSchema = z.object({
  ...queueItemBase,
  status: ResultItemStatusSchema,
  completedAt: z.number(),
  durationMs: z.number(),
  resultMessage: z.string(),
});
export type ResultItem = z.output<typeof ResultItemSchema>;

export type QueueData = {
  config: QueueConfig;
  items: QueueItem[];
  results: ResultItem[];
};

export const QueueDataSchema = z.object({
  config: QueueConfigSchema,
  items: z.array(QueueItemSchema),
  results: z.array(ResultItemSchema),
});

const serializationSchema = z.object({
  queues: z.record(z.string(), QueueDataSchema),
});

/**
 * App-level state slice holding every queue's configuration, pending/running items, and the
 * bounded history of recently completed results.
 *
 * Queue *definitions* (name + config) are sourced from the service config at construction time.
 * The runtime data (items + results) is what gets persisted and restored: on restore, any item
 * that was `running` is reset to `pending` so it re-dispatches, and `results` are trimmed to the
 * queue's `maxResults`.
 */
export class QueueState extends AppStateSlice<typeof serializationSchema> {
  queues = new Map<string, QueueData>();

  constructor(private readonly options: ParsedQueueConfig) {
    super("QueueState", serializationSchema);
    this.buildQueuesFromConfig();
  }

  private resolveConfig(
    agentType: string | undefined,
    concurrency: number | undefined,
    maxSize: number | null | undefined,
    maxResults: number | null | undefined,
  ): QueueConfig {
    return {
      agentType: agentType ?? this.options.defaultAgentType,
      concurrency: concurrency ?? this.options.defaultConcurrency,
      maxSize: maxSize ?? null,
      maxResults: maxResults ?? this.options.maxResults,
    };
  }

  private buildQueuesFromConfig(): void {
    this.queues = new Map();

    const configured = this.options.queues;
    const defaultCfg = configured.default;

    this.queues.set("default", {
      config: this.resolveConfig(defaultCfg?.agentType, defaultCfg?.concurrency, defaultCfg?.maxSize, defaultCfg?.maxResults),
      items: [],
      results: [],
    });

    for (const [name, cfg] of Object.entries(configured)) {
      if (name === "default") continue;
      this.queues.set(name, {
        config: this.resolveConfig(cfg.agentType, cfg.concurrency, cfg.maxSize, cfg.maxResults),
        items: [],
        results: [],
      });
    }
  }

  serialize(): z.output<typeof serializationSchema> {
    return {
      queues: Object.fromEntries(
        Array.from(this.queues.entries()).map(([name, data]) => [name, { config: data.config, items: data.items, results: data.results }]),
      ),
    };
  }

  deserialize(data: z.output<typeof serializationSchema>): void {
    // Rebuild queue definitions from the current config (config is the source of truth for
    // definitions), then overlay persisted runtime data for any queues that still exist.
    this.buildQueuesFromConfig();

    for (const [name, saved] of Object.entries(data.queues)) {
      const existing = this.queues.get(name);
      if (!existing) continue;

      existing.items = saved.items.map(item =>
        item.status === "running" ? { ...item, status: "pending" as const, startedAt: null, agentId: null, requestId: null } : item,
      );
      const max = existing.config.maxResults;
      existing.results = saved.results.slice(Math.max(0, saved.results.length - max));
    }
  }
}
