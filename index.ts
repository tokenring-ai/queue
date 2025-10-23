import {AgentTeam, TokenRingPackage} from "@tokenring-ai/agent";

import * as chatCommands from "./chatCommands.ts";
import packageJSON from "./package.json" with {type: "json"};
import * as tools from "./tools.ts";
import WorkQueueService from "./WorkQueueService.js";

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(agentTeam: AgentTeam) {
    agentTeam.addTools(packageJSON.name, tools);
    agentTeam.addChatCommands(chatCommands);
    agentTeam.addServices(new WorkQueueService());
  },
} as TokenRingPackage;

export {default as WorkQueueService} from "./WorkQueueService.ts";
