define(["components/modalBase", "tapHandler", "data", "analytics"], function(ModalBase, tapHandler, Data, Analytics) {

  var Loading = ModalBase.extend({
    id: "loading-modal",
    name: "Loading",

    tapOffCloses: false,

    init: function() {
      this._super();
    },

    show: function() {
      this._super();

      console.log("Loading");
      this.afterShow();
    },

    hide: function() {
      this._super();

      this.afterHide();
    },
  });

  return new Loading();
});