define(["event"], function(Event) {
  var Online = function Online() {
    this.init();
  };

  Online.prototype = {
    _online: null,

    _script: null,

    _retryDelay: 3 * 1000,

    init: function() {
      this._online = false;

      this._script = document.getElementById("gapiScript");

      window.addEventListener("online", this._onlineEvent.bind(this));
      window.addEventListener("offline", this._offlineEvent.bind(this));
    },

    gapiLoaded: function() {
      console.log("Gapi loaded");
      gapi.load('auth:client,drive-realtime,drive-share', (function() {
        this._setStatus(true);
      }).bind(this));
    },

    gapiLoadError: function() {
      console.warn("Failed to load gapi");
      this._setStatus(false);
      // set a reconnect timer, but only if navigator.online
      window.setTimeout(this._retryScript.bind(this), this._retryDelay);
    },

    isOnline: function() {
      return this._online;
    },

    _retryScript: function() {
      if (navigator.onLine) {
        console.log("Retrying to load gapi");
        // We are connected to wifi but might not have a connection,
        // try to reload the script
        this._reloadScript();
      } else {
        // we aren't connected, don't retry
        window.setTimeout(this._retryScript.bind(this), this._retryDelay);
      }
    },

    _reloadScript: function() {
      var parent = this._script.parentElement;
      parent.removeChild(this._script);

      var newScript = document.createElement("script");
      newScript.onError = this._script.onError;
      newScript.async = this._script.async;
      newScript.id = this._script.id;
      newScript.type = this._script.type;
      newScript.src = this._script.src;
      this._script = newScript;

      parent.insertBefore(this._script, parent.children[0]);
    },

    _onlineEvent: function() {
      if (window.gapi) {
        this._setStatus(true);
      } else {
        // reload the script
        this._reloadScript();
      }
    },

    _offlineEvent: function() {
      this._setStatus(false);
      // keep doing everything
    },


    _setStatus: function(online) {
      if (this._online == online) {
        // if we are changing to the same status we currently have, skip
        return;
      }

      this._online = online;
      Event.trigger("onlineStatusChanged", {
        online: online
      });
    },

    waitToComeOnline: function(wait) {
      return new Promise((function(resolve, reject) {
        if (this.isOnline()) {
          resolve();
        }

        var timer = null;

        function statusChanged(status) {
          if (status.online) {
            window.clearTimeout(timer);
            Event.removeListener("onlineStatusChanged", statusChanged);
            resolve();
          }
        }

        function giveUp() {
          Event.removeListener("onlineStatusChanged", statusChanged);
          reject();
        }

        Event.addListener("onlineStatusChanged", statusChanged);

        timer = window.setTimeout(giveUp, wait);
      }).bind(this))
    },
  }

  return new Online();
});