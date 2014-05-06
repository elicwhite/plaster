define(["section"], function(Section) {

  var Modal = Section.extend({
    _overlayElement: null,
    _overallElement: null,

    init: function() {
      this._super();

      this._overlayElement = document.getElementById("modal-overlay");
      this._overallElement = document.getElementById("overall");
    },

    afterShow: function() {
      this._overallElement.classList.add("blurred");
      this._overlayElement.classList.remove("hidden");

      this._super();
    },

    afterHide: function() {
      this._overallElement.classList.remove("blurred");
      this._overlayElement.classList.add("hidden");

      this._super();
    }
  });

  return Modal;

});