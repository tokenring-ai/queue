import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import WorkQueueService from "../../WorkQueueService.ts";

const inputSchema = {
  args: {},
  positionals: [{
    name: "prompt",
    description: "Prompt to add to queue",
    required: true,
    greedy: true,
  }],
  allowAttachments: false,
} as const satisfies AgentCommandInputSchema;

export default {
  name: "queue add",
  description: "Add a prompt to the queue",
  help: `Add a new prompt to the end of the queue.

## Example

/queue add Write a Python function to calculate Fibonacci numbers`,
  inputSchema,
  execute: async ({positionals: { prompt }, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> => {
    const workQueueService = agent.requireServiceByType(WorkQueueService);
    workQueueService.enqueue({ checkpoint: agent.generateCheckpoint(), name: prompt, input: prompt }, agent);
    return `Added to queue. Queue length: ${workQueueService.size(agent)}`;
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
