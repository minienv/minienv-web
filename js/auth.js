var app = {

  code: null,
  state: null,
  apiUrl: '$apiUrl',
  githubClientId: '$githubClientId',

  authCallback: function(callback) {
    var request = new XMLHttpRequest();
    request.onload = function () {
      if (this.status >= 200 && this.status < 400) {
        var me = JSON.parse(this.responseText);
        localStorage.setItem('githubAccessToken', me.user.accessToken);
        callback();
      }
      else {
        callback('Error getting me.');
      }
    };
    request.open('GET', app.apiUrl + '/auth/callback?code=' + encodeURIComponent(app.code), true);
    request.send();
  },

  getParameterByName: function (name, url) {
    if (!url) {
      url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
    var results = regex.exec(url);
    if (!results) {
      return null;
    }
    if (!results[2]) {
      return '';
    }
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  },

  init: function () {
    // fix api url
    if (app.apiUrl.startsWith('$')) {
      var api = app.getParameterByName('api');
      if (api) {
        app.apiUrl = api;
      }
      else {
        app.apiUrl = 'http://localhost:8002';
      }
    }
    // fix github client id
    if (app.githubClientId.startsWith('$')) {
      var clientId = app.getParameterByName('clientId');
      if (clientId) {
        app.githubClientId = clientId;
      }
      else {
        app.githubClientId = '02d75fcd9044ca3d6cf9';
      }
    }
    // get code
    let redirectUrl = "/error/browser";
    let state = undefined;
    if (typeof(Storage) !== 'undefined') {
      redirectUrl = localStorage.getItem('githubAuthRedirectUrl');
      state = localStorage.getItem('githubAuthState');
      localStorage.removeItem('githubAuthRedirectUrl');
      localStorage.removeItem('githubAuthState');
    }
    app.code = app.getParameterByName('code');
    app.state = app.getParameterByName('state');
    if (!app.code || app.state !== state) {
      document.location.href = '/';
    }
    else {
      app.authCallback(function(err) {
        if (err) {
          document.location.href = '/error/unexpected';
        }
        else {
          document.location.href = redirectUrl;
        }
      });
    }
  }
};

(function () {
  app.init();
})();