export function execute(remainder: any, registry: any): Promise<void>;
export function help(): string[];
/**
 * /queue add|remove|clear|list|run <args>
 * Manages a queue of chat prompt strings to run.
 * Queue is stored on state.queue as an array of prompt strings.
 */
export const description: "/queue <command> - Manage a queue of chat prompts";
