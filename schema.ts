import {z} from "zod";

export const WorkQueueAgentConfigSchema = z.object({
  maxSize: z.number().positive().optional(),
})

export const WorkQueueServiceConfigSchema = z.object({
  agentDefaults: z.object({
    maxSize: z.number().positive().optional(),
  }).prefault({})
});

export type ParsedWorkQueueConfig = z.output<typeof WorkQueueServiceConfigSchema>;