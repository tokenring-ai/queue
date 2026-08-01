import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import indent from "@tokenring-ai/utility/string/indent";
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
  name: "queue status",
  description: "Show the configuration and health of a queue",
  help: `Show the configuration and current health of a single queue.

## Examples

/queue status
/queue status --queue research`,
  inputSchema,
  execute: ({ args, agent }: AgentCommandInputType<typeof inputSchema>): string => {
    const queueService = agent.requireService(QueueService);
    const queueName = args.queue || "default";

    const config = queueService.getQueueConfig(queueName);
    if (!config) {
      return `Queue "${queueName}" does not exist. Use /queue queues to list configured queues.`;
    }

    const pending = queueService.getPending(queueName).length;
    const running = queueService.getRunning(queueName).length;
    const results = queueService.getResults(queueName, 1000).length;

    return [
      `=== Queue "${queueName}" ===`,
      indent(
        [
          `Agent type: ${config.agentType}`,
          `Concurrency: ${config.concurrency}`,
          `Max pending: ${config.maxSize ?? "unlimited"}`,
          `Max results: ${config.maxResults}`,
          `Pending: ${pending}`,
          `Running: ${running} / ${config.concurrency}`,
          `Completed (retained): ${results}`,
        ],
        1,
      ),
    ].join("\n");
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
