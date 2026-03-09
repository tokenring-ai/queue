import {AgentCheckpointData, AgentStateSlice} from "@tokenring-ai/agent/types";
import {z} from "zod";
import type {WorkQueueAgentConfigSchema} from "../schema.ts";

export type QueueItem = {
  checkpoint: AgentCheckpointData;
  name: string;
  input: string;
};

const serializationSchema = z.object({
  queue: z.array(z.object({
    checkpoint: z.any(),
    name: z.string(),
    input: z.string()
  })),
  started: z.boolean(),
  currentItem: z.any().nullable(),
  initialCheckpoint: z.any().nullable(),
  maxSize: z.number().nullable(),
});

export class WorkQueueState extends AgentStateSlice<typeof serializationSchema> {
  /** The queue of work items. */
  queue: QueueItem[] = [];
  /** Whether the service has been started. */
  started = false;
  /** The initial agent checkpoint for the queue. */
  initialCheckpoint: AgentCheckpointData | null = null;
  /** The current item being processed. */
  currentItem: QueueItem | null = null;
  maxSize: number | null = null;

  constructor(readonly initialConfig: z.output<typeof WorkQueueAgentConfigSchema>) {
    super("WorkQueueState", serializationSchema);
    this.maxSize = initialConfig.maxSize ?? null;
  }

  reset() {
    this.queue = [];
    this.started = false;
    this.currentItem = null;
    this.initialCheckpoint = null;
  }

  serialize(): z.output<typeof serializationSchema> {
    return {
      started: this.started,
      currentItem: this.currentItem,
      initialCheckpoint: this.initialCheckpoint,
      queue: this.queue,
      maxSize: this.maxSize
    };
  }

  deserialize(data: z.output<typeof serializationSchema>): void {
    this.started = data.started;
    this.currentItem = data.currentItem;
    this.initialCheckpoint = data.initialCheckpoint;
    this.queue = data.queue;
    this.maxSize = data.maxSize;
  }

  show(): string[] {
    return [
      `Started: ${this.started}`,
      `Queue Items: ${this.queue.length}`,
      `Current Item: ${this.currentItem?.name || "None"}`
    ];
  }
}
