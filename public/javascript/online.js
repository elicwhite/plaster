define(["event", "gauth", "data"], function(Event, GAuth, Data) {
  var Online = function Online() {
    this.init();
  };

  Online.prototype = {
    _online: null,

    _script: null,

    init: function() {
      this._online = false;

      this._script = document.getElementById("gapiScript");

      window.addEventListener("online", this._onlineEvent.bind(this));
      window.addEventListener("offline", this._offlineEvent.bind(this));
    },

    gapiLoaded: function() {
      GAuth.start((function() {
        console.log("GAuth Loaded");
        Data.startDrive()
          .
        catch (function(error) {
          console.error(error);
        })
          .then((function() {
            this._setStatus(true);
          }).bind(this))
      }).bind(this));
    },

    gapiLoadError: function() {
      console.warn("Failed to load gapi");
      this._setStatus(false);
      // set a reconnect timer, but only if navigator.online
      window.setTimeout(this._retryScript.bind(this), 10);
    },

    isOnline: function() {
      return this._online;
    },

    _retryScript: function() {
      if (navigator.onLine) {
        console.log("retrying to load gapi");
        // We are connected to wifi but might not have a connection,
        // try to reload the script
        this._reloadScript();
      } else {
        // we aren't connected, don't retry
      }
    },

    _reloadScript: function() {
      var parent = this._script.parentElement;
      parent.removeChild(this._script);
      parent.insertBefore(this._script, parent.children[0]);
    },

    _onlineEvent: function() {
      if (window.gapi) {
        GAuth.start((function() {
          this._setStatus(true);
        }).bind(this));
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