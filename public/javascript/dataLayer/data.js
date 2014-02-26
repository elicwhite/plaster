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

      this._createFile(newFile);
    },

    _createFile: function(fileInfo) {
      var file = new File(new this._backing.instance(this._backing));

      // Create a new file for this
      file.create(fileInfo, (function() {
        this._cachedFiles[file.fileInfo.id] = file;
        Event.trigger("fileAdded", file.fileInfo);

        if (this._driveBacking) {
          file.startDrive(this._newDriveInstance());
        }
      }).bind(this));
    },

    loadFile: function(fileId, callback) {
      if (this._cachedFiles[fileId]) {
        this._cachedFiles[fileId].afterLoad((function() {
          callback(this._cachedFiles[fileId]);
        }).bind(this));
        return;
      }

      // file was not found
      var file = new File(new this._backing.instance(this._backing));
      this._cachedFiles[fileId] = file;

      file.load(fileId, (function() {
        if (this._driveBacking) {
          file.startDrive(this._newDriveInstance());
        }

        callback(file);
      }).bind(this));


    },

    deleteFile: function(fileId) {
      this._backing.deleteFile(fileId);

      if (this._driveBacking) {
        this._driveBacking.deleteFile(fileId);
      }

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

      this._driveBacking.getFiles((function(remoteFiles) {
        this._backing.getFiles((function(localFiles) {

          // Check for files that are on drive and not saved locally
          for (var i = 0; i < remoteFiles.length; i++) {
            var found = false;

            for (var j = 0; j < localFiles.length; j++) {
              if (remoteFiles[i].id == localFiles[j].id) {
                found = true;
                break;
              }
            }

            var file = remoteFiles[i];

            if (!found) {

              // File wasn't found locally, make a file with the same
              // id and then it will sync
              var newFile = {
                id: file.id,
                name: file.title,
                modifiedTime: new Date(result.modifiedDate).getTime()
              };

              this._createFile(newFile);

            } else {

              // we have this file on both local and server
              // make sure we have all the remote actions
              this.loadFile(file.id, function() {});
            }
          }


          for (var i = 0; i < localFiles.length; i++) {
            var found = false;

            for (var j = 0; j < remoteFiles.length; j++) {
              if (localFiles[i].id == remoteFiles[j].id) {
                found = true;
                break;
              }
            }

            if (!found) {
              // we don't have it on the remote

              // load it and let it sync
              this.loadFile(localFiles[i].id, function() {});
            }
          }

        }).bind(this));
      }).bind(this));
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
  });

  var data = new Data();
  window.dataLayer = data

  return data;
});