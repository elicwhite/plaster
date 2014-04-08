define(["class"], function(Class) {
  var instance = Class.extend({
    _parent: null,

    _actions: null,
    _title: "",

    init: function(parent) {
      this._parent = parent;
      this._actions = [];
      this._title = "Untitled File";
    },

    listen: function(addedCallback, removedCallback) {
    },

    stopListening: function() {
    },

    load: function(fileId) {

      return Promise.resolve();
    },

    create: function(file) {
      this._parent._files.push(file);
      return this.load();
    },

    getActions: function() {
      return Promise.resolve(this._actions);
    },

    rename: function(newName) {
      this._title = newName;
      return Promise.resolve();
    },

    addAction: function(action) {
      this._actions.push(action);
      return Promise.resolve();
    },

    removeAction: function(actionIndex) {
      return Promise.resolve();
    },

    undo: function() {
      return Promise.resolve();
    },

    redo: function() {
      return Promise.resolve();
    },

    close: function() {
      return Promise.resolve();
    },
  });

  var DriveFixture = Class.extend({
    _files: null,

    init: function() {
      this._files = [];
    },

    getFileInfo: function(fileId) {
      for (var file in this._files) {
        if (this._files[file].fileId == fileId) {
          return Promise.resolve(this._files[file]);
        }
      }

      return Promise.reject();
    },

    getFiles: function() {
      return Promise.resolve(this._files);
    },

    deleteFile: function(fileId) {
      for (var file in this._files) {
        if (this._files[file].fileId == fileId) {
          delete this._files[file];
        }
      }

      return Promise.resolve();
    },

    touchFile: function(fileId) {
      return Promise.resolve();
    },

    instance: instance,
  });

  return DriveFixture;
});