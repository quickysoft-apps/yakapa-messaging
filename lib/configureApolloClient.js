'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createClient;

var _apolloClient = require('apollo-client');

var _apolloClient2 = _interopRequireDefault(_apolloClient);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createClient() {

  var networkInterface = (0, _apolloClient.createNetworkInterface)({
    uri: 'https://api.graph.cool/simple/v1/cixri1w220iji0121r8lr0n69',
    opts: {
      credentials: 'same-origin'
    }
  });

  networkInterface.use([{
    applyMiddleware: function applyMiddleware(req, next) {
      if (!req.options.headers) {
        req.options.headers = {};
      }
      //const auth0UserId = "google-oauth2|105177936045252041367"
      //req.options.headers.authorization = `Bearer ${auth0UserId}`
      // get the authentication token from local storage if it exists
      /*if (localStorage && localStorage.getItem('auth0IdToken')) {
        req.options.headers.authorization = `Bearer ${localStorage.getItem('auth0IdToken')}`
      }*/
      next();
    }
  }]);

  var client = new _apolloClient2.default({
    dataIdFromObject: function dataIdFromObject(result) {
      if (result.id) {
        return result.id;
      }
      return null;
    },
    networkInterface: networkInterface
  });

  return client;
}
//# sourceMappingURL=configureApolloClient.js.map