var consts = {

  apiUrl: '$apiUrl'

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
  }
};

(function () {
  consts.init();
})();