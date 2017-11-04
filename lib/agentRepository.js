'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _lokka = require('lokka');

var _lokkaTransportHttp = require('lokka-transport-http');

var _common = require('./common');

var _common2 = _interopRequireDefault(_common);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var storageSystems = ['f1a33ec7-b0a5-4b65-be40-d2a93fd5b133'];

var client = new _lokka.Lokka({
	transport: new _lokkaTransportHttp.Transport('https://api.graph.cool/simple/v1/cixri1w220iji0121r8lr0n69')
});

var findAgentByTag = function findAgentByTag(tag) {
	return client.query('\n  query findAgentByTag($tag: String!) {\n    Agent(tag: $tag) { \n      id\n      tag\n      nickname\n      endUser {\n        email\n      }\n    }\n    User(tag: $tag) {\n      id\n    }\n  }', {
		tag: tag
	});
};

var findEndUserByEmailAndAgentTag = function findEndUserByEmailAndAgentTag(email, tag) {
	return client.query('\n  query ($email: String!, $tag: String!) {\n    EndUser(email: $email) {\n      id\n      agents(filter: {tag: $tag}) {\n        id\n        nickname      \n      }\n    }\n  }', {
		tag: tag,
		email: email
	});
};

var createAgent = function createAgent(tag, nickname, endUserId) {
	return client.mutate('\n  {\n    newAgent: createAgent(tag: "' + tag + '", nickname: "' + nickname + '", endUserId: "' + endUserId + '") {\n      id\n      updatedAt\n      nickname\n      endUser {\n        email\n      }\n    }\n  }');
};

var updateAgent = function updateAgent(id, nickname) {
	return client.mutate('\n  {\n   updatedAgent: updateAgent(id: "' + id + '", nickname: "' + nickname + '") {\n      id\n      updatedAt    \n      nickname\n    }\n  }');
};

var findByTag = function findByTag(tag, callback) {
	if (!tag) {
		callback(null, new DiscoverError('undefined tag'));
	}
	findAgentByTag(tag).then(function (data) {
		var system = null;
		if (data.Agent) {
			system = {
				nickname: data.Agent.nickname,
				email: data.Agent.endUser.email,
				tag: tag
			};
		}
		if (data.User) {
			system = {
				nickname: 'Yakapa User',
				email: 'n/a',
				tag: tag
			};
		}
		if (storageSystems.indexOf(tag) !== -1) {
			system = {
				nickname: 'Yakapa Storage',
				email: 'n/a',
				tag: tag
			};
		}
		if (system) {
			console.info(_common2.default.now(), 'Connection ' + JSON.stringify(system));
			callback(system, null);
		} else {
			console.warn(_common2.default.now(), 'Connection syst\xE8me inconnu ' + tag);
			callback(null, new AuthenticationError('Système non authorisé'));
		}
	}).catch(function (error) {
		console.error(_common2.default.now() + ' La d\xE9couverte du syst\xE8me a \xE9chou\xE9', error);
		callback(null, new ServerError(error.message));
	});
};

var update = function update(tag, nickname, email) {
	if (!email) {
		return;
	}
	findEndUserByEmailAndAgentTag(email, tag).then(function (data) {
		if (!data.EndUser) {
			return console.info(_common2.default.now(), 'Email inconnu : ' + email);
		} else {
			var endUserId = data.EndUser.id;
			if (data.EndUser.agents.length > 0) {
				var agent = data.EndUser.agents[0];
				if (agent.nickname !== nickname) {
					updateAgent(agent.id, nickname).then(function (data) {
						console.info(_common2.default.now(), 'Agent mis \xE0 jour : ' + data.updatedAgent.nickname + ', ' + email);
					}).catch(function (error) {
						console.error(_common2.default.now() + ' updateAgent', error);
					});
				}
			} else {
				createAgent(tag, nickname, endUserId).then(function (data) {
					console.info(_common2.default.now(), 'Nouvel agent "' + data.newAgent.nickname + '" cr\xE9\xE9 pour ' + data.newAgent.endUser.email);
				}).catch(function (error) {
					console.error(_common2.default.now() + ' createAgent', error);
				});
			}
		}
	}).catch(function (error) {
		console.error(_common2.default.now() + ' findEndUserByEmailAndAgentTag', error);
	});
};

exports.default = {
	findByTag: findByTag,
	update: update
};
//# sourceMappingURL=agentRepository.js.map