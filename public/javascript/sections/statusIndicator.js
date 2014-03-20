define(["event", "section"], function(Event, Section) {

  var StatusIndicator = Section.extend({
    id: "mode",

    init: function() {
      this._super();
      this._onlineStatusChanged = this._onlineStatusChanged.bind(this);

      Event.addListener("onlineStatusChanged", this._onlineStatusChanged);
    },

    _onlineStatusChanged: function(e) {
      if (e.online) {
        this.element.classList.remove("offline");

        // check for updates if we come online while looking at this page
        if (this._visible) {
          Data.checkForUpdates()
            .then((function() {
              this._scheduleUpdate()
            }).bind(this))
            .
          catch (function(error) {
            console.error(error, error.stack, error.message);
          });
        }
      } else {
        // we are now offline, set the indicator
        this.element.classList.add("offline");
      }
    },
  });

  return StatusIndicator;

});