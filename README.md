```markdown
# @token-ring/queue

This package provides a lightweight, in-memory work queue for Token Ring along with chat commands and a programmatic tool to manage and run queued tasks. It integrates with the Token Ring registry, chat UI, and chat message storage to support batching prompts/tasks and processing them in a controlled, stateful way.

## What’s included

- WorkQueueService: A registry service that manages a FIFO queue and lifecycle for processing work items.
- chatCommands.queue: A chat command (/queue) to add, list, remove, start, step through, skip, run, and finish queued items.
- tools.addTaskToQueue: A programmatic tool to enqueue a new task with a description and natural-language content.

---

## 1. WorkQueueService

WorkQueueService is a simple queue manager with optional capacity limits and minimal lifecycle. It stores arbitrary work items (commonly { name, input, currentMessage }) and exposes queue operations.

Key features:
- Queue operations: enqueue, dequeue, get, splice, size, isEmpty, clear, getAll
- Lifecycle and state: start, stop, started
- Context helpers for chat flows: setInitialMessage/getInitialMessage, setCurrentItem/getCurrentItem
- Optional maxSize to limit queue length

Constructor options:
- maxSize?: number — Maximum queue length; unlimited if not set

Example (registry usage):
```ts
import { WorkQueueService } from "@token-ring/queue";
import { TokenRingRegistry } from "@token-ring/registry"; // example registry

const registry = new TokenRingRegistry();
const workQueue = new WorkQueueService({ maxSize: 50 });
registry.register(workQueue);

await workQueue.start(registry);
workQueue.enqueue({ name: "Generate summary", input: [{ role: "user", content: "Summarize the project status" }] });
console.log(`Queue size: ${workQueue.size()}`);
const item = workQueue.dequeue();
// process item...
await workQueue.stop(registry);
```

Notes:
- Items are stored in-memory and are lost on process exit.
- start/stop set internal state and are used by the chat command flow.

---

## 2. Chat Command: /queue

The /queue command manages a queue of chat prompts (strings/messages) and coordinates execution in the chat UI. It integrates with:
- ChatService (for system/error messages)
- ChatMessageStorage (to preserve/restore chat state while processing)
- History checkpoints (to mark queue session boundaries)

Usage:
- /queue add <prompt> — Add a new prompt to the end of the queue
- /queue remove <index> — Remove the prompt at the given zero-based index
- /queue details <index> — Show the queued item’s details
- /queue clear — Remove all prompts from the queue
- /queue list — Display all queued prompts with their indices
- /queue start — Begin a queue session and preserve current chat state
- /queue next — Load the next queued item (does not execute it)
- /queue run — Execute the currently loaded queued prompt
- /queue skip — Skip current item (re-queues it at the end)
- /queue done — Finish the queue session and restore preserved chat state

Typical flow:
1) Queue up prompts:
   - /queue add Write tests for the file parser
   - /queue add Refactor the queue service
2) Start processing:
   - /queue start
3) For each item:
   - /queue next (loads it)
   - /queue run (executes it)
   - Optionally /queue skip to move it to the end
4) End session:
   - /queue done

---

## 3. Tool: tools.addTaskToQueue

A programmatic tool to enqueue tasks for later execution.

Signature:
```ts
async function execute({ description, content }, registry): Promise<object>
```

Parameters:
- description: Short title/name for the task
- content: Detailed natural-language instructions (used as the user message for the run)

Example:
```ts
import { tools } from "@token-ring/queue";

await tools.addTaskToQueue.execute(
  {
    description: "Investigate failing tests",
    content: "Run the test suite, identify failing tests, and propose fixes."
  },
  registry
);
```

Return value:
- { status: "queued", message: string } on success
- { status: "error", message: string } if required parameters are missing

---

## Exports

From this package:
- WorkQueueService (default)
- chatCommands (namespace) — includes queue command
- tools (namespace) — includes addTaskToQueue tool
- name, version, description (from package.json)

---

## Dependencies and integration

This package relies on Token Ring core services via the registry:
- @token-ring/registry — service registration and lookup
- @token-ring/chat — user/system messaging from chat commands
- @token-ring/ai-client — ChatMessageStorage to snapshot/restore chat state
- @token-ring/history — checkpoints to mark queue session boundaries

The queue is intentionally simple and in-memory. For persistence or distributed processing, extend/replace the service accordingly.

---

## Limitations
- In-memory only; no persistence between runs
- Single-process usage; no cross-process coordination built-in
- Items are generic objects; the /queue command expects { name, input, currentMessage } shape for chat flows

---

## License
MIT
```