import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import WorkQueueService from "../../WorkQueueService.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

export default {
  name: "queue clear",
  description: "Remove all prompts from the queue",
  help: `Remove all prompts from the queue.

## Example

/queue clear`,
  inputSchema,
  execute: ({
              agent,
            }: AgentCommandInputType<typeof inputSchema>): string => {
    agent.requireServiceByType(WorkQueueService).clear(agent);
    return "Queue cleared!";
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
