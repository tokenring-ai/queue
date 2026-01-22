import type {ResetWhat} from "@tokenring-ai/agent/AgentEvents";
import {AgentCheckpointData, AgentStateSlice} from "@tokenring-ai/agent/types";
import {z} from "zod";

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
  initialCheckpoint: z.any().nullable()
});

export class WorkQueueState implements AgentStateSlice<typeof serializationSchema> {
  name = "WorkQueueState";
  serializationSchema = serializationSchema;
  /** The queue of work items. */
  queue: QueueItem[] = [];
  /** Whether the service has been started. */
  started = false;
  /** The initial agent checkpoint for the queue. */
  initialCheckpoint: AgentCheckpointData | null = null;
  /** The current item being processed. */
  currentItem: QueueItem | null = null;

  reset(what: ResetWhat[]) {
    if (what.includes("chat")) {
      this.queue = [];
      this.started = false;
      this.currentItem = null;
      this.initialCheckpoint = null;
    }
  }

  serialize(): z.output<typeof serializationSchema> {
    return {
      started: this.started,
      currentItem: this.currentItem,
      initialCheckpoint: this.initialCheckpoint,
      queue: this.queue,
    };
  }

  deserialize(data: z.output<typeof serializationSchema>): void {
    this.started = data.started;
    this.currentItem = data.currentItem;
    this.initialCheckpoint = data.initialCheckpoint;
    this.queue = data.queue;
  }

  show(): string[] {
    return [
      `Started: ${this.started}`,
      `Queue Items: ${this.queue.length}`,
      `Current Item: ${this.currentItem?.name || "None"}`
    ];
  }
}
