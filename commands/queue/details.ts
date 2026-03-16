import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import WorkQueueService from "../../WorkQueueService.ts";

const inputSchema = {
  args: {
    "--index": {
      type: "number",
      description: "Index of queue item",
      required: true,
      minimum: 0
    },
  }
} as const satisfies AgentCommandInputSchema;

export default {
  name: "queue details",
  description: "Show details of a queue item",
  help: `Show detailed information about a specific queue item.

## Example

/queue details 0`,
  inputSchema,
  execute: async ({args, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> => {
    const idx = args["--index"];
    const workQueueService = agent.requireServiceByType(WorkQueueService);
    if (idx >= workQueueService.size(agent)) {
      throw new CommandFailedError("Index is larger than work queue size");
    }
    return ["Queue item details:", ...JSON.stringify(workQueueService.get(idx, agent), null, 2).split("\n")].join("\n");
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
