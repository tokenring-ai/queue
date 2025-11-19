# Queue Package Documentation

## Overview

The `@tokenring-ai/queue` package provides a lightweight, in-memory queue management system for the Token Ring AI agent
framework. It enables the queuing of work items, such as chat prompts or tasks, to be processed sequentially while
preserving and restoring agent state via checkpoints. The package includes a core service (`WorkQueueService`) for
programmatic queue operations, a chat command (`/queue`) for interactive management in chat interfaces, and a tool (
`addTaskToQueue`) for enqueuing tasks programmatically. It plays a key role in batching and deferred execution of AI
agent tasks, ensuring stateful processing without losing conversation context.

The queue operates as a FIFO (First-In-First-Out) structure, with optional size limits. Items are stored in memory and
lost on process restart. Integration with the agent's checkpoint system allows pausing and resuming queue processing by
snapshotting the agent's state.

## Installation/Setup

This package is a TypeScript module designed for use within the Token Ring ecosystem. To install:

1. Ensure you have Node.js (v18+) and npm/yarn installed.
2. Add it as a dependency in your project:

   ```
   npm install @tokenring-ai/queue@0.1.0
   ```

   Or, if building from source in a monorepo:

   ```
   npm install
   npm run build  # Runs `tsc -p .` to compile TypeScript
   ```

Dependencies are automatically resolved via the package's `package.json`. The package exports ES modules (type:
\"module\") and requires TypeScript for development.

To integrate into a Token Ring agent:

```ts
import { WorkQueueService } from '@tokenring-ai/queue';
import { Agent } from '@tokenring-ai/agent';

// Create and attach the service to an agent
const workQueue = new WorkQueueService({ maxSize: 50 });  // Optional limit
agent.services.add(workQueue);  // Assuming agent has a services registry
await workQueue.attach(agent);
```

## Package Structure

The package is structured as a simple TypeScript project under `pkg/queue/`:

- `index.ts`: Main entry point exporting the `TokenRingPackage` info (name, version, description, chatCommands, tools)
  and `WorkQueueService`.
- `WorkQueueService.ts`: Core queue management service implementing `TokenRingService`.
- `chatCommands.ts`: Exports chat commands (e.g., `/queue`).
- `commands/queue.ts`: Implementation of the `/queue` chat command for interactive queue management.
- `tools.ts`: Exports tools (e.g., `addTaskToQueue`).
- `tools/addTaskToQueue.ts`: Tool for programmatically adding tasks to the queue.
- `package.json`: Metadata, dependencies, and build scripts.
- `README.md`: This documentation.
- `LICENSE`: MIT license.
- `test/WorkQueueService.test.js`: Unit tests (Jest-style).
- Other: TypeScript config implied via build script.

Directories like `commands/` and `tools/` organize sub-modules.

## Core Components

### WorkQueueService

The primary service for queue operations. It maintains an internal `WorkQueueState` slice for the agent's state,
tracking the queue, lifecycle flags, and checkpoints.

**Description**: Manages a queue of `QueueItem` objects (
`{ checkpoint: AgentCheckpointData; name: string; input: ChatInputMessage[] }`). Provides CRUD operations, lifecycle
control, and state preservation for processing items in an AI agent context. Attaches to an `Agent` instance to mutate
its state.

**Key Methods**:

- `constructor({ maxSize } = {})`: Initializes with optional queue size limit.
- `async attach(agent: Agent)`: Initializes the state slice on the agent.
- `startWork(agent: Agent)`: Sets `started = true`.
- `stopWork(agent: Agent)`: Sets `started = false` and clears current item.
- `started(agent: Agent): boolean`: Checks if processing is active.
- `setInitialCheckpoint(checkpoint: AgentCheckpointData, agent: Agent)` /
  `getInitialCheckpoint(agent: Agent): AgentCheckpointData | null` / `clearInitialCheckpoint(agent: Agent)`: Manages the
  starting checkpoint for queue sessions.
- `setCurrentItem(item: QueueItem | null, agent: Agent)` / `getCurrentItem(agent: Agent): QueueItem | null`: Tracks the
  active item.
- `enqueue(item: QueueItem, agent: Agent): boolean`: Adds to end of queue (returns false if full).
- `dequeue(agent: Agent): QueueItem | undefined`: Removes and returns front item.
- `get(idx: number, agent: Agent): QueueItem`: Retrieves item by index.
- `splice(start: number, deleteCount: number, agent: Agent, ...items: QueueItem[]): QueueItem[]`: Modifies queue like
  Array.splice.
- `size(agent: Agent): number`: Current queue length.
- `isEmpty(agent: Agent): boolean`: Checks if queue is empty.
- `clear(agent: Agent)`: Empties the queue.
- `getAll(agent: Agent): QueueItem[]`: Returns a copy of all items.

**Interactions**: All methods interact with the agent's state via `mutateState` or `getState`. Checkpoints ensure state
restoration during queue processing.

### /queue Chat Command

An interactive command for managing the queue via chat input. Exported via `chatCommands.queue`.

**Description**: Handles subcommands to add/remove/list items, start/stop processing, and execute items. Integrates with
`runChat` for executing queued inputs and checkpoints for state management.

**Key Subcommands** (invoked as `/queue <action> [args]`):

- `add <prompt>`: Enqueues a new item with the prompt as name and input.
- `remove <index>`: Removes item at zero-based index.
- `details <index>`: Displays JSON details of an item.
- `clear`: Empties the queue.
- `list`: Lists all items with indices and names.
- `start`: Initializes queue session, sets initial checkpoint, and starts processing.
- `next` / `done`: Advances to next item (or ends session, restoring initial checkpoint).
- `skip`: Moves current item to end of queue.
- `run`: Executes the current item's input via `runChat`, restoring its checkpoint first.

**Interactions**: Uses `WorkQueueService` for queue ops, agent's `infoLine`/`errorLine` for feedback, and checkpoints to
bound sessions.

### addTaskToQueue Tool

A programmatic tool for enqueuing tasks. Exported via `tools.addTaskToQueue`.

**Description**: Adds a detailed task to the queue, capturing the current agent checkpoint.

**Key Function**:

-
`async execute({ description, content }: { description?: string; content?: string }, agent: Agent): Promise<{ status: string; message: string }>`:
Validates inputs, enqueues `{ checkpoint, name: description, input: [{ role: 'user', content }] }`. Throws if
description or content missing.

**Input Schema** (Zod): `description` (string, short task name), `content` (string, detailed instructions for AI
execution).

**Interactions**: Requires `WorkQueueService` from the agent; logs via `agent.infoLine`.

## Usage Examples

### 1. Programmatic Queue Management

```ts
import { Agent } from '@tokenring-ai/agent';
import { WorkQueueService } from '@tokenring-ai/queue';

const agent = new Agent(/* config */);
const queueService = new WorkQueueService({ maxSize: 10 });
await queueService.attach(agent);

// Enqueue a task
const item = {
  checkpoint: agent.generateCheckpoint(),
  name: 'Analyze data',
  input: [{ role: 'user', content: 'Analyze the sales data and report trends.' }]
};
const added = queueService.enqueue(item, agent);
console.log(`Added: ${added}, Size: ${queueService.size(agent)}`);

// Process front item
const nextItem = queueService.dequeue(agent);
if (nextItem) {
  agent.restoreCheckpoint(nextItem.checkpoint);
  // Execute nextItem.input via runChat or similar
}
```

### 2. Using the Chat Command

In a chat interface:

```
/queue add Generate report on user metrics
/queue add Fix bug in authentication
/queue list  // Shows: [0] Generate report... [1] Fix bug...
/queue start  // Begins session
/queue next   // Loads first item
/queue run    // Executes it
/queue next   // Moves to second
/queue done   // Ends and restores initial state
```

### 3. Enqueuing via Tool

```ts
import { tools } from '@tokenring-ai/queue';

await tools.addTaskToQueue.execute(
  {
    description: 'Optimize query performance',
    content: 'Review the database queries in the user service, identify bottlenecks, and suggest indexes or rewrites. Use the code analysis tools available.'
  },
  agent
);
```

## Configuration Options

- **maxSize** (number, optional): Limits queue length in `WorkQueueService` constructor. Defaults to unlimited. Enqueue
  fails silently if exceeded.
- No environment variables or external configs; all via constructor or agent state.
- For chat/tool usage, no additional config needed beyond agent setup.

## API Reference

### WorkQueueService

- See Core Components for full method signatures.
- Public: All methods listed; internal state via `WorkQueueState` (implements `AgentStateSlice` with `reset`,
  `serialize`, `deserialize`).

### /queue Command

- `export const description = '/queue <command> - Manage a queue of chat prompts' as const;`
- `async execute(remainder: string, agent: Agent): Promise<void>`
- `export function help(): string[]` - Returns usage strings.

### addTaskToQueue Tool

- `export const name = 'queue/addTaskToQueue' as const;`
- `export const description = 'Adds a task to the queue for later execution by the system.' as const;`
- `export const inputSchema = z.object({ description: z.string(), content: z.string() });`
- `async execute(args, agent)` - As above.

Package exports: `{ packageInfo: TokenRingPackage, default: WorkQueueService }`.

## Dependencies

- `@tokenring-ai/ai-client@0.1.0`: For `ChatInputMessage`, `runChat`, `AIService`.
- `@tokenring-ai/agent@0.1.0`: For `Agent`, `AgentStateSlice`, `AgentCheckpointData`, `TokenRingService`.
- `@tokenring-ai/history@0.1.0`: For checkpoint operations.
- Dev: `typescript@^5.9.2`, `zod` (inferred for schemas).

## Contributing/Notes

- **Testing**: Run tests with `npm test` (assumes Jest setup in `test/`).
- **Building**: `npm run build` compiles to JS.
- **Limitations**: In-memory only (no persistence); single-agent use; queue items must match `QueueItem` shape for full
  compatibility with commands/tools. No distributed or concurrent processing.
- **Best Practices**: Always restore checkpoints before executing items to maintain state. Use `maxSize` for bounded
  memory. Extend `WorkQueueState` for custom serialization if needed.
- Contributions: Fork, add features/tests, PR with TypeScript compliance. Focus on agent integration.

MIT License (see LICENSE).