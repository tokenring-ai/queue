import Agent from "@tokenring-ai/agent/Agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import WorkQueueService from "../../WorkQueueService.ts";

export default {
  name: "queue remove",
  description: "Remove a prompt from the queue",
  help: `# /queue remove\n\nRemove the prompt at the given zero-based index.\n\n## Example\n\n/queue remove 2`,
  execute: async (remainder: string, agent: Agent): Promise<string> => {
    const workQueueService = agent.requireServiceByType(WorkQueueService);
    const idx = Number.parseInt(remainder.trim(), 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= workQueueService.size(agent)) {
      throw new CommandFailedError("Usage: /queue remove <index>  (index starts from 0)");
    }
    const removed = workQueueService.splice(idx, 1, agent)[0];
    return `Removed "${removed.name}" from queue. Remaining: ${workQueueService.size(agent)}`;
  },
} satisfies TokenRingAgentCommand;
