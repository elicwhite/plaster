define(["event", "gauth", "dataLayer/data"], function(Event, GAuth, Data) {
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
      GAuth.start(function() {
        console.log("GAuth Loaded");
        Data.startDrive()
          .then((function() {
            this._setStatus(true);
          }).bind(this))
      });
    },

    gapiLoadError: function() {
      console.log("Failed to load gapi");
      this._setStatus(false);
      // set a reconnect timer, but only if navigator.online
      window.setTimeout(this._retryScript.bind(this), 10);
    },

    isOnline: function() {
      return this._online;
    },

    _retryScript: function() {
      if (navigator.onLine) {
        console.log("retrying to load the script");
        // We are connected to wifi but might not have a connection, 
        // try to reload the script
        this._reloadScript();
      }
      else
      {
        // we aren't connected, don't retry
      } 
    },

    _reloadScript: function() {
      var parent = this._script.parentElement;
      parent.removeChild(this._script);
      parent.insertBefore(this._script, parent.children[0]);
    },

    _onlineEvent: function() {
      console.log("online event");
      if (window.gapi) {
        GAuth.authorize()
        this._setStatus(true);
      } else {
        // reload the script
        this._reloadScript();
      }
    },

    _offlineEvent: function() {
      console.log("offline event");
      this._setStatus(false);
      // keep doing everything
    },


    _setStatus: function(online) {
      this._online = online;
      Event.trigger("onlineStatusChanged", {
        online: online
      });
    }



  }

  return new Online();
});