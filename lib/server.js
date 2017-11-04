'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _socket = require('socket.io');

var _socket2 = _interopRequireDefault(_socket);

var _stringCapitalizeName = require('string-capitalize-name');

var _stringCapitalizeName2 = _interopRequireDefault(_stringCapitalizeName);

var _faker = require('faker');

var _faker2 = _interopRequireDefault(_faker);

var _common = require('./common');

var _common2 = _interopRequireDefault(_common);

var _events = require('./events');

var _events2 = _interopRequireDefault(_events);

var _repository = require('./repository');

var _repository2 = _interopRequireDefault(_repository);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var request = require('request');
var qs = require('qs');

var DEFAULT_PUBLIC_PORT = 80;
var DEFAULT_PRIVATE_PORT = 3000;
var DEFAULT_PUBLIC_SSL_PORT = 443;
var DEFAULT_PRIVATE_SSL_PORT = 3443;
var DEFAULT_HOST = 'http://mprj.cloudapp.net';
var DEFAULT_SSL_HOST = 'https://mprj.cloudapp.net';

var storageSystems = ['f1a33ec7-b0a5-4b65-be40-d2a93fd5b133'];

var ExtendableError = function (_Error) {
	_inherits(ExtendableError, _Error);

	function ExtendableError(message) {
		_classCallCheck(this, ExtendableError);

		var _this = _possibleConstructorReturn(this, (ExtendableError.__proto__ || Object.getPrototypeOf(ExtendableError)).call(this, message));

		_this.name = _this.constructor.name;
		if (typeof Error.captureStackTrace === 'function') {
			Error.captureStackTrace(_this, _this.constructor);
		} else {
			_this.stack = new Error(message).stack;
		}
		return _this;
	}

	return ExtendableError;
}(Error);

var ServerError = function (_ExtendableError) {
	_inherits(ServerError, _ExtendableError);

	function ServerError(message) {
		_classCallCheck(this, ServerError);

		var _this2 = _possibleConstructorReturn(this, (ServerError.__proto__ || Object.getPrototypeOf(ServerError)).call(this, message));

		_this2.data = 'ServerError';
		return _this2;
	}

	return ServerError;
}(ExtendableError);

var AuthenticationError = function (_ExtendableError2) {
	_inherits(AuthenticationError, _ExtendableError2);

	function AuthenticationError(message) {
		_classCallCheck(this, AuthenticationError);

		var _this3 = _possibleConstructorReturn(this, (AuthenticationError.__proto__ || Object.getPrototypeOf(AuthenticationError)).call(this, 'Authentication error: ' + message));

		_this3.data = 'AuthenticationError';
		return _this3;
	}

	return AuthenticationError;
}(ExtendableError);

var Server = function () {
	function Server() {
		var _this4 = this;

		var secure = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

		_classCallCheck(this, Server);

		this._secure = secure;

		var sslOptions = {
			key: _fs2.default.readFileSync('/home/azemour/yakapa/yakapa-messaging/yakapass.pem'),
			cert: _fs2.default.readFileSync('/home/azemour/yakapa/yakapa-messaging/yakapass.crt')
		};

		this.publicPort = secure ? DEFAULT_PUBLIC_SSL_PORT : DEFAULT_PUBLIC_PORT;
		this.privatePort = secure ? DEFAULT_PRIVATE_SSL_PORT : DEFAULT_PRIVATE_PORT;
		this.expressApp = (0, _express2.default)();
		this.webServer = secure ? _https2.default.Server(sslOptions, this.expressApp) : _http2.default.Server(this.expressApp);

		this.socketServer = _socket2.default.listen(this.webServer);

		this.handleRequests();

		this.socketServer.sockets.on('connection', function (socket) {
			_this4.setReady(socket);
			_this4.registerHandlers(socket);
		});

		this.socketServer.use(function (socket, next) {
			var tag = socket.handshake.query.tag;

			_this4.discoverAgent(tag, function (res, error) {
				if (error) {
					console.error(_common2.default.now() + ' ' + error.message);
					next(error);
				} else {
					socket.yakapa = {
						data: {
							knownAgent: res,
							authenticatingTag: tag
						}
					};
					return next();
				}
			});
		});
	}

	_createClass(Server, [{
		key: 'registerHandlers',
		value: function registerHandlers(socket) {
			this.handlePassThrough(_events2.default.CHAT, socket);
			this.handlePassThrough(_events2.default.EXECUTE, socket);
			this.handlePassThrough(_events2.default.RESULT, socket);
			this.handlePassThrough(_events2.default.CONFIGURED, socket);
		}
	}, {
		key: 'discoverAgent',
		value: function discoverAgent(tag, callback) {
			var _this5 = this;

			if (!tag) {
				callback(null, new DiscoverError('undefined tag'));
			}
			_repository2.default.findAgentByTag(tag).then(function (data) {
				var system = null;
				var host = _this5._secure ? DEFAULT_SSL_HOST : DEFAULT_HOST;
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
		}
	}, {
		key: 'setReady',
		value: function setReady(socket) {
			var randomUser = {
				name: {
					first: _faker2.default.commerce.productAdjective(),
					last: _faker2.default.name.firstName()
				}
			};
			var generatedNickname = (0, _stringCapitalizeName2.default)(randomUser.name.first + ' ' + randomUser.name.last, {
				ignoreLessThanLength: 3
			});
			var tag = socket.yakapa.data.authenticatingTag;
			var knownAgent = socket.yakapa.data.knownAgent;
			var nickname = knownAgent ? knownAgent.nickname : generatedNickname;
			var host = this._secure ? DEFAULT_SSL_HOST : DEFAULT_HOST;
			socket.join(tag);
			this.socketServer.sockets.in(tag).emit(_events2.default.READY, {
				tag: tag,
				nickname: nickname
			});
		}
	}, {
		key: 'listen',
		value: function listen() {
			var _this6 = this;

			this.webServer.listen(this.privatePort, function () {
				console.info(_common2.default.now(), 'Listening on *:' + _this6.publicPort + ' --> *:' + _this6.privatePort);
			});
		}
	}, {
		key: 'toJson',
		value: function toJson(json) {
			return (typeof json === 'undefined' ? 'undefined' : _typeof(json)) === 'object' ? json : JSON.parse(json);
		}
	}, {
		key: 'handleRequests',
		value: function handleRequests() {
			this.expressApp.use(_express2.default.static(_path2.default.resolve(__dirname, '..', 'static')));
			this.expressApp.get('*', function (req, res) {
				res.sendFile(_path2.default.resolve(__dirname, '..', 'static', 'index.html'));
			});
		}
	}, {
		key: 'handlePassThrough',
		value: function handlePassThrough(event, socket) {
			var _this7 = this;

			socket.on(event, function (message) {
				var json = _this7.toJson(message);
				console.info(_common2.default.now() + ' ' + event, json);
				if (json.to) {
					_this7.socketServer.sockets.in(json.to).emit(event, message);
					return;
				} else {
					if (event === _events2.default.CONFIGURED) {
						_this7.updateAgent(json.from, json.nickname, json.email);
						return;
					}
				}
				console.error(_common2.default.now() + ' ' + json.from + ' doit sp\xE9cifier un destinataire');
			});
		}
	}, {
		key: 'updateAgent',
		value: function updateAgent(tag, nickname, email) {
			if (!email) {
				return;
			}
			_repository2.default.findEndUserByEmailAndAgentTag(email, tag).then(function (data) {
				if (!data.EndUser) {
					return console.info(_common2.default.now(), 'Email inconnu : ' + email);
				} else {
					var endUserId = data.EndUser.id;
					if (data.EndUser.agents.length > 0) {
						var agent = data.EndUser.agents[0];
						if (agent.nickname !== nickname) {
							_repository2.default.updateAgent(agent.id, nickname).then(function (data) {
								console.info(_common2.default.now(), 'Agent mis \xE0 jour : ' + data.updatedAgent.nickname + ', ' + email);
							}).catch(function (error) {
								console.error(_common2.default.now() + ' updateAgent', error);
							});
						}
					} else {
						_repository2.default.createAgent(tag, nickname, endUserId).then(function (data) {
							console.info(_common2.default.now(), 'Nouvel agent "' + data.newAgent.nickname + '" cr\xE9\xE9 pour ' + data.newAgent.endUser.email);
						}).catch(function (error) {
							console.error(_common2.default.now() + ' createAgent', error);
						});
					}
				}
			}).catch(function (error) {
				console.error(_common2.default.now() + ' findEndUserByEmailAndAgentTag', error);
			});
		}
	}]);

	return Server;
}();

exports.default = Server;
//# sourceMappingURL=server.js.map