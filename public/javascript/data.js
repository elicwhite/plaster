/*
TODO:
  Make data.js have the same functions 
*/

define(["class", "dataBacking/indexedDBBacking", "dataBacking/webSQLBacking", "event"], function(Class, IndexedDBBacking, WebSQLBacking, Event) {
  var Data = Class.extend({
    _backing: null,

    init: function() {
      //this._backing = new IndexedDBBacking();
      window.sql = new WebSQLBacking();
      this._backing = window.sql;

      Event.addListener("fileModified", this._fileModified.bind(this));
    },

    // Get the name of all the files we have
    getFiles: function(callback) {
      this._backing.getFiles(callback);
    },

    getFileActions: function(fileId, callback) {
      this._backing.getFileActions(fileId, callback);
    },

    // Create a new file and returns the file name
    createFile: function(callback) {
      this._backing.createFile(callback);
    },

    renameFile: function(fileId, newFileName) {
      this._backing.renameFile(fileId, newFileName);
    },

    deleteFile: function(fileId) {
      this._backing.deleteFile(fileId);
    },

    addAction: function(fileId, action) {
      this._backing.addAction(fileId, action);
    },

    removeLastAction: function(fileId) {
      this._backing.removeLastAction(fileId);
    },

    // Delete all the file rows, delete all the file databases,
    // delete everything for files from local storage
    clearAll: function() {
      this._backing.clearAll();
    },

    _fileModified: function(data) {
      this._backing.updateFileModified(data.fileId, data.timestamp);
    },

    // Get the stored file settings
    localFileSettings: function(fileId, settings) {
      if (settings) {
        localStorage[fileId] = JSON.stringify(settings);
      }

      if (!localStorage[fileId]) {
        localStorage[fileId] = JSON.stringify({
          offsetX: 0,
          offsetY: 0,
          scale: 1
        });
      }

      return JSON.parse(localStorage[fileId]);
    },
  });

  var data = new Data();
  window.data = data

  return data;
});