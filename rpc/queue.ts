import { AgentManager } from "@tokenring-ai/agent";
import type TokenRingApp from "@tokenring-ai/app";
import { createRPCEndpoint } from "@tokenring-ai/rpc/createRPCEndpoint";
import QueueService from "../QueueService.ts";
import type { QueueData } from "../state/queueState.ts";
import { QueueState } from "../state/queueState.ts";
import QueueRpcSchema from "./schema.ts";

/** Project service config + runtime state into a wire-safe record of queue snapshots. */
function snapshot(app: TokenRingApp, state: QueueState): Record<string, QueueData> {
  const queueService = app.requireService(QueueService);
  const queues: Record<string, QueueData> = {};
  for (const name of queueService.getQueueNames()) {
    const config = queueService.getQueueConfig(name);
    if (!config) continue;
    const data = state.queues.get(name);
    queues[name] = {
      config: { ...config },
      items: (data?.items ?? []).map(i => ({ ...i })),
      results: (data?.results ?? []).map(r => ({ ...r })),
    };
  }
  return queues;
}

export default createRPCEndpoint(QueueRpcSchema, {
  async *streamQueues(_args, app: TokenRingApp, signal) {
    for await (const state of app.subscribeStateAsync(QueueState, signal)) {
      yield { status: "success", queues: snapshot(app, state) };
    }
  },

  enqueue(args, app: TokenRingApp) {
    const queueService = app.requireService(QueueService);
    if (!queueService.getQueueConfig(args.queueName)) {
      return { status: "queueNotFound" };
    }
    try {
      const item = queueService.enqueue(args.queueName, {
        name: args.name,
        input: args.input,
        from: args.from ?? "ui",
      });
      const position = queueService.getPending(args.queueName).length;
      return { status: "success", itemId: item.id, position, message: `Added to queue "${args.queueName}"` };
    } catch (err) {
      // maxSize / other config errors surface as ConfigurationError; treat as not found only if gone.
      if (!queueService.getQueueConfig(args.queueName)) {
        return { status: "queueNotFound" };
      }
      throw err;
    }
  },

  cancelItem(args, app: TokenRingApp) {
    const queueService = app.requireService(QueueService);
    if (!queueService.getQueueConfig(args.queueName)) {
      return { status: "success", cancelled: false, message: `Queue "${args.queueName}" not found` };
    }
    const cancelled = queueService.cancelItem(args.queueName, args.itemId);
    return {
      status: "success",
      cancelled,
      message: cancelled ? "Item cancelled" : "No pending or running item found with that id",
    };
  },

  clear(args, app: TokenRingApp) {
    const queueService = app.requireService(QueueService);
    if (!queueService.getQueueConfig(args.queueName)) {
      return { status: "queueNotFound" };
    }
    const removed = queueService.clear(args.queueName);
    return { status: "success", removed, message: `Cleared ${removed} pending item(s)` };
  },

  createQueue(args, app: TokenRingApp) {
    const queueService = app.requireService(QueueService);
    if (queueService.getQueueConfig(args.name)) {
      return { status: "queueExists" };
    }
    const agentManager = app.requireService(AgentManager);
    const knownTypes = agentManager.getAgentTypes();
    if (!knownTypes.includes(args.agentType)) {
      return { status: "invalidAgentType" };
    }
    queueService.createQueue(args.name, {
      agentType: args.agentType,
      ...(args.concurrency != null ? { concurrency: args.concurrency } : {}),
      ...(args.maxSize != null ? { maxSize: args.maxSize } : {}),
      ...(args.maxResults != null ? { maxResults: args.maxResults } : {}),
    });
    // Ensure a runtime bucket exists so streamQueues subscribers see the new name immediately.
    app.mutateState(QueueState, s => {
      s.ensureQueue(args.name);
    });
    return { status: "success", message: `Created queue "${args.name}"` };
  },
});
