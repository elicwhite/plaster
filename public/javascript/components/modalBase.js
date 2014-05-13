define(["section", "managers/modal", "tapHandler", "analytics"], function(Section, ModalManager, TapHandler, Analytics) {

  var ModalBase = Section.extend({

    tapOffCloses: true,

    init: function() {
      this._super();

      new TapHandler(this.element, {
        start: function(e) {
          // We need this to keep from going to the overlay
          e.stopPropagation();
        }
      });
    },

    show: function() {
      Analytics.event("modal", "shown", this.name);
      ModalManager.show(this);
    },

    hide: function() {
      Analytics.event("modal", "closed", this.name);
      ModalManager.hide();
    }
  });

  return ModalBase;

});