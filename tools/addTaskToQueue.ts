import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingToolDefinition} from "@tokenring-ai/chat/schema";
import {z} from "zod";
import WorkQueueService from "../WorkQueueService.ts";

/**
 * Adds a task to the work queue for later execution
 */
const name = "queue_addTaskToQueue";
const displayName = "Queue/addTaskToQueue";

async function execute(
  {description, content}: z.infer<typeof inputSchema>,
  agent: Agent,
): Promise<{ status: string; message: string }> {
  const workQueueService = agent.requireServiceByType(WorkQueueService);

  // Prefix all chat output with the tool name
  agent.infoMessage(`[${name}] Added task "${description}" to queue`);

  if (!description) {
    throw new Error(`[${name}] Task description is required`);
  }

  if (!content) {
    throw new Error(`[${name}] Task content is required`);
  }

  workQueueService.enqueue(
    {
      checkpoint: agent.generateCheckpoint(),
      name: description,
      input: content
    },
    agent,
  );

  return {
    status: "queued",
    message: `Task has been queued for later execution.`,
  };
}

const description =
  "Adds a task to the queue for later execution by the system." as const;

const inputSchema = z.object({
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
});

export default {
  name, displayName, description, inputSchema, execute,
} satisfies TokenRingToolDefinition<typeof inputSchema>;