define(["section", "managers/modal", "tapHandler"], function(Section, ModalManager, TapHandler) {

  var ModalBase = Section.extend({

    tapOffCloses: true,

    init: function() {
      this._super();

      new TapHandler(this.element, {
        start: function(e) {
          console.log("modal start");
          // We need this to keep from going to the overlay
          e.stopPropagation();
        }
      });
    },

    show: function() {
      ModalManager.show(this);
    },

    hide: function() {
      ModalManager.hide();
    }
  });

  return ModalBase;

});