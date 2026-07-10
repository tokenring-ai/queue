import { CommandFailedError } from "@tokenring-ai/agent/AgentError";
import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import QueueService from "../../QueueService.ts";

const inputSchema = {
  args: {
    type: {
      type: "string",
      description: "The agent type that will process items on this queue (required)",
      required: true,
    },
    concurrency: {
      type: "number",
      description: "Maximum number of agents that can work the queue at once (defaults to 1)",
    },
  },
  positionals: [
    {
      name: "name",
      description: "The name of the queue to create",
      required: true,
    },
  ],
} as const satisfies AgentCommandInputSchema;

export default {
  name: "queue create",
  description: "Create a new named queue",
  help: `Create a new named queue with an assigned agent type and concurrency.

## Examples

/queue create research --type research --concurrency 2
/queue create docs --type code`,
  inputSchema,
  execute: ({ args, positionals, agent }: AgentCommandInputType<typeof inputSchema>): string => {
    const queueService = agent.requireServiceByType(QueueService);
    const name = positionals.name;
    const agentType = args.type;
    const concurrency = args.concurrency ?? 1;

    if (!name) throw new CommandFailedError("A queue name is required");
    if (!agentType) throw new CommandFailedError("An agent type is required (--type)");

    queueService.createQueue(name, { agentType, concurrency });

    return `Created queue "${name}" (agentType: ${agentType}, concurrency: ${concurrency}).`;
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
