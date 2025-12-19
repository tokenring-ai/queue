# @tokenring-ai/queue

A comprehensive queue management system for TokenRing AI, providing work item queuing with state preservation, interactive management, and seamless integration with the agent framework.

## Overview

The `@tokenring-ai/queue` package provides a sophisticated queue management system that enables sequential processing of work items while preserving agent state through checkpointing. It offers both programmatic and interactive interfaces for queue operations, making it ideal for batch processing, task management, and workflow orchestration.

## Installation

```bash
npm install @tokenring-ai/queue
```

## Package Structure

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

## Core Components

### WorkQueueService

The central service for queue operations with comprehensive state management:

```typescript
import { WorkQueueService } from "@tokenring-ai/queue";

const queueService = new WorkQueueService({ maxSize: 100 });
```

**Constructor Options:**
```typescript
interface WorkQueueServiceOptions {
  maxSize?: number;  // Optional maximum queue size
}
```

**Core Methods:**

**Lifecycle Management:**
- `attach(agent: Agent)`: Initialize queue state on agent
- `startWork(agent: Agent)`: Start queue processing
- `stopWork(agent: Agent)`: Stop processing and clear current item
- `started(agent: Agent): boolean`: Check if queue is active

**Checkpoint Management:**
- `setInitialCheckpoint(checkpoint, agent)`: Set starting state checkpoint
- `getInitialCheckpoint(agent)`: Get initial checkpoint
- `clearInitialCheckpoint(agent)`: Clear initial checkpoint

**Queue Operations:**
- `enqueue(item: QueueItem, agent)`: Add item to queue (returns false if full)
- `dequeue(agent)`: Remove and return front item
- `get(idx: number, agent)`: Get item at index
- `splice(start, deleteCount, agent, ...items)`: Modify queue like Array.splice

**Utility Methods:**
- `size(agent)`: Get current queue length
- `isEmpty(agent)`: Check if queue is empty
- `clear(agent)`: Empty the queue
- `getAll(agent)`: Get copy of all items
- `getCurrentItem(agent)`: Get currently processing item
- `setCurrentItem(item, agent)`: Set current processing item

### WorkQueueState

State management for queue operations:

```typescript
interface QueueItem {
  checkpoint: AgentCheckpointData;
  name: string;
  input: string;
}
```

**State Properties:**
- `queue: QueueItem[]` - The actual queue of items
- `started: boolean` - Whether queue processing is active
- `initialCheckpoint: AgentCheckpointData | null` - Preserved starting state
- `currentItem: QueueItem | null` - Currently processing item

**State Methods:**
- `reset(what: ResetWhat[])`: Reset specific state components
- `serialize()`: Convert state to serializable format
- `deserialize(data)`: Restore state from data
- `show()`: Get human-readable state summary

### Queue Command Interface

Interactive command for queue management via chat:

**Available Subcommands:**

**Queue Management:**
- `/queue add <prompt>` - Add new item to queue
- `/queue remove <index>` - Remove item at zero-based index
- `/queue details <index>` - Show detailed JSON information
- `/queue clear` - Empty entire queue
- `/queue list` - Display all items with indices

**Processing Control:**
- `/queue start` - Begin queue processing (preserves current state)
- `/queue next` - Load next item without executing
- `/queue run` - Execute current loaded item
- `/queue skip` - Skip current item and re-add to end
- `/queue done` - End processing and restore initial state

**Usage Examples:**
```bash
/queue add "Analyze user engagement metrics"
/queue add "Generate weekly report"
/queue list
/queue start
/queue next
/queue run
```

### addTaskToQueue Tool

Programmatic tool for adding tasks to the queue:

```typescript
import { tools } from "@tokenring-ai/queue";

await tools.addTaskToQueue.execute({
  description: "Process customer feedback",
  content: "Analyze the customer feedback data, categorize sentiment, and generate insights using available analysis tools."
}, agent);
```

**Input Schema:**
```typescript
{
  description: string;  // Short task description
  content: string;      // Detailed instructions for AI execution
}
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

### Plugin Configuration

The package automatically integrates with TokenRing applications:

```typescript
// Plugin automatically registers:
// - WorkQueueService
// - /queue chat command
// - addTaskToQueue tool
import queuePlugin from "@tokenring-ai/queue/plugin";
const app = new TokenRingApp();
app.install(queuePlugin);
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
/queue run

# Continue with next items
/queue next
/queue run

# Complete processing
/queue done
```

### Programmatic Task Addition

```typescript
// Using the tool programmatically
const tool = tools.addTaskToQueue;
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

### Advanced Queue Manipulation

```typescript
// Direct queue manipulation
const queueSize = queueService.size(agent);
const allItems = queueService.getAll(agent);

// Remove item at specific position
const removed = queueService.splice(2, 1, agent)[0];

// Check current processing status
const isProcessing = queueService.started(agent);
const currentItem = queueService.getCurrentItem(agent);
```

## Integration Patterns

### Agent Integration

The queue service integrates seamlessly with the agent system:

```typescript
// Automatic state slice attachment
await queueService.attach(agent);

// Access queue service through agent
const queueService = agent.requireServiceByType(WorkQueueService);

// Queue operations available through agent
const queueSize = queueService.size(agent);
```

### Checkpoint Integration

Queue operations integrate with the checkpoint system:

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

The queue integrates with the chat service:

```typescript
// Chat commands automatically registered
const chatService = agent.requireServiceByType(ChatService);

// Tools automatically available
const tools = chatService.getTools();

// Commands work through chat interface
await agent.handleInput({ message: "/queue list" });
```

## Advanced Features

### Queue Processing Workflows

**Sequential Processing:**
```bash
/queue add "Task 1: Data collection"
/queue add "Task 2: Analysis"
/queue add "Task 3: Report generation"
/queue start
/queue next
/queue run    # Execute task 1
/queue next
/queue run    # Execute task 2
/queue done   # Restore original state
```

**Selective Processing:**
```bash
/queue add "Urgent task"
/queue add "Regular task 1"
/queue add "Regular task 2"
/queue start
/queue next
/queue run    # Execute urgent task
/queue skip   # Skip regular tasks for now
/queue done
```

### Error Handling

```typescript
// Queue operations handle errors gracefully
try {
  const item = queueService.dequeue(agent);
  // Process item
} catch (error) {
  console.error("Queue processing error:", error);
  // Queue state preserved for recovery
}
```

### State Management

```typescript
// Queue state is part of agent state
agent.mutateState(WorkQueueState, (state) => {
  state.queue.push(newItem);
});

// State persists across agent sessions
const checkpoint = agent.generateCheckpoint();
const restoredAgent = await Agent.createAgentFromCheckpoint(app, checkpoint, { headless });
```

## API Reference

### WorkQueueService Methods

#### Lifecycle Methods

```typescript
async attach(agent: Agent): Promise<void>
void startWork(agent: Agent): void
void stopWork(agent: Agent): void
boolean started(agent: Agent): boolean
```

#### Checkpoint Methods

```typescript
void setInitialCheckpoint(message: AgentCheckpointData, agent: Agent): void
void clearInitialCheckpoint(agent: Agent): void
AgentCheckpointData | null getInitialCheckpoint(agent: Agent): AgentCheckpointData | null
```

#### Queue Operation Methods

```typescript
boolean enqueue(item: QueueItem, agent: Agent): boolean
QueueItem | undefined dequeue(agent: Agent): QueueItem | undefined
QueueItem get(idx: number, agent: Agent): QueueItem
QueueItem[] splice(start: number, deleteCount: number, agent: Agent, ...items: QueueItem[]): QueueItem[]
number size(agent: Agent): number
boolean isEmpty(agent: Agent): boolean
void clear(agent: Agent): void
QueueItem[] getAll(agent: Agent): QueueItem[]
```

#### Current Item Methods

```typescript
QueueItem | null getCurrentItem(agent: Agent): QueueItem | null
void setCurrentItem(item: QueueItem | null, agent: Agent): void
```

### QueueItem Interface

```typescript
interface QueueItem {
  checkpoint: AgentCheckpointData;
  name: string;
  input: string;
}
```

### WorkQueueState Interface

```typescript
class WorkQueueState implements AgentStateSlice {
  name: string;
  queue: QueueItem[];
  started: boolean;
  initialCheckpoint: AgentCheckpointData | null;
  currentItem: QueueItem | null;
  
  reset(what: ResetWhat[]): void;
  serialize(): object;
  deserialize(data: any): void;
  show(): string[];
}
```

## Error Handling

The queue system provides comprehensive error handling:

- **Queue Overflow**: Returns false when queue exceeds maxSize
- **Invalid Indices**: Validates indices in remove/details commands
- **Empty Queue**: Handles operations on empty queue gracefully
- **State Restoration**: Ensures state consistency during processing
- **Checkpoint Failures**: Handles checkpoint creation/restoration errors
- **Invalid Operations**: Validates queue operations and provides helpful error messages

## Performance Considerations

- **Memory Usage**: Queue items stored in memory (not persistent)
- **Checkpoint Overhead**: Each item includes full agent state
- **Processing Speed**: Sequential processing with optional parallel execution
- **Memory Management**: Optional size limits prevent unbounded growth
- **State Serialization**: Efficient state serialization for checkpoint creation

## Dependencies

- **@tokenring-ai/agent**: Agent framework and state management
- **@tokenring-ai/chat**: Chat service and tool integration
- **@tokenring-ai/checkpoint**: Checkpoint creation and restoration
- **@tokenring-ai/app**: Application framework
- **@tokenring-ai/ai-client**: AI client integration
- **zod**: Schema validation

## Development

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

### Plugin Development

Custom queue functionality:

```typescript
import { WorkQueueService } from "@tokenring-ai/queue";

class CustomQueueService extends WorkQueueService {
  // Extend with custom functionality
}
```

## Version History

- **0.2.0**: Current version with comprehensive queue management
- Complete checkpoint integration
- Interactive command interface
- Tool integration for programmatic access
- State management and persistence

## License

MIT

## Related Packages

- **@tokenring-ai/agent**: Agent framework integration
- **@tokenring-ai/chat**: Chat service and tool system
- **@tokenring-ai/checkpoint**: State preservation system
- **@tokenring-ai/app**: Application framework