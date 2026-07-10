import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import QueueService from "../../QueueService.ts";

const inputSchema = {
  args: {
    queue: {
      type: "string",
      description: "The name of the queue (defaults to 'default')",
    },
  },
} as const satisfies AgentCommandInputSchema;

export default {
  name: "queue clear",
  description: "Remove all pending items from a queue",
  help: `Remove all pending items from a queue. Items that are currently running are not affected.

## Examples

/queue clear
/queue clear --queue research`,
  inputSchema,
  execute: ({ args, agent }: AgentCommandInputType<typeof inputSchema>): string => {
    const queueService = agent.requireServiceByType(QueueService);
    const queueName = args.queue || "default";

    const removed = queueService.clear(queueName);
    return `Cleared ${removed} pending item(s) from queue "${queueName}".`;
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
