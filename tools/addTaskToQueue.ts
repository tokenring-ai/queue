import ChatMessageStorage from "@token-ring/ai-client/ChatMessageStorage";
import ChatService from "@token-ring/chat/ChatService";
import { z } from "zod";
import WorkQueueService from "../WorkQueueService.ts";
import {Registry} from "@token-ring/registry";

/**
 * Adds a task to the work queue for later execution
 * @param args Object containing the task description and content
 * @param args.description A short description of the task to be performed
 * @param args.content The detailed task description in natural language
 * @param registry The package registry
 * @returns Result containing queue status and message
 */
export async function execute(
	{ description, content }: { description?: string; content?: string },
	registry: Registry,
): Promise<object> {
	const chatService = registry.requireFirstServiceByType(ChatService);
	const chatMessageStorage =
		registry.requireFirstServiceByType(ChatMessageStorage);
	const workQueueService = registry.requireFirstServiceByType(WorkQueueService);

	chatService.systemLine(`[Queue] Added task "${description}" to queue`);

    if (!description) {
        chatService.errorLine("Task description is required");
        return {
            status: "error",
            message: "Task description is required",
        };
    }

    if (!content) {
        chatService.errorLine("Task content is required");
        return {
            status: "error",
            message: "Task content is required",
        };
    }

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
	"Adds a task to the queue for later execution by the system." as const;

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
