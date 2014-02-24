define(["class", "helpers", "event", "dataLayer/file", "dataLayer/IndexedDBBacking", "dataLayer/DriveBacking"], function(Class, Helpers, Event, File, IndexedDBBacking, DriveBacking) {
  var Data = Class.extend({
    _backing: null,
    _cachedFiles: null,

    _driveBacking: null,

    init: function() {
      this._cachedFiles = {};

      console.log("Using IndexedDB as data store");
      this._backing = new IndexedDBBacking();

      Event.addListener("fileIdChanged", this._fileIdChanged.bind(this));
    },

    // FILE METHODS
    getFiles: function(callback) {
      this._backing.getFiles((function(files) {
        callback(files);
      }).bind(this));
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
        this._cachedFiles[file.fileInfo.id] = file;
        Event.trigger("fileAdded", newFile);

        if (this._driveBacking) {
          file.startDrive(this._newDriveInstance());
        }
      }).bind(this));
    },

    loadFile: function(fileId, callback) {


      if (this._cachedFiles[fileId]) {
        callback(this._cachedFiles[fileId]);
        return;
      }


      // file was not found
      file = new File(new this._backing.instance(this._backing));

      file.load(fileId, (function() {
        this._cachedFiles[fileId] = file;

        if (this._driveBacking) {
          file.startDrive(this._newDriveInstance());
        }

        callback(file);
      }).bind(this));


    },

    deleteFile: function(fileId) {
      this._backing.deleteFile(fileId);

      Event.trigger("fileRemoved", fileId);
    },

    close: function(file) {
      file.close();
      delete this._cachedFiles[file.fileInfo.id];
    },

    startDrive: function() {
      console.log("drive connected");
      this._driveBacking = new DriveBacking();

      // add drive to our open files
      for (var i in this._cachedFiles) {
        this._cachedFiles[i].startDrive(this._newDriveInstance());
      }
    },

    _fileIdChanged: function(e) {
      if (this._cachedFiles[e.oldId]) {
        this._cachedFiles[e.newId] = this._cachedFiles[e.oldId];
        delete this._cachedFiles[e.oldId];
      }
    },

    _newDriveInstance: function() {
      return new this._driveBacking.instance(this._driveBacking);
    },

    _doLater: function(func, args) {
      this._loadCallbacks.push({
        func: func,
        args: args
      })
    }
  });

  var data = new Data();
  window.dataLayer = data

  return data;
});