import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import numberedList from "@tokenring-ai/utility/string/numberedList";
import QueueService from "../../QueueService.ts";

const inputSchema = {
  args: {
    queue: {
      type: "string",
      description: "The name of the queue to inspect (defaults to 'default')",
    },
    limit: {
      type: "number",
      description: "Maximum number of results to show (defaults to 20)",
    },
  },
} as const satisfies AgentCommandInputSchema;

export default {
  name: "queue results",
  description: "Display recently completed work on a queue",
  help: `Display the results of recently completed work on a queue, newest first.

## Examples

/queue results
/queue results --queue research --limit 5`,
  inputSchema,
  execute: ({ args, agent }: AgentCommandInputType<typeof inputSchema>): string => {
    const queueService = agent.requireService(QueueService);
    const queueName = args.queue || "default";

    const results = queueService.getResults(queueName, args.limit ?? 20);

    if (results.length === 0) {
      return `No completed items on queue "${queueName}".`;
    }

    const lines = [
      `=== Results for queue "${queueName}" (newest first) ===`,
      numberedList(
        results.map(item => {
          const duration = `${(item.durationMs / 1000).toFixed(1)}s`;
          return `[${item.status.toUpperCase()}] ${item.name} (${duration})\n  ${item.resultMessage}`;
        }),
      ),
    ];

    return lines.join("\n");
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
