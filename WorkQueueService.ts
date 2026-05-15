import type { Agent } from "@tokenring-ai/agent";
import type { AgentCheckpointData } from "@tokenring-ai/agent/types";
import type { TokenRingService } from "@tokenring-ai/app/types";
import deepClone from "@tokenring-ai/utility/object/deepClone";
import { type ParsedWorkQueueConfig, WorkQueueAgentConfigSchema } from "./schema.ts";
import type { QueueItem } from "./state/workQueueState.ts";
import { WorkQueueState } from "./state/workQueueState.ts";

/**
 * A service for managing a queue of work items.
 */
export default class WorkQueueService implements TokenRingService {
  readonly name = "WorkQueueService";
  description = "Provides Work Queue functionality";

  /**
   * Creates a new WorkQueueService instance.
   */
  constructor(private readonly options: ParsedWorkQueueConfig) {}

  attach(agent: Agent): void {
    const config = deepClone(this.options.agentDefaults, agent.getAgentConfigSlice("queue", WorkQueueAgentConfigSchema));

    agent.initializeState(WorkQueueState, config);
  }

  startWork(agent: Agent): void {
    agent.mutateState(WorkQueueState, (state: WorkQueueState) => {
      state.started = true;
    });
  }

  /**
   * Stops the service.
   */
  stopWork(agent: Agent): void {
    agent.mutateState(WorkQueueState, (state: WorkQueueState) => {
      state.started = false;
      state.currentItem = null;
    });
  }

  /** Checks if the service has been started. */
  started(agent: Agent): boolean {
    return agent.getState(WorkQueueState).started;
  }

  /** Sets the initial message for the queue. */
  setInitialCheckpoint(message: AgentCheckpointData, agent: Agent): void {
    agent.mutateState(WorkQueueState, (state: WorkQueueState) => {
      state.initialCheckpoint = message;
    });
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
    agent.mutateState(WorkQueueState, (state: WorkQueueState) => {
      state.currentItem = item;
    });
  }

  /**
   * Adds a work item to the end of the queue.
   * Returns true if the item was added, or false if the queue is full.
   */
  enqueue(item: QueueItem, agent: Agent): boolean {
    return agent.mutateState(WorkQueueState, (state: WorkQueueState) => {
      if (state.maxSize && state.queue.length >= state.maxSize) {
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
    });
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
    });
  }

  /** Returns all items in the queue without removing them. */
  getAll(agent: Agent): QueueItem[] {
    return [...agent.getState(WorkQueueState).queue];
  }
}
