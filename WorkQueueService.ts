import {StoredChatMessage} from "@token-ring/ai-client/ChatMessageStorage";
import {ChatInputMessage} from "@token-ring/ai-client/client/AIChatClient";
import type {Registry} from "@token-ring/registry";
import {Service} from "@token-ring/registry";

type QueueItem = {
  currentMessage?: StoredChatMessage | null;
  name: string;
  input: ChatInputMessage[];
}

/**
 * A service for managing a queue of work items.
 */
export default class WorkQueueService extends Service {
  /** Configuration properties for the constructor. */
  static constructorProperties: Record<string, unknown> = {
    maxSize: {
      type: "number",
      required: false,
      description: "Maximum size of the work queue. Defaults to unlimited",
    },
  };
  /** The name of the service. */
  name = "WorkQueueService";
  /** A description of the service. */
  description = "Provides WorkQueue functionality";
  /** The queue of work items. */
  queue: QueueItem[] = [];
  /** The maximum size of the queue. */
  readonly maxSize: number | undefined;
  /** Whether the service has been started. */
  _started = false;
  /** The initial message for the queue. */
  private initialMessage: StoredChatMessage | null = null;
  /** The current item being processed. */
  private currentItem: QueueItem | null = null;

  /**
   * Creates a new WorkQueueService instance.
   */
  constructor({maxSize}: { maxSize?: number } = {}) {
    super();
    this.maxSize = maxSize;
  }

  /**
   * Reports the status of the service.
   */
  async status(_registry: Registry): Promise<{ active: boolean; service: string }> {
    return {active: true, service: "WorkQueueService"};
  }

  /**
   * Starts the service.
   */
  async start(_registry: Registry): Promise<void> {
    this._started = true;
  }

  /**
   * Stops the service.
   */
  async stop(_registry: Registry): Promise<void> {
    this._started = false;
    this.currentItem = null;
  }

  /** Checks if the service has been started. */
  started(): boolean {
    return this._started;
  }

  /** Sets the initial message for the queue. */
  setInitialMessage(message: StoredChatMessage | null): void {
    this.initialMessage = message;
  }

  /** Gets the initial message for the queue. */
  getInitialMessage(): StoredChatMessage | null {
    return this.initialMessage;
  }

  /** Gets the current item being processed. */
  getCurrentItem(): QueueItem | null {
    return this.currentItem;
  }

  /** Sets the current item being processed. */
  setCurrentItem(item: QueueItem | null): void {
    this.currentItem = item;
  }

  /**
   * Adds a work item to the end of the queue.
   * Returns true if the item was added, or false if the queue is full.
   */
  enqueue(item: QueueItem): boolean {
    if (this.maxSize && this.queue.length >= this.maxSize) {
      return false;
    }
    this.queue.push(item);
    return true;
  }

  /** Removes and returns the first item from the queue. */
  dequeue(): QueueItem | undefined {
    return this.queue.shift();
  }

  /** Gets the item at the specified index in the queue. */
  get(idx: number): QueueItem {
    return this.queue[idx];
  }

  /**
   * Modifies the queue by removing or replacing items.
   * Returns the removed items.
   */
  splice(start: number, deleteCount: number, ...items: QueueItem[]): QueueItem[] {
    return this.queue.splice(start, deleteCount, ...items);
  }

  /** Returns the current size of the queue. */
  size(): number {
    return this.queue.length;
  }

  /** Checks if the queue is empty. */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /** Clears all items from the queue. */
  clear(): void {
    this.queue = [];
  }

  /** Returns all items in the queue without removing them. */
  getAll(): QueueItem[] {
    return [...this.queue];
  }
}
