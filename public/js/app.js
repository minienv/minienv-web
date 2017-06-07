var app = {

    userId: null,
    repo: undefined,
    pingTimeMillis: 30000,
    pendingIFrameSleepTimeMillis: 100,
    pendingIFrames : {},
    pendingIFrameTimer: null,
    pendingIFrameTimeMillis: 5000,
    pendingIFrameTimeoutMillis: 10000,
    addedNavItems: [],
    addedTabs: [],

    processPendingIFrames: function() {
        var keys = Object.keys(app.pendingIFrames);
        var pending = keys.length;
        for (var i=0; i<keys.length; i++) {
            iframeMeta = app.pendingIFrames[keys[i]];
            if ((Date.now()-iframeMeta.date) > app.pendingIFrameTimeoutMillis) {
                pending--;
                delete app.pendingIFrames[keys[i]];
                app.abortAndQueueIFrame(iframeMeta.request, iframeMeta.iframe, keys[i], 0);
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
        app.pendingIFrames[src] = {request: request, iframe: iframe, date: Date.now()};
        if (! app.pendingIFrameTimer) {
            app.pendingIFrameTimer = setTimeout(app.processPendingIFrames, app.pendingIFrameTimeMillis);
        }
        request.onload = function () {
            if (this.status >= 200 && this.status < 400) {
                console.log(Date.now() + ': ' + src + ' loaded.');
                delete app.pendingIFrames[src];
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
        var div = document.createElement('div');
        div.id = tabId;
        div.setAttribute('class', 'tab-pane');
        div.setAttribute('role', 'tabpanel');
        div.appendChild(iframe);
        return div;
    },

    processUpResponse: function(upResponse) {
        // add nav item for editor
        var navItems = document.getElementById('nav-items');
        var navItem = app.getListItem("editor",'Editor');
        navItems.appendChild(navItem);
        app.addedNavItems.push(navItem);
        // add tab for editor
        var tabs = document.getElementById('tabs');
        var tab = app.getTab('editor','editor-iframe');
        tabs.appendChild(tab);
        app.addedTabs.push(tab);
        for (var i = 0; i < upResponse.dockerComposeUrls.length; i++) {
            var tabId = 'proxy' + i;
            var iframeId = 'proxy' + i + '-iframe';
            // add nav item
            navItem = app.getListItem(tabId,upResponse.dockerComposeNames[i]+'');
            navItems.appendChild(navItem);
            app.addedNavItems.push(navItem);
            // add tab
            tab = app.getTab(tabId, iframeId);
            tabs.appendChild(tab);
            app.addedTabs.push(tab);
            // queue iframe
            app.queueIFrame(document.getElementById(iframeId), upResponse.dockerComposeUrls[i], app.pendingIFrameSleepTimeMillis);
        }
        app.queueIFrame(document.getElementById('editor-iframe'), upResponse.editorUrl, app.pendingIFrameSleepTimeMillis);
        app.queueIFrame(document.getElementById('log-iframe'), upResponse.logUrl, app.pendingIFrameSleepTimeMillis);
    },

    up: function () {
        // reset ui
        document.getElementById('log-iframe').src = 'about:blank';
        document.getElementById('repo-btn').disabled = true;
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
        // make request to server
        var request = new XMLHttpRequest();
        var json = JSON.stringify({
            userId: app.userId,
            repo: app.repo
        });
        request.onload = function () {
            document.getElementById('repo-btn').disabled = false;
            if (this.status >= 200 && this.status < 400) {
                document.getElementById('log-iframe').contentWindow.document.write("<html><body style='font-family: -apple-system,system-ui,BlinkMacSystemFont,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif' font-size: 11pt;'><pre>Please wait...this may take a minute or two...</pre></body></html>");
                var upResponse = JSON.parse(this.responseText);
                app.processUpResponse(upResponse);
            }
            else {
                document.getElementById('log-iframe').contentWindow.document.write("<html><body style='font-family: -apple-system,system-ui,BlinkMacSystemFont,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif' font-size: 11pt;'><pre>Error deploying repo. Please try again...</pre></body></html>");
                console.log('Error deploying repo.');
            }
        };
        request.open('POST', '/api/up', true);
        request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        request.send(json);
    },

    ping: function () {
        var request = new XMLHttpRequest();
        var json = JSON.stringify({userId: app.userId});
        request.onload = function () {
            if (this.status >= 200 && this.status < 400) {
                // ok
            }
            else {
                console.log('Error pinging server.');
            }
        };
        request.open('POST', '/api/ping', true);
        request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        request.send(json);
    },

    generateUniqueId: function (len) {
        var ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var id = '';
        for (var i = 0; i < len; i++) {
            id += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
        }
        return id;
    },

    init: function () {
        // get userId
        if (typeof(Storage) !== 'undefined') {
            app.userId = localStorage.getItem('userId');
        }
        if (!app.userId) {
            app.userId = app.generateUniqueId(8);
            if (typeof(Storage) !== 'undefined') {
                localStorage.setItem('userId', app.userId);
            }
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
        setTimeout(app.onTimer, app.pingTimeMillis);
    },

    onTimer: function () {
        app.ping();
        setTimeout(app.onTimer, app.pingTimeMillis);
    }
};

(function() {
    app.init();
})();