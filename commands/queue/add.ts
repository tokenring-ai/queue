import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import WorkQueueService from "../../WorkQueueService.ts";

const inputSchema = {
  args: {},
  remainder: {name: "prompt", description: "Prompt to add to queue", required: true}
} as const satisfies AgentCommandInputSchema;

export default {
  name: "queue add",
  description: "Add a prompt to the queue",
  help: `Add a new prompt to the end of the queue.

## Example

/queue add Write a Python function to calculate Fibonacci numbers`,
  inputSchema,
  execute: async ({remainder, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> => {
    const workQueueService = agent.requireServiceByType(WorkQueueService);
    workQueueService.enqueue({checkpoint: agent.generateCheckpoint(), name: remainder, input: remainder}, agent);
    return `Added to queue. Queue length: ${workQueueService.size(agent)}`;
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
