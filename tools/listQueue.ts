import type Agent from "@tokenring-ai/agent/Agent";
import type { TokenRingToolDefinition, TokenRingToolResult } from "@tokenring-ai/chat/schema";
import { z } from "zod";
import QueueService from "../QueueService.ts";

const name = "queue_list";
const displayName = "Queue/List";
const description = "Lists the items currently waiting (and optionally running) on a named work queue." as const;

const inputSchema = z.object({
  queueName: z.string().describe("The name of the queue to inspect. Defaults to 'default'.").optional(),
  includeRunning: z.boolean().describe("Whether to also include items that are currently being processed.").optional(),
});

function execute({ queueName, includeRunning }: z.output<typeof inputSchema>, agent: Agent): TokenRingToolResult {
  const queueService = agent.requireServiceByType(QueueService);
  const queue = queueName?.trim() || "default";

  const pending = queueService.getPending(queue);
  const running = includeRunning ? queueService.getRunning(queue) : [];

  return JSON.stringify({
    queueName: queue,
    pending: pending.map((item, index) => ({
      position: index + 1,
      id: item.id,
      name: item.name,
      createdAt: item.createdAt,
    })),
    ...(running.length > 0
      ? {
          running: running.map(item => ({
            id: item.id,
            name: item.name,
            agentId: item.agentId,
            startedAt: item.startedAt,
          })),
        }
      : {}),
  });
}

export default {
  name,
  displayName,
  description,
  inputSchema,
  execute,
} satisfies TokenRingToolDefinition<typeof inputSchema>;
