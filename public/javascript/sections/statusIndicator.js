define(["event", "section", "online", "platform"], function(Event, Section, Online, Platform) {

  var StatusIndicator = Section.extend({
    id: "mode",

    init: function() {
      this._super();
      this._onlineStatusChanged = this._onlineStatusChanged.bind(this);

      Event.addListener("onlineStatusChanged", this._onlineStatusChanged);
    },

    _onlineStatusChanged: function(e) {
      if (e.online) {
        this._showOnline();
      } else {
        // we are now offline, set the indicator
        this._showOffline();
      }
    },

    _showOnline: function() {
      this.element.classList.add("hidden")

      this._waitAnimationEnd()
        .then((function() {
          this.element.innerText = "Online";
          this.element.classList.remove("hidden");
          this.element.classList.remove("offline");
        }).bind(this));
    },

    _showOffline: function() {
      this.element.classList.add("hidden")

      this._waitAnimationEnd()
        .then((function() {
          this.element.innerText = "Offline";
          this.element.classList.remove("hidden");
          this.element.classList.add("offline");
        }).bind(this));

    },

    _waitAnimationEnd: function() {
      return new Promise((function(resolve) {
        setTimeout(function() {
          resolve()
        }, 500);
      }).bind(this));
    }
  });

  return StatusIndicator;

});