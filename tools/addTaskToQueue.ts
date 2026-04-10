import type Agent from "@tokenring-ai/agent/Agent";
import type {TokenRingToolDefinition, TokenRingToolJSONResult,} from "@tokenring-ai/chat/schema";
import {z} from "zod";
import WorkQueueService from "../WorkQueueService.ts";

/**
 * Adds a task to the work queue for later execution
 */
const name = "queue_addTaskToQueue";
const displayName = "Queue/addTaskToQueue";

function execute(
  {description, content}: z.output<typeof inputSchema>,
  agent: Agent,
): TokenRingToolJSONResult<{ status: string; message: string }> {
  const workQueueService = agent.requireServiceByType(WorkQueueService);

  // Prefix all chat output with the tool name
  agent.infoMessage(`[${name}] Added task "${description}" to queue`);

  workQueueService.enqueue(
    {
      checkpoint: agent.generateCheckpoint(),
      name: description,
      input: content,
    },
    agent,
  );

  return {
    type: "json",
    data: {
      status: "queued",
      message: `Task has been queued for later execution.`,
    },
  };
}

const description =
  "Adds a task to the queue for later execution by the system." as const;

const inputSchema = z
  .object({
    description: z
      .string()
      .describe("A short description of the task to be performed"),
    content: z
      .string()
      .describe(
        "A natural language string, explaining the exact task to be performed, in great detail. " +
        "This string will be used to prompt an AI agent as the next message in this conversation, so should be as detailed as possible, " +
        "and should directly order the AI agent to execute the task, using the tools that are available to it.",
      ),
  })
  .refine((data) => data.description?.trim(), {
    message: "Task description is required",
    path: ["description"],
  })
  .refine((data) => data.content?.trim(), {
    message: "Task content is required",
    path: ["content"],
  });

export default {
  name,
  displayName,
  description,
  inputSchema,
  execute,
} satisfies TokenRingToolDefinition<typeof inputSchema>;
