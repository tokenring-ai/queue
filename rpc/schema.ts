import type { RPCSchema } from "@tokenring-ai/rpc/types";
import { SuccessSchema } from "@tokenring-ai/rpc/types";
import { z } from "zod";
import { QueueItemSchema, ResultItemSchema } from "../state/queueState.ts";

/** Wire-safe queue config with concrete (resolved) fields for the frontend. */
const QueueConfigSnapshotSchema = z.object({
  agentType: z.string(),
  concurrency: z.number(),
  maxSize: z.number().nullable(),
  maxResults: z.number(),
});

/** A single queue's full runtime state, projected for the wire. */
const QueueSnapshotSchema = z.object({
  config: QueueConfigSnapshotSchema,
  items: z.array(QueueItemSchema),
  results: z.array(ResultItemSchema),
});

const QueueNotFoundSchema = z.object({ status: z.literal("queueNotFound") });
const QueueExistsSchema = z.object({ status: z.literal("queueExists") });
const InvalidAgentTypeSchema = z.object({ status: z.literal("invalidAgentType") });

export default {
  name: "Queue RPC",
  path: "/rpc/queue",
  methods: {
    streamQueues: {
      type: "stream",
      input: z.object({}),
      result: SuccessSchema.extend({
        queues: z.record(z.string(), QueueSnapshotSchema),
      }),
    },
    enqueue: {
      type: "mutation",
      input: z.object({
        queueName: z.string(),
        name: z.string(),
        input: z.string(),
        from: z.string().optional(),
      }),
      result: z.discriminatedUnion("status", [
        SuccessSchema.extend({
          itemId: z.string(),
          position: z.number(),
          message: z.string(),
        }),
        QueueNotFoundSchema,
      ]),
    },
    cancelItem: {
      type: "mutation",
      input: z.object({
        queueName: z.string(),
        itemId: z.string(),
      }),
      result: SuccessSchema.extend({
        cancelled: z.boolean(),
        message: z.string(),
      }),
    },
    clear: {
      type: "mutation",
      input: z.object({
        queueName: z.string(),
      }),
      result: z.discriminatedUnion("status", [
        SuccessSchema.extend({
          removed: z.number(),
          message: z.string(),
        }),
        QueueNotFoundSchema,
      ]),
    },
    createQueue: {
      type: "mutation",
      input: z.object({
        name: z.string(),
        agentType: z.string(),
        concurrency: z.number().int().positive().optional(),
        maxSize: z.number().int().positive().nullable().optional(),
        maxResults: z.number().int().positive().optional(),
      }),
      result: z.discriminatedUnion("status", [
        SuccessSchema.extend({
          message: z.string(),
        }),
        QueueExistsSchema,
        InvalidAgentTypeSchema,
      ]),
    },
  },
} satisfies RPCSchema;
