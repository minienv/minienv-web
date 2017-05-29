var app = {

    userId: null,
    repo: undefined,
    pingTimeMillis: 30000,

    up: function () {
        var request = new XMLHttpRequest();
        var json = JSON.stringify({
            userId: app.userId,
            repo: app.repo
        });
        request.onload = function () {
            if (this.status >= 200 && this.status < 400) {
                var upResponse = JSON.parse(this.responseText);
                var dcIframeContainer = document.getElementById("dc-iframe-container");
                while (dcIframeContainer.firstChild) {
                    dcIframeContainer.removeChild(dcIframeContainer.firstChild);
                }
                var dcIframeIds = [];
                var dcIFrameSizes = [];
                for (var i = 0; i < upResponse.dockerComposeUrls.length; i++) {
                    var iframe = document.createElement("iframe");
                    iframe.id = "dc-iframe-" + i;
                    iframe.style.width = "100%";
                    iframe.style.border = "0px";
                    iframe.src = upResponse.dockerComposeUrls[i];
                    dcIframeContainer.appendChild(iframe);
                    dcIframeIds.push('#' + iframe.id);
                    dcIFrameSizes.push(100/upResponse.dockerComposeUrls.length);
                }
                Split(dcIframeIds, {
                    direction: 'vertical',
                    sizes: dcIFrameSizes
                });
                document.getElementById("editor-iframe").src = upResponse.editorUrl;
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
        if (typeof(Storage) !== "undefined") {
            app.userId = localStorage.getItem("userId");
        }
        if (!app.userId) {
            app.userId = app.generateUniqueId(8);
            if (typeof(Storage) !== "undefined") {
                localStorage.setItem("userId", app.userId);
            }
        }
        // wire up events
        document.getElementById('repo-input-text').addEventListener("keypress", function(e) {
            if (e.keyCode === 13) {
                e.preventDefault();
                app.repo = document.getElementById("repo-input-text").value;
                app.up();
            }
        });
        document.getElementById("repo-btn").addEventListener("click", function() {
            app.repo = document.getElementById("repo-input-text").value;
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