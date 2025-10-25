import {AgentCommandService, AgentTeam, TokenRingPackage} from "@tokenring-ai/agent";
import {AIService} from "@tokenring-ai/ai-client";

import * as chatCommands from "./chatCommands.ts";
import packageJSON from "./package.json" with {type: "json"};
import * as tools from "./tools.ts";
import WorkQueueService from "./WorkQueueService.js";

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(agentTeam: AgentTeam) {
    agentTeam.waitForService(AIService, aiService =>
      aiService.addTools(packageJSON.name, tools)
    );
    agentTeam.waitForService(AgentCommandService, agentCommandService =>
      agentCommandService.addAgentCommands(chatCommands)
    );
    agentTeam.addServices(new WorkQueueService());
  },
} as TokenRingPackage;

export {default as WorkQueueService} from "./WorkQueueService.ts";
