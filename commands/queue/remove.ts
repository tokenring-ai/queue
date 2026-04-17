import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import WorkQueueService from "../../WorkQueueService.ts";

const inputSchema = {
  args: {
    "index": {
      type: "number",
      description: "Index of queue item",
      required: true,
      minimum: 0,
    },
  },
} as const satisfies AgentCommandInputSchema;

export default {
  name: "queue remove",
  description: "Remove a prompt from the queue",
  help: `Remove the prompt at the given zero-based index.

## Example

/queue remove 2`,
  inputSchema,
  execute: ({
              args,
              agent,
            }: AgentCommandInputType<typeof inputSchema>): string => {
    const workQueueService = agent.requireServiceByType(WorkQueueService);
    const idx = args.index;
    if (idx >= workQueueService.size(agent)) {
      throw new CommandFailedError("Index is larger than work queue size");
    }
    const removed = workQueueService.splice(idx, 1, agent)[0];
    return `Removed "${removed.name}" from queue. Remaining: ${workQueueService.size(agent)}`;
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
