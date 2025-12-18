import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import {ChatService} from "@tokenring-ai/chat";
import runChat from "@tokenring-ai/chat/runChat";
import {execute as checkpoint} from "@tokenring-ai/checkpoint/commands/checkpoint";
import WorkQueueService from "../WorkQueueService.ts";

/**
 * /queue add|remove|clear|list|run|start|next|skip|done <args>
 * Manages a queue of chat prompt strings to run.
 * Queue is stored in state.queue as an array of prompt strings.
 */

const description =
  "/queue - Manage a queue of chat prompts" as const;

async function execute(remainder: string, agent: Agent): Promise<void> {
  const workQueueService = agent.requireServiceByType(WorkQueueService);

  const [action, ...args] = (remainder ?? "").trim().split(/\s+/);

  switch (action) {
    case "add": {
      const prompt = args.join(" ");
      if (!prompt) {
        agent.errorLine("Usage: /queue add <prompt>");
        return;
      }

      workQueueService.enqueue(
        {
          checkpoint: agent.generateCheckpoint(),
          name: prompt,
          input: prompt,
        },
        agent,
      );

      agent.infoLine(
        `Added to queue. Queue length: ${workQueueService.size(agent)}`,
      );
      break;
    }
    case "remove": {
      const idx = Number.parseInt(args[0], 10);

      if (Number.isNaN(idx) || idx < 0 || idx >= workQueueService.size(agent)) {
        agent.errorLine("Usage: /queue remove <index>  (index starts from 0)");
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
        agent.errorLine("Usage: /queue details <index>  (index starts from 0)");
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

      workQueueService.setInitialCheckpoint(agent.generateCheckpoint(), agent);
      workQueueService.startWork(agent);

      await checkpoint("create Start of queue operation", agent);
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

      await checkpoint(
        `create End of queue operation: ${currentItem?.name ?? "unknown"}`,
        agent,
      );

      if (action === "done" || workQueueService.isEmpty(agent)) {
        const initialCheckpoint = workQueueService.getInitialCheckpoint(agent);
        if (initialCheckpoint) {
          agent.restoreState(initialCheckpoint.state);
        } else {
          agent.errorLine(
            "Couldn't restore initial state, no initial checkpoint found",
          );
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
        `Queue Item loaded: ${newItem?.name ?? "unknown"} Use /queue run to run the queue item, and /queue next|skip|done to move on to the next item.`,
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
      agent.restoreState(checkpoint.state)

      const chatService = agent.requireServiceByType(ChatService);
      const chatConfig = chatService.getChatConfig(agent);

      try {
        const chatConfig = chatService.getChatConfig(agent);
        await runChat(input, chatConfig, agent);
      } catch (error: any) {
        agent.errorLine(
          `Error running queued prompt: ${error.message || error}`,
        );
      }
      break;
    }

    default: {
      agent.chatOutput(help);
    }
  }
}

const help: string = `# 📋 QUEUE COMMAND HELP

The /queue command manages a queue of chat prompts for batch processing. Use these commands to organize, manage, and execute your prompts efficiently.

## 🔧 QUEUE MANAGEMENT COMMANDS

### /queue add <prompt>

Add a new prompt to the end of the queue

**Example:**
/queue add 'Write a Python function to calculate Fibonacci numbers'

### /queue remove <index>

Remove the prompt at the given zero-based index

**Example:**
/queue remove 2

### /queue details <index>

Show detailed information about a specific queue item

**Example:**
/queue details 0

### /queue clear

Remove all prompts from the queue

**Example:**
/queue clear

### /queue list

Display all queued prompts with their indices

**Example:**
/queue list

## 🚀 QUEUE PROCESSING COMMANDS

### /queue start

Begin queue processing (preserves current chat state)

**Example:**
/queue start

### /queue next

Load the next queued item (does not execute it)

**Example:**
/queue next

### /queue run

Execute the currently loaded queued prompt

**Example:**
/queue run

### /queue skip

Skip current item and re-add to end of queue

**Example:**
/queue skip

### /queue done

End queue processing and restore previous chat state

**Example:**
/queue done

## 💡 USAGE TIPS

1. Use /queue add to build up a list of prompts you want to process
2. Use /queue start to begin processing (this preserves your current chat state)
3. Use /queue next to load each prompt, then /queue run to execute it
4. Use /queue skip to defer a prompt for later processing
5. Use /queue done to finish and restore your original chat state

## 📊 QUEUE STATUS

- **Queue length**: Use /queue list to see current queue size
- **Processing status**: Queue is either idle or started (use /queue start to begin)
- **Current item**: Shows which item is loaded (use /queue next to load next)`;

export default {
  description,
  execute,
  help,
} satisfies TokenRingAgentCommand