var consts = {

  apiUrl: '$apiUrl',
  githubClientId: '$githubClientId',

  init: function () {
    // fix api url
    if (consts.apiUrl.startsWith('$')) {
      var api = utils.getParameterByName('api');
      if (api) {
        consts.apiUrl = api;
      }
      else {
        consts.apiUrl = 'http://localhost:8002';
      }
    }
    // fix github client id
    if (consts.githubClientId.startsWith('$')) {
      var clientId = utils.getParameterByName('clientId');
      if (clientId) {
        consts.githubClientId = clientId;
      }
      else {
        consts.githubClientId = '02d75fcd9044ca3d6cf9';
      }
    }
  }
};

(function () {
  consts.init();
})();