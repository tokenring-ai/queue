# @tokenring-ai/queue

A queue management system for the Token Ring AI agent framework, providing work item queuing with state preservation and interactive management capabilities.

## Overview

The `@tokenring-ai/queue` package provides a comprehensive queue management system for the Token Ring AI agent framework. It enables queuing of work items (such as chat prompts or tasks) to be processed sequentially while preserving and restoring agent state via checkpoints. The package includes:

- **WorkQueueService**: Core service for programmatic queue operations
- **/queue command**: Interactive chat command for queue management
- **addTaskToQueue tool**: Programmatic tool for enqueuing tasks

The queue operates as a FIFO (First-In-First-Out) structure with optional size limits. Items are stored in memory and lost on process restart. Integration with the agent's checkpoint system allows pausing and resuming queue processing by snapshotting the agent's state.

## Installation

```bash
npm install @tokenring-ai/queue@0.1.0
```

## Package Structure

```
pkg/queue/
├── index.ts                 # Main entry point and TokenRingPlugin export
├── WorkQueueService.ts      # Core queue management service
├── chatCommands.ts          # Exports chat commands
├── commands/queue.ts        # /queue chat command implementation
├── tools.ts                 # Exports tools
├── tools/addTaskToQueue.ts  # addTaskToQueue tool implementation
├── state/workQueueState.ts  # WorkQueueState implementation
├── package.json             # Package metadata and dependencies
├── README.md                # This documentation
├── LICENSE                  # MIT license
└── test/WorkQueueService.test.js # Unit tests
```

## Core Components

### WorkQueueService

The primary service for queue operations. It maintains an internal `WorkQueueState` slice for the agent's state, tracking the queue, lifecycle flags, and checkpoints.

**Constructor:**
```typescript
constructor({ maxSize } = {})
```
- `maxSize` (optional): Maximum number of items in the queue

**Key Methods:**
- `async attach(agent: Agent)`: Initializes the state slice on the agent
- `startWork(agent: Agent)`: Starts queue processing
- `stopWork(agent: Agent)`: Stops queue processing and clears current item
- `started(agent: Agent): boolean`: Returns whether processing is active
- `setInitialCheckpoint(checkpoint: AgentCheckpointData, agent: Agent)`: Sets the starting checkpoint
- `getInitialCheckpoint(agent: Agent): AgentCheckpointData | null`: Gets the starting checkpoint
- `clearInitialCheckpoint(agent: Agent)`: Clears the starting checkpoint
- `setCurrentItem(item: QueueItem | null, agent: Agent)`: Sets the current item being processed
- `getCurrentItem(agent: Agent): QueueItem | null`: Gets the current item being processed
- `enqueue(item: QueueItem, agent: Agent): boolean`: Adds item to end of queue (returns false if full)
- `dequeue(agent: Agent): QueueItem | undefined`: Removes and returns front item
- `get(idx: number, agent: Agent): QueueItem`: Retrieves item by index
- `splice(start: number, deleteCount: number, agent: Agent, ...items: QueueItem[]): QueueItem[]`: Modifies queue like Array.splice
- `size(agent: Agent): number`: Returns current queue length
- `isEmpty(agent: Agent): boolean`: Checks if queue is empty
- `clear(agent: Agent)`: Empties the queue
- `getAll(agent: Agent): QueueItem[]`: Returns a copy of all items

### /queue Chat Command

An interactive command for managing the queue via chat input.

**Subcommands:**
- `add <prompt>`: Enqueues a new item with the prompt as name and input
- `remove <index>`: Removes item at zero-based index
- `details <index>`: Displays JSON details of an item
- `clear`: Empties the queue
- `list`: Lists all items with indices and names
- `start`: Initializes queue session, sets initial checkpoint, and starts processing
- `next`: Advances to next item (does not execute it)
- `done`: Ends queue processing and restores initial checkpoint
- `skip`: Moves current item to end of queue
- `run`: Executes the current item's input via `runChat`

### addTaskToQueue Tool

A programmatic tool for enqueuing tasks.

**Input Schema:**
```typescript
{
  description: string;  // Short description of the task
  content: string;     // Detailed instructions for AI execution
}
```

**Usage:**
```typescript
await tools.addTaskToQueue.execute({
  description: 'Analyze user metrics',
  content: 'Analyze the sales data and report trends using available tools.'
}, agent);
```

## Integration

### Basic Setup

```typescript
import { WorkQueueService } from '@tokenring-ai/queue';
import { Agent } from '@tokenring-ai/agent';

const agent = new Agent(/* config */);
const queueService = new WorkQueueService({ maxSize: 10 });
await queueService.attach(agent);
```

### Plugin Integration

The package exports a `TokenRingPlugin` that automatically integrates with the Token Ring app:

```typescript
import queue from '@tokenring-ai/queue';

// The plugin will automatically:
// - Register the WorkQueueService
// - Add chat commands
// - Add tools to the chat service
app.install(queue);
```

## Usage Examples

### 1. Programmatic Queue Management

```typescript
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

### 2. Interactive Queue Management

In a chat interface:

```
/queue add Generate report on user metrics
/queue add Fix bug in authentication
/queue list
# Output: [0] Generate report on user metrics
#         [1] Fix bug in authentication
/queue start
/queue next
/queue run
/queue next
/queue done
```

### 3. Using the addTaskToQueue Tool

```typescript
import { tools } from '@tokenring-ai/queue';

await tools.addTaskToQueue.execute(
  {
    description: 'Optimize query performance',
    content: 'Review the database queries in the user service, identify bottlenecks, and suggest indexes or rewrites. Use the code analysis tools available.'
  },
  agent
);
```

## API Reference

### WorkQueueService

**Type:** `class WorkQueueService implements TokenRingService`

**Properties:**
- `name: string = "WorkQueueService"`
- `description: string = "Provides WorkQueue functionality"`
- `maxSize: number | undefined`

### /queue Command

**Type:** `TokenRingAgentCommand`

**Properties:**
- `description: string = "/queue <command> - Manage a queue of chat prompts"`
- `execute(remainder: string, agent: Agent): Promise<void>`
- `help(): string[]`

### addTaskToQueue Tool

**Type:** `TokenRingToolDefinition`

**Properties:**
- `name: string = "queue/addTaskToQueue"`
- `description: string = "Adds a task to the queue for later execution by the system."`
- `inputSchema: ZodObject`
- `execute(args: {description: string, content: string}, agent: Agent): Promise<{status: string, message: string}>`

## Dependencies

- `@tokenring-ai/chat@0.1.0`: For chat service integration
- `@tokenring-ai/agent@0.1.0`: For agent services and types
- `typescript@^5.9.3`: For TypeScript compilation
- `zod`: For input schema validation (inferred)

## Building

```bash
npm run build
```

This compiles the TypeScript source code to JavaScript using `tsc -p .`.

## Testing

```bash
npm test
```

Run the unit tests in the `test/` directory.

## Limitations

- **In-memory only**: Queue items are not persisted and will be lost on process restart
- **Single-agent use**: Designed for use within a single agent instance
- **No distributed processing**: Not designed for distributed or concurrent processing across multiple agents
- **Queue item structure**: Items must match the `QueueItem` type for full compatibility with commands and tools

## Best Practices

- Always restore checkpoints before executing items to maintain state consistency
- Use `maxSize` for bounded memory usage in long-running applications
- Extend `WorkQueueState` for custom serialization if needed
- Use the `/queue` command for interactive management and the `addTaskToQueue` tool for programmatic access

## License

MIT License (see LICENSE file)