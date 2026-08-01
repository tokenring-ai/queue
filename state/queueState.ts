import { InputMessageSchema } from "@tokenring-ai/agent/AgentEvents";
import { AppStateSlice } from "@tokenring-ai/app/types";
import EnhancedMap from "@tokenring-ai/utility/map/enhancedMap";
import { z } from "zod";
import type { QueueConfig } from "../schema.ts";

export const QueueItemStatusSchema = z.enum(["pending", "running"]);
export type QueueItemStatus = z.output<typeof QueueItemStatusSchema>;

export const ResultItemStatusSchema = z.enum(["completed", "failed", "cancelled"]);
export type ResultItemStatus = z.output<typeof ResultItemStatusSchema>;

const queueItemBase = {
  id: z.string(),
  queueName: z.string(),
  name: z.string(),
  /** Complete agent input message (text + optional attachments) delivered when the item runs. */
  input: InputMessageSchema,
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

/** Runtime data for one named queue. Config lives on {@link QueueService}, not here. */
export type QueueRuntimeData = {
  items: QueueItem[];
  results: ResultItem[];
};

/**
 * Wire/UI projection of a queue, including the service-owned config snapshot.
 * Not stored in app state.
 */
export type QueueData = {
  config: QueueConfig;
  items: QueueItem[];
  results: ResultItem[];
};

const QueueRuntimeSchema = z.object({
  items: z.array(QueueItemSchema),
  results: z.array(ResultItemSchema),
  // Older checkpoints embedded config; accept and ignore it.
  config: z.unknown().optional(),
});

const serializationSchema = z.object({
  queues: z.record(z.string(), QueueRuntimeSchema),
});

/**
 * App-level state for queue runtime only: pending/running items and completed results.
 *
 * Queue *definitions* (agent type, concurrency, limits) live on {@link QueueService}
 * and are never persisted in this slice.
 */
export class QueueState extends AppStateSlice<typeof serializationSchema> {
  queues = new EnhancedMap<string, QueueRuntimeData>();

  constructor(_props: Record<string, never> = {}) {
    super("QueueState", serializationSchema);
  }

  /** Ensures a runtime bucket exists for `name` and returns it. */
  ensureQueue(name: string): QueueRuntimeData {
    let data = this.queues.get(name);
    if (!data) {
      data = { items: [], results: [] };
      this.queues.set(name, data);
    }
    return data;
  }

  serialize(): z.output<typeof serializationSchema> {
    return {
      queues: Object.fromEntries(this.queues.mapEntries(([name, data]) => [name, { items: data.items, results: data.results }])),
    };
  }

  deserialize(data: z.output<typeof serializationSchema>): void {
    this.queues = new EnhancedMap();

    for (const [name, saved] of Object.entries(data.queues)) {
      this.queues.set(name, {
        items: saved.items.map(item =>
          item.status === "running" ? { ...item, status: "pending" as const, startedAt: null, agentId: null, requestId: null } : item,
        ),
        results: saved.results,
      });
    }
  }
}
