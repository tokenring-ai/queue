import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { AgentManager } from "@tokenring-ai/agent";
import type Agent from "@tokenring-ai/agent/Agent";
import { AgentEventState } from "@tokenring-ai/agent/state/agentEventState";
import type TokenRingApp from "@tokenring-ai/app";
import type { TokenRingService } from "@tokenring-ai/app/types";
import { ConfigurationError } from "@tokenring-ai/app/types";
import EnhancedStringMap from "@tokenring-ai/utility/map/enhancedStringMap";
import { type ParsedQueueConfig, type QueueConfig, QueueServiceConfigSchema } from "./schema.ts";
import type { QueueItem, QueueRuntimeData, ResultItem, ResultItemStatus } from "./state/queueState.ts";
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
 * Queue *definitions* (agent type, concurrency, limits) are owned by this service via
 * {@link reconfigure}. App state only tracks runtime items and results.
 *
 * A `default` queue always exists. When items are enqueued, the dispatcher loop spawns a fresh
 * headless agent of the queue's agent type for each item (up to `concurrency` at a time), runs
 * the item, captures the result, and then deletes the agent. Agents are never reused across items.
 */
export default class QueueService implements TokenRingService {
  readonly name = "QueueService";
  description = "App-level work queue that dispatches items to agents of a specific type";

  private readonly running = new Map<string, RunningItem>();
  private isStopping = false;
  private options = QueueServiceConfigSchema.parse({});
  /** Resolved per-queue definitions, keyed by queue name. Source of truth for config. */
  private queueConfigs = new EnhancedStringMap<QueueConfig>();

  constructor(
    private readonly app: TokenRingApp,
    options?: ParsedQueueConfig,
  ) {
    this.app.initializeState(QueueState, {});
    if (options) {
      this.applyOptions(options);
    } else {
      this.rebuildQueueConfigs();
    }
  }

  /**
   * Replaces service-owned queue definitions from package config.
   * Does not mutate app state — runtime buckets are created lazily when used.
   */
  reconfigure(options: ParsedQueueConfig): void {
    this.applyOptions(options);
  }

  private applyOptions(options: ParsedQueueConfig): void {
    this.options = options;
    this.rebuildQueueConfigs();
  }

  private rebuildQueueConfigs(): void {
    this.queueConfigs.clear();
    const configured = this.options.queues;
    this.queueConfigs.set("default", this.resolveConfig(configured.default));
    for (const [name, cfg] of Object.entries(configured)) {
      if (name === "default") continue;
      this.queueConfigs.set(name, this.resolveConfig(cfg));
    }
  }

  private resolveConfig(cfg?: {
    agentType?: string | undefined;
    concurrency?: number | undefined;
    maxSize?: number | null | undefined;
    maxResults?: number | null | undefined;
  }): QueueConfig {
    return {
      agentType: cfg?.agentType ?? this.options.defaultAgentType,
      concurrency: cfg?.concurrency ?? this.options.defaultConcurrency,
      maxSize: cfg?.maxSize ?? null,
      maxResults: cfg?.maxResults ?? this.options.maxResults,
    };
  }

  private state(): QueueState {
    return this.app.getState(QueueState);
  }

  private requireConfig(queueName: string): QueueConfig {
    const config = this.queueConfigs.get(queueName);
    if (!config) throw new ConfigurationError(this.name, `Queue "${queueName}" does not exist`);
    return config;
  }

  /** Runtime bucket for a known queue; created on first write if missing. */
  private runtime(queueName: string): QueueRuntimeData {
    this.requireConfig(queueName);
    const existing = this.state().queues.get(queueName);
    if (existing) return existing;
    return this.app.mutateState(QueueState, s => s.ensureQueue(queueName));
  }

  // ---------------------------------------------------------------------------
  // Queue configuration
  // ---------------------------------------------------------------------------

  getQueueNames(): string[] {
    return this.queueConfigs.keysArray();
  }

  getQueueConfig(name: string): QueueConfig | undefined {
    return this.queueConfigs.get(name);
  }

  createQueue(name: string, config: { agentType: string; concurrency?: number; maxSize?: number | null; maxResults?: number | null }): void {
    if (this.queueConfigs.has(name)) {
      throw new ConfigurationError(this.name, `Queue "${name}" already exists`);
    }
    this.queueConfigs.set(name, this.resolveConfig(config));
  }

  // ---------------------------------------------------------------------------
  // Enqueue / read / mutate
  // ---------------------------------------------------------------------------

  enqueue(queueName: string, item: NewItemInput): QueueItem {
    const config = this.requireConfig(queueName);
    const data = this.runtime(queueName);
    const pendingCount = data.items.filter(i => i.status === "pending").length;
    if (config.maxSize !== null && pendingCount >= config.maxSize) {
      throw new ConfigurationError(this.name, `Queue "${queueName}" is full (maxSize ${config.maxSize})`);
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

    this.app.mutateState(QueueState, s => {
      s.ensureQueue(queueName).items.push(queueItem);
    });

    return queueItem;
  }

  getPending(queueName: string): QueueItem[] {
    this.requireConfig(queueName);
    const data = this.state().queues.get(queueName);
    if (!data) return [];
    return data.items.filter(i => i.status === "pending").map(i => ({ ...i }));
  }

  getRunning(queueName: string): QueueItem[] {
    this.requireConfig(queueName);
    const data = this.state().queues.get(queueName);
    if (!data) return [];
    return data.items.filter(i => i.status === "running").map(i => ({ ...i }));
  }

  getResults(queueName: string, limit = 20, status?: ResultItemStatus): ResultItem[] {
    this.requireConfig(queueName);
    const data = this.state().queues.get(queueName);
    if (!data) return [];
    let results = [...data.results].reverse();
    if (status) results = results.filter(r => r.status === status);
    return results.slice(0, limit).map(r => ({ ...r }));
  }

  removeItem(queueName: string, itemId: string): boolean {
    this.requireConfig(queueName);
    return this.app.mutateState(QueueState, s => {
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
    this.requireConfig(queueName);
    return this.app.mutateState(QueueState, s => {
      const queue = s.queues.get(queueName);
      if (!queue) return 0;
      const before = queue.items.length;
      queue.items = queue.items.filter(i => i.status === "running");
      return before - queue.items.length;
    });
  }

  private finalizeItem(queueName: string, itemId: string, status: ResultItemStatus, message: string): void {
    const maxResults = this.queueConfigs.get(queueName)?.maxResults ?? this.options.maxResults;
    this.app.mutateState(QueueState, s => {
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

      if (queue.results.length > maxResults) {
        queue.results.splice(0, queue.results.length - maxResults);
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

    for (const [queueName, config] of this.queueConfigs) {
      const data = snapshot.queues.get(queueName);
      if (!data) continue;
      const runningCount = data.items.filter(i => i.status === "running").length;
      const slots = config.concurrency - runningCount;
      if (slots <= 0) continue;
      const pending = data.items.filter(i => i.status === "pending").slice(0, slots);
      if (pending.length > 0) {
        work.push({ queueName, config, items: pending });
      }
    }

    for (const { queueName, config, items } of work) {
      for (const item of items) {
        const startedAt = Date.now();
        this.app.mutateState(QueueState, s => {
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
      this.app.mutateState(QueueState, s => {
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
