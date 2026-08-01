import type Agent from "@tokenring-ai/agent/Agent";
import type { TokenRingToolDefinition, TokenRingToolResult } from "@tokenring-ai/chat/schema";
import { z } from "zod";
import QueueService from "../QueueService.ts";

const name = "queue_getResults";
const displayName = "Queue/GetResults";
const description = "Retrieves the results of recently completed work on a named work queue, newest first." as const;

const inputSchema = z.object({
  queueName: z.string().describe("The name of the queue to inspect. Defaults to 'default'.").optional(),
  limit: z.number().int().positive().max(100).describe("Maximum number of results to return. Defaults to 20.").optional(),
  status: z.enum(["completed", "failed", "cancelled"]).describe("Filter results to a specific status.").optional(),
});

function execute({ queueName, limit, status }: z.output<typeof inputSchema>, agent: Agent): TokenRingToolResult {
  const queueService = agent.requireService(QueueService);
  const queue = queueName?.trim() || "default";

  const results = queueService.getResults(queue, limit ?? 20, status);

  return {
    message: `**Task Queue** Retrieved queue results for ${queue}`,
    result: JSON.stringify({
      queueName: queue,
      count: results.length,
      results: results.map(item => ({
        id: item.id,
        name: item.name,
        status: item.status,
        resultMessage: item.resultMessage,
        durationMs: item.durationMs,
        completedAt: item.completedAt,
      })),
    }),
  };
}

export default {
  name,
  displayName,
  description,
  inputSchema,
  execute,
} satisfies TokenRingToolDefinition<typeof inputSchema>;
