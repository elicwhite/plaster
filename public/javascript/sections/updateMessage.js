define(["event", "section", "tapHandler"], function(Event, Section, TapHandler) {

  var UpdateMessage = Section.extend({
    id: "updateBar",

    init: function() {
      this._super();

      var button = document.getElementById("updateBarContent");
      new TapHandler(button, {tap: this._buttonClicked.bind(this) });
    },

    show: function() {
      this.element.classList.add("visible");
    },

    hide: function() {
      this.element.classList.remove("visible");
    },

    _buttonClicked: function() {
      location.reload();
    }
  });

  return new UpdateMessage();

});