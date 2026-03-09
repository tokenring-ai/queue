import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import {ChatService} from "@tokenring-ai/chat";
import runChat from "@tokenring-ai/chat/runChat";
import WorkQueueService from "../../WorkQueueService.ts";

export default {
  name: "queue run",
  description: "/queue run - Execute the currently loaded queued prompt",
  help: `# /queue run\n\nExecute the currently loaded queued prompt.\n\n## Example\n\n/queue run`,
  execute: async (_remainder: string, agent: Agent): Promise<string> => {
    const workQueueService = agent.requireServiceByType(WorkQueueService);
    if (!workQueueService.started(agent)) return "Queue not started. Use /queue start to start the queue.";
    const currentItem = workQueueService.getCurrentItem(agent);
    if (!currentItem) return "No queue item loaded. Use /queue next to load the next item in the queue, or queue done to end the queue.";
    const {input, checkpoint} = currentItem;
    agent.restoreState(checkpoint.state);
    const chatService = agent.requireServiceByType(ChatService);
    const chatConfig = chatService.getChatConfig(agent);
    try {
      await runChat({input, chatConfig, agent});
    } catch (error: any) {
      throw new CommandFailedError(`Error running queued prompt: ${error.message || error}`);
    }
    return "Queue item executed.";
  },
} satisfies TokenRingAgentCommand;
