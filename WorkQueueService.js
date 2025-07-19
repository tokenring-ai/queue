import { Service } from "@token-ring/registry";

/**
 * A service for managing a queue of work items.
 * @class
 */
export default class WorkQueueService extends Service {
	/** @type {string} The name of the service. */
	name = "WorkQueueService";
	/** @type {string} A description of the service. */
	description = "Provides WorkQueue functionality";

	/** @type {Object} Configuration properties for the constructor. */
	static constructorProperties = {
		maxSize: {
			type: "number",
			required: false,
			description: "Maximum size of the work queue. Defaults to unlimited",
		},
	};

	/**
	 * Creates a new WorkQueueService instance.
	 * @param {Object} [options] - Configuration options.
	 * @param {number} [options.maxSize] - Maximum size of the work queue.
	 */
	constructor({ maxSize } = {}) {
		super();
		/** @type {Array<any>} The queue of work items. */
		this.queue = [];
		/** @type {number|undefined} The maximum size of the queue. */
		this.maxSize = maxSize;
		/** @type {boolean} Whether the service has been started. */
		this._started = false;
		/** @type {any} The initial message for the queue. */
		this.initialMessage = null;
		/** @type {any} The current item being processed. */
		this.currentItem = null;
	}

	/**
	 * Reports the status of the service.
	 * @param {TokenRingRegistry} registry - The package registry.
	 * @returns {Object} Status information.
	 * @property {boolean} active - Whether the service is active.
	 * @property {string} service - The name of the service.
	 */
	async status(registry) {
		return {
			active: true,
			service: "WorkQueueService",
		};
	}

	/**
	 * Starts the service.
	 * @param {TokenRingRegistry} registry
	 * @returns {void}
	 */
	start(registry) {
		this._started = true;
	}

	/**
	 * Checks if the service has been started.
	 * @returns {boolean} Whether the service has been started.
	 */
	started() {
		return this._started;
	}

	/**
	 * Sets the initial message for the queue.
	 * @param {any} message - The initial message.
	 * @returns {void}
	 */
	setInitialMessage(message) {
		this.initialMessage = message;
	}

	/**
	 * Gets the initial message for the queue.
	 * @returns {any} The initial message.
	 */
	getInitialMessage() {
		return this.initialMessage;
	}

	/**
	 * Gets the current item being processed.
	 * @returns {any} The current item.
	 */
	getCurrentItem() {
		return this.currentItem;
	}

	/**
	 * Sets the current item being processed.
	 * @param {any} item - The current item.
	 * @returns {void}
	 */
	setCurrentItem(item) {
		this.currentItem = item;
	}

	/**
	 * Adds a work item to the end of the queue.
	 * @param {any} item - Work item to be added.
	 * @returns {boolean} True if the item was successfully added, false if the queue is full.
	 */
	enqueue(item) {
		if (this.maxSize && this.queue.length >= this.maxSize) {
			return false;
		}
		this.queue.push(item);
		return true;
	}

	/**
	 * Removes and returns the first item from the queue.
	 * @returns {any|undefined} The first item in the queue or undefined if the queue is empty.
	 */
	dequeue() {
		return this.queue.shift();
	}

	/**
	 * Gets the item at the specified index in the queue.
	 * @param {number} idx - The index of the item to retrieve.
	 * @returns {any} The item at the specified index.
	 */
	get(idx) {
		return this.queue[idx];
	}

	/**
	 * Modifies the queue by removing or replacing items.
	 * @param {number} start - The index at which to start changing the queue.
	 * @param {number} deleteCount - The number of items to remove.
	 * @param {...any} items - The items to add to the queue.
	 * @returns {Array<any>} The removed items.
	 */
	splice(start, deleteCount, ...items) {
		return this.queue.splice(start, deleteCount, ...items);
	}

	/**
	 * Returns the current size of the queue.
	 * @returns {number} The number of items in the queue.
	 */
	size() {
		return this.queue.length;
	}

	/**
	 * Checks if the queue is empty.
	 * @returns {boolean} True if the queue is empty, false otherwise.
	 */
	isEmpty() {
		return this.queue.length === 0;
	}

	/**
	 * Clears all items from the queue.
	 * @returns {void}
	 */
	clear() {
		this.queue = [];
	}

	/**
	 * Returns all items in the queue without removing them.
	 * @returns {Array<any>} A copy of the queue.
	 */
	getAll() {
		return [...this.queue];
	}
}
