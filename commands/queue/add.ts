import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import WorkQueueService from "../../WorkQueueService.ts";

export default {
  name: "queue add",
  description: "/queue add <prompt> - Add a prompt to the queue",
  help: `# /queue add\n\nAdd a new prompt to the end of the queue.\n\n## Example\n\n/queue add 'Write a Python function to calculate Fibonacci numbers'`,
  execute: async (remainder: string, agent: Agent): Promise<string> => {
    const prompt = remainder.trim();
    if (!prompt) throw new CommandFailedError("Usage: /queue add <prompt>");
    const workQueueService = agent.requireServiceByType(WorkQueueService);
    workQueueService.enqueue({ checkpoint: agent.generateCheckpoint(), name: prompt, input: prompt }, agent);
    return `Added to queue. Queue length: ${workQueueService.size(agent)}`;
  },
} satisfies TokenRingAgentCommand;
