import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import numberedList from "@tokenring-ai/utility/string/numberedList";
import WorkQueueService from "../../WorkQueueService.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

export default {
  name: "queue list",
  description: "Display all queued prompts",
  help: `Display all queued prompts with their indices.

## Example

/queue list`,
  inputSchema,
  execute: ({
              agent,
            }: AgentCommandInputType<typeof inputSchema>): string => {
    const workQueueService = agent.requireServiceByType(WorkQueueService);
    if (workQueueService.size(agent) === 0) return "Queue is empty.";
    return [
      "Queue contents:",
      numberedList(workQueueService.getAll(agent).map(({name}) => name)),
    ].join("\n");
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
