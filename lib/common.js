'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var now = function now() {
  return new Date().toJSON().slice(0, 19).replace(/T/g, ' ');
};

exports.default = {
  now: now
};
//# sourceMappingURL=common.js.map