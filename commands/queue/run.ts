import { CommandFailedError } from "@tokenring-ai/agent/AgentError";
import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import { ChatService } from "@tokenring-ai/chat";
import runChat from "@tokenring-ai/chat/runChat";
import WorkQueueService from "../../WorkQueueService.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

export default {
  name: "queue run",
  description: "Execute the currently loaded queued prompt",
  help: `Execute the currently loaded queued prompt.

## Example

/queue run`,
  inputSchema,
  execute: async ({ agent }: AgentCommandInputType<typeof inputSchema>): Promise<string> => {
    const workQueueService = agent.requireServiceByType(WorkQueueService);
    if (!workQueueService.started(agent)) return "Queue not started. Use /queue start to start the queue.";
    const currentItem = workQueueService.getCurrentItem(agent);
    if (!currentItem) return "No queue item loaded. Use /queue next to load the next item in the queue, or queue done to end the queue.";
    const { input, checkpoint } = currentItem;
    agent.restoreState(checkpoint.state);
    const chatService = agent.requireServiceByType(ChatService);
    const chatConfig = chatService.getChatConfig(agent);
    try {
      await runChat({ input, chatConfig, agent });
    } catch (err) {
      throw new CommandFailedError(`Error running queued prompt`, { cause: err });
    }
    return "Queue item executed.";
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
