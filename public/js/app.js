var app = {

    userId: null,
    repo: undefined,
    pingTimeMillis: 30000,
    pendingIFrameSleepTimeMillis: 100,
    pendingIFrames : {},
    pendingIFrameTimer: null,
    pendingIFrameTimeMillis: 5000,
    pendingIFrameTimeoutMillis: 10000,

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

    // loadIFrame: function(iframe, src) {
    //     app.pendingIFrames[src] = {iframe: iframe, date: Date.now()};
    //     iframe.onload = function() {
    //         delete app.pendingIFrames[src];
    //     };
    //     setTimeout(function() {
    //         if (! app.pendingIFrameTimer) {
    //             app.pendingIFrameTimer = setTimeout(app.processPendingIFrames, app.pendingIFrameTimeMillis);
    //         }
    //         try {
    //             iframe.src = src;
    //         }
    //         catch(err) {
    //             console.log('Error loading ' + src + ': ' + err);
    //         }
    //     }, 0);
    // },

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


    up: function () {
        var request = new XMLHttpRequest();
        var json = JSON.stringify({
            userId: app.userId,
            repo: app.repo
        });
        request.onload = function () {
            if (this.status >= 200 && this.status < 400) {
                var upResponse = JSON.parse(this.responseText);
                var dcIframeContainer = document.getElementById('dc-iframe-container');
                while (dcIframeContainer.firstChild) {
                    dcIframeContainer.removeChild(dcIframeContainer.firstChild);
                }
                var dcIFrames = []
                var dcIframeIds = [];
                var dcIFrameSizes = [];
                for (var i = 0; i < upResponse.dockerComposeUrls.length; i++) {
                    var iframe = document.createElement('iframe');
                    iframe.id = 'dc-iframe-' + i;
                    iframe.style.width = '100%';
                    iframe.style.border = '0px';
                    app.queueIFrame(iframe, upResponse.dockerComposeUrls[i], app.pendingIFrameSleepTimeMillis);
                    dcIframeContainer.appendChild(iframe);
                    dcIFrames.push(iframe);
                    dcIframeIds.push('#' + iframe.id);
                    dcIFrameSizes.push(100/upResponse.dockerComposeUrls.length);
                }
                Split(dcIframeIds, {
                    direction: 'vertical',
                    sizes: dcIFrameSizes
                });
                app.queueIFrame(document.getElementById('editor-iframe'), upResponse.editorUrl, app.pendingIFrameSleepTimeMillis);
            }
            else {
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
        document.getElementById('repo-input-text').addEventListener('keypress', function(e) {
            if (e.keyCode === 13) {
                e.preventDefault();
                app.repo = document.getElementById('repo-input-text').value;
                app.up();
            }
        });
        document.getElementById('repo-btn').addEventListener('click', function() {
            app.repo = document.getElementById('repo-input-text').value;
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