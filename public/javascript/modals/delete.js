define(["modal", "tapHandler", "data"], function(Modal, tapHandler, Data) {

  var Delete = Modal.extend({
    id: "delete-modal",

    _titleElement: null,
    _deleteButton: null,

    _fileInfo: null,

    init: function() {
      this._super();

      this._titleElement = document.getElementById("delete-modal-title");
      this._deleteButton = document.getElementById("delete-modal-delete");

      new tapHandler(this._deleteButton, {
        tap: this._deleteTapped.bind(this)
      })
    },

    show: function(fileInfo) {
      this._fileInfo = fileInfo;
      this._titleElement.textContent = fileInfo.name;

      this.afterShow();
    },

    hide: function() {
      this.afterHide();
    },

    _deleteTapped: function(e) {
      this.hide();

      Data.deleteFile(this._fileInfo.id)
        .then((function() {
          Analytics.event("deleted file");
        }).bind(this));
    }
  });

  return new Delete();
});