import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import numberedList from "@tokenring-ai/utility/string/numberedList";
import QueueService from "../../QueueService.ts";

const inputSchema = {
  args: {
    queue: {
      type: "string",
      description: "The name of the queue to inspect (defaults to 'default')",
    },
    all: {
      type: "flag",
      description: "Include items that are currently running",
    },
  },
} as const satisfies AgentCommandInputSchema;

export default {
  name: "queue list",
  description: "Display the items waiting on a queue",
  help: `Display the items waiting on a queue.

## Examples

/queue list
/queue list --queue research
/queue list --all`,
  inputSchema,
  execute: ({ args, agent }: AgentCommandInputType<typeof inputSchema>): string => {
    const queueService = agent.requireService(QueueService);
    const queueName = args.queue || "default";

    const pending = queueService.getPending(queueName);
    const running = args.all ? queueService.getRunning(queueName) : [];

    const lines = [`=== Queue "${queueName}" ===`];

    if (pending.length === 0) {
      lines.push("No pending items.");
    } else {
      lines.push("Pending:", numberedList(pending.map(item => `${item.name} (id: ${item.id})`)));
    }

    if (running.length > 0) {
      lines.push("Running:", numberedList(running.map(item => `${item.name} (agent: ${item.agentId ?? "?"})`)));
    }

    return lines.join("\n");
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
