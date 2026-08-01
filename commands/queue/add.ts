import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import QueueService from "../../QueueService.ts";

const inputSchema = {
  args: {
    queue: {
      type: "string",
      description: "The name of the queue to add to (defaults to 'default')",
    },
  },
  remainder: {
    name: "prompt",
    description: "The task to add to the queue",
    required: true,
  },
} as const satisfies AgentCommandInputSchema;

export default {
  name: "queue add",
  description: "Add a task to a queue",
  help: `Add a new task to the end of a queue. A fresh agent of the queue's assigned type will be spawned to run it.

## Examples

/queue add Write a Python function to calculate Fibonacci numbers
/queue add --queue research Summarize the latest findings on topic X`,
  inputSchema,
  execute: ({ args, remainder, agent }: AgentCommandInputType<typeof inputSchema>): string => {
    const queueService = agent.requireService(QueueService);
    const queueName = args.queue || "default";

    const item = queueService.enqueue(queueName, {
      name: remainder,
      input: { from: `user:${agent.id}`, message: remainder },
    });
    const pending = queueService.getPending(queueName);

    return `Added to queue "${queueName}" (id: ${item.id}). Position: ${pending.length}.`;
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
