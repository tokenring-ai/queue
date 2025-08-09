/**
 * Adds a task to the work queue for later execution
 * @param {object} args
 * @param {string} args.description - A short description of the task to be performed
 * @param {string} args.content - The detailed task description in natural language
 * @param {TokenRingRegistry} registry - The package registry
 * @returns {Promise<object>} Result containing queue status and message
 */
export function execute(
	{
		description,
		content,
	}: {
		description: string;
		content: string;
	},
	registry: TokenRingRegistry,
): Promise<object>;
export const description: "Adds a task to the queue for later execution by the system.";
export const parameters: z.ZodObject<
	{
		description: z.ZodString;
		content: z.ZodString;
	},
	"strip",
	z.ZodTypeAny,
	{
		description?: string;
		content?: string;
	},
	{
		description?: string;
		content?: string;
	}
>;
import { z } from "zod";
