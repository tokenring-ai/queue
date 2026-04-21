import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import WorkQueueService from "../../WorkQueueService.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

export default {
  name: "queue start",
  description: "Begin queue processing",
  help: `Begin queue processing (preserves current chat state).

## Example

/queue start`,
  inputSchema,
  execute: ({ agent }: AgentCommandInputType<typeof inputSchema>): string => {
    const workQueueService = agent.requireServiceByType(WorkQueueService);
    if (workQueueService.isEmpty(agent)) return "Queue is empty.";
    if (workQueueService.started(agent)) return "Queue already started. Use /queue next to load the next item in the queue, or queue done to end the queue.";
    workQueueService.setInitialCheckpoint(agent.generateCheckpoint(), agent);
    workQueueService.startWork(agent);
    return "Queue started, use /queue next to start working on the first item in the queue, or /queue done to end the queue.";
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
