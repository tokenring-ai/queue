import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import WorkQueueService from "../../WorkQueueService.ts";

export default {
  name: "queue start",
  description: "/queue start - Begin queue processing",
  help: `# /queue start\n\nBegin queue processing (preserves current chat state).\n\n## Example\n\n/queue start`,
  execute: async (_remainder: string, agent: Agent): Promise<string> => {
    const workQueueService = agent.requireServiceByType(WorkQueueService);
    if (workQueueService.isEmpty(agent)) return "Queue is empty.";
    if (workQueueService.started(agent)) return "Queue already started. Use /queue next to load the next item in the queue, or queue done to end the queue.";
    workQueueService.setInitialCheckpoint(agent.generateCheckpoint(), agent);
    workQueueService.startWork(agent);
    return "Queue started, use /queue next to start working on the first item in the queue, or /queue done to end the queue.";
  },
} satisfies TokenRingAgentCommand;
