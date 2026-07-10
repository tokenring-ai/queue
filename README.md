# @tokenring-ai/queue

## Overview

App-level work queue that dispatches items to agents of a specific type. Items placed on a queue
are each executed by a **fresh headless agent** of the queue's assigned `agentType`; agents are not
reused across items. Each queue has a **concurrency** that caps how many agents may work it at any
one time, and a bounded history of **recently completed results**.

A `default` queue is always present. You can configure additional named queues, each with their own
agent type and concurrency.

### Key Features

- **App-level**: queue state lives on the app (`AppStateSlice`), visible to all agents and tools — not tied to a single agent.
- **Typed dispatch**: each queue is assigned an `agentType`; a fresh agent of that type is spawned per item.
- **Concurrency caps**: each queue limits how many items run simultaneously.
- **Results history**: completed/failed/cancelled items are retained (bounded) with status, message, and timing.
- **AI tools**: agents can add work, inspect a queue, and retrieve results.
- **Named queues**: a `default` queue always exists; more can be configured or created at runtime.
- **Automatic dispatch**: a background dispatcher loop processes the queue — no manual driving.
- **Persistence**: queue state serializes through the app state system; in-flight items are re-dispatched after a restart.

## Installation

```bash
bun add @tokenring-ai/queue
```

## Core Components

### QueueService

The central app-level service. It owns the queue state, runs the dispatcher loop, and exposes
operations used by the tools and commands.

**Service Name:** `QueueService`

```typescript
import QueueService from "@tokenring-ai/queue/QueueService";
import type { ParsedQueueConfig } from "@tokenring-ai/queue/schema";

const config: ParsedQueueConfig = {
  defaultAgentType: "code",
  defaultConcurrency: 1,
  maxResults: 100,
  pollIntervalMs: 500,
  queues: {
    research: { agentType: "research", concurrency: 2 },
  },
};

const queueService = new QueueService(app, config);
app.addServices(queueService);
```

The service implements `TokenRingService`:
- `run(signal)` — the dispatcher loop. Every `pollIntervalMs` it starts pending items (up to `concurrency` per queue) by spawning a headless agent, dispatching the item via `agent.handleInput`, and watching for the `agent.response`.
- `stop()` — tears down any running worker agents on shutdown.

#### Queue configuration methods

| Method | Description |
|---|---|
| `getQueueNames()` | Names of all queues |
| `getQueueConfig(name)` | The config (`agentType`, `concurrency`, `maxSize`, `maxResults`) for a queue |
| `createQueue(name, { agentType, concurrency?, maxSize?, maxResults? })` | Create a new named queue at runtime |

#### Item methods

| Method | Description |
|---|---|
| `enqueue(queueName, { name, input, from })` | Add a pending item; throws if the queue is full (`maxSize`) or unknown |
| `getPending(queueName)` | Pending items (copies) |
| `getRunning(queueName)` | Currently running items (copies) |
| `getResults(queueName, limit?, status?)` | Recent results, newest first (copies) |
| `removeItem(queueName, itemId)` | Remove a pending item by id |
| `cancelItem(queueName, itemId)` | Cancel a running item (aborts its agent) or remove a pending one; records a `cancelled` result |
| `clear(queueName)` | Remove all pending items (running items are left alone) |

### QueueState

The `AppStateSlice` that holds every queue's configuration, pending/running items, and bounded
results history. Registered on `app.stateManager` by `QueueService`.

On restore (`deserialize`), any item that was `running` is reset to `pending` so it re-dispatches,
and `results` are trimmed to the queue's `maxResults`.

### Data model

```typescript
interface QueueItem {
  id: string;
  queueName: string;
  name: string;          // short description
  input: string;         // the prompt executed by the worker agent
  from: string;          // who submitted it (e.g. "agent:<id>", "user:<id>")
  status: "pending" | "running";
  createdAt: number;
  startedAt?: number | null;
  agentId?: string | null;
  requestId?: string | null;
}

interface ResultItem {
  /* ...same identity/timing fields as QueueItem... */
  status: "completed" | "failed" | "cancelled";
  completedAt: number;
  durationMs: number;
  resultMessage: string;   // the agent.response message/summary
}
```

## AI Tools

These tools let an AI agent interact with the queue. They are registered globally by the plugin and
enabled per agent type via `enabledTools` (e.g. `queue_*`).

### queue_addTaskToQueue

Adds a task to a queue for execution by an available agent of the queue's assigned type.

```typescript
{
  queueName?: string,   // defaults to "default"
  description: string,  // short description
  content: string,      // detailed instructions for the worker agent
}
```

Returns `{ status: "queued", itemId, queueName, message }`.

### queue_list

Lists the items waiting (and optionally running) on a queue.

```typescript
{ queueName?: string, includeRunning?: boolean }
```

Returns `{ queueName, pending: [...], running?: [...] }`.

### queue_getResults

Retrieves the results of recently completed work on a queue, newest first.

```typescript
{ queueName?: string, limit?: number, status?: "completed" | "failed" | "cancelled" }
```

Returns `{ queueName, count, results: [...] }` where each result includes `id`, `name`, `status`,
`resultMessage`, `durationMs`, and `completedAt`.

### queue_cancel

Cancels a queued task — removes it if pending, or aborts the running agent if in progress.

```typescript
{ queueName?: string, itemId: string }
```

## Chat Commands

The package provides `/queue` commands for interactive use:

| Command | Description |
|---|---|
| `/queue list [--queue <name>] [--all]` | Show pending items (and running with `--all`) |
| `/queue add <prompt> [--queue <name>]` | Add a task |
| `/queue results [--queue <name>] [--limit <n>]` | Show recently completed results |
| `/queue remove <position> [--queue <name>]` | Remove a pending item by its 1-based position |
| `/queue clear [--queue <name>]` | Remove all pending items |
| `/queue status [--queue <name>]` | Show a queue's configuration and health |
| `/queue queues` | List all configured queues |
| `/queue create <name> --type <type> [--concurrency <n>]` | Create a new named queue |

## Configuration

### Plugin Configuration

```typescript
{
  queue: {
    defaultAgentType: "code",       // agent type for the default queue
    defaultConcurrency: 1,          // default concurrency for queues that don't specify one
    maxResults: 100,                // default results-history bound per queue
    pollIntervalMs: 500,            // dispatcher loop interval
    queues: {
      default: { agentType: "code", concurrency: 2 },
      research: { agentType: "research", concurrency: 1, maxSize: 50 },
    },
  }
}
```

A `default` queue is always created. It uses `queues.default` if present, otherwise
`{ agentType: defaultAgentType, concurrency: defaultConcurrency }`. Queues that omit `concurrency`
inherit `defaultConcurrency`; those that omit `maxResults` inherit the global `maxResults`.

### Enabling tools for an agent

Add `queue_*` to an agent type's `chat.enabledTools` to let it use the queue tools:

```yaml
agents:
  leader:
    chat:
      enabledTools:
        - queue_*
```

## How dispatching works

1. An item is enqueued (via a tool, command, or `QueueService.enqueue`).
2. The dispatcher loop (in `run`) wakes every `pollIntervalMs`. For each queue, it computes
   `concurrency − currentlyRunning` free slots and starts that many pending items.
3. For each started item it spawns a **fresh headless agent** of the queue's `agentType`, dispatches
   the item via `agent.handleInput`, and watches the agent's event stream for the matching
   `agent.response`.
4. On completion the result (status + message + timing) is recorded in the queue's results history
   (trimmed to `maxResults`), and the agent is **deleted** (never reused).

## Dependencies

- `@tokenring-ai/agent` — `AgentManager`, `AgentEventState`, agent types
- `@tokenring-ai/app` — `TokenRingApp`, `AppStateSlice`, plugin/service types
- `@tokenring-ai/chat` — tool registration (`ChatService`)
- `@tokenring-ai/utility` — string utilities
- `zod` — schema validation

## Development

```bash
bun run build         # typecheck (tsc --noEmit)
bun run test          # run tests
bun run test:watch
```

## License

MIT License - see [LICENSE](./LICENSE) file for details.
