import { Service } from "@token-ring/registry";
import type { Registry } from "@token-ring/registry";

/**
 * A service for managing a queue of work items.
 */
export default class WorkQueueService extends Service {
	/** The name of the service. */
	name = "WorkQueueService";
	/** A description of the service. */
	description = "Provides WorkQueue functionality";

	/** Configuration properties for the constructor. */
	static constructorProperties: any = {
		maxSize: {
			type: "number",
			required: false,
			description: "Maximum size of the work queue. Defaults to unlimited",
		},
	};

	/** The queue of work items. */
	private queue: any[] = [];
	/** The maximum size of the queue. */
    private readonly maxSize: number | undefined;
	/** Whether the service has been started. */
	private _started = false;
	/** The initial message for the queue. */
	private initialMessage: any = null;
	/** The current item being processed. */
	private currentItem: any = null;

	/**
	 * Creates a new WorkQueueService instance.
	 * @param options Configuration options.
	 */
	constructor({ maxSize }: { maxSize?: number } = {}) {
		super();
		this.maxSize = maxSize;
	}

	/**
	 * Reports the status of the service.
	 */
	async status(_registry: Registry): Promise<{ active: boolean; service: string }> {
		return { active: true, service: "WorkQueueService" };
	}

	/**
	 * Initializes the service.
	 */
	async init(_registry: Registry): Promise<void> {
		// Implementation for initialization if needed
	}

	/**
	 * Deinitializes the service.
	 */
	async deinit(_registry: Registry): Promise<void> {
		// Implementation for deinitialization if needed
	}

	/**
	 * Starts the service.
	 */
	async start(_registry?: Registry): Promise<void> {
		this._started = true;
	}

	/** Checks if the service has been started. */
	started(): boolean {
		return this._started;
	}

	/** Sets the initial message for the queue. */
	setInitialMessage(message: any): void {
		this.initialMessage = message;
	}

	/** Gets the initial message for the queue. */
	getInitialMessage(): any {
		return this.initialMessage;
	}

	/** Gets the current item being processed. */
	getCurrentItem(): any {
		return this.currentItem ?? undefined;
	}

	/** Sets the current item being processed. */
	setCurrentItem(item: any): void {
		this.currentItem = item;
	}

	/**
	 * Adds a work item to the end of the queue.
	 * Returns true if the item was added, or false if the queue is full.
	 */
	enqueue(item: any): boolean {
		if (this.maxSize && this.queue.length >= this.maxSize) {
			return false;
		}
		this.queue.push(item);
		return true;
	}

	/** Removes and returns the first item from the queue. */
	dequeue(): any | undefined {
		return this.queue.shift();
	}

	/** Gets the item at the specified index in the queue. */
	get(idx: number): any {
		return this.queue[idx];
	}

	/**
	 * Modifies the queue by removing or replacing items.
	 * Returns the removed items.
	 */
	splice(start: number, deleteCount: number, ...items: any[]): any[] {
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
	getAll(): any[] {
		return [...this.queue];
	}
}
