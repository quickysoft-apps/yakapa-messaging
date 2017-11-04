'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lokka = require('lokka');

var _lokkaTransportHttp = require('lokka-transport-http');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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

var AgentRepository = function () {
  function AgentRepository() {
    _classCallCheck(this, AgentRepository);
  }

  _createClass(AgentRepository, [{
    key: 'update',
    value: function update(tag, nickname, email) {
      if (!email) {
        return;
      }
      findEndUserByEmailAndAgentTag(email, tag).then(function (data) {
        if (!data.EndUser) {
          return console.info(Common.now(), 'Email inconnu : ' + email);
        } else {
          var endUserId = data.EndUser.id;
          if (data.EndUser.agents.length > 0) {
            var agent = data.EndUser.agents[0];
            if (agent.nickname !== nickname) {
              updateAgent(agent.id, nickname).then(function (data) {
                console.info(Common.now(), 'Agent mis \xE0 jour : ' + data.updatedAgent.nickname + ', ' + email);
              }).catch(function (error) {
                console.error(Common.now() + ' updateAgent', error);
              });
            }
          } else {
            createAgent(tag, nickname, endUserId).then(function (data) {
              console.info(Common.now(), 'Nouvel agent "' + data.newAgent.nickname + '" cr\xE9\xE9 pour ' + data.newAgent.endUser.email);
            }).catch(function (error) {
              console.error(Common.now() + ' createAgent', error);
            });
          }
        }
      }).catch(function (error) {
        console.error(Common.now() + ' findEndUserByEmailAndAgentTag', error);
      });
    }
  }]);

  return AgentRepository;
}();

exports.default = AgentRepository;
//# sourceMappingURL=repository.js.map