import {Agent} from "@tokenring-ai/agent";
import {AgentStateSlice} from "@tokenring-ai/agent/Agent";
import {AgentCheckpointData} from "@tokenring-ai/agent/AgentCheckpointProvider";
import {ResetWhat} from "@tokenring-ai/agent/AgentEvents";
import {TokenRingService} from "@tokenring-ai/agent/types";
import {ChatInputMessage} from "@tokenring-ai/ai-client/client/AIChatClient";

type QueueItem = {
  checkpoint: AgentCheckpointData;
  name: string;
  input: ChatInputMessage[];
}

class WorkQueueState implements AgentStateSlice {
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
    if (what.includes('chat')) {
      this.queue = [];
      this.started = false;
      this.currentItem = null;
      this.initialCheckpoint = null;
    }
  }
  serialize() : object {
    return {
      started: this.started,
      currentItem: this.currentItem,
      initialCheckpoint: this.initialCheckpoint,
      queue: this.queue,
    }
  }
  deserialize(data: any) : void {
    this.started = data.started;
    this.currentItem = data.currentItem;
    this.initialCheckpoint = data.initialCheckpoint;
    this.queue = data.queue;
  }
}


/**
 * A service for managing a queue of work items.
 */
export default class WorkQueueService implements TokenRingService {
  name = "WorkQueueService";
  description = "Provides WorkQueue functionality";

  /** The maximum size of the queue. */
  readonly maxSize: number | undefined;

  /**
   * Creates a new WorkQueueService instance.
   */
  constructor({maxSize}: { maxSize?: number } = {}) {
    this.maxSize = maxSize;
  }

  async attach(agent: Agent): Promise<void> {
    agent.initializeState(WorkQueueState, {});
  }

  startWork(agent: Agent): void {
    agent.mutateState(WorkQueueState, (state: WorkQueueState) => {
      state.started = true;
    })
  }

  /**
   * Stops the service.
   */
  stopWork(agent: Agent): void {
    agent.mutateState(WorkQueueState, (state: WorkQueueState) => {
      state.started = false;
      state.currentItem = null;
    })
  }

  /** Checks if the service has been started. */
  started(agent: Agent): boolean {
    return agent.getState(WorkQueueState).started;
  }

  /** Sets the initial message for the queue. */
  setInitialCheckpoint(message: AgentCheckpointData, agent: Agent): void {
    agent.mutateState(WorkQueueState, (state: WorkQueueState) => {
      state.initialCheckpoint = message;
    })
  }

  clearInitialCheckpoint(agent: Agent): void {
    agent.mutateState(WorkQueueState, (state: WorkQueueState) => {
      state.initialCheckpoint = null;
    })
  }

  /** Gets the initial agent state checkpoint for the queue. */
  getInitialCheckpoint(agent: Agent): AgentCheckpointData | null {
    return agent.getState(WorkQueueState).initialCheckpoint;
  }

  /** Gets the current item being processed. */
  getCurrentItem(agent: Agent): QueueItem | null {
    return agent.getState(WorkQueueState).currentItem;
  }

  /** Sets the current item being processed. */
  setCurrentItem(item: QueueItem | null, agent: Agent): void {
    return agent.mutateState(WorkQueueState, (state: WorkQueueState) => {
      state.currentItem = item;
    })
  }

  /**
   * Adds a work item to the end of the queue.
   * Returns true if the item was added, or false if the queue is full.
   */
  enqueue(item: QueueItem, agent: Agent): boolean {
    return agent.mutateState(WorkQueueState, (state: WorkQueueState) => {
      if (this.maxSize && state.queue.length >= this.maxSize) {
        return false;
      }
      state.queue.push(item);
      return true;
    });
  }

  /** Removes and returns the first item from the queue. */
  dequeue(agent: Agent): QueueItem | undefined {
    return agent.mutateState(WorkQueueState, (state: WorkQueueState) => {
      return state.queue.shift();
    });
  }

  /** Gets the item at the specified index in the queue. */
  get(idx: number, agent: Agent): QueueItem {
    return agent.getState(WorkQueueState).queue[idx];
  }

  /**
   * Modifies the queue by removing or replacing items.
   * Returns the removed items.
   */
  splice(start: number, deleteCount: number, agent: Agent, ...items: QueueItem[]): QueueItem[] {
    return agent.mutateState(WorkQueueState, (state: WorkQueueState) => {
      return state.queue.splice(start, deleteCount, ...items);
    })
  }

  /** Returns the current size of the queue. */
  size(agent: Agent): number {
    return agent.getState(WorkQueueState).queue.length;
  }

  /** Checks if the queue is empty. */
  isEmpty(agent: Agent): boolean {
    return agent.getState(WorkQueueState).queue.length === 0;
  }

  /** Clears all items from the queue. */
  clear(agent: Agent): void {
    agent.mutateState(WorkQueueState, (state: WorkQueueState) => {
      state.queue = [];
    })
  }

  /** Returns all items in the queue without removing them. */
  getAll(agent: Agent): QueueItem[] {
    return [...agent.getState(WorkQueueState).queue];
  }
}
