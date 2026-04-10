import {AgentCommandService} from "@tokenring-ai/agent";
import type {TokenRingPlugin} from "@tokenring-ai/app";
import {ChatService} from "@tokenring-ai/chat";
import {z} from "zod";

import agentCommands from "./commands.ts";
import packageJSON from "./package.json" with {type: "json"};
import {WorkQueueServiceConfigSchema} from "./schema.ts";
import tools from "./tools.ts";
import WorkQueueService from "./WorkQueueService.ts";

const packageConfigSchema = z.object({
  queue: WorkQueueServiceConfigSchema.prefault({}),
});

export default {
  name: packageJSON.name,
  displayName: "Work Queue",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    app.waitForService(ChatService, (chatService) =>
      chatService.addTools(tools),
    );
    app.waitForService(AgentCommandService, (agentCommandService) =>
      agentCommandService.addAgentCommands([...agentCommands]),
    );
    app.addServices(new WorkQueueService(config.queue));
  },
  config: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
