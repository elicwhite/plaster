define(["section", "tapHandler"], function(Section, TapHandler) {

  var Modal = Section.extend({
    _overlayElement: null,
    _overallElement: null,

    _tapOffCloses: true,

    init: function() {
      this._super();

      this._overlayElement = document.getElementById("modal-overlay");
      this._overallElement = document.getElementById("overall");

      new TapHandler(this.element, {
        start: function(e) {
          console.log("modal start");
          // We need this to keep from going to the overlay
          e.stopPropagation();
        }
      });

      new TapHandler(this._overlayElement, {
        start: function(e) {
          console.log("overlay start");
          // We need this to keep from going to the overlay
          e.stopPropagation();
        },
        tap: this._overlayTapped.bind(this)
      });
    },

    afterShow: function() {
      //this._overallElement.classList.add("blurred");
      this._overlayElement.classList.remove("hidden");

      this._super();
    },

    afterHide: function() {
      //this._overallElement.classList.remove("blurred");
      this._overlayElement.classList.add("hidden");

      this._super();
    },

    _overlayTapped: function(e) {
      if (e.srcElement == this._overlayElement && this._tapOffCloses) {
        this.hide();
      }
    }
  });

  return Modal;

});