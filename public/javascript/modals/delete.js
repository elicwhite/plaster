define(["components/modalBase", "tapHandler", "data", "analytics"], function(ModalBase, tapHandler, Data, Analytics) {

  var Delete = ModalBase.extend({
    id: "delete-modal",
    name: "Delete",

    _titleElement: null,
    _deleteButton: null,
    _closeButton: null,

    _fileInfo: null,

    init: function() {
      this._super();

      this._titleElement = document.getElementById("delete-modal-title");
      this._deleteButton = document.getElementById("delete-modal-delete");
      this._closeButton = document.getElementById("delete-modal-close");

      new tapHandler(this._deleteButton, {
        start: function(e) {
          e.stopPropagation();
        },
        tap: this._deleteTapped.bind(this)
      })

      new tapHandler(this._closeButton, {
        start: function(e) {
          e.stopPropagation();
        },
        tap: this._closeTapped.bind(this)
      })
    },

    show: function(fileInfo) {
      this._super();

      this._fileInfo = fileInfo;
      this._titleElement.textContent = fileInfo.name;

      this.afterShow();
    },

    hide: function() {
      this._super();

      this.afterHide();
    },

    _deleteTapped: function(e) {
      this.hide();

      Data.deleteFile(this._fileInfo.id)
        .then((function() {
          Analytics.event("file", "deleted");
        }).bind(this));
    },

    _closeTapped: function(e) {
      this.hide();
    }
  });

  return new Delete();
});