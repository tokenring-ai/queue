import { CommandFailedError } from "@tokenring-ai/agent/AgentError";
import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import QueueService from "../../QueueService.ts";

const inputSchema = {
  args: {
    queue: {
      type: "string",
      description: "The name of the queue (defaults to 'default')",
    },
  },
  positionals: [
    {
      name: "position",
      description: "The 1-based position of the pending item to remove (see /queue list)",
      required: true,
    },
  ],
} as const satisfies AgentCommandInputSchema;

export default {
  name: "queue remove",
  description: "Remove a pending item from a queue by position",
  help: `Remove a pending item from a queue by its 1-based position.

## Example

/queue list
/queue remove 2`,
  inputSchema,
  execute: ({ args, agent }: AgentCommandInputType<typeof inputSchema>): string => {
    const queueService = agent.requireService(QueueService);
    const queueName = args.queue || "default";

    const position = Number.parseInt(args.position, 10);
    if (!Number.isFinite(position) || position < 1) {
      throw new CommandFailedError("Position must be a positive number (see /queue list)");
    }

    const pending = queueService.getPending(queueName);
    const item = pending[position - 1];
    if (!item) {
      throw new CommandFailedError(`No pending item at position ${position} (queue has ${pending.length} pending item(s))`);
    }

    const removed = queueService.removeItem(queueName, item.id);
    return removed ? `Removed "${item.name}" from queue "${queueName}".` : `Could not remove item (it may have already started).`;
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
