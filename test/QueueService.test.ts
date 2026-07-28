import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { setTimeout as delay } from "node:timers/promises";
import { AgentManager } from "@tokenring-ai/agent";
import { AgentEventState } from "@tokenring-ai/agent/state/agentEventState";
import type TokenRingApp from "@tokenring-ai/app";
import StateManager from "@tokenring-ai/app/StateManager";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp.test";
import QueueService from "../QueueService.ts";
import type { ParsedQueueConfig } from "../schema.ts";
import { QueueState } from "../state/queueState.ts";

type ResponseStatus = "success" | "error" | "cancelled";

let idCounter = 0;
const nextId = () => `id-${++idCounter}`;

/**
 * A lightweight stand-in for an Agent backed by a real StateManager + AgentEventState. handleInput
 * queues an input and schedules an agent.response (via `responder`) after `workMs`, letting the
 * dispatcher's subscribe/cursor machinery work end-to-end without a real agent loop.
 */
class FakeAgent {
  readonly id = `agent-${nextId()}`;
  readonly agentShutdownController = new AbortController();
  readonly agentShutdownSignal = this.agentShutdownController.signal;
  private readonly sm = new StateManager<any>({});
  private timer: ReturnType<typeof setTimeout> | null = null;

  responder: (requestId: string) => { status: ResponseStatus; message: string } = () => ({
    status: "success",
    message: "done",
  });
  workMs = 5;

  constructor() {
    this.sm.initializeState(AgentEventState, {});
  }

  handleInput(input: { from: string; message: string }): string {
    const requestId = `req-${nextId()}`;
    this.sm.mutateState(AgentEventState, s =>
      s.emit({ type: "input.received", timestamp: Date.now(), input: { from: input.from, message: input.message }, requestId }),
    );

    this.timer = setTimeout(() => {
      const r = this.responder(requestId);
      this.sm.mutateState(AgentEventState, s => s.emit({ type: "agent.response", timestamp: Date.now(), requestId, status: r.status, message: r.message }));
    }, this.workMs);

    return requestId;
  }

  getState<T>(type: new (...args: any[]) => T): T {
    return this.sm.getState(type);
  }

  subscribeStateAsync(type: any, signal: AbortSignal) {
    return this.sm.subscribeAsync(type, signal);
  }

  abortCurrentOperation(): boolean {
    return true;
  }

  shutdown(): void {
    if (this.timer) clearTimeout(this.timer);
    this.agentShutdownController.abort();
  }
}

/**
 * Registers a real AgentManager (correct service name) with spawn/get/delete overridden to return
 * FakeAgents, while tracking the concurrency high-water mark.
 */
function installFakeAgentManager(app: TokenRingApp) {
  const agentManager = new AgentManager(app);
  app.addServices(agentManager);

  const live = new Map<string, FakeAgent>();
  const spawned: FakeAgent[] = [];
  let liveHighWater = 0;

  (agentManager as any).spawnAgent = ({ agentType }: { agentType: string; headless: boolean }) => {
    void agentType;
    const agent = new FakeAgent();
    live.set(agent.id, agent);
    spawned.push(agent);
    liveHighWater = Math.max(liveHighWater, live.size);
    return agent;
  };
  (agentManager as any).getAgent = (id: string) => live.get(id) ?? null;
  (agentManager as any).deleteAgent = (id: string) => {
    const a = live.get(id);
    if (a) {
      a.shutdown();
      live.delete(id);
    }
    return true;
  };

  return { agentManager, live, spawned, getLiveHighWater: () => liveHighWater };
}

function setup(app: TokenRingApp, options?: Partial<ParsedQueueConfig>) {
  const config: ParsedQueueConfig = {
    defaultAgentType: "code",
    defaultConcurrency: 1,
    maxResults: 100,
    pollIntervalMs: 10,
    queues: {},
    ...options,
  };
  const queueService = new QueueService(app, config);
  app.addServices(queueService);
  return { queueService };
}

describe("QueueService", () => {
  let app: TokenRingApp;
  let abortController: AbortController;

  beforeEach(() => {
    app = createTestingApp();
    abortController = new AbortController();
  });

  afterEach(() => {
    abortController.abort();
  });

  describe("queue configuration", () => {
    it("always creates a default queue with the default agent type", () => {
      const { queueService } = setup(app);
      expect(queueService.getQueueNames()).toContain("default");
      expect(queueService.getQueueConfig("default")?.agentType).toBe("code");
      expect(queueService.getQueueConfig("default")?.concurrency).toBe(1);
    });

    it("creates named queues from config", () => {
      const { queueService } = setup(app, { queues: { research: { agentType: "research", concurrency: 3 } } });
      expect(queueService.getQueueNames()).toContain("research");
      expect(queueService.getQueueConfig("research")?.concurrency).toBe(3);
    });

    it("allows the default queue to be overridden", () => {
      const { queueService } = setup(app, { queues: { default: { agentType: "research", concurrency: 4 } } });
      expect(queueService.getQueueConfig("default")?.agentType).toBe("research");
      expect(queueService.getQueueConfig("default")?.concurrency).toBe(4);
    });

    it("can create queues at runtime", () => {
      const { queueService } = setup(app);
      queueService.createQueue("docs", { agentType: "code", concurrency: 2 });
      expect(queueService.getQueueConfig("docs")?.concurrency).toBe(2);
    });

    it("rejects duplicate queue creation", () => {
      const { queueService } = setup(app);
      expect(() => queueService.createQueue("default", { agentType: "code" })).toThrow();
    });
  });

  describe("enqueue", () => {
    it("adds pending items and reports them via getPending", () => {
      const { queueService } = setup(app);
      const item = queueService.enqueue("default", { name: "task", input: "do it", from: "test" });
      expect(item.status).toBe("pending");
      expect(queueService.getPending("default")).toHaveLength(1);
    });

    it("respects maxSize", () => {
      const { queueService } = setup(app, { queues: { default: { agentType: "code", maxSize: 2 } } });
      queueService.enqueue("default", { name: "a", input: "a", from: "t" });
      queueService.enqueue("default", { name: "b", input: "b", from: "t" });
      expect(() => queueService.enqueue("default", { name: "c", input: "c", from: "t" })).toThrow();
    });

    it("throws when enqueueing to an unknown queue", () => {
      const { queueService } = setup(app);
      expect(() => queueService.enqueue("nope", { name: "a", input: "a", from: "t" })).toThrow();
    });
  });

  describe("remove / clear", () => {
    it("removes a pending item by id", () => {
      const { queueService } = setup(app);
      const item = queueService.enqueue("default", { name: "a", input: "a", from: "t" });
      expect(queueService.removeItem("default", item.id)).toBe(true);
      expect(queueService.getPending("default")).toHaveLength(0);
    });

    it("clears all pending items", () => {
      const { queueService } = setup(app);
      queueService.enqueue("default", { name: "a", input: "a", from: "t" });
      queueService.enqueue("default", { name: "b", input: "b", from: "t" });
      expect(queueService.clear("default")).toBe(2);
      expect(queueService.getPending("default")).toHaveLength(0);
    });
  });

  describe("dispatching", () => {
    it("spawns agents up to the concurrency limit and no more", () => {
      const fake = installFakeAgentManager(app);
      const { queueService } = setup(app, { defaultConcurrency: 2 });

      for (let i = 0; i < 5; i++) {
        queueService.enqueue("default", { name: `t${i}`, input: "x", from: "t" });
      }

      (queueService as any).dispatchPending(abortController.signal);

      expect(fake.spawned).toHaveLength(2);
      expect(queueService.getRunning("default")).toHaveLength(2);
      expect(queueService.getPending("default")).toHaveLength(3);
      expect(fake.getLiveHighWater()).toBe(2);
    });

    it("captures a completed result with status, message, and timing, and deletes the agent", async () => {
      const fake = installFakeAgentManager(app);
      const { queueService } = setup(app, { defaultConcurrency: 1 });

      queueService.enqueue("default", { name: "task", input: "do", from: "test" });
      (queueService as any).dispatchPending(abortController.signal);

      expect(queueService.getRunning("default")).toHaveLength(1);
      await delay(30);

      const results = queueService.getResults("default");
      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe("completed");
      expect(results[0]?.resultMessage).toBe("done");
      expect(results[0]?.durationMs).toBeGreaterThanOrEqual(0);
      expect(queueService.getRunning("default")).toHaveLength(0);
      expect(fake.live.size).toBe(0);
    });

    it("captures a failed result when the agent errors", async () => {
      const fake = installFakeAgentManager(app);
      const { queueService } = setup(app, { defaultConcurrency: 1 });

      queueService.enqueue("default", { name: "task", input: "do", from: "test" });
      (queueService as any).dispatchPending(abortController.signal);

      expect(fake.spawned).toHaveLength(1);
      fake.spawned[0]!.responder = () => ({ status: "error", message: "boom" });

      await delay(30);
      const results = queueService.getResults("default");
      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe("failed");
      expect(results[0]?.resultMessage).toBe("boom");
    });

    it("processes all items sequentially when concurrency is 1", async () => {
      const fake = installFakeAgentManager(app);
      const { queueService } = setup(app, { defaultConcurrency: 1, pollIntervalMs: 5 });

      for (let i = 0; i < 3; i++) {
        queueService.enqueue("default", { name: `t${i}`, input: "x", from: "t" });
      }

      for (let i = 0; i < 50 && queueService.getResults("default").length < 3; i++) {
        (queueService as any).dispatchPending(abortController.signal);
        await delay(10);
      }

      expect(queueService.getResults("default")).toHaveLength(3);
      expect(fake.getLiveHighWater()).toBe(1);
    });

    it("trims results to maxResults", async () => {
      installFakeAgentManager(app);
      const { queueService } = setup(app, {
        defaultConcurrency: 1,
        pollIntervalMs: 5,
        queues: { default: { agentType: "code", maxResults: 2 } },
      });

      for (let i = 0; i < 4; i++) {
        queueService.enqueue("default", { name: `t${i}`, input: "x", from: "t" });
      }

      for (let i = 0; i < 80 && queueService.getResults("default", 100).length < 2; i++) {
        (queueService as any).dispatchPending(abortController.signal);
        await delay(10);
      }

      expect(queueService.getResults("default", 100)).toHaveLength(2);
    });

    it("cancels a running item, recording it as cancelled", async () => {
      const fake = installFakeAgentManager(app);
      const { queueService } = setup(app, { defaultConcurrency: 1 });

      queueService.enqueue("default", { name: "task", input: "do", from: "test" });
      (queueService as any).dispatchPending(abortController.signal);

      const running = queueService.getRunning("default");
      expect(running).toHaveLength(1);

      expect(queueService.cancelItem("default", running[0]!.id)).toBe(true);
      await delay(10);

      const results = queueService.getResults("default");
      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe("cancelled");
      expect(fake.live.size).toBe(0);
    });
  });

  describe("persistence", () => {
    it("resets running items to pending on restore", () => {
      const state = new QueueState();
      state.ensureQueue("default").items.push({
        id: "x",
        queueName: "default",
        name: "running-task",
        input: "do",
        from: "t",
        status: "running",
        createdAt: 1,
        startedAt: 2,
        agentId: "a",
        requestId: "r",
      });

      const restored = new QueueState();
      restored.deserialize(state.serialize());

      const items = restored.queues.get("default")!.items;
      expect(items).toHaveLength(1);
      expect(items[0]?.status).toBe("pending");
      expect(items[0]?.agentId).toBeNull();
    });

    it("restores results without embedding config in state", () => {
      const state = new QueueState();
      const results = state.ensureQueue("default").results;
      for (let i = 0; i < 5; i++) {
        results.push({
          id: `r${i}`,
          queueName: "default",
          name: "n",
          input: "i",
          from: "t",
          createdAt: 0,
          startedAt: null,
          agentId: null,
          requestId: null,
          status: "completed",
          completedAt: i,
          durationMs: 0,
          resultMessage: "ok",
        });
      }

      const serialized = state.serialize();
      expect(serialized.queues.default).not.toHaveProperty("config");

      const restored = new QueueState();
      restored.deserialize(serialized);
      expect(restored.queues.get("default")!.results).toHaveLength(5);
    });

    it("reconfigure updates queue definitions without mutating state", () => {
      const { queueService } = setup(app);
      const stateBefore = app.stateManager.getState(QueueState);
      const queuesRef = stateBefore.queues;

      queueService.reconfigure({
        defaultAgentType: "research",
        defaultConcurrency: 3,
        maxResults: 50,
        pollIntervalMs: 10,
        queues: { docs: { agentType: "code", concurrency: 2 } },
      });

      expect(queueService.getQueueConfig("default")?.agentType).toBe("research");
      expect(queueService.getQueueConfig("default")?.concurrency).toBe(3);
      expect(queueService.getQueueConfig("docs")?.concurrency).toBe(2);
      // State map identity unchanged — reconfigure only touched service-owned config
      expect(app.stateManager.getState(QueueState).queues).toBe(queuesRef);
    });
  });
});
