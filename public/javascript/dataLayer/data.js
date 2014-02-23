define(["class", "helpers", "event", "dataLayer/file", "dataLayer/IndexedDBBacking"], function(Class, Helpers, Event, File, IndexedDBBacking) {
  var Data = Class.extend({
    _backing: null,
    _cachedFiles: null,

    init: function() {
      this._cachedFiles = [];

      console.log("Using IndexedDB as data store");
      this._backing = new IndexedDBBacking();

    },

    // FILE METHODS
    getFiles: function(callback) {
      if (this._cachedFiles) {
        callback(this._cachedFiles);
      } else {
        this._backing.getFiles((function(files) {
          callback(files);
        }).bind(this));
      }
    },

    createFile: function() {
      var newFile = {
        id: Helpers.getGuid(),
        name: "Untitled File",
        modifiedTime: Date.now()
      };

      var file = new File(new this._backing.instance(this._backing));

      // Create a new file for this
      file.create(newFile, (function() {
        this._cachedFiles.unshift(file);
        Event.trigger("fileAdded", file);
      }).bind(this));
    },

    deleteFile: function(fileId) {
      var file = this._getFile(fileId);
      
      delete this._cachedFiles[this._cachedFiles.indexOf(file)];

      file.delete();

      Event.trigger("fileRemoved", file);
    },

    loadFile: function(fileId, callback) {
      var file = this._getFile(fileId);

      if (file) {
        callback(file);
        return;
      }

      // file was not found
      file = new File(new this._backing.instance(this._backing));
      file.load(fileId, (function() {
        this._cachedFiles.unshift(file);
        callback(file);
      }).bind(this));
    },

    close: function(file) {
      file.close();
      delete this._cachedFiles[this._cachedFiles.indexOf(file)];
    },

    _doLater: function(func, args) {
      this._loadCallbacks.push({
        func: func,
        args: args
      })
    },

    _getFile: function(fileId) {
      for (var i in this._cachedFiles) {
        if (this._cachedFiles.fileInfo[i].id == fileId) {

          var file = this._cachedFiles[i];
          delete this._cachedFiles[i];
          this._cachedFiles.unshift(file);

          return file;
        }
      }

      return false;
    },
  });

  var data = new Data();
  window.dataLayer = data

  return data;
});