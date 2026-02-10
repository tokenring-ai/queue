import {Agent} from "@tokenring-ai/agent";
import createTestingAgent from "@tokenring-ai/agent/test/createTestingAgent";
import TokenRingApp from "@tokenring-ai/app";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {WorkQueueState} from "../state/workQueueState";
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
  workQueueService.attach(agent)
 });

 afterEach(() => {
  vi.clearAllMocks();
 });

 // Test 1: Constructor with default parameters
 it("should initialize with default parameters", () => {
   const state = agent.getState(WorkQueueState);

  // Verify
  expect(state.queue).toEqual([]);
  expect(workQueueService.maxSize).toBeUndefined();
 });

 // Test 2: Constructor with maxSize parameter
 it("should initialize with maxSize parameter", () => {
  // Execute
  const maxSize = 5;
   workQueueService = new WorkQueueService({agentDefaults: {maxSize}});
  workQueueService.attach(agent)

  const state = agent.getState(WorkQueueState);


   // Verify
  expect(state.queue).toEqual([]);
   expect(state.maxSize).toBe(maxSize);
 });

 // Test 3: Enqueue with unlimited queue
 it("should add items to an unlimited queue", () => {
  const item1 = {name: "item1", checkpoint: {} as any, input: ""};
  const item2 = {name: "item2", checkpoint: {} as any, input: ""};

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
   agent.mutateState(WorkQueueState, state => {
     state.maxSize = 2;
   });
  const item1 = {name: "item1", checkpoint: {} as any, input: ""};
  const item2 = {name: "item2", checkpoint: {} as any, input: ""};
  const item3 = {name: "item3", checkpoint: {} as any, input: ""};

  // Execute
  const result1 = workQueueService.enqueue(item1,agent);
  const result2 = workQueueService.enqueue(item2,agent);
  const result3 = workQueueService.enqueue(item3,agent); // This should fail

   const state = agent.getState(WorkQueueState);


   // Verify
  expect(result1).toBe(true);
  expect(result2).toBe(true);
  expect(result3).toBe(false); // Should return false when queue is full
  expect(state.queue).toEqual([item1, item2]);
  expect(workQueueService.size(agent)).toBe(2);
 });

 // Test 5: Dequeue from empty queue
 it("should return undefined when dequeuing from empty queue", () => {
  // Execute
  const result = workQueueService.dequeue(agent);

  // Verify
  expect(result).toBeUndefined();
 });

 // Test 7: Queue state management methods
 it("should correctly manage queue state", () => {
  // Setup
  workQueueService = new WorkQueueService();
  const message = {id: "test-message"} as any;
  const item = {name: "test-item", checkpoint: {} as any, input: ""};

  // Execute and verify start/started
  expect(workQueueService.started(agent)).toBe(false);
  workQueueService.startWork(agent);
  expect(workQueueService.started(agent)).toBe(true);

  // Execute and verify initial message
  workQueueService.setInitialCheckpoint(message, agent);
  expect(workQueueService.getInitialCheckpoint(agent)).toBe(message);

  // Execute and verify current item
  expect(workQueueService.getCurrentItem(agent)).toBeNull();
  workQueueService.setCurrentItem(item, agent);
  expect(workQueueService.getCurrentItem(agent)).toBe(item);
 });

 // Test 8: Queue manipulation methods
 it("should correctly manipulate queue contents", () => {
  // Setup
  workQueueService = new WorkQueueService();
  const item1 = {name: "item1", checkpoint: {} as any, input: ""};
  const item2 = {name: "item2", checkpoint: {} as any, input: ""};
  const item3 = {name: "item3", checkpoint: {} as any, input: ""};

  // Test enqueue and size
  workQueueService.enqueue(item1, agent);
  workQueueService.enqueue(item2, agent);
  workQueueService.enqueue(item3, agent);
  expect(workQueueService.size(agent)).toBe(3);
  expect(workQueueService.isEmpty(agent)).toBe(false);

  // Test get
  expect(workQueueService.get(1, agent)).toBe(item2);

  // Test getAll
  const state = agent.getState(WorkQueueState);
  expect(workQueueService.getAll(agent)).toEqual([item1, item2, item3]);
  expect(workQueueService.getAll(agent)).not.toBe(state.queue); // Should be a copy

  // Test splice
  const removed = workQueueService.splice(1, 1, agent);
  expect(removed).toEqual([item2]);
  expect(workQueueService.size(agent)).toBe(2);
  expect(workQueueService.getAll(agent)).toEqual([item1, item3]);

  // Test dequeue
  const dequeued = workQueueService.dequeue(agent);
  expect(dequeued).toBe(item1);
  expect(workQueueService.size(agent)).toBe(1);

  // Test clear
  workQueueService.clear(agent);
  expect(workQueueService.size(agent)).toBe(0);
  expect(workQueueService.isEmpty(agent)).toBe(true);
 });
});
