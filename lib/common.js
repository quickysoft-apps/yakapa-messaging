'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var now = function now() {
	return new Date().toJSON().slice(0, 19).replace(/T/g, ' ');
};

var toJson = function toJson(json) {
	return (typeof json === 'undefined' ? 'undefined' : _typeof(json)) === 'object' ? json : JSON.parse(json);
};

exports.default = {
	now: now,
	toJson: toJson
};
//# sourceMappingURL=common.js.map