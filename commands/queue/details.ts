import Agent from "@tokenring-ai/agent/Agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import WorkQueueService from "../../WorkQueueService.ts";

export default {
  name: "queue details",
  description: "Show details of a queue item",
  help: `# /queue details\n\nShow detailed information about a specific queue item.\n\n## Example\n\n/queue details 0`,
  execute: async (remainder: string, agent: Agent): Promise<string> => {
    const workQueueService = agent.requireServiceByType(WorkQueueService);
    const idx = Number.parseInt(remainder.trim(), 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= workQueueService.size(agent)) {
      throw new CommandFailedError("Usage: /queue details <index>  (index starts from 0)");
    }
    return ["Queue item details:", ...JSON.stringify(workQueueService.get(idx, agent), null, 2).split("\n")].join("\n");
  },
} satisfies TokenRingAgentCommand;
