import type {Agent} from "@tokenring-ai/agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import WorkQueueService from "../../WorkQueueService.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

function nextOrDone(
  action: "next" | "done",
  agent: Agent,
): string {
  const workQueueService = agent.requireServiceByType(WorkQueueService);
  if (!workQueueService.started(agent))
    return "Queue not started. Use /queue start to start the queue.";

  if (action === "done" || workQueueService.isEmpty(agent)) {
    const initialCheckpoint = workQueueService.getInitialCheckpoint(agent);
    if (initialCheckpoint) {
      agent.restoreState(initialCheckpoint.state);
    } else {
      throw new CommandFailedError(
        "Couldn't restore initial state, no initial checkpoint found",
      );
    }
    workQueueService.stopWork(agent);
    return action === "done"
      ? "Restored chat state to preserved state."
      : "Queue complete.";
  }

  const newItem = workQueueService.dequeue(agent);
  return `Queue Item loaded: ${newItem?.name ?? "unknown"} Use /queue run to run the queue item, and /queue next|skip|done to move on to the next item.`;
}

export const queueNext = {
  name: "queue next",
  description: "Load the next queued item",
  help: `Load the next queued item (does not execute it).

## Example

/queue next`,
  inputSchema,
  execute: async ({agent}: AgentCommandInputType<typeof inputSchema>) =>
    nextOrDone("next", agent),
} satisfies TokenRingAgentCommand<typeof inputSchema>;

export const queueDone = {
  name: "queue done",
  description: "End queue processing and restore chat state",
  help: `End queue processing and restore previous chat state.

## Example

/queue done`,
  inputSchema,
  execute: async ({agent}: AgentCommandInputType<typeof inputSchema>) =>
    nextOrDone("done", agent),
} satisfies TokenRingAgentCommand<typeof inputSchema>;
