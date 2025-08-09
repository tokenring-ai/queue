/**
 * A service for managing a queue of work items.
 * @class
 */
export default class WorkQueueService extends Service {
	/** @type {Object} Configuration properties for the constructor. */
	static constructorProperties: any;
	/**
	 * Creates a new WorkQueueService instance.
	 * @param {Object} [options] - Configuration options.
	 * @param {number} [options.maxSize] - Maximum size of the work queue.
	 */
	constructor({
		maxSize,
	}?: {
		maxSize?: number;
	});
	/** @type {Array<any>} The queue of work items. */
	queue: Array<any>;
	/** @type {number|undefined} The maximum size of the queue. */
	maxSize: number | undefined;
	/** @type {boolean} Whether the service has been started. */
	_started: boolean;
	/** @type {any} The initial message for the queue. */
	initialMessage: any;
	/** @type {any} The current item being processed. */
	currentItem: any;
	/**
	 * Reports the status of the service.
	 * @param {TokenRingRegistry} registry - The package registry.
	 * @returns {Object} Status information.
	 * @property {boolean} active - Whether the service is active.
	 * @property {string} service - The name of the service.
	 */
	status(_registry: any): any;
	/**
	 * Starts the service.
	 * @param {TokenRingRegistry} registry
	 * @returns {void}
	 */
	start(_registry: any): void;
	/**
	 * Checks if the service has been started.
	 * @returns {boolean} Whether the service has been started.
	 */
	started(): boolean;
	/**
	 * Sets the initial message for the queue.
	 * @param {any} message - The initial message.
	 * @returns {void}
	 */
	setInitialMessage(message: any): void;
	/**
	 * Gets the initial message for the queue.
	 * @returns {any} The initial message.
	 */
	getInitialMessage(): any;
	/**
	 * Gets the current item being processed.
	 * @returns {any} The current item.
	 */
	getCurrentItem(): any;
	/**
	 * Sets the current item being processed.
	 * @param {any} item - The current item.
	 * @returns {void}
	 */
	setCurrentItem(item: any): void;
	/**
	 * Adds a work item to the end of the queue.
	 * @param {any} item - Work item to be added.
	 * @returns {boolean} True if the item was successfully added, false if the queue is full.
	 */
	enqueue(item: any): boolean;
	/**
	 * Removes and returns the first item from the queue.
	 * @returns {any|undefined} The first item in the queue or undefined if the queue is empty.
	 */
	dequeue(): any | undefined;
	/**
	 * Gets the item at the specified index in the queue.
	 * @param {number} idx - The index of the item to retrieve.
	 * @returns {any} The item at the specified index.
	 */
	get(idx: number): any;
	/**
	 * Modifies the queue by removing or replacing items.
	 * @param {number} start - The index at which to start changing the queue.
	 * @param {number} deleteCount - The number of items to remove.
	 * @param {...any} items - The items to add to the queue.
	 * @returns {Array<any>} The removed items.
	 */
	splice(start: number, deleteCount: number, ...items: any[]): Array<any>;
	/**
	 * Returns the current size of the queue.
	 * @returns {number} The number of items in the queue.
	 */
	size(): number;
	/**
	 * Checks if the queue is empty.
	 * @returns {boolean} True if the queue is empty, false otherwise.
	 */
	isEmpty(): boolean;
	/**
	 * Clears all items from the queue.
	 * @returns {void}
	 */
	clear(): void;
	/**
	 * Returns all items in the queue without removing them.
	 * @returns {Array<any>} A copy of the queue.
	 */
	getAll(): Array<any>;
}
import { Service } from "@token-ring/registry";
