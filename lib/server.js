'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

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

var _agentRepository = require('./agentRepository');

var _agentRepository2 = _interopRequireDefault(_agentRepository);

var _events = require('./events');

var _events2 = _interopRequireDefault(_events);

var _errors = require('./errors');

var _errors2 = _interopRequireDefault(_errors);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DEFAULT_PUBLIC_PORT = 80;
var DEFAULT_PRIVATE_PORT = 3000;
var DEFAULT_PUBLIC_SSL_PORT = 443;
var DEFAULT_PRIVATE_SSL_PORT = 3443;
var DEFAULT_HOST = 'http://mprj.cloudapp.net';
var DEFAULT_SSL_HOST = 'https://mprj.cloudapp.net';

var storageSystems = ['f1a33ec7-b0a5-4b65-be40-d2a93fd5b133'];

var Server = function () {
	function Server() {
		var _this = this;

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

		this.expressApp.use(_express2.default.static(_path2.default.resolve(__dirname, '..', 'static')));
		this.expressApp.get('*', function (req, res) {
			res.sendFile(_path2.default.resolve(__dirname, '..', 'static', 'index.html'));
		});

		this.socketServer.sockets.on('connection', function (socket) {
			_this.setReady(socket);
			_this.registerHandlers(socket);
		});

		this.socketServer.use(function (socket, next) {
			var tag = socket.handshake.query.tag;

			_agentRepository2.default.findByTag(tag, function (res, error) {
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
			this.handleEvent(_events2.default.CHAT, socket);
			this.handleEvent(_events2.default.EXECUTE, socket);
			this.handleEvent(_events2.default.RESULT, socket);
			this.handleEvent(_events2.default.CONFIGURED, socket);
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
			var _this2 = this;

			this.webServer.listen(this.privatePort, function () {
				console.info(_common2.default.now(), 'Listening on *:' + _this2.publicPort + ' --> *:' + _this2.privatePort);
			});
		}
	}, {
		key: 'handleEvent',
		value: function handleEvent(event, socket) {
			var _this3 = this;

			socket.on(event, function (message) {
				var json = _common2.default.toJson(message);
				console.info(_common2.default.now() + ' ' + event, json);
				if (json.to) {
					_this3.socketServer.sockets.in(json.to).emit(event, message);
					return;
				} else {
					if (event === _events2.default.CONFIGURED) {
						_agentRepository2.default.update(json.from, json.nickname, json.email);
						return;
					}
				}
				console.error(_common2.default.now() + ' ' + json.from + ' doit sp\xE9cifier un destinataire');
			});
		}
	}]);

	return Server;
}();

exports.default = Server;
//# sourceMappingURL=server.js.map