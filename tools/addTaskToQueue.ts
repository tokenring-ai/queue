import Agent from "@tokenring-ai/agent/Agent";
import {z} from "zod";
import WorkQueueService from "../WorkQueueService.ts";

/**
 * Adds a task to the work queue for later execution
 */
export const name = "queue/addTaskToQueue" as const;

export async function execute(
  {description, content}: { description?: string; content?: string },
  agent: Agent,
): Promise<{ status: string; message: string }> {
  const workQueueService = agent.requireServiceByType(WorkQueueService);

  // Prefix all chat output with the tool name
  agent.infoLine(`[${name}] Added task "${description}" to queue`);

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
      input: [{role: "user", content}],
    },
    agent,
  );

  return {
    status: "queued",
    message: `Task has been queued for later execution.`,
  };
}

export const description =
  "Adds a task to the queue for later execution by the system." as const;

export const inputSchema = z.object({
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
