'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lokka = require('lokka');

var _lokkaTransportHttp = require('lokka-transport-http');

var client = new _lokka.Lokka({
  transport: new _lokkaTransportHttp.Transport('https://api.graph.cool/simple/v1/cixri1w220iji0121r8lr0n69')
});

var getAgentByTag = function getAgentByTag(tag) {
  return client.query('\n  query agent($tag: String!) {\n    Agent(tag: $tag) { \n      tag\n      nickname\n      endUser {\n        email\n      }\n    }\n  }', { tag: tag });
};

var findEndUserByEmail = function findEndUserByEmail(email) {
  return client.query('\n  query getEndUser($email: String!) {\n    EndUser(email: $email) {\n      id\n    }\n  }', { email: email });
};

var createAgent = function createAgent(tag, nickname, endUserId) {
  return client.mutate('{\n    item: createAgent(tag: "' + tag + '", nickname: "' + nickname + '", endUserId: "' + endUserId + '") {\n      id\n      updatedAt\n    }\n  }');
};

exports.default = {
  getAgentByTag: getAgentByTag,
  findEndUserByEmail: findEndUserByEmail,
  createAgent: createAgent
};
//# sourceMappingURL=data.js.map