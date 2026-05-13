import { Agent } from "@tokenring-ai/agent";
import createTestingAgent from "@tokenring-ai/agent/test/createTestingAgent";
import TokenRingApp from "@tokenring-ai/app";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkQueueState } from "../state/workQueueState.ts";
import WorkQueueService from "../WorkQueueService.ts";

// Mock dependencies
vi.mock("@tokenring-ai/chat/resources/ChatCommandRegistry", () => ({
  default: class MockChatCommandService {
    commands = new Map();
  },
}));

describe("WorkQueueService", () => {

  let app: TokenRingApp;
  let workQueueService!: WorkQueueService;
  let agent!: Agent;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    app = createTestingApp();
    agent = createTestingAgent(app);
    workQueueService = new WorkQueueService({
      agentDefaults: {},
    });
    app.addServices(workQueueService);
    workQueueService.attach(agent);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Constructor with default parameters
  it("should initialize with default parameters", () => {
    const state = agent.getState(WorkQueueState);

    // Verify
    expect(state.queue).toEqual([]);
    expect(workQueueService.size(agent)).toBe(0);
  });

  // Test 2: Constructor with maxSize parameter
  it("should initialize with maxSize parameter", () => {
    // Create a new app and agent for this test
    const testApp = createTestingApp();
    const testAgent = createTestingAgent(testApp);
    const maxSize = 5;
    const testWorkQueueService = new WorkQueueService({
      agentDefaults: { maxSize },
    });
    testApp.addServices(testWorkQueueService);
    testWorkQueueService.attach(testAgent);

    const state = testAgent.getState(WorkQueueState);

    // Verify
    expect(state.queue).toEqual([]);
    expect(testWorkQueueService.size(testAgent)).toBe(0);
  });

  // Test 3: Enqueue with unlimited queue
  it("should add items to an unlimited queue", () => {
    const item1 = { name: "item1", checkpoint: {} as any, input: "" };
    const item2 = { name: "item2", checkpoint: {} as any, input: "" };

    // Execute
    const result1 = workQueueService.enqueue(item1, agent);
    const result2 = workQueueService.enqueue(item2, agent);

    const state = agent.getState(WorkQueueState);

    // Verify
    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(state.queue).toEqual([item1, item2]);
    expect(workQueueService.size(agent)).toBe(2);
  });

  // Test 4: Enqueue with size limit
  it("should respect maxSize when adding items", () => {
    // Create a new app and agent for this test with maxSize
    const testApp = createTestingApp();
    const testAgent = createTestingAgent(testApp);
    const testWorkQueueService = new WorkQueueService({
      agentDefaults: { maxSize: 2 },
    });
    testApp.addServices(testWorkQueueService);
    testWorkQueueService.attach(testAgent);

    const item1 = { name: "item1", checkpoint: {} as any, input: "" };
    const item2 = { name: "item2", checkpoint: {} as any, input: "" };
    const item3 = { name: "item3", checkpoint: {} as any, input: "" };

    // Execute
    const result1 = testWorkQueueService.enqueue(item1, testAgent);
    const result2 = testWorkQueueService.enqueue(item2, testAgent);
    const result3 = testWorkQueueService.enqueue(item3, testAgent); // This should fail

    const state = testAgent.getState(WorkQueueState);

    // Verify
    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(result3).toBe(false); // Should return false when queue is full
    expect(state.queue).toEqual([item1, item2]);
    expect(testWorkQueueService.size(testAgent)).toBe(2);
  });

  // Test 5: Dequeue from empty queue
  it("should return undefined when dequeuing from empty queue", () => {
    // Execute
    const result = workQueueService.dequeue(agent);

    // Verify
    expect(result).toBeUndefined();
  });

  // Test 6: Dequeue from non-empty queue
  it("should return and remove the first item when dequeuing", () => {
    // Setup
    const item1 = { name: "item1", checkpoint: {} as any, input: "" };
    const item2 = { name: "item2", checkpoint: {} as any, input: "" };
    workQueueService.enqueue(item1, agent);
    workQueueService.enqueue(item2, agent);

    // Execute
    const result = workQueueService.dequeue(agent);

    // Verify
    expect(result).toBe(item1);
    expect(workQueueService.size(agent)).toBe(1);
    expect(workQueueService.getAll(agent)).toEqual([item2]);
  });

  // Test 7: Queue state management methods
  it("should correctly manage queue state", () => {
    // Create a new app and agent for this test
    const testApp = createTestingApp();
    const testAgent = createTestingAgent(testApp);
    const testWorkQueueService = new WorkQueueService({
      agentDefaults: {},
    });
    testApp.addServices(testWorkQueueService);
    testWorkQueueService.attach(testAgent);

    const message = { id: "test-message" } as any;
    const item = { name: "test-item", checkpoint: {} as any, input: "" };

    // Execute and verify start/started
    expect(testWorkQueueService.started(testAgent)).toBe(false);
    testWorkQueueService.startWork(testAgent);
    expect(testWorkQueueService.started(testAgent)).toBe(true);

    // Execute and verify initial message
    testWorkQueueService.setInitialCheckpoint(message, testAgent);
    expect(testWorkQueueService.getInitialCheckpoint(testAgent)).toBe(message);

    // Execute and verify current item
    expect(testWorkQueueService.getCurrentItem(testAgent)).toBeNull();
    testWorkQueueService.setCurrentItem(item, testAgent);
    expect(testWorkQueueService.getCurrentItem(testAgent)).toBe(item);
  });

  // Test 8: Queue manipulation methods
  it("should correctly manipulate queue contents", () => {
    // Create a new app and agent for this test
    const testApp = createTestingApp();
    const testAgent = createTestingAgent(testApp);
    const testWorkQueueService = new WorkQueueService({
      agentDefaults: {},
    });
    testApp.addServices(testWorkQueueService);
    testWorkQueueService.attach(testAgent);

    const item1 = { name: "item1", checkpoint: {} as any, input: "" };
    const item2 = { name: "item2", checkpoint: {} as any, input: "" };
    const item3 = { name: "item3", checkpoint: {} as any, input: "" };

    // Test enqueue and size
    testWorkQueueService.enqueue(item1, testAgent);
    testWorkQueueService.enqueue(item2, testAgent);
    testWorkQueueService.enqueue(item3, testAgent);
    expect(testWorkQueueService.size(testAgent)).toBe(3);
    expect(testWorkQueueService.isEmpty(testAgent)).toBe(false);

    // Test get
    expect(testWorkQueueService.get(1, testAgent)).toBe(item2);

    // Test getAll
    const state = testAgent.getState(WorkQueueState);
    expect(testWorkQueueService.getAll(testAgent)).toEqual([item1, item2, item3]);
    expect(testWorkQueueService.getAll(testAgent)).not.toBe(state.queue); // Should be a copy

    // Test splice
    const removed = testWorkQueueService.splice(1, 1, testAgent);
    expect(removed).toEqual([item2]);
    expect(testWorkQueueService.size(testAgent)).toBe(2);
    expect(testWorkQueueService.getAll(testAgent)).toEqual([item1, item3]);

    // Test dequeue
    const dequeued = testWorkQueueService.dequeue(testAgent);
    expect(dequeued).toBe(item1);
    expect(testWorkQueueService.size(testAgent)).toBe(1);

    // Test clear
    testWorkQueueService.clear(testAgent);
    expect(testWorkQueueService.size(testAgent)).toBe(0);
    expect(testWorkQueueService.isEmpty(testAgent)).toBe(true);
  });

  // Test 9: Stop work clears current item
  it("should clear current item when stopping work", () => {
    const item = { name: "test-item", checkpoint: {} as any, input: "" };
    workQueueService.setCurrentItem(item, agent);
    expect(workQueueService.getCurrentItem(agent)).toBe(item);

    // Execute
    workQueueService.stopWork(agent);

    // Verify
    expect(workQueueService.getCurrentItem(agent)).toBeNull();
    expect(workQueueService.started(agent)).toBe(false);
  });

  // Test 10: get() returns item at index
  it("should return item at specified index", () => {
    const item1 = { name: "item1", checkpoint: {} as any, input: "" };
    const item2 = { name: "item2", checkpoint: {} as any, input: "" };
    const item3 = { name: "item3", checkpoint: {} as any, input: "" };

    workQueueService.enqueue(item1, agent);
    workQueueService.enqueue(item2, agent);
    workQueueService.enqueue(item3, agent);

    // Verify
    expect(workQueueService.get(0, agent)).toBe(item1);
    expect(workQueueService.get(1, agent)).toBe(item2);
    expect(workQueueService.get(2, agent)).toBe(item3);
  });
});
