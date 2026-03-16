import Agent from "@tokenring-ai/agent/Agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import WorkQueueService from "../../WorkQueueService.ts";

async function nextOrDone(action: "next" | "done", _remainder: string, agent: Agent): Promise<string> {
  const workQueueService = agent.requireServiceByType(WorkQueueService);
  if (!workQueueService.started(agent)) return "Queue not started. Use /queue start to start the queue.";

  if (action === "done" || workQueueService.isEmpty(agent)) {
    const initialCheckpoint = workQueueService.getInitialCheckpoint(agent);
    if (initialCheckpoint) {
      agent.restoreState(initialCheckpoint.state);
    } else {
      throw new CommandFailedError("Couldn't restore initial state, no initial checkpoint found");
    }
    workQueueService.stopWork(agent);
    return action === "done" ? "Restored chat state to preserved state." : "Queue complete.";
  }

  const newItem = workQueueService.dequeue(agent);
  return `Queue Item loaded: ${newItem?.name ?? "unknown"} Use /queue run to run the queue item, and /queue next|skip|done to move on to the next item.`;
}

export const queueNext = {
  name: "queue next",
  description: "Load the next queued item",
  help: `# /queue next\n\nLoad the next queued item (does not execute it).\n\n## Example\n\n/queue next`,
  execute: (remainder: string, agent: Agent) => nextOrDone("next", remainder, agent),
} satisfies TokenRingAgentCommand;

export const queueDone = {
  name: "queue done",
  description: "End queue processing and restore chat state",
  help: `# /queue done\n\nEnd queue processing and restore previous chat state.\n\n## Example\n\n/queue done`,
  execute: (remainder: string, agent: Agent) => nextOrDone("done", remainder, agent),
} satisfies TokenRingAgentCommand;
