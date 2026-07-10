import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import numberedList from "@tokenring-ai/utility/string/numberedList";
import QueueService from "../../QueueService.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

export default {
  name: "queue queues",
  description: "List all configured queues",
  help: `List all configured queues with their agent type, concurrency, and current item counts.

## Example

/queue queues`,
  inputSchema,
  execute: ({ agent }: AgentCommandInputType<typeof inputSchema>): string => {
    const queueService = agent.requireServiceByType(QueueService);
    const names = queueService.getQueueNames();

    if (names.length === 0) {
      return "No queues configured.";
    }

    const lines = [
      "=== Queues ===",
      numberedList(
        names.map(name => {
          const config = queueService.getQueueConfig(name);
          const pending = queueService.getPending(name).length;
          const running = queueService.getRunning(name).length;
          return `${name} — agentType: ${config?.agentType}, concurrency: ${config?.concurrency} (pending: ${pending}, running: ${running})`;
        }),
      ),
    ];

    return lines.join("\n");
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
