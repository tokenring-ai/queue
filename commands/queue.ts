import { ChatMessageStorage } from "@token-ring/ai-client";
import runChat from "@token-ring/ai-client/runChat";
import ChatService from "@token-ring/chat/ChatService";
import * as checkpoint from "@token-ring/history/commands/checkpoint";
import WorkQueueService from "../WorkQueueService.ts";
import {abandon} from "@token-ring/utility/abandon";

/**
 * /queue add|remove|clear|list|run <args>
 * Manages a queue of chat prompt strings to run.
 * Queue is stored on state.queue as an array of prompt strings.
 */

export const description = "/queue <command> - Manage a queue of chat prompts" as const;

export async function execute(
	remainder: any,
	registry: TokenRingRegistry,
): Promise<void> {
	const chatService = registry.requireFirstServiceByType(ChatService);
	const chatMessageStorage =
		registry.requireFirstServiceByType(ChatMessageStorage);

	const workQueueService = registry.requireFirstServiceByType(WorkQueueService);

	const [action, ...args] = (remainder ?? "").trim().split(/\s+/);

	switch (action) {
		case "add": {
			const prompt = args.join(" ");
			if (!prompt) {
				chatService.errorLine("Usage: /queue add <prompt>");
				return;
			}

			const currentMessage = chatMessageStorage.getCurrentMessage();

			workQueueService.enqueue({
				currentMessage,
				name: prompt,
				input: [{ role: "user", content: prompt }],
			});

			chatService.systemLine(
				`Added to queue. Queue length: ${workQueueService.size()}`,
			);
			break;
		}
		case "remove": {
			const idx = Number.parseInt(args[0], 10);

			if (Number.isNaN(idx) || idx < 0 || idx >= workQueueService.size()) {
				chatService.errorLine(
					"Usage: /queue remove <index>  (index starts from 0)",
				);
				return;
			}
			const removed = workQueueService.splice(idx, 1);
			chatService.systemLine(
				`Removed \"${removed.name}\" from queue. Remaining: ${workQueueService.size()}`,
			);
			break;
		}

		case "details": {
			const idx = Number.parseInt(args[0], 10);

			if (Number.isNaN(idx) || idx < 0 || idx >= workQueueService.size()) {
				chatService.errorLine(
					"Usage: /queue details <index>  (index starts from 0)",
				);
				return;
			}
			const item = workQueueService.get(idx);
			chatService.systemLine(`Queue item details:`);
			JSON.stringify(item, null, 2)
				.split("")
				.forEach((line) => chatService.systemLine(line));

			break;
		}
		case "clear": {
			workQueueService.clear();
			chatService.systemLine("Queue cleared!");
			break;
		}

		case "list": {
			if (workQueueService.size() === 0) {
				chatService.systemLine("Queue is empty.");
				return;
			}
			chatService.systemLine("Queue contents:");
			workQueueService.getAll().forEach(({ name }: any, i: number) => {
				chatService.systemLine(`[${i}] ${name}`);
			});
			break;
		}

		case "start": {
			if (workQueueService.isEmpty()) {
				chatService.systemLine("Queue is empty.");
				return;
			}

			if (workQueueService.started()) {
				chatService.systemLine(
					"Queue already started. Use /queue next to load the next item in the queue, or queue done to end the queue.",
				);
				return;
			}

			workQueueService.setInitialMessage(
				chatMessageStorage.getCurrentMessage(),
			);
			abandon(workQueueService.start());

			await checkpoint.execute("create Start of queue operation", registry);
			chatService.systemLine(
				"Queue started, use /queue next to start working on the first item in the queue, or /queue done to end the queue.",
			);
			break;
		}
		case "next":
		case "done": {
			if (!workQueueService.started()) {
				chatService.systemLine(
					"Queue not started. Use /queue start to start the queue.",
				);
				return;
			}

			const currentItem = workQueueService.getCurrentItem();

			await checkpoint.execute(
				`create End of queue operation: ${currentItem.name}`,
				registry,
			);

			if (action === "done" || workQueueService.isEmpty()) {
				chatMessageStorage.setCurrentMessage(
					workQueueService.getInitialMessage(),
				);
				abandon(workQueueService.stop());
				if (action === "done") {
					chatService.systemLine("Restored chat state to preserved state.");
				} else {
					chatService.systemLine("Queue complete.");
				}
				return;
			}

			chatMessageStorage.setCurrentMessage(null);

			const newItem = workQueueService.dequeue();
			chatService.systemLine(
				`Queue Item loaded: ${newItem.name} Use /queue run to run the queue item, and /queue next|skip|done to move on to the next item.`,
			);

			break;
		}
		case "skip": {
			if (!workQueueService.started()) {
				chatService.systemLine(
					"Queue not started. Use /queue start to start the queue.",
				);
				return;
			}

			const currentItem = workQueueService.getCurrentItem();
			if (!currentItem) {
				chatService.systemLine(
					"No queue item loaded. Use /queue next to load the next item in the queue, or queue done to end the queue.",
				);
				return;
			}

			workQueueService.queue(currentItem);
			workQueueService.setCurrentItem(null);
			chatService.systemLine(
				"Queue item skipped. It has been added to the end of the queue in case you would like to run it later, and you can use /queue next to load the next item in the queue, or /queue done to end the queue.",
			);
			break;
		}
		case "run": {
			if (!workQueueService.started()) {
				chatService.systemLine(
					"Queue not started. Use /queue start to start the queue.",
				);
				return;
			}

			const currentItem = workQueueService.getCurrentItem();
			if (!currentItem) {
				chatService.systemLine(
					"No queue item loaded. Use /queue next to load the next item in the queue, or queue done to end the queue.",
				);
				return;
			}

			const { input, currentMessage } = currentItem;
			chatMessageStorage.setCurrentMessage(
				currentMessage ?? workQueueService.getInitialMessage(),
			);

			try {
				await runChat(
					{
						systemPrompt: chatMessageStorage.getInstructions(),
						input,
						model: "auto",
					},
					registry,
				);
			} catch (error: any) {
				chatService.errorLine(
					`Error running queued prompt: ${error.message || error}`,
				);
			}
			break;
		}

		default: {
			help();
		}
	}
}

export function help(): string[] {
	return [
		"/queue [add|remove|clear|list|run|start|next|skip|done] [args...]",
		"  - With no arguments: shows command help",
		"  - add <prompt>: Add a new prompt to the end of the queue",
		"  - remove <index>: Remove the prompt at the given zero-based index",
		"  - update <index> <prompt>: Replace the prompt at given index",
		"  - clear: Remove all prompts from the queue",
		"  - list: Display all queued prompts with their indices",
		"  - start: Begin queue processing",
		"  - next: Load the next queued item (does not execute it)",
		"  - run: Execute the currently loaded queued prompt",
		"  - skip: Skip current item and re-add to end of queue",
		"  - done: End queue processing and restore previous state",
	];
}
