import type Agent from "@tokenring-ai/agent/Agent";
import type { TokenRingToolDefinition, TokenRingToolResult } from "@tokenring-ai/chat/schema";
import { z } from "zod";
import QueueService from "../QueueService.ts";

const name = "queue_addTaskToQueue";
const displayName = "Queue/AddTaskToQueue";
const description =
  "Adds a task to a named work queue for execution by an available agent of the queue's assigned type. A fresh agent is spawned to run each task, so the task will not run in the current conversation." as const;

const inputSchema = z
  .object({
    queueName: z.string().describe("The name of the queue to add the task to. Defaults to 'default'.").optional(),
    description: z.string().describe("A short description of the task to be performed"),
    content: z
      .string()
      .describe(
        "A natural language string, explaining the exact task to be performed, in great detail. " +
          "This string will be used to prompt an AI agent (spawned from the queue) to execute the task, so should be as detailed as possible, " +
          "and should directly order the AI agent to execute the task, using the tools that are available to it.",
      ),
  })
  .refine(data => data.description.trim(), {
    message: "Task description is required",
    path: ["description"],
  })
  .refine(data => data.content.trim(), {
    message: "Task content is required",
    path: ["content"],
  });

function execute({ queueName, description, content }: z.output<typeof inputSchema>, agent: Agent): TokenRingToolResult {
  const queueService = agent.requireServiceByType(QueueService);
  const queue = queueName?.trim() || "default";

  const item = queueService.enqueue(queue, { name: description, input: content, from: `agent:${agent.id}` });

  agent.infoMessage(`[${name}] Added task "${description}" to queue "${queue}"`);

  return {
    message: `**Task Queue** Added task to queue ${queue}`,
    result: JSON.stringify({
      status: "queued",
      itemId: item.id,
      queueName: queue,
      message: `Task has been queued for execution by a "${queueService.getQueueConfig(queue)?.agentType}" agent.`,
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
