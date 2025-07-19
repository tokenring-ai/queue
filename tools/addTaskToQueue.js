import ChatService from "@token-ring/chat/ChatService";
import WorkQueueService from "../WorkQueueService.js";
import ChatMessageStorage from "@token-ring/ai-client/ChatMessageStorage";
import { z } from "zod";

/**
 * Adds a task to the work queue for later execution
 * @param {object} args
 * @param {string} args.description - A short description of the task to be performed
 * @param {string} args.content - The detailed task description in natural language
 * @param {TokenRingRegistry} registry - The package registry
 * @returns {Promise<object>} Result containing queue status and message
 */
export async function execute({ description, content }, registry) {
	const chatService = registry.requireFirstServiceByType(ChatService);
	const chatMessageStorage =
		registry.requireFirstServiceByType(ChatMessageStorage);
	const workQueueService = registry.requireFirstServiceByType(WorkQueueService);

	chatService.systemLine(`[Queue] Added task "${description}" to queue`);

	workQueueService.enqueue({
		currentMessage: chatMessageStorage.getCurrentMessage(),
		name: description,
		input: [{ role: "user", content }],
	});

	return {
		status: "queued",
		message: `Task has been queued for later execution.`,
	};
}

export const description =
	"Adds a task to the queue for later execution by the system.";

export const parameters = z.object({
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
