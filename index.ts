import TokenRingApp from "@tokenring-ai/app"; 
import {AgentCommandService} from "@tokenring-ai/agent";
import {ChatService} from "@tokenring-ai/chat";
import {TokenRingPlugin} from "@tokenring-ai/app";

import chatCommands from "./chatCommands.ts";
import packageJSON from "./package.json" with {type: "json"};
import tools from "./tools.ts";
import WorkQueueService from "./WorkQueueService.js";

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app: TokenRingApp) {
    app.waitForService(ChatService, chatService =>
      chatService.addTools(packageJSON.name, tools)
    );
    app.waitForService(AgentCommandService, agentCommandService =>
      agentCommandService.addAgentCommands(chatCommands)
    );
    app.addServices(new WorkQueueService());
  },
} as TokenRingPlugin;

export {default as WorkQueueService} from "./WorkQueueService.ts";
