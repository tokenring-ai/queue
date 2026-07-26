import { AgentCommandService } from "@tokenring-ai/agent";
import type { TokenRingPlugin } from "@tokenring-ai/app";
import { ChatService } from "@tokenring-ai/chat";
import { RpcService } from "@tokenring-ai/rpc";
import { z } from "zod";

import agentCommands from "./commands.ts";
import packageJSON from "./package.json" with { type: "json" };
import QueueService from "./QueueService.ts";
import queueRPC from "./rpc/queue.ts";
import { QueueServiceConfigSchema } from "./schema.ts";
import tools from "./tools.ts";

const packageConfigSchema = z.object({
  queue: QueueServiceConfigSchema.prefault({}),
});

export default {
  name: packageJSON.name,
  displayName: "Work Queue",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    app.waitForService(ChatService, chatService => chatService.addTools(...tools));
    app.waitForService(AgentCommandService, agentCommandService => agentCommandService.addAgentCommands(agentCommands));
    app.waitForService(RpcService, rpcService => {
      rpcService.registerEndpoint(queueRPC);
    });
    app.addServices(new QueueService(app, config.queue));
  },
  configSchema: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
