var app = {

  me: null,
  sessionId: null,
  claimGranted: false,
  claimToken: null,
  repo: '',
  branch: '',
  selectedRepo: '',
  selectedBranch: '',
  requestedRepo: undefined,
  requestedBranch: undefined,
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
    app.updateUIRepo(app.repo, app.branch);
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
    var request = new XMLHttpRequest();
    var json = JSON.stringify({
      repo: app.selectedRepo,
      branch: app.selectedBranch
    });
    request.onload = function () {
      if (this.status >= 200 && this.status < 400) {
        var infoResponse = JSON.parse(this.responseText);
        if (infoResponse && infoResponse.env && infoResponse.env.vars && infoResponse.env.vars.length > 0) {
          app.env = infoResponse.env;
          app.showInfoModal();
        }
        else {
          app.repo = app.selectedRepo;
          app.branch = app.selectedBranch;
          app.up();
        }
      }
      else {
        // mw:TODO:
        console.log('ERROR');
      }
    };
    request.open('POST', consts.apiUrl + '/info', true);
    request.setRequestHeader('Minienv-Session-Id', app.sessionId);
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

  getMe: function(callback) {
    var request = new XMLHttpRequest();
    request.onload = function () {
      if (this.status >= 200 && this.status < 400) {
        app.me = JSON.parse(this.responseText);
        app.sessionId = app.me.sessionId;
        utils.saveToLocalStorage('sessionId', app.sessionId);
        callback();
      }
      else {
        callback('Error getting me.');
      }
    };
    request.open('GET', consts.apiUrl + '/me', true);
    request.setRequestHeader('Minienv-Session-Id', app.sessionId);
    request.send();
  },

  upWithEnvVars() {
    $('#nav-env-modal').modal('hide');
    var envVars = {};
    for (var i=0; i<app.env.vars.length; i++) {
      envVars[app.env.vars[i].name] = document.getElementById('nav-env-modal-text' + i).value;
    }
    app.repo = app.selectedRepo;
    app.branch = app.selectedBranch;
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
      branch: app.branch,
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
    request.open('POST', consts.apiUrl + '/up', true);
    request.setRequestHeader('Minienv-Session-Id', app.sessionId);
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
          if (pingResponse.envDetails && !app.requestedRepo && pingResponse.repo != app.repo && pingResponse.branch != app.branch) {
            app.repo = pingResponse.repo;
            app.branch = pingResponse.branch;
            app.clearAndDisableTabs();
            app.updateUIRepo(app.repo, app.branch);
            app.processEnvUpResponse(pingResponse.envDetails);
          }
        }
      }
      else {
        console.log('Error pinging server.');
      }
      callback();
    };
    request.open('POST', consts.apiUrl + '/ping', true);
    request.setRequestHeader('Minienv-Session-Id', app.sessionId);
    request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    request.send(json);
  },

  claim: function (callback) {
    var request = new XMLHttpRequest();
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
    request.open('POST', consts.apiUrl + '/claim', true);
    request.setRequestHeader('Minienv-Session-Id', app.sessionId);
    request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    request.send('{}');
  },

  onClaimGrantedChanged: function () {
    if (app.claimGranted) {
      utils.saveToLocalStorage('claimToken', app.claimToken);
      // check if repo supplied in url and automatically load
      if (app.requestedRepo && app.requestedRepo.length > 0) {
        if (!whitelist.repos || whitelist.repos.contains(app.requestedRepo, app.requestedBranch)) {
          app.repo = app.requestedRepo;
          app.branch = app.requestedBranch;
          app.requestedRepo = undefined;
          app.requestedBranch = undefined;
          app.updateUIRepo(app.repo, app.branch);
          app.up();
        }
      }
    }
    else {
      app.claimToken = null;
      utils.removeFromLocalStorage('claimToken');
    }
    app.updateUIOnClaimGrantedChange();
  },

  updateUIRepo: function(repo, branch) {
    if (whitelist.repos) {
      var index = whitelist.repos.indexOf(repo, branch);
      if (index >= 0) {
        document.getElementById('repo-select').selectedIndex = index;
      }
    }
    else {
      document.getElementById('repo-input').value = repo;
    }
  },

  updateUIOnWhitelistChange: function () {
    if (whitelist.repos) {
      document.getElementById('repo-input').style.display = 'none';
      document.getElementById('repo-select').style.display = 'block';
      var select = document.getElementById("repo-select");
      for (var i = select.options.length - 1; i >= 0; i--) {
        select.options.remove(i);
      }
      whitelist.repos.forEach(function(repo, i) {
        var option = document.createElement("option");
        option.text = repo.name;
        option.value = i+"";
        select.add(option);
      });
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

  init: function () {
    // warn when leaving
    window.onbeforeunload = function () {
      return true;
    };
    app.sessionId = utils.getFromLocalStorage('sessionId');
    app.requestedRepo = utils.getParameterByName('repo');
    app.requestedBranch = utils.getParameterByName('branch');
    app.claimToken = utils.getParameterByName('token') || utils.getFromLocalStorage('claimToken');
    // wire up events
    document.getElementById('repo-input').addEventListener('keypress', function (e) {
      if (e.keyCode === 13) {
        e.preventDefault();
        app.selectedRepo = document.getElementById('repo-input').value;
        app.selectedBranch = '';
        app.info();
      }
    });
    document.getElementById('repo-btn').addEventListener('click', function () {
      if (whitelist.repos) {
        var whitelistRepo = whitelist.repos.get(parseInt(document.getElementById('repo-select').value));
        app.selectedRepo = whitelistRepo.url;
        app.selectedBranch = whitelistRepo.branch;
      }
      else {
        app.selectedRepo = document.getElementById('repo-input').value;
        app.selectedBranch = '';
      }
      app.info();
    });
    // periodically ping the server to signal that we are still alive
    // server will tear down any pods for users not actively running
    app.onTimer();
  },

  onTimer: function () {
    if (! app.me) {
      return app.getMe(function(err) {
        if (! err && ! app.me.authenticated) {
          var state = Math.random().toString(36).substring(2); // random string
          var url = 'https://github.com/login/oauth/authorize?scope=user:email,read:org,repo,&client_id=';
          url += encodeURIComponent(consts.githubClientId);
          url += "&state=";
          url += encodeURIComponent(state);
          utils.saveToLocalStorage('githubAuthRedirectUrl', document.location.href);
          utils.saveToLocalStorage('githubAuthState', state);
          document.location.href = url;
        }
        else {
          app.onTimer();
        }
      });
    }
    if (!whitelist.loaded) {
      return whitelist.load(app.sessionId, function(err) {
        if (err) {
          // mw:TODO
          console.log(err);
          setTimeout(app.onTimer, app.claimTimeMillis);
        }
        else {
          app.updateUIOnWhitelistChange();
          app.onTimer();
        }
      });
    }
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