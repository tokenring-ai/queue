import queueAdd from "./commands/queue/add.ts";
import queueClear from "./commands/queue/clear.ts";
import queueCreate from "./commands/queue/create.ts";
import queueList from "./commands/queue/list.ts";
import queueQueues from "./commands/queue/queues.ts";
import queueRemove from "./commands/queue/remove.ts";
import queueResults from "./commands/queue/results.ts";
import queueStatus from "./commands/queue/status.ts";

export default [queueList, queueAdd, queueResults, queueRemove, queueClear, queueStatus, queueQueues, queueCreate];
