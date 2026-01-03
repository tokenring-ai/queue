# @tokenring-ai/queue

## Overview

A comprehensive queue management system for TokenRing AI, providing work item queuing with state preservation, interactive management, and seamless integration with the agent framework. This package enables sequential processing of work items while preserving agent state through checkpointing, making it ideal for batch processing, task management, and workflow orchestration.

## Features

- **State Preservation**: Maintains agent state through checkpointing during queue processing
- **Interactive Management**: Comprehensive chat commands for queue operations
- **Programmatic Access**: Tools for adding tasks to the queue programmatically
- **Checkpoint Integration**: Seamless integration with TokenRing's checkpoint system
- **Flexible Configuration**: Supports both bounded and unbounded queue sizes
- **Error Handling**: Robust error handling for queue operations
- **Agent Integration**: Automatic registration with TokenRing agent framework
- **FIFO Processing**: First-in-first-out queue processing for reliable batch operations

## Installation

```bash
bun install @tokenring-ai/queue
```

## Chat Commands

The package provides the `/queue` command for managing queue operations.

### Queue Management Commands

| Command | Description |
|---------|-------------|
| `/queue add <prompt>` | Add a new prompt to the end of the queue |
| `/queue remove <index>` | Remove the prompt at the given zero-based index |
| `/queue details <index>` | Show detailed information about a specific queue item |
| `/queue clear` | Remove all prompts from the queue |
| `/queue list` | Display all queued prompts with their indices |

### Queue Processing Commands

| Command | Description |
|---------|-------------|
| `/queue start` | Begin queue processing (preserves current chat state) |
| `/queue next` | Load the next queued item (does not execute it) |
| `/queue run` | Execute the currently loaded queued prompt |
| `/queue skip` | Skip current item and re-add to end of queue |
| `/queue done` | End queue processing and restore previous chat state |

## Plugin Configuration

The plugin does not require any configuration options.

```typescript
import queuePlugin from "@tokenring-ai/queue/plugin";
const app = new TokenRingApp();
app.install(queuePlugin);
```

## Tools

### queue_addTaskToQueue

Adds a task to the queue for later execution by the system.

**Input Schema:**
```typescript
{
  description: string;  // A short description of the task to be performed
  content: string;      // A natural language string explaining the exact task to be performed in great detail
}
```

**Output:**
```typescript
{
  status: "queued";
  message: "Task has been queued for later execution.";
}
```

## Core Components and APIs

### WorkQueueService

The central service for queue operations with comprehensive state management.

**Constructor:**
```typescript
new WorkQueueService(options: { maxSize?: number })
```

**Options:**
- `maxSize?: number` - Optional maximum queue size (default: unlimited)

#### Lifecycle Management Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `attach(agent)` | Initialize queue state on agent | `agent: Agent` | `Promise<void>` |
| `startWork(agent)` | Start queue processing | `agent: Agent` | `void` |
| `stopWork(agent)` | Stop processing and clear current item | `agent: Agent` | `void` |
| `started(agent)` | Check if queue is active | `agent: Agent` | `boolean` |

#### Checkpoint Management Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `setInitialCheckpoint(checkpoint, agent)` | Set starting state checkpoint | `checkpoint: AgentCheckpointData`, `agent: Agent` | `void` |
| `getInitialCheckpoint(agent)` | Get initial checkpoint | `agent: Agent` | `AgentCheckpointData \| null` |
| `clearInitialCheckpoint(agent)` | Clear initial checkpoint | `agent: Agent` | `void` |

#### Queue Operation Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `enqueue(item, agent)` | Add item to queue | `item: QueueItem`, `agent: Agent` | `boolean` |
| `dequeue(agent)` | Remove and return front item | `agent: Agent` | `QueueItem \| undefined` |
| `get(idx, agent)` | Get item at index | `idx: number`, `agent: Agent` | `QueueItem` |
| `splice(start, deleteCount, agent, ...items)` | Modify queue like Array.splice | `start: number`, `deleteCount: number`, `agent: Agent`, `...items: QueueItem[]` | `QueueItem[]` |
| `size(agent)` | Get current queue length | `agent: Agent` | `number` |
| `isEmpty(agent)` | Check if queue is empty | `agent: Agent` | `boolean` |
| `clear(agent)` | Empty the queue | `agent: Agent` | `void` |
| `getAll(agent)` | Get copy of all items | `agent: Agent` | `QueueItem[]` |

#### Current Item Management Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `getCurrentItem(agent)` | Get currently processing item | `agent: Agent` | `QueueItem \| null` |
| `setCurrentItem(item, agent)` | Set current processing item | `item: QueueItem \| null`, `agent: Agent` | `void` |

### WorkQueueState

State management for queue operations.

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `queue` | `QueueItem[]` | Array of queue items |
| `started` | `boolean` | Whether queue processing is active |
| `initialCheckpoint` | `AgentCheckpointData \| null` | Preserved starting state |
| `currentItem` | `QueueItem \| null` | Currently processing item |

**Methods:**

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `reset(what)` | Reset specific state components | `what: ResetWhat[]` | `void` |
| `serialize()` | Convert state to serializable format | None | `object` |
| `deserialize(data)` | Restore state from data | `data: any` | `void` |
| `show()` | Get human-readable state summary | None | `string[]` |

### QueueItem Interface

```typescript
interface QueueItem {
  checkpoint: AgentCheckpointData;
  name: string;
  input: string;
}
```

## Usage Examples

### Basic Queue Operations

```typescript
import Agent from "@tokenring-ai/agent";
import { WorkQueueService } from "@tokenring-ai/queue";

const agent = new Agent(app, { config: agentConfig, headless: false });
const queueService = new WorkQueueService({ maxSize: 10 });

// Initialize queue on agent
await queueService.attach(agent);

// Add items to queue
const item: QueueItem = {
  checkpoint: agent.generateCheckpoint(),
  name: "Generate report",
  input: "Create a comprehensive sales report for Q4."
};

const added = queueService.enqueue(item, agent);

// Process queue
queueService.startWork(agent);
const nextItem = queueService.dequeue(agent);
```

### Interactive Queue Processing

```bash
# Build queue interactively
/queue add "Analyze user behavior patterns"
/queue add "Generate monthly metrics"
/queue add "Update dashboard data"

# Start processing
/queue start

# Process items one by one
/queue next
/queue run    # Execute task 1
/queue next
/queue run    # Execute task 2

# Complete processing
/queue done   # Restore original state
```

### Programmatic Task Addition

```typescript
// Using the tool programmatically
const tool = tools.queue_addTaskToQueue;
const result = await tool.execute({
  description: "Data analysis task",
  content: "Analyze the sales data from last quarter and identify trends, anomalies, and recommendations for improvement. Use all available data analysis tools."
}, agent);

console.log(result);
// { status: "queued", message: "Task has been queued for later execution." }
```

### State Preservation and Restoration

```typescript
// Queue processing preserves original state
/queue start  // Saves current agent state

// Process multiple items
/queue next
/queue run    // Each item can modify state temporarily

// Restore original state
/queue done   // Returns to saved state
```

### Removing and Inspecting Queue Items

```bash
# Add items to queue
/queue add "Task 1: Generate report"
/queue add "Task 2: Update metrics"
/queue add "Task 3: Send notifications"

# View queue contents
/queue list
# Output:
// Queue contents:
// [0] Task 1: Generate report
// [1] Task 2: Update metrics
// [2] Task 3: Send notifications

# Check details of a specific item
/queue details 1
# Output:
// Queue item details:
// {
//   "checkpoint": {...},
//   "name": "Task 2: Update metrics",
//   "input": "Task 2: Update metrics"
// }

# Remove an item from the queue
/queue remove 1
# Output:
// Removed "Task 2: Update metrics" from queue. Remaining: 2
```

## Configuration

### Queue Configuration

```typescript
// Basic queue with unlimited size
const queueService = new WorkQueueService();

// Queue with size limit
const boundedQueue = new WorkQueueService({ maxSize: 50 });

// Agent automatically gets WorkQueueState attached
await queueService.attach(agent);
```

## Error Handling

The queue system provides comprehensive error handling:

- **Queue Overflow**: Returns false when queue exceeds maxSize
- **Invalid Indices**: Validates indices in remove/details commands
- **Empty Queue**: Handles operations on empty queue gracefully
- **State Restoration**: Ensures state consistency during processing
- **Checkpoint Failures**: Handles checkpoint creation/restoration errors
- **Invalid Operations**: Validates queue operations and provides helpful error messages

## Integration

### TokenRing Plugin Integration

The package automatically integrates with TokenRing applications:

- Registers WorkQueueService with the application
- Registers tools and commands with the chat service
- Handles plugin installation and configuration

### Agent Integration

```typescript
// Automatic state slice attachment
await queueService.attach(agent);

// Access queue service through agent
const queueService = agent.requireServiceByType(WorkQueueService);

// Queue operations available through agent
const queueSize = queueService.size(agent);
```

### Checkpoint Integration

```typescript
// Items store checkpoints for state preservation
const item: QueueItem = {
  checkpoint: agent.generateCheckpoint(),  // Saves current state
  name: "Task name",
  input: "Task instructions"
};

// State restoration during processing
agent.restoreState(item.checkpoint.state);
```

### Chat Service Integration

```typescript
// Chat commands automatically registered
const chatService = agent.requireServiceByType(ChatService);

// Tools automatically available
const tools = chatService.getTools();

// Commands work through chat interface
await agent.handleInput({ message: "/queue list" });
```

## Development

### Testing

```bash
bun run test
bun run test:coverage
```

### Package Structure

```
pkg/queue/
├── WorkQueueService.ts              # Core queue management service
├── index.ts                          # Package exports and plugin integration
├── plugin.ts                         # TokenRing plugin implementation
├── package.json                      # Package configuration
├── commands/                         # Chat commands
│   └── queue.ts                      # /queue command implementation
├── tools/                            # Built-in tools
│   └── addTaskToQueue.ts             # Task addition tool
├── state/                            # State management
│   └── workQueueState.ts             # WorkQueueState implementation
├── chatCommands.ts                   # Command exports
├── tools.ts                          # Tool exports
├── test/                             # Test suite
│   └── WorkQueueService.test.js      # Unit tests
└── vitest.config.ts                  # Test configuration
```

### Contribution Guidelines

- Follow established coding patterns
- Write unit tests for new functionality
- Update documentation for new features
- Ensure all changes work with TokenRing agent framework

## License

MIT License - see [LICENSE](./LICENSE) file for details.
