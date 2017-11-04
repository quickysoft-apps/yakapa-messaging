'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lokka = require('lokka');

var _lokkaTransportHttp = require('lokka-transport-http');

var client = new _lokka.Lokka({
  transport: new _lokkaTransportHttp.Transport('https://api.graph.cool/simple/v1/cixri1w220iji0121r8lr0n69')
});

var findAgentByTag = function findAgentByTag(tag) {
  return client.query('\n  query findAgentByTag($tag: String!) {\n    Agent(tag: $tag) { \n      id\n      tag\n      nickname\n      endUser {\n        email\n      }\n    }\n    User(tag: $tag) {\n      id\n    }\n  }', { tag: tag });
};

var findEndUserByEmailAndAgentTag = function findEndUserByEmailAndAgentTag(email, tag) {
  return client.query('\n  query ($email: String!, $tag: String!) {\n    EndUser(email: $email) {\n      id\n      agents(filter: {tag: $tag}) {\n        id\n        nickname      \n      }\n    }\n  }', { tag: tag, email: email });
};

var createAgent = function createAgent(tag, nickname, endUserId) {
  return client.mutate('\n  {\n    newAgent: createAgent(tag: "' + tag + '", nickname: "' + nickname + '", endUserId: "' + endUserId + '") {\n      id\n      updatedAt\n      nickname\n      endUser {\n        email\n      }\n    }\n  }');
};

var updateAgent = function updateAgent(id, nickname) {
  return client.mutate('\n  {\n   updatedAgent: updateAgent(id: "' + id + '", nickname: "' + nickname + '") {\n      id\n      updatedAt    \n      nickname\n    }\n  }');
};

exports.default = {
  findAgentByTag: findAgentByTag,
  findEndUserByEmailAndAgentTag: findEndUserByEmailAndAgentTag,
  createAgent: createAgent,
  updateAgent: updateAgent
};
//# sourceMappingURL=repository.js.map