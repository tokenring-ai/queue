# @tokenring-ai/queue

## Overview

In-memory task management for sequential processing of agent prompts. This package enables sequential processing of work
items while preserving agent state through checkpointing, making it ideal for batch processing, task management, and
workflow orchestration.

### Key Features

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
bun add @tokenring-ai/queue
```

## Core Components

### WorkQueueService

The central service for queue operations with comprehensive state management.

**Service Name:** `WorkQueueService`

**Description:** Provides Work Queue functionality

**Constructor:**

```typescript
import WorkQueueService from "@tokenring-ai/queue/WorkQueueService";
import { WorkQueueServiceConfigSchema } from "@tokenring-ai/queue/schema";

const service = new WorkQueueService({
  agentDefaults: {
    maxSize: 50  // Optional: Maximum queue size
  }
});
```

#### Lifecycle Management Methods

| Method             | Description                            | Parameters     | Returns   |
|--------------------|----------------------------------------|----------------|-----------|
| `attach(agent)`    | Initialize queue state on agent        | `agent: Agent` | `void`    |
| `startWork(agent)` | Start queue processing                 | `agent: Agent` | `void`    |
| `stopWork(agent)`  | Stop processing and clear current item | `agent: Agent` | `void`    |
| `started(agent)`   | Check if queue is active               | `agent: Agent` | `boolean` |

#### Checkpoint Management Methods

| Method                                    | Description                   | Parameters                                        | Returns                       |
|-------------------------------------------|-------------------------------|---------------------------------------------------|-------------------------------|
| `setInitialCheckpoint(checkpoint, agent)` | Set starting state checkpoint | `checkpoint: AgentCheckpointData`, `agent: Agent` | `void`                        |
| `getInitialCheckpoint(agent)`             | Get initial checkpoint        | `agent: Agent`                                    | `AgentCheckpointData \| null` |

#### Queue Operation Methods

| Method                                        | Description                    | Parameters                                                                      | Returns                  |
|-----------------------------------------------|--------------------------------|---------------------------------------------------------------------------------|--------------------------|
| `enqueue(item, agent)`                        | Add item to queue              | `item: QueueItem`, `agent: Agent`                                               | `boolean`                |
| `dequeue(agent)`                              | Remove and return front item   | `agent: Agent`                                                                  | `QueueItem \| undefined` |
| `get(idx, agent)`                             | Get item at index              | `idx: number`, `agent: Agent`                                                   | `QueueItem`              |
| `splice(start, deleteCount, agent, ...items)` | Modify queue like Array.splice | `start: number`, `deleteCount: number`, `agent: Agent`, `...items: QueueItem[]` | `QueueItem[]`            |
| `size(agent)`                                 | Get current queue length       | `agent: Agent`                                                                  | `number`                 |
| `isEmpty(agent)`                              | Check if queue is empty        | `agent: Agent`                                                                  | `boolean`                |
| `clear(agent)`                                | Empty the queue                | `agent: Agent`                                                                  | `void`                   |
| `getAll(agent)`                               | Get copy of all items          | `agent: Agent`                                                                  | `QueueItem[]`            |

#### Current Item Management Methods

| Method                        | Description                   | Parameters                                | Returns             |
|-------------------------------|-------------------------------|-------------------------------------------|---------------------|
| `getCurrentItem(agent)`       | Get currently processing item | `agent: Agent`                            | `QueueItem \| null` |
| `setCurrentItem(item, agent)` | Set current processing item   | `item: QueueItem \| null`, `agent: Agent` | `void`              |

### WorkQueueState

State management for queue operations. Implements `AgentStateSlice` for integration with the agent state system.

**Properties:**

| Property              | Type                          | Description                        |
|-----------------------|-------------------------------|------------------------------------|
| `queue`               | `QueueItem[]`                 | Array of queue items               |
| `started`             | `boolean`                     | Whether queue processing is active |
| `initialCheckpoint`   | `AgentCheckpointData \| null` | Preserved starting state           |
| `currentItem`         | `QueueItem \| null`           | Currently processing item          |
| `maxSize`             | `number \| null`              | Maximum queue size (if configured) |
| `name`                | `"WorkQueueState"`            | State slice identifier             |
| `serializationSchema` | `z.ZodSchema`                 | Zod schema for serialization       |

**Constructor:**

```typescript
import { WorkQueueState } from "@tokenring-ai/queue/state/workQueueState";

const state = new WorkQueueState({
  maxSize: 50  // Optional: Maximum queue size
});
```

**Methods:**

| Method              | Description                          | Parameters  | Returns    |
|---------------------|--------------------------------------|-------------|------------|
| `reset()`           | Reset all state components           | None        | `void`     |
| `serialize()`       | Convert state to serializable format | None        | `object`   |
| `deserialize(data)` | Restore state from data              | `data: any` | `void`     |
| `show()`            | Get human-readable state summary     | None        | `string[]` |

### QueueItem Interface

```typescript
import type {AgentCheckpointData} from "@tokenring-ai/agent/types";

interface QueueItem {
  checkpoint: AgentCheckpointData;  // Saved agent state for this item
  name: string;                      // Short description of the task
  input: string;                     // Full prompt/instructions to execute
}
```

## Chat Commands

The package provides the `/queue` command for managing queue operations.

### Queue Management Commands

| Command                           | Description                                           | Example                                                             |
|-----------------------------------|-------------------------------------------------------|---------------------------------------------------------------------|
| `/queue add <prompt>`             | Add a new prompt to the end of the queue              | `/queue add Write a Python function to calculate Fibonacci numbers` |
| `/queue remove --index <number>`  | Remove the prompt at the given zero-based index       | `/queue remove 2`                                                   |
| `/queue details --index <number>` | Show detailed information about a specific queue item | `/queue details 0`                                                  |
| `/queue clear`                    | Remove all prompts from the queue                     | `/queue clear`                                                      |
| `/queue list`                     | Display all queued prompts with their indices         | `/queue list`                                                       |

### Queue Processing Commands

| Command        | Description                                           | Example        |
|----------------|-------------------------------------------------------|----------------|
| `/queue start` | Begin queue processing (preserves current chat state) | `/queue start` |
| `/queue next`  | Load the next queued item (does not execute it)       | `/queue next`  |
| `/queue run`   | Execute the currently loaded queued prompt            | `/queue run`   |
| `/queue skip`  | Skip current item and re-add to end of queue          | `/queue skip`  |
| `/queue done`  | End queue processing and restore previous chat state  | `/queue done`  |

## Tools

### queue_addTaskToQueue

Adds a task to the queue for later execution by the system.

**Tool Name:** `queue_addTaskToQueue`

**Display Name:** `Queue/addTaskToQueue`

**Description:** Adds a task to the queue for later execution by the system.

**Input Schema:**

```typescript
import {z} from "zod";

const inputSchema = z.object({
  description: z
    .string()
    .describe("A short description of the task to be performed"),
  content: z
    .string()
    .describe(
      "A natural language string, explaining the exact task to be performed, in great detail. " +
      "This string will be used to prompt an AI agent as the next message in this conversation, so should be as detailed as possible, " +
      "and should directly order the AI agent to execute the task, using the tools that are available to it."
    )
}).refine(data => data.description && data.description.trim(), {
  message: "Task description is required",
  path: ["description"],
}).refine(data => data.content && data.content.trim(), {
  message: "Task content is required",
  path: ["content"],
});
```

**Output:**

```typescript
{
  type: "json",
  data: {
    status: "queued",
    message: "Task has been queued for later execution."
  }
}
```

**Side Effects:**

- Outputs info message: `[queue_addTaskToQueue] Added task "<description>" to queue`

## Configuration

### Plugin Configuration

The plugin configuration supports optional queue size limits through the `queue` option.

```typescript
import queuePlugin from "@tokenring-ai/queue/plugin";
import TokenRingApp from "@tokenring-ai/app";

const app = new TokenRingApp();

// Configure with optional queue size limit
app.install(queuePlugin, {
  queue: {
    agentDefaults: {
      maxSize: 50  // Optional: Maximum number of items in the queue
    }
  }
});
```

### Configuration Schema

```typescript
import { WorkQueueServiceConfigSchema } from "@tokenring-ai/queue/schema";

// Configuration schema for the plugin
const configSchema = WorkQueueServiceConfigSchema;

// Valid configuration structure
{
  queue: {
    agentDefaults: {
      maxSize?: number  // Optional: Maximum queue size (positive number)
    }
  }
}
```

### Agent Configuration

The queue service can be configured at the agent level to override default queue settings.

```typescript
import { WorkQueueAgentConfigSchema } from "@tokenring-ai/queue/schema";
import Agent from "@tokenring-ai/agent";

// Agent configuration with queue settings
const agentConfig = {
  queue: {
    maxSize: 100  // Override default queue size for this agent
  }
};

const agent = new Agent(app, { config: agentConfig, headless: false });
```

### Agent Configuration Schema

```typescript
import { WorkQueueAgentConfigSchema } from "@tokenring-ai/queue/schema";

// Agent-level configuration schema
{
  maxSize?: number  // Optional: Maximum queue size for this agent
}
```

## State Management

### State Slice

The `WorkQueueState` class implements the `AgentStateSlice` interface for integration with the agent state system.

**State Properties:**

```typescript
{
  queue: QueueItem[];           // Array of queued work items
  started: boolean;             // Whether queue processing is active
  initialCheckpoint: AgentCheckpointData \| null;  // Saved starting state
  currentItem: QueueItem \| null;  // Currently processing item
  maxSize: number \| null;      // Maximum queue size limit
}
```

### Persistence and Restoration

The queue state is automatically persisted through the agent's state management system:

```typescript
import Agent from "@tokenring-ai/agent";
import { WorkQueueState } from "@tokenring-ai/queue/state/workQueueState";

// Access queue state through agent
const state = agent.getState(WorkQueueState);

// Serialize state for persistence
const serialized = state.serialize();

// Restore state from serialized data
state.deserialize(serialized);
```

### Checkpoint Generation and Recovery

Queue items store checkpoints for state preservation:

```typescript
import Agent from "@tokenring-ai/agent";

// Generate checkpoint when adding to queue
const item = {
  checkpoint: agent.generateCheckpoint(),  // Saves current state
  name: "Task name",
  input: "Task instructions"
};

// Restore checkpoint during processing
agent.restoreState(checkpoint.state);
```

## Integration

### TokenRing Plugin Integration

The package automatically integrates with TokenRing applications:

- Registers `WorkQueueService` with the application
- Registers tools and commands with the chat service
- Handles plugin installation and configuration

```typescript
import queuePlugin from "@tokenring-ai/queue/plugin";
import TokenRingApp from "@tokenring-ai/app";

const app = new TokenRingApp();

// Install plugin with configuration
app.install(queuePlugin, {
  queue: {
    agentDefaults: {
      maxSize: 50
    }
  }
});

// Services and tools are automatically registered
```

### Agent Integration

```typescript
import Agent from "@tokenring-ai/agent";
import WorkQueueService from "@tokenring-ai/queue/WorkQueueService";

// Automatic state slice attachment
queueService.attach(agent);

// Access queue service through agent
const queueService = agent.requireServiceByType(WorkQueueService);

// Queue operations available through agent
const queueSize = queueService.size(agent);
const isEmpty = queueService.isEmpty(agent);
```

### Chat Service Integration

```typescript
import Agent from "@tokenring-ai/agent";
import { ChatService } from "@tokenring-ai/chat";

// Chat commands automatically registered
const chatService = agent.requireServiceByType(ChatService);

// Tools automatically available
const tools = chatService.getTools();

// Commands work through chat interface
await agent.handleInput({ message: "/queue list" });
```

## Usage Examples

### Basic Queue Operations

```typescript
import Agent from "@tokenring-ai/agent";
import WorkQueueService from "@tokenring-ai/queue/WorkQueueService";
import { WorkQueueState } from "@tokenring-ai/queue/state/workQueueState";

// Create service with optional size limit
const queueService = new WorkQueueService({
  agentDefaults: { maxSize: 10 }
});

// Attach to agent (initializes state)
queueService.attach(agent);

// Add items to queue
const item = {
  checkpoint: agent.generateCheckpoint(),
  name: "Generate report",
  input: "Create a comprehensive sales report for Q4."
};

const added = queueService.enqueue(item, agent);
console.log(`Item added: ${added}`);

// Process queue
queueService.startWork(agent);
const nextItem = queueService.dequeue(agent);
console.log(`Processing: ${nextItem?.name}`);
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
import Agent from "@tokenring-ai/agent";
import tools from "@tokenring-ai/queue/tools";

// Using the tool programmatically
const result = await tools.addTaskToQueue.execute({
  description: "Data analysis task",
  content: "Analyze the sales data from last quarter and identify trends, anomalies, and recommendations for improvement. Use all available data analysis tools."
}, agent);

console.log(result);
// { type: "json", data: { status: "queued", message: "Task has been queued for later execution." } }
```

### State Preservation and Restoration

```bash
# Queue processing preserves original state
/queue start  # Saves current agent state

# Process multiple items
/queue next
/queue run    # Each item can modify state temporarily

# Restore original state
/queue done   # Returns to saved state
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
# Queue contents:
# 1. Task 1: Generate report
# 2. Task 2: Update metrics
# 3. Task 3: Send notifications

# Check details of a specific item
/queue details 1
# Output:
# Queue item details:
# {
#   "checkpoint": {...},
#   "name": "Task 2: Update metrics",
#   "input": "Task 2: Update metrics"
# }

# Remove an item from the queue
/queue remove 1
# Output:
# Removed "Task 2: Update metrics" from queue. Remaining: 2
```

### Queue with Size Limits

```typescript
import WorkQueueService from "@tokenring-ai/queue/WorkQueueService";
import { WorkQueueState } from "@tokenring-ai/queue/state/workQueueState";

// Create service with size limit
const boundedQueue = new WorkQueueService({
  agentDefaults: { maxSize: 5 }
});

boundedQueue.attach(agent);

// Add items
for (let i = 0; i < 7; i++) {
  const item = {
    checkpoint: agent.generateCheckpoint(),
    name: `Task ${i}`,
    input: `Process task ${i}`
  };

  const added = boundedQueue.enqueue(item, agent);
  console.log(`Task ${i} added: ${added}`);
  // Tasks 0-4 will be added (true), tasks 5-6 will fail (false)
}

// Check queue size through state
const state = agent.getState(WorkQueueState);
console.log(`Queue size: ${state.queue.length}`);  // 5
console.log(`Max size: ${state.maxSize}`);  // 5
```

## Error Handling

The queue system provides comprehensive error handling:

- **Queue Overflow**: Returns `false` when queue exceeds `maxSize`
- **Invalid Indices**: Validates indices in `remove`/`details` commands
- **Empty Queue**: Handles operations on empty queue gracefully
- **State Restoration**: Ensures state consistency during processing
- **Checkpoint Failures**: Handles checkpoint creation/restoration errors
- **Invalid Operations**: Validates queue operations and provides helpful error messages

### Common Error Scenarios

```typescript
// Queue full
const added = queueService.enqueue(item, agent);
if (!added) {
  console.log("Queue is full, cannot add item");
}

// Invalid index
try {
  await agent.handleInput({ message: "/queue remove 999" });
} catch (error) {
  console.log(error.message);  // "Usage: /queue remove <index> (index starts from 0)"
}

// Queue not started
const result = await agent.handleInput({ message: "/queue run" });
console.log(result);  // "Queue not started. Use /queue start to start the queue."
```

## Dependencies

### Production Dependencies

- `@tokenring-ai/agent`: Agent framework and state management (0.2.0)
- `@tokenring-ai/ai-client`: AI client integration (0.2.0)
- `@tokenring-ai/app`: Application framework and plugin system (0.2.0)
- `@tokenring-ai/chat`: Chat service for command execution (0.2.0)
- `@tokenring-ai/utility`: Shared utilities including deepMerge (0.2.0)
- `zod`: Schema validation and configuration (^4.3.6)

### Development Dependencies

- `typescript`: TypeScript compiler (^6.0.2)
- `vitest`: Unit testing framework (^4.1.1)

## Development

### Testing

```bash
bun run test
bun run test:watch
bun run test:coverage
```

### Package Structure

```
pkg/queue/
├── WorkQueueService.ts              # Core queue management service
├── index.ts                          # Package exports and plugin integration
├── plugin.ts                         # TokenRing plugin implementation
├── package.json                      # Package configuration
├── schema.ts                         # Configuration schemas
├── commands/                         # Chat commands
│   └── queue/                        # Queue command implementations
│       ├── add.ts                    # /queue add command
│       ├── remove.ts                 # /queue remove command
│       ├── details.ts                # /queue details command
│       ├── clear.ts                  # /queue clear command
│       ├── list.ts                   # /queue list command
│       ├── start.ts                  # /queue start command
│       ├── next-done.ts              # /queue next and /queue done commands
│       ├── skip.ts                   # /queue skip command
│       └── run.ts                    # /queue run command
├── tools/                            # Built-in tools
│   └── addTaskToQueue.ts             # Task addition tool
├── state/                            # State management
│   └── workQueueState.ts             # WorkQueueState implementation
├── commands.ts                       # Command exports
├── tools.ts                          # Tool exports
├── test/                             # Test suite
│   └── WorkQueueService.test.ts      # Unit tests
└── vitest.config.ts                  # Test configuration
```

### Testing Examples

```typescript
import {describe, it, expect, beforeEach, afterEach, vi} from "vitest";
import {Agent} from "@tokenring-ai/agent";
import createTestingAgent from "@tokenring-ai/agent/test/createTestingAgent";
import TokenRingApp from "@tokenring-ai/app";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp";
import {WorkQueueState} from "../state/workQueueState.ts";
import WorkQueueService from "../WorkQueueService.ts";

describe("WorkQueueService", () => {
  let app: TokenRingApp;
  let workQueueService: WorkQueueService;
  let agent: Agent;

  beforeEach(() => {
    vi.resetAllMocks();
    app = createTestingApp();
    agent = createTestingAgent(app);
    workQueueService = new WorkQueueService({
      agentDefaults: {},
    });
    app.addServices(workQueueService);
    workQueueService.attach(agent);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default parameters", () => {
    const state = agent.getState(WorkQueueState);
    expect(state.queue).toEqual([]);
    expect(workQueueService.size(agent)).toBe(0);
  });

  it("should enqueue and dequeue items", () => {
    const item1 = { name: "item1", checkpoint: {} as any, input: "" };
    const item2 = { name: "item2", checkpoint: {} as any, input: "" };

    const result1 = workQueueService.enqueue(item1, agent);
    const result2 = workQueueService.enqueue(item2, agent);

    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(workQueueService.size(agent)).toBe(2);

    const dequeued = workQueueService.dequeue(agent);
    expect(dequeued).toBe(item1);
    expect(workQueueService.size(agent)).toBe(1);
  });

  it("should respect maxSize when adding items", () => {
    const testApp = createTestingApp();
    const testAgent = createTestingAgent(testApp);
    const testWorkQueueService = new WorkQueueService({
      agentDefaults: { maxSize: 2 },
    });
    testApp.addServices(testWorkQueueService);
    testWorkQueueService.attach(testAgent);

    const item1 = { name: "item1", checkpoint: {} as any, input: "" };
    const item2 = { name: "item2", checkpoint: {} as any, input: "" };
    const item3 = { name: "item3", checkpoint: {} as any, input: "" };

    expect(testWorkQueueService.enqueue(item1, testAgent)).toBe(true);
    expect(testWorkQueueService.enqueue(item2, testAgent)).toBe(true);
    expect(testWorkQueueService.enqueue(item3, testAgent)).toBe(false); // Queue full
    expect(testWorkQueueService.size(testAgent)).toBe(2);
  });
});
```

### Contribution Guidelines

- Follow established coding patterns
- Write unit tests for new functionality
- Update documentation for new features
- Ensure all changes work with TokenRing agent framework
- Use `bun` for running tests and examples
- Follow TypeScript best practices

## License

MIT License - see [LICENSE](./LICENSE) file for details.
