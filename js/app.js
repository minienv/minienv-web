var app = {

  apiUrl: '$apiUrl',
  claimGranted: false,
  claimToken: null,
  repo: '',
  whitelistRepos: undefined,
  requestedRepo: undefined,
  claimTimeMillis: 5000,
  pingTimeMillis: 15000,
  pendingIFrameSleepTimeMillis: 100,
  pendingIFrames: [],
  pendingIFrameTimer: null,
  pendingIFrameTimeMillis: 5000,
  pendingIFrameTimeoutMillis: 10000,
  iframeNavItems: {},
  addedNavItems: [],
  addedTabs: [],

  processPendingIFrames: function () {
    var pending = app.pendingIFrames.length;
    for (var i = app.pendingIFrames.length - 1; i >= 0; i--) {
      var pendingIFrame = app.pendingIFrames[i];
      if ((Date.now() - pendingIFrame.date) > app.pendingIFrameTimeoutMillis) {
        pending--;
        app.pendingIFrames.splice(app.pendingIFrames.indexOf(pendingIFrame), 1);
        app.abortAndQueueIFrame(pendingIFrame.request, pendingIFrame.iframe, pendingIFrame.src, 0);
      }
    }
    if (pending > 0) {
      app.pendingIFrameTimer = setTimeout(app.processPendingIFrames, app.pendingIFrameTimeMillis);
    }
    else {
      app.pendingIFrameTimer = null;
    }

  },

  loadIFrame: function (iframe, src) {
    console.log(Date.now() + ': Loading ' + src);
    var request = new XMLHttpRequest();
    var pendingIFrame = {request: request, iframe: iframe, src: src, date: Date.now()};
    app.pendingIFrames.push(pendingIFrame);
    if (!app.pendingIFrameTimer) {
      app.pendingIFrameTimer = setTimeout(app.processPendingIFrames, app.pendingIFrameTimeMillis);
    }
    request.onload = function () {
      if (this.status >= 200 && this.status < 400) {
        console.log(Date.now() + ': ' + src + ' loaded.');
        app.pendingIFrames.splice(app.pendingIFrames.indexOf(pendingIFrame), 1);
        setTimeout(function () {
          if (iframe.id) {
            if (iframe.id == 'log-iframe') {
              document.getElementById('log-loading').style.display = 'none';
              document.getElementById('log-error').style.display = 'none';
            }
            if (app.iframeNavItems[iframe.id]) {
              app.iframeNavItems[iframe.id].style.display = 'block';
            }
          }
          iframe.src = src;
        }, 0);
      }
      else {
        console.log(Date.now() + ': ' + 'Error loading ' + src);
      }
    };
    request.open('GET', src, true);
    request.send();
  },

  abortAndQueueIFrame: function (request, iframe, src, timeout) {
    setTimeout(function () {
      if (request) {
        try {
          console.log('Aborting ' + src + '...');
          request.abort();
        }
        catch (err) {
          console.log('Error aborting ' + src + ': ' + err);
        }
      }
      app.loadIFrame(iframe, src);
    }, timeout);
  },

  queueIFrame: function (iframe, src, timeout) {
    setTimeout(function () {
      app.loadIFrame(iframe, src);
    }, timeout);
  },

  getNavItem: function (id, title) {
    var anchorText = document.createTextNode(title);
    var anchor = document.createElement('a');
    anchor.setAttribute('class', 'nav-link');
    anchor.setAttribute('data-toggle', 'tab');
    anchor.setAttribute('href', '#' + id);
    anchor.setAttribute('role', 'tab');
    anchor.appendChild(anchorText);
    var navItem = document.createElement('li');
    navItem.setAttribute('class', 'nav-item');
    navItem.appendChild(anchor);
    navItem.style.display = 'none';
    return navItem;
  },

  getTab: function (tabId, iframeId) {
    var iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.padding = '10px';
    iframe.style.border = '0px';
    return app.getTabWithChild(tabId, iframe);
  },

  getTabWithChild: function (tabId, child) {
    var div = document.createElement('div');
    div.id = tabId;
    div.setAttribute('class', 'tab-pane');
    div.setAttribute('role', 'tabpanel');
    div.appendChild(child);
    return div;
  },

  processEnvUpResponse: function (envUpResponse) {
    document.getElementById('repo-btn').disabled = false;
    document.getElementById('log-loading').textContent = "Your environment is starting...this may take a minute or two...";
    document.getElementById('log-loading').style.display = 'block';
    document.getElementById('log-error').style.display = 'none';
    var navItems = document.getElementById('nav-items');
    var tabs = document.getElementById('tabs');
    var showEditor = (envUpResponse.editorUrl && envUpResponse.editorUrl.length > 0);
    if (showEditor) {
      // add nav item for editor
      var navItem = app.getNavItem("editor", 'Edit');
      navItems.appendChild(navItem);
      app.iframeNavItems['editor-iframe'] = navItem;
      app.addedNavItems.push(navItem);
      // add tab for editor
      var tab = app.getTab('editor', 'editor-iframe');
      tabs.appendChild(tab);
      app.addedTabs.push(tab);
    }
    for (var i = 0; i < envUpResponse.tabs.length; i++) {
      var tabId = 'proxy' + i;
      var iframeId = 'proxy' + i + '-iframe';
      // add nav item
      navItem = app.getNavItem(tabId, envUpResponse.tabs[i].name + '');
      navItems.appendChild(navItem);
      app.iframeNavItems[iframeId] = navItem;
      app.addedNavItems.push(navItem);
      // add tab
      tab = app.getTab(tabId, iframeId);
      tabs.appendChild(tab);
      app.addedTabs.push(tab);
      // queue iframe
      app.queueIFrame(document.getElementById(iframeId), envUpResponse.tabs[i].url, app.pendingIFrameSleepTimeMillis);
    }
    // deploy to bluemix
    // if (envUpResponse.deployToBluemix) {
    //     var tabId = 'deploy';
    //     // add nav item
    //     navItem = app.getNavItem(tabId,'Deploy');
    //     navItems.appendChild(navItem);
    //     app.addedNavItems.push(navItem);
    //     // add tab
    //     var img = document.createElement('img');
    //     img.setAttribute('src', 'https://bluemix.net/deploy/button.png');
    //     img.setAttribute('alt', 'Deploy to Bluemix');
    //     var anchor = document.createElement('a');
    //     anchor.setAttribute('href', 'https://bluemix.net/deploy?repository=' + encodeURIComponent(app.repo));
    //     anchor.setAttribute('target', '_blank');
    //     anchor.appendChild(img);
    //     var tabs = document.getElementById('tabs');
    //     var tab = app.getTabWithChild(tabId, anchor);
    //     tabs.appendChild(tab);
    //     app.addedTabs.push(tab);
    // }
    // queue log and editor (if enabled)
    app.queueIFrame(document.getElementById('log-iframe'), envUpResponse.logUrl, app.pendingIFrameSleepTimeMillis);
    if (showEditor) {
      app.queueIFrame(document.getElementById('editor-iframe'), envUpResponse.editorUrl, app.pendingIFrameSleepTimeMillis);
    }
  },

  enableTabs: function () {
    document.getElementById('repo-btn').disabled = false;
  },

  clearAndDisableTabs: function () {
    document.getElementById('log-iframe').src = 'about:blank';
    document.getElementById('repo-btn').disabled = true;
    app.updateUIRepo(app.repo);
    app.iframeNavItems = {};
    if (app.addedTabs.length > 0) {
      var tabs = document.getElementById('tabs');
      for (var i = 0; i < app.addedTabs.length; i++) {
        tabs.removeChild(app.addedTabs[i]);
      }
      app.addedTabs = [];
    }
    if (app.addedNavItems.length > 0) {
      var navItems = document.getElementById('nav-items');
      for (var i = 0; i < app.addedNavItems.length; i++) {
        navItems.removeChild(app.addedNavItems[i]);
      }
      app.addedNavItems = [];
    }
  },

  info: function () {
    // make request to server
    var request = new XMLHttpRequest();
    var json = JSON.stringify({
      repo: app.repo
    });
    request.onload = function () {
      if (this.status >= 200 && this.status < 400) {
        var infoResponse = JSON.parse(this.responseText);
        if (infoResponse && infoResponse.env && infoResponse.env.vars && infoResponse.env.vars.length > 0) {
          app.env = infoResponse.env;
          app.showInfoModal();
        }
        else {
          app.up();
        }
      }
      else {
        // mw:TODO:
        console.log('ERROR');
      }
    };
    request.open('POST', app.apiUrl + '/api/info', true);
    request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    request.send(json);
  },

  showInfoModal : function() {
    var html = '';
    html += '<div id="nav-env-modal" class="modal fade">';
    html += '<div class="modal-dialog" role="document">';
    html += '<div class="modal-content">';
    html += '<div class="modal-header">';
    html += '<h5 class="modal-title">Set Environment Variables</h5>';
    html += '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
    html += '</div>';
    html += '<div class="modal-body">';
    html += '<form id="nav-env-modal-form">';
    for (var i=0; i<app.env.vars.length; i++) {
      html += '<div class="form-group">';
      html += '<label for="example-text-input" class="col-2 col-form-label">' + app.env.vars[i].name + '</label>';
      html += '</div">';
      html += '<div class="form-group">';
      html += '<input class="form-control" type="text" value="' + app.env.vars[i].defaultValue + '" id="nav-env-modal-text' + i + '">';
      html += '</div>';
      html += '</div>';
    }
    html += '</form>';
    html += '</div>';
    html += '<div class="modal-footer">';
    html += '<button type="button" class="btn btn-primary" onclick="app.upWithEnvVars();">Run</button>';
    html += '<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    document.getElementById('nav-env-modal-container').innerHTML = html;
    $("#nav-env-modal").modal();
  },

  upWithEnvVars() {
    $('#nav-env-modal').modal('hide');
    var envVars = {};
    for (var i=0; i<app.env.vars.length; i++) {
      envVars[app.env.vars[i].name] = document.getElementById('nav-env-modal-text' + i).value;
    }
    app.up(envVars);
  },

  up: function (envVars) {
    app.clearAndDisableTabs();
    // update status
    document.getElementById('log-loading').textContent = "Preparing your environment...please wait...";
    document.getElementById('log-loading').style.display = 'block';
    document.getElementById('log-error').style.display = 'none';
    // make request to server
    var request = new XMLHttpRequest();
    var json = JSON.stringify({
      claimToken: app.claimToken,
      repo: app.repo,
      envVars: envVars
    });
    request.onload = function () {
      document.getElementById('repo-btn').disabled = false;
      if (this.status >= 200 && this.status < 400) {
        var envUpResponse = JSON.parse(this.responseText);
        app.processEnvUpResponse(envUpResponse);
      }
      else {
        document.getElementById('log-loading').style.display = 'none';
        document.getElementById('log-error').style.display = 'block';
        console.log('Error deploying repo.');
      }
    };
    request.open('POST', app.apiUrl + '/api/up', true);
    request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    request.send(json);
  },

  ping: function (callback) {
    var request = new XMLHttpRequest();
    var json = JSON.stringify({claimToken: app.claimToken, getEnvDetails: true});
    request.onload = function () {
      if (this.status >= 200 && this.status < 400) {
        var pingResponse = JSON.parse(this.responseText);
        if (!pingResponse.claimGranted) {
          app.claimGranted = false;
          app.claimToken = null;
          app.onClaimGrantedChanged();
          return app.claim(callback);
        }
        else {
          if (!app.claimGranted) {
            app.claimGranted = true;
            app.onClaimGrantedChanged();
          }
          if (pingResponse.envDetails && !app.requestedRepo && pingResponse.repo != app.repo) {
            app.repo = pingResponse.repo;
            app.clearAndDisableTabs();
            app.updateUIRepo(app.repo);
            app.processEnvUpResponse(pingResponse.envDetails);
          }
        }
      }
      else {
        console.log('Error pinging server.');
      }
      callback();
    };
    request.open('POST', app.apiUrl + '/api/ping', true);
    request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    request.send(json);
  },

  claim: function (callback) {
    var request = new XMLHttpRequest();
    var json = JSON.stringify({authorization: 'TODO'});
    request.onload = function () {
      if (this.status >= 200 && this.status < 400) {
        var claimResponse = JSON.parse(this.responseText);
        if (claimResponse.claimGranted) {
          app.claimGranted = true;
          app.claimToken = claimResponse.claimToken;
          app.onClaimGrantedChanged();
        }
        else {
          console.log('Claim rejected: ' + claimResponse.message);
          app.updateUIOnClaimGrantedChange();
        }
      }
      else {
        console.log('Error pinging server.');
      }
      callback();
    };
    request.open('POST', app.apiUrl + '/api/claim', true);
    request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    request.send(json);
  },

  loadWhitelist: function (callback) {
    var request = new XMLHttpRequest();
    request.onload = function () {
      if (this.status >= 200 && this.status < 400) {
        var whitelistResponse = JSON.parse(this.responseText);
        if (whitelistResponse.repos && whitelistResponse.repos.length > 0) {
          app.whitelistRepos = whitelistResponse.repos;
        }
        else {
          app.whitelistRepos = undefined;
        }
        app.updateUIOnWhitelistChange();
      }
      else {
        console.log('Error getting whitelist.');
      }
      callback();
    };
    request.open('GET', app.apiUrl + '/api/whitelist', true);
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
    // warn when leaving
    window.onbeforeunload = function () {
      return true;
    };
    // fix api url
    if (app.apiUrl.startsWith('$')) {
      api = app.getParameterByName('api');
      if (api) {
        app.apiUrl = api;
      }
      else {
        app.apiUrl = 'http://localhost:8080';
      }
    }
    // get repo from query string
    app.requestedRepo = app.getParameterByName('repo');
    // get claimToken
    var claimToken = app.getParameterByName('token');
    if (claimToken && claimToken.length > 0) {
      app.claimToken = claimToken;
    }
    if (!app.claimToken && typeof(Storage) !== 'undefined') {
      app.claimToken = localStorage.getItem('claimToken');
    }
    // wire up events
    document.getElementById('repo-input').addEventListener('keypress', function (e) {
      if (e.keyCode === 13) {
        e.preventDefault();
        app.repo = document.getElementById('repo-input').value;
        app.up();
      }
    });
    document.getElementById('repo-btn').addEventListener('click', function () {
      if (app.whitelistRepos) {
        app.repo = document.getElementById('repo-select').value;
      }
      else {
        app.repo = document.getElementById('repo-input').value;
      }
      app.info();
    });
    // periodically ping the server to signal that we are still alive
    // server will tear down any pods for users not actively running
    app.onTimer();
  },

  onClaimGrantedChanged: function () {
    if (app.claimGranted) {
      if (typeof(Storage) !== 'undefined') {
        localStorage.setItem('claimToken', app.claimToken);
      }
      app.loadWhitelist(function () {
        // check if repo supplied in url and automatically load
        if (app.requestedRepo && app.requestedRepo.length > 0) {
          if (!app.whitelistRepos || app.whitelistRepos.indexOf(app.requestedRepo) >= 0) {
            app.repo = app.requestedRepo;
            app.requestedRepo = undefined;
            app.updateUIRepo(app.repo);
            app.up();
          }
        }
      })
    }
    else {
      app.claimToken = null;
      if (typeof(Storage) !== 'undefined') {
        localStorage.removeItem('claimToken');
      }
    }
    app.updateUIOnClaimGrantedChange();
  },

  updateUIRepo: function (repo) {
    if (app.whitelistRepos) {
      var index = app.whitelistRepos.indexOf(repo);
      if (index >= 0) {
        document.getElementById('repo-select').selectedIndex = index;
      }
    }
    else {
      document.getElementById('repo-input').value = repo;
    }
  },

  updateUIOnWhitelistChange: function () {
    if (app.whitelistRepos) {
      document.getElementById('repo-input').style.display = 'none';
      document.getElementById('repo-select').style.display = 'block';
      var select = document.getElementById("repo-select");
      for (var i = select.options.length - 1; i >= 0; i--) {
        select.remove(i);
      }
      for (var i = 0; i < app.whitelistRepos.length; i++) {
        var option = document.createElement("option");
        option.text = app.whitelistRepos[i];
        select.add(option);
      }
    }
    else {
      document.getElementById('repo-select').style.display = 'none';
      document.getElementById('repo-input').style.display = 'block';
    }
  },

  updateUIOnClaimGrantedChange: function () {
    if (app.claimGranted) {
      app.enableTabs();
      document.getElementById('claim-container').style.display = 'none';
      document.getElementById('tab-container').style.display = 'block';
    }
    else {
      app.clearAndDisableTabs();
      document.getElementById('tab-container').style.display = 'none';
      document.getElementById('claim-container').style.display = 'block';
    }
  },

  onTimer: function () {
    if (!app.claimToken && !app.claimGranted) {
      app.claim(function () {
        setTimeout(app.onTimer, app.claimTimeMillis);
      });
    }
    else {
      app.ping(function () {
        setTimeout(app.onTimer, app.pingTimeMillis);
      });
    }
  }
};

(function () {
  app.init();
})();