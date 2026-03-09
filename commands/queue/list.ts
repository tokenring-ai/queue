import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import numberedList from "@tokenring-ai/utility/string/numberedList";
import WorkQueueService from "../../WorkQueueService.ts";

export default {
  name: "queue list",
  description: "/queue list - Display all queued prompts",
  help: `# /queue list\n\nDisplay all queued prompts with their indices.\n\n## Example\n\n/queue list`,
  execute: async (_remainder: string, agent: Agent): Promise<string> => {
    const workQueueService = agent.requireServiceByType(WorkQueueService);
    if (workQueueService.size(agent) === 0) return "Queue is empty.";
    return ["Queue contents:", numberedList(workQueueService.getAll(agent).map(({name}) => name))].join("\n");
  },
} satisfies TokenRingAgentCommand;
