import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import WorkQueueService from "../../WorkQueueService.ts";

export default {
  name: "queue skip",
  description: "Skip current item and re-add to end of queue",
  help: `# /queue skip\n\nSkip current item and re-add to end of queue.\n\n## Example\n\n/queue skip`,
  execute: async (_remainder: string, agent: Agent): Promise<string> => {
    const workQueueService = agent.requireServiceByType(WorkQueueService);
    if (!workQueueService.started(agent)) return "Queue not started. Use /queue start to start the queue.";
    const currentItem = workQueueService.getCurrentItem(agent);
    if (!currentItem) return "No queue item loaded. Use /queue next to load the next item in the queue, or queue done to end the queue.";
    workQueueService.enqueue(currentItem, agent);
    workQueueService.setCurrentItem(null, agent);
    return "Queue item skipped. It has been added to the end of the queue in case you would like to run it later, and you can use /queue next to load the next item in the queue, or /queue done to end the queue.";
  },
} satisfies TokenRingAgentCommand;
