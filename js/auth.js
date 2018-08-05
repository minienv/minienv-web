var app = {

  code: null,
  state: null,

  authCallback: function(callback) {
    var request = new XMLHttpRequest();
    request.onload = function () {
      if (this.status >= 200 && this.status < 400) {
        //var me = JSON.parse(this.responseText);
        //utils.saveToLocalStorage('githubAccessToken', me.user.accessToken);
        callback();
      }
      else {
        callback('Error getting me.');
      }
    };
    request.open('GET', consts.apiUrl + '/auth/callback?code=' + encodeURIComponent(app.code), true);
    request.setRequestHeader('Minienv-Session-Id', utils.getFromLocalStorage('sessionId'));
    request.send();
  },

  init: function () {
    // get code
    var redirectUrl = utils.getFromLocalStorage('githubAuthRedirectUrl') || '/error/browser';
    var state = utils.getFromLocalStorage('githubAuthState');;
    utils.removeFromLocalStorage('githubAuthRedirectUrl');
    utils.removeFromLocalStorage('githubAuthState');
    app.code = utils.getParameterByName('code');
    app.state = utils.getParameterByName('state');
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