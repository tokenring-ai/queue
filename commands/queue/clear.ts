import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import WorkQueueService from "../../WorkQueueService.ts";

export default {
  name: "queue clear",
  description: "Remove all prompts from the queue",
  help: `# /queue clear\n\nRemove all prompts from the queue.\n\n## Example\n\n/queue clear`,
  execute: async (_remainder: string, agent: Agent): Promise<string> => {
    agent.requireServiceByType(WorkQueueService).clear(agent);
    return "Queue cleared!";
  },
} satisfies TokenRingAgentCommand;
