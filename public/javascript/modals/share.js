define(["modal"], function(Modal) {

  var Share = Modal.extend({
    id: "share-modal",

    _titleElement: null,

    init: function() {
      this._super();

      this._titleElement = document.getElementById("share-modal-title");
    },

    show: function(fileInfo) {
      this._titleElement.textContent = fileInfo.name;

      this.afterShow();
    },

    hide: function() {
      this.afterHide();
    }
  });

  return new Share();

});