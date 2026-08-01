import type Agent from "@tokenring-ai/agent/Agent";
import type { TokenRingToolDefinition, TokenRingToolResult } from "@tokenring-ai/chat/schema";
import { z } from "zod";
import QueueService from "../QueueService.ts";

const name = "queue_cancel";
const displayName = "Queue/Cancel";
const description = "Cancels a queued task. Removes it if it has not started yet, or aborts the running agent if it has." as const;

const inputSchema = z.object({
  queueName: z.string().describe("The name of the queue the task is on. Defaults to 'default'.").optional(),
  itemId: z.string().describe("The id of the task to cancel."),
});

function execute({ queueName, itemId }: z.output<typeof inputSchema>, agent: Agent): TokenRingToolResult {
  const queueService = agent.requireService(QueueService);
  const queue = queueName?.trim() || "default";

  const cancelled = queueService.cancelItem(queue, itemId);

  return {
    message: `**Task Queue** Cancelled task ${itemId}`,
    result: JSON.stringify({
      status: cancelled ? "cancelled" : "not_found",
      itemId,
      queueName: queue,
      message: cancelled ? "Item was cancelled." : "No pending or running item was found with that id.",
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
