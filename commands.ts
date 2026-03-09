import queueAdd from './commands/queue/add.ts';
import queueRemove from './commands/queue/remove.ts';
import queueDetails from './commands/queue/details.ts';
import queueClear from './commands/queue/clear.ts';
import queueList from './commands/queue/list.ts';
import queueStart from './commands/queue/start.ts';
import {queueNext, queueDone} from './commands/queue/next-done.ts';
import queueSkip from './commands/queue/skip.ts';
import queueRun from './commands/queue/run.ts';

export default [queueAdd, queueRemove, queueDetails, queueClear, queueList, queueStart, queueNext, queueDone, queueSkip, queueRun];
