import Agent from "@tokenring-ai/agent/Agent";
import runChat from "@tokenring-ai/ai-client/runChat";
import * as checkpoint from "@tokenring-ai/agent/commands/checkpoint";
import WorkQueueService from "../WorkQueueService.ts";

/**
 * /queue add|remove|clear|list|run <args>
 * Manages a queue of chat prompt strings to run.
 * Queue is stored on state.queue as an array of prompt strings.
 */

export const description = "/queue <command> - Manage a queue of chat prompts" as const;

export async function execute(
  remainder: string,
  agent: Agent,
): Promise<void> {
  const workQueueService = agent.requireFirstServiceByType(WorkQueueService);

  const [action, ...args] = (remainder ?? "").trim().split(/\s+/);

  switch (action) {
    case "add": {
      const prompt = args.join(" ");
      if (!prompt) {
        agent.errorLine("Usage: /queue add <prompt>");
        return;
      }

      workQueueService.enqueue({
        checkpoint: agent.generateCheckpoint(),
        name: prompt,
        input: [{role: "user", content: prompt}],
      }, agent);

      agent.infoLine(
        `Added to queue. Queue length: ${workQueueService.size(agent)}`,
      );
      break;
    }
    case "remove": {
      const idx = Number.parseInt(args[0], 10);

      if (Number.isNaN(idx) || idx < 0 || idx >= workQueueService.size(agent)) {
        agent.errorLine(
          "Usage: /queue remove <index>  (index starts from 0)",
        );
        return;
      }
      const removed = workQueueService.splice(idx, 1, agent)[0];
      agent.infoLine(
        `Removed \"${removed.name}\" from queue. Remaining: ${workQueueService.size(agent)}`,
      );
      break;
    }

    case "details": {
      const idx = Number.parseInt(args[0], 10);

      if (Number.isNaN(idx) || idx < 0 || idx >= workQueueService.size(agent)) {
        agent.errorLine(
          "Usage: /queue details <index>  (index starts from 0)",
        );
        return;
      }
      const item = workQueueService.get(idx, agent);
      agent.infoLine(`Queue item details:`);
      JSON.stringify(item, null, 2)
        .split("")
        .forEach((line) => agent.infoLine(line));

      break;
    }
    case "clear": {
      workQueueService.clear(agent);
      agent.infoLine("Queue cleared!");
      break;
    }

    case "list": {
      if (workQueueService.size(agent) === 0) {
        agent.infoLine("Queue is empty.");
        return;
      }
      agent.infoLine("Queue contents:");
      workQueueService.getAll(agent).forEach(({name}: any, i: number) => {
        agent.infoLine(`[${i}] ${name}`);
      });
      break;
    }

    case "start": {
      if (workQueueService.isEmpty(agent)) {
        agent.infoLine("Queue is empty.");
        return;
      }

      if (workQueueService.started(agent)) {
        agent.infoLine(
          "Queue already started. Use /queue next to load the next item in the queue, or queue done to end the queue.",
        );
        return;
      }

      workQueueService.setInitialCheckpoint(
        agent.generateCheckpoint(),
        agent,
      );
      workQueueService.startWork(agent);

      await checkpoint.execute("create Start of queue operation", agent);
      agent.infoLine(
        "Queue started, use /queue next to start working on the first item in the queue, or /queue done to end the queue.",
      );
      break;
    }
    case "next":
    case "done": {
      if (!workQueueService.started(agent)) {
        agent.infoLine(
          "Queue not started. Use /queue start to start the queue.",
        );
        return;
      }

      const currentItem = workQueueService.getCurrentItem(agent);

      await checkpoint.execute(
        `create End of queue operation: ${currentItem?.name ?? 'unknown'}`,
        agent,
      );

      if (action === "done" || workQueueService.isEmpty(agent)) {
        const initialCheckpoint = workQueueService.getInitialCheckpoint(agent);
        if (initialCheckpoint) {
          agent.restoreCheckpoint(initialCheckpoint);
        } else {
          agent.errorLine("Couldn't restore initial state, no initial checkpoint found");
        }

        workQueueService.stopWork(agent);
        if (action === "done") {
          agent.infoLine("Restored chat state to preserved state.");
        } else {
          agent.infoLine("Queue complete.");
        }
        return;
      }

      const newItem = workQueueService.dequeue(agent);
      agent.infoLine(
        `Queue Item loaded: ${newItem?.name ?? 'unknown'} Use /queue run to run the queue item, and /queue next|skip|done to move on to the next item.`,
      );

      break;
    }
    case "skip": {
      if (!workQueueService.started(agent)) {
        agent.infoLine(
          "Queue not started. Use /queue start to start the queue.",
        );
        return;
      }

      const currentItem = workQueueService.getCurrentItem(agent);
      if (!currentItem) {
        agent.infoLine(
          "No queue item loaded. Use /queue next to load the next item in the queue, or queue done to end the queue.",
        );
        return;
      }

      workQueueService.enqueue(currentItem, agent);
      workQueueService.setCurrentItem(null, agent);
      agent.infoLine(
        "Queue item skipped. It has been added to the end of the queue in case you would like to run it later, and you can use /queue next to load the next item in the queue, or /queue done to end the queue.",
      );
      break;
    }
    case "run": {
      if (!workQueueService.started(agent)) {
        agent.infoLine(
          "Queue not started. Use /queue start to start the queue.",
        );
        return;
      }

      const currentItem = workQueueService.getCurrentItem(agent);
      if (!currentItem) {
        agent.infoLine(
          "No queue item loaded. Use /queue next to load the next item in the queue, or queue done to end the queue.",
        );
        return;
      }

      const {input, checkpoint} = currentItem;
      agent.restoreCheckpoint(checkpoint);

      try {
        await runChat({
          input
        }, agent);
      } catch (error: any) {
        agent.errorLine(
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

// noinspection JSUnusedGlobalSymbols
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
