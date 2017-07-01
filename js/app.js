var app = {

    apiUrl: '$apiUrl',
    claimGranted: false,
    claimToken: null,
    repo: '',
	requestedRepo: undefined,
	claimTimeMillis: 5000,
    pingTimeMillis: 15000,
    pendingIFrameSleepTimeMillis: 100,
    pendingIFrames : [],
    pendingIFrameTimer: null,
    pendingIFrameTimeMillis: 5000,
    pendingIFrameTimeoutMillis: 10000,
    addedNavItems: [],
    addedTabs: [],

    processPendingIFrames: function() {
        var pending = app.pendingIFrames.length;
        for (var i=app.pendingIFrames.length-1; i>=0; i--) {
            var pendingIFrame = app.pendingIFrames[i];
            if ((Date.now()-pendingIFrame.date) > app.pendingIFrameTimeoutMillis) {
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

    loadIFrame: function(iframe, src) {
        console.log(Date.now() + ': Loading ' + src);
        var request = new XMLHttpRequest();
        var pendingIFrame = {request: request, iframe: iframe, src: src, date: Date.now()};
        app.pendingIFrames.push(pendingIFrame);
        if (! app.pendingIFrameTimer) {
            app.pendingIFrameTimer = setTimeout(app.processPendingIFrames, app.pendingIFrameTimeMillis);
        }
        request.onload = function () {
            if (this.status >= 200 && this.status < 400) {
                console.log(Date.now() + ': ' + src + ' loaded.');
				app.pendingIFrames.splice(app.pendingIFrames.indexOf(pendingIFrame), 1);
                setTimeout(function() {
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

    abortAndQueueIFrame: function(request, iframe, src, timeout) {
        setTimeout(function() {
            if (request) {
                try {
                    console.log('Aborting ' + src + '...');
                    request.abort();
                }
                catch(err) {
                    console.log('Error aborting ' + src + ': ' + err);
                }
            }
            app.loadIFrame(iframe, src);
        }, timeout);
    },

    queueIFrame: function(iframe, src, timeout) {
        setTimeout(function() {
            app.loadIFrame(iframe, src);
        }, timeout);
    },

    getListItem: function(id, title) {
        var anchorText = document.createTextNode(title);
        var anchor = document.createElement('a');
        anchor.setAttribute('class', 'nav-link');
        anchor.setAttribute('data-toggle', 'tab');
        anchor.setAttribute('href', '#'+id);
        anchor.setAttribute('role', 'tab');
        anchor.appendChild(anchorText);
        var listItem = document.createElement('li');
        listItem.setAttribute('class', 'nav-item');
        listItem.appendChild(anchor);
        return listItem;
    },

    getTab: function(tabId, iframeId) {
        var iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.padding = '10px';
        iframe.style.border = '0px';
        return app.getTabWithChild(tabId, iframe);
    },

    getTabWithChild: function(tabId, child) {
        var div = document.createElement('div');
        div.id = tabId;
        div.setAttribute('class', 'tab-pane');
        div.setAttribute('role', 'tabpanel');
        div.appendChild(child);
        return div;
    },

    processUpResponse: function(upResponse) {
        document.getElementById('repo-btn').disabled = false;
        document.getElementById('log-iframe').contentWindow.document.write("<html><body style='font-family: -apple-system,system-ui,BlinkMacSystemFont,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif' font-size: 11pt;'><pre>Please wait...this may take a minute or two...</pre></body></html>");
		var navItems = document.getElementById('nav-items');
		var tabs = document.getElementById('tabs');
		var showEditor = (upResponse.editorUrl && upResponse.editorUrl.length > 0);
        if (showEditor) {
			// add nav item for editor
			var navItem = app.getListItem("editor", 'Editor');
			navItems.appendChild(navItem);
			app.addedNavItems.push(navItem);
			// add tab for editor
			var tab = app.getTab('editor', 'editor-iframe');
			tabs.appendChild(tab);
			app.addedTabs.push(tab);
		}
        for (var i = 0; i < upResponse.tabs.length; i++) {
            var tabId = 'proxy' + i;
            var iframeId = 'proxy' + i + '-iframe';
            // add nav item
            navItem = app.getListItem(tabId,upResponse.tabs[i].name+'');
            navItems.appendChild(navItem);
            app.addedNavItems.push(navItem);
            // add tab
            tab = app.getTab(tabId, iframeId);
            tabs.appendChild(tab);
            app.addedTabs.push(tab);
            // queue iframe
            app.queueIFrame(document.getElementById(iframeId), upResponse.tabs[i].url, app.pendingIFrameSleepTimeMillis);
        }
        // deploy to bluemix
        if (upResponse.deployToBluemix) {
            var tabId = 'deploy';
            // add nav item
            navItem = app.getListItem(tabId,'Deploy');
            navItems.appendChild(navItem);
            app.addedNavItems.push(navItem);
            // add tab
            var img = document.createElement('img');
            img.setAttribute('src', 'https://bluemix.net/deploy/button.png');
            img.setAttribute('alt', 'Deploy to Bluemix');
            var anchor = document.createElement('a');
            anchor.setAttribute('href', 'https://bluemix.net/deploy?repository=' + encodeURIComponent(app.repo));
            anchor.setAttribute('target', '_blank');
            anchor.appendChild(img);
            var tabs = document.getElementById('tabs');
            var tab = app.getTabWithChild(tabId, anchor);
            tabs.appendChild(tab);
            app.addedTabs.push(tab);
        }
        // queue log and editor (if enabled)
		app.queueIFrame(document.getElementById('log-iframe'), upResponse.logUrl, app.pendingIFrameSleepTimeMillis);
        if (showEditor) {
			app.queueIFrame(document.getElementById('editor-iframe'), upResponse.editorUrl, app.pendingIFrameSleepTimeMillis);
		}
    },

	enableTabs: function() {
		document.getElementById('repo-btn').disabled = false;
	},

    clearAndDisableTabs: function() {
        document.getElementById('log-iframe').src = 'about:blank';
        document.getElementById('repo-btn').disabled = true;
		document.getElementById('repo-input').value = app.repo;
		if (app.addedTabs.length > 0) {
            var tabs = document.getElementById('tabs');
            for (var i=0; i<app.addedTabs.length; i++) {
                tabs.removeChild(app.addedTabs[i]);
            }
            app.addedTabs = [];
        }
        if (app.addedNavItems.length > 0) {
            var navItems = document.getElementById('nav-items');
            for (var i=0; i<app.addedNavItems.length; i++) {
                navItems.removeChild(app.addedNavItems[i]);
            }
            app.addedNavItems = [];
        }
    },

    up: function() {
        app.clearAndDisableTabs();
        // make request to server
        var request = new XMLHttpRequest();
        var json = JSON.stringify({
            claimToken: app.claimToken,
            repo: app.repo
        });
        request.onload = function() {
            document.getElementById('repo-btn').disabled = false;
            if (this.status >= 200 && this.status < 400) {
                var upResponse = JSON.parse(this.responseText);
                app.processUpResponse(upResponse);
            }
            else {
                document.getElementById('log-iframe').contentWindow.document.write("<html><body style='font-family: -apple-system,system-ui,BlinkMacSystemFont,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif' font-size: 11pt;'><pre>Error deploying repo. Please try again...</pre></body></html>");
                console.log('Error deploying repo.');
            }
        };
        request.open('POST', app.apiUrl + '/api/up', true);
        request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        request.send(json);
    },

    ping: function(callback) {
        var request = new XMLHttpRequest();
        var json = JSON.stringify({claimToken: app.claimToken, getUpDetails: ! app.repo});
        request.onload = function() {
            if (this.status >= 200 && this.status < 400) {
                var pingResponse = JSON.parse(this.responseText);
                if (! pingResponse.claimGranted) {
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
					else if (pingResponse.upDetails) {
						app.repo = pingResponse.upDetails.repo;
						app.clearAndDisableTabs();
						document.getElementById('repo-input').value = app.repo;
						app.processUpResponse(pingResponse.upDetails);
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

	claim: function(callback) {
		var request = new XMLHttpRequest();
		var json = JSON.stringify({authorization: 'TODO'});
		request.onload = function() {
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

    getParameterByName: function(name, url) {
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

    init: function() {
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
        document.getElementById('repo-input').addEventListener('keypress', function(e) {
            if (e.keyCode === 13) {
                e.preventDefault();
                app.repo = document.getElementById('repo-input').value;
                app.up();
            }
        });
        document.getElementById('repo-btn').addEventListener('click', function() {
            app.repo = document.getElementById('repo-input').value;
            app.up();
        });
        // periodically ping the server to signal that we are still alive
        // server will tear down any pods for users not actively running
        app.onTimer();
	},

    onClaimGrantedChanged: function() {
        if (app.claimGranted) {
			if (typeof(Storage) !== 'undefined') {
				localStorage.setItem('claimToken', app.claimToken);
			}
			// check if repo supplied in url and automatically load
			if (app.requestedRepo && app.requestedRepo.length > 0) {
				document.getElementById('repo-input').value = repo;
				app.repo = app.requestedRepo;
				app.requestedRepo = undefined;
				app.up();
			}
        }
        else {
			app.claimToken = null;
			if (typeof(Storage) !== 'undefined') {
				localStorage.removeItem('claimToken');
			}
        }
		app.updateUIOnClaimGrantedChange();
	},

    updateUIOnClaimGrantedChange: function() {
        if (app.claimGranted) {
			app.enableTabs();
			document.getElementById('claim-container').style.visibility = 'hidden';
			document.getElementById('tab-container').style.visibility = 'visible';
        }
        else {
        	app.clearAndDisableTabs();
			document.getElementById('tab-container').style.visibility = 'hidden';
			document.getElementById('claim-container').style.visibility = 'visible';
		}
    },

    onTimer: function() {
        if (! app.claimToken && ! app.claimGranted) {
            app.claim(function() {
				setTimeout(app.onTimer, app.claimTimeMillis);
            });
        }
        else {
			app.ping(function() {
				setTimeout(app.onTimer, app.pingTimeMillis);
			});
		}
    }
};

(function() {
    app.init();
})();