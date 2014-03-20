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
        Data.startDrive();
      });
    },

    gapiLoadError: function() {

    },

    isOnline: function() {
      return this._online;
    },

    _onlineStatusChanged: function(e) {
      this._online = e.online;
    },

    _onlineEvent: function() {
      Event.trigger("onlineStatusChanged", {
        online: true
      });
    },

    _offlineEvent: function() {
      Event.trigger("onlineStatusChanged", {
        online: false
      });
    }


  }

  return new Online();
});