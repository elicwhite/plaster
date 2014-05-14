define(["section", "tapHandler"], function(Section, TapHandler) {

  var ModalManager = Section.extend({
    _overlayElement: null,
    _overallElement: null,

    _currentModal: null,

    init: function() {
      this._super();

      this._overlayElement = document.getElementById("modal-overlay");
      this._overallElement = document.getElementById("overall");

      new TapHandler(this._overlayElement, {
        start: function(e) {
          // We need this to keep from going to the overlay
          e.stopPropagation();
        },
        tap: this._overlayTapped.bind(this)
      });
    },

    show: function(modal) {
      if (this._currentModal !== null) {
        console.error("A modal is already showing");
      }

      this._currentModal = modal;

      this.afterShow();
    },

    afterShow: function() {
      //this._overallElement.classList.add("blurred");
      this._overlayElement.classList.remove("hidden");

      this._super();
    },

    hide: function() {
      this.afterHide();
      this._currentModal = null;
    },

    afterHide: function() {
      //this._overallElement.classList.remove("blurred");
      this._overlayElement.classList.add("hidden");

      this._super();
    },

    _overlayTapped: function(e) {
      if (e.srcElement == this._overlayElement && this._currentModal.tapOffCloses) {
        // This will tell us to hide
        this._currentModal.hide();
      }
    }
  });

  return new ModalManager();

});