import type {ResetWhat} from "@tokenring-ai/agent/AgentEvents";
import {AgentCheckpointData, AgentStateSlice} from "@tokenring-ai/agent/types";
import type {ChatInputMessage} from "@tokenring-ai/ai-client/client/AIChatClient";

export type QueueItem = {
	checkpoint: AgentCheckpointData;
	name: string;
	input: ChatInputMessage[];
};

export class WorkQueueState implements AgentStateSlice {
	name = "WorkQueueState";
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

	serialize(): object {
		return {
			started: this.started,
			currentItem: this.currentItem,
			initialCheckpoint: this.initialCheckpoint,
			queue: this.queue,
		};
	}

	deserialize(data: any): void {
		this.started = data.started;
		this.currentItem = data.currentItem;
		this.initialCheckpoint = data.initialCheckpoint;
		this.queue = data.queue;
	}
}
