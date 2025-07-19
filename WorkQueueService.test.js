import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import WorkQueueService from "./WorkQueueService.js";
import ChatCommandRegistry from "@token-ring/registry/ChatCommandRegistry.js";

// Mock dependencies
vi.mock("@token-ring/chat/resources/ChatCommandRegistry", () => ({
	default: class MockChatCommandService {
		constructor() {}
		commands = new Map();

		registerCommand = vi.fn((name, command) => {
			this.commands.set(name, command);
		});

		unregisterCommand = vi.fn((name) => {
			this.commands.delete(name);
		});
	},
}));

describe("WorkQueueService", () => {
	let workQueueService;
	let mockServices;
	let mockChatCommandService;

	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();

		// Setup mock registry
		mockChatCommandService = new ChatCommandRegistry();

		mockServices = {
			requireFirstServiceByType: vi.fn((contextType) => {
				if (contextType === ChatCommandRegistry) {
					return mockChatCommandService;
				}
				return null;
			}),
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// Test 1: Constructor with default parameters
	it("should initialize with default parameters", () => {
		// Execute
		workQueueService = new WorkQueueService();

		// Verify
		expect(workQueueService.queue).toEqual([]);
		expect(workQueueService.maxSize).toBeUndefined();
	});

	// Test 2: Constructor with maxSize parameter
	it("should initialize with maxSize parameter", () => {
		// Execute
		const maxSize = 5;
		workQueueService = new WorkQueueService({ maxSize });

		// Verify
		expect(workQueueService.queue).toEqual([]);
		expect(workQueueService.maxSize).toBe(maxSize);
	});

	// Test 3: Enqueue with unlimited queue
	it("should add items to an unlimited queue", () => {
		// Setup
		workQueueService = new WorkQueueService();
		const item1 = { name: "item1" };
		const item2 = { name: "item2" };

		// Execute
		const result1 = workQueueService.enqueue(item1);
		const result2 = workQueueService.enqueue(item2);

		// Verify
		expect(result1).toBe(true);
		expect(result2).toBe(true);
		expect(workQueueService.queue).toEqual([item1, item2]);
		expect(workQueueService.size()).toBe(2);
	});

	// Test 4: Enqueue with size limit
	it("should respect maxSize when adding items", () => {
		// Setup
		workQueueService = new WorkQueueService({ maxSize: 2 });
		const item1 = { name: "item1" };
		const item2 = { name: "item2" };
		const item3 = { name: "item3" };

		// Execute
		const result1 = workQueueService.enqueue(item1);
		const result2 = workQueueService.enqueue(item2);
		const result3 = workQueueService.enqueue(item3); // This should fail

		// Verify
		expect(result1).toBe(true);
		expect(result2).toBe(true);
		expect(result3).toBe(false); // Should return false when queue is full
		expect(workQueueService.queue).toEqual([item1, item2]);
		expect(workQueueService.size()).toBe(2);
	});

	// Test 5: Dequeue from empty queue
	it("should return undefined when dequeuing from empty queue", () => {
		// Setup
		workQueueService = new WorkQueueService();

		// Execute
		const result = workQueueService.dequeue();

		// Verify
		expect(result).toBeUndefined();
	});

	// Test 6: Service initialization and deinitialization
	it("should register and unregister commands during init and deinit", async () => {
		// Setup
		workQueueService = new WorkQueueService();

		// Execute
		await workQueueService.init(mockServices);

		// Verify
		expect(mockServices.requireFirstServiceByType).toHaveBeenCalledWith(
			ChatCommandRegistry,
		);
		expect(mockChatCommandService.registerCommand).toHaveBeenCalledWith(
			"queue",
			expect.any(Object),
		);

		// Execute deinit
		await workQueueService.deinit(mockServices);

		// Verify
		expect(mockChatCommandService.unregisterCommand).toHaveBeenCalledWith(
			"queue",
		);
	});

	// Test 7: Queue state management methods
	it("should correctly manage queue state", () => {
		// Setup
		workQueueService = new WorkQueueService();
		const message = { id: "test-message" };
		const item = { name: "test-item" };

		// Execute and verify start/started
		expect(workQueueService.started()).toBeUndefined();
		workQueueService.start();
		expect(workQueueService._started).toBe(true);
		expect(workQueueService.started()).toBe(true);

		// Execute and verify initial message
		workQueueService.setInitialMessage(message);
		expect(workQueueService.getInitialMessage()).toBe(message);

		// Execute and verify current item
		expect(workQueueService.getCurrentItem()).toBeUndefined();
		workQueueService.setCurrentItem(item);
		expect(workQueueService.getCurrentItem()).toBe(item);
	});

	// Test 8: Queue manipulation methods
	it("should correctly manipulate queue contents", () => {
		// Setup
		workQueueService = new WorkQueueService();
		const item1 = { name: "item1" };
		const item2 = { name: "item2" };
		const item3 = { name: "item3" };

		// Test enqueue and size
		workQueueService.enqueue(item1);
		workQueueService.enqueue(item2);
		workQueueService.enqueue(item3);
		expect(workQueueService.size()).toBe(3);
		expect(workQueueService.isEmpty()).toBe(false);

		// Test get
		expect(workQueueService.get(1)).toBe(item2);

		// Test getAll
		expect(workQueueService.getAll()).toEqual([item1, item2, item3]);
		expect(workQueueService.getAll()).not.toBe(workQueueService.queue); // Should be a copy

		// Test splice
		const removed = workQueueService.splice(1, 1);
		expect(removed).toEqual([item2]);
		expect(workQueueService.size()).toBe(2);
		expect(workQueueService.getAll()).toEqual([item1, item3]);

		// Test dequeue
		const dequeued = workQueueService.dequeue();
		expect(dequeued).toBe(item1);
		expect(workQueueService.size()).toBe(1);

		// Test clear
		workQueueService.clear();
		expect(workQueueService.size()).toBe(0);
		expect(workQueueService.isEmpty()).toBe(true);
	});
});
