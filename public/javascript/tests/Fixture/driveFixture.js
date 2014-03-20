define(["class"], function(Class) {
  var instance = Class.extend({
    _parent: null,

    init: function(parent) {
      this._parent = parent;
    },

    listen: function(addedCallback, removedCallback) {
    },

    stopListening: function() {
    },

    load: function(fileId) {
      return Promise.resolve();

    },

    create: function(file) {
      return this.load();
    },

    getActions: function() {
      return Promise.resolve([]);
    },

    rename: function(newName) {
      return Promise.resolve();
    },

    addAction: function(action) {
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
    init: function() {

    },

    getFiles: function() {
      return Promise.resolve([]);
    },

    deleteFile: function(fileId) {
      return Promise.resolve();
    },

    touchFile: function(fileId) {
      return Promise.resolve();
    },

    instance: instance,
  });

  return DriveFixture;
});