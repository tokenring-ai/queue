import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { AgentManager } from "@tokenring-ai/agent";
import type Agent from "@tokenring-ai/agent/Agent";
import { AgentEventState } from "@tokenring-ai/agent/state/agentEventState";
import type TokenRingApp from "@tokenring-ai/app";
import type { TokenRingService } from "@tokenring-ai/app/types";
import { ConfigurationError } from "@tokenring-ai/app/types";
import type { ParsedQueueConfig, QueueConfig } from "./schema.ts";
import type { QueueData, QueueItem, ResultItem, ResultItemStatus } from "./state/queueState.ts";
import { QueueState } from "./state/queueState.ts";

type RunningItem = { agentId: string; requestId: string };

type NewItemInput = {
  name: string;
  input: string;
  from: string;
};

/**
 * App-level work queue service.
 *
 * Holds one or more named queues (a `default` queue always exists). Each queue is assigned an
 * agent type and a concurrency. When items are enqueued, the dispatcher loop spawns a fresh
 * headless agent of the queue's agent type for each item (up to `concurrency` at a time), runs
 * the item, captures the result, and then deletes the agent. Agents are never reused across items.
 */
export default class QueueService implements TokenRingService {
  readonly name = "QueueService";
  description = "App-level work queue that dispatches items to agents of a specific type";

  private readonly running = new Map<string, RunningItem>();
  private isStopping = false;

  constructor(
    private readonly app: TokenRingApp,
    private readonly options: ParsedQueueConfig,
  ) {
    this.app.stateManager.initializeState(QueueState, options);
  }

  private state(): QueueState {
    return this.app.stateManager.getState(QueueState);
  }

  private requireQueue(queueName: string): QueueData {
    const data = this.state().queues.get(queueName);
    if (!data) throw new ConfigurationError(this.name, `Queue "${queueName}" does not exist`);
    return data;
  }

  // ---------------------------------------------------------------------------
  // Queue configuration
  // ---------------------------------------------------------------------------

  getQueueNames(): string[] {
    return Array.from(this.state().queues.keys());
  }

  getQueueConfig(name: string): QueueConfig | undefined {
    return this.state().queues.get(name)?.config;
  }

  createQueue(name: string, config: { agentType: string; concurrency?: number; maxSize?: number | null; maxResults?: number | null }): void {
    if (this.state().queues.has(name)) {
      throw new ConfigurationError(this.name, `Queue "${name}" already exists`);
    }
    const resolved: QueueConfig = {
      agentType: config.agentType,
      concurrency: config.concurrency ?? this.options.defaultConcurrency,
      maxSize: config.maxSize ?? null,
      maxResults: config.maxResults ?? this.options.maxResults,
    };
    this.app.stateManager.mutateState(QueueState, s => {
      s.queues.set(name, { config: resolved, items: [], results: [] });
    });
  }

  // ---------------------------------------------------------------------------
  // Enqueue / read / mutate
  // ---------------------------------------------------------------------------

  enqueue(queueName: string, item: NewItemInput): QueueItem {
    const data = this.requireQueue(queueName);
    const pendingCount = data.items.filter(i => i.status === "pending").length;
    if (data.config.maxSize !== null && pendingCount >= data.config.maxSize) {
      throw new ConfigurationError(this.name, `Queue "${queueName}" is full (maxSize ${data.config.maxSize})`);
    }

    const queueItem: QueueItem = {
      id: randomUUID(),
      queueName,
      name: item.name,
      input: item.input,
      from: item.from,
      status: "pending",
      createdAt: Date.now(),
      startedAt: null,
      agentId: null,
      requestId: null,
    };

    this.app.stateManager.mutateState(QueueState, s => {
      s.queues.get(queueName)?.items.push(queueItem);
    });

    return queueItem;
  }

  getPending(queueName: string): QueueItem[] {
    return this.requireQueue(queueName)
      .items.filter(i => i.status === "pending")
      .map(i => ({ ...i }));
  }

  getRunning(queueName: string): QueueItem[] {
    return this.requireQueue(queueName)
      .items.filter(i => i.status === "running")
      .map(i => ({ ...i }));
  }

  getResults(queueName: string, limit = 20, status?: ResultItemStatus): ResultItem[] {
    const data = this.requireQueue(queueName);
    let results = [...data.results].reverse();
    if (status) results = results.filter(r => r.status === status);
    return results.slice(0, limit).map(r => ({ ...r }));
  }

  removeItem(queueName: string, itemId: string): boolean {
    return this.app.stateManager.mutateState(QueueState, s => {
      const queue = s.queues.get(queueName);
      if (!queue) return false;
      const idx = queue.items.findIndex(i => i.id === itemId && i.status === "pending");
      if (idx === -1) return false;
      queue.items.splice(idx, 1);
      return true;
    });
  }

  cancelItem(queueName: string, itemId: string): boolean {
    const running = this.running.get(itemId);
    if (running) {
      this.finalizeItem(queueName, itemId, "cancelled", "Item was cancelled");
      try {
        const agentManager = this.app.requireService(AgentManager);
        const agent = agentManager.getAgent(running.agentId);
        agent?.abortCurrentOperation("Queue item cancelled");
        agentManager.deleteAgent(running.agentId, "Queue item cancelled");
      } catch {
        // agent may already be gone
      }
      return true;
    }
    return this.removeItem(queueName, itemId);
  }

  clear(queueName: string): number {
    return this.app.stateManager.mutateState(QueueState, s => {
      const queue = s.queues.get(queueName);
      if (!queue) return 0;
      const before = queue.items.length;
      queue.items = queue.items.filter(i => i.status === "running");
      return before - queue.items.length;
    });
  }

  private finalizeItem(queueName: string, itemId: string, status: ResultItemStatus, message: string): void {
    this.app.stateManager.mutateState(QueueState, s => {
      const queue = s.queues.get(queueName);
      if (!queue) return;
      const idx = queue.items.findIndex(i => i.id === itemId);
      if (idx === -1) return;

      const item = queue.items[idx]!;
      const completedAt = Date.now();
      const result: ResultItem = {
        id: item.id,
        queueName: item.queueName,
        name: item.name,
        input: item.input,
        from: item.from,
        createdAt: item.createdAt,
        startedAt: item.startedAt ?? null,
        agentId: item.agentId ?? null,
        requestId: item.requestId ?? null,
        status,
        completedAt,
        durationMs: item.startedAt != null ? completedAt - item.startedAt : completedAt - item.createdAt,
        resultMessage: message,
      };

      queue.items.splice(idx, 1);
      queue.results.push(result);

      const max = queue.config.maxResults;
      if (queue.results.length > max) {
        queue.results.splice(0, queue.results.length - max);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Dispatcher loop
  // ---------------------------------------------------------------------------

  async run(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      try {
        await delay(this.options.pollIntervalMs, null, { signal });
      } catch {
        break;
      }
      try {
        this.dispatchPending();
      } catch (err: unknown) {
        this.app.serviceError(this, "Error while dispatching queue items:", err);
      }
    }
  }

  private dispatchPending(): void {
    const agentManager = this.app.requireService(AgentManager);
    const snapshot = this.state();

    type Pending = { queueName: string; config: QueueConfig; items: QueueItem[] };
    const work: Pending[] = [];

    for (const [queueName, data] of snapshot.queues.entries()) {
      const runningCount = data.items.filter(i => i.status === "running").length;
      const slots = data.config.concurrency - runningCount;
      if (slots <= 0) continue;
      const pending = data.items.filter(i => i.status === "pending").slice(0, slots);
      if (pending.length > 0) {
        work.push({ queueName, config: data.config, items: pending });
      }
    }

    for (const { queueName, config, items } of work) {
      for (const item of items) {
        const startedAt = Date.now();
        this.app.stateManager.mutateState(QueueState, s => {
          const it = s.queues.get(queueName)?.items.find(i => i.id === item.id);
          if (it && it.status === "pending") {
            it.status = "running";
            it.startedAt = startedAt;
          }
        });
        void this.runItem(queueName, { ...item, startedAt }, config, agentManager);
      }
    }
  }

  private async runItem(queueName: string, item: QueueItem, config: QueueConfig, agentManager: AgentManager): Promise<void> {
    let agent: Agent | null = null;
    let requestId: string | null = null;

    try {
      agent = agentManager.spawnAgent({ agentType: config.agentType, headless: true });
      requestId = agent.handleInput({ from: `queue:${queueName}:${item.id}`, message: item.input });

      this.running.set(item.id, { agentId: agent.id, requestId });
      this.app.stateManager.mutateState(QueueState, s => {
        const it = s.queues.get(queueName)?.items.find(i => i.id === item.id);
        if (it) {
          it.agentId = agent!.id;
          it.requestId = requestId;
        }
      });

      const cursor = agent.getState(AgentEventState).getEventCursorFromCurrentPosition();
      let outcome: { status: ResultItemStatus; message: string } | null = null;

      for await (const eventState of agent.subscribeStateAsync(AgentEventState, agent.agentShutdownSignal)) {
        for (const event of eventState.yieldEventsByCursor(cursor)) {
          if (event.type === "agent.response" && event.requestId === requestId) {
            outcome = {
              status: event.status === "success" ? "completed" : event.status === "cancelled" ? "cancelled" : "failed",
              message: event.message,
            };
          }
        }
        if (outcome) break;
      }

      if (outcome) {
        this.finalizeItem(queueName, item.id, outcome.status, outcome.message);
      } else if (!this.isStopping) {
        this.finalizeItem(queueName, item.id, "failed", "Agent terminated before responding");
      }
    } catch (err: unknown) {
      if (!this.isStopping) {
        this.finalizeItem(queueName, item.id, "failed", `Item failed with error: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      this.running.delete(item.id);
      if (agent) {
        try {
          agentManager.deleteAgent(agent.id, "Queue item complete");
        } catch {
          // agent may already be gone
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  stop(): void {
    this.isStopping = true;
    try {
      const agentManager = this.app.requireService(AgentManager);
      for (const { agentId } of this.running.values()) {
        try {
          agentManager.deleteAgent(agentId, "Queue service stopping");
        } catch {
          // agent may already be gone
        }
      }
    } catch {
      // AgentManager unavailable during shutdown
    }
  }
}
