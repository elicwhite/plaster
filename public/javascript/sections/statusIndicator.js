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
      } else {
        // we are now offline, set the indicator
        this.element.classList.add("offline");
      }
    },
  });

  return StatusIndicator;

});