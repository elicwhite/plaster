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
        modifiedTime: Date.now(),
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
        var file = this._cachedFiles[fileId];
        file.afterLoad((function() {

          //if (file._driveBacking) {
          //  file.sync();
          //}

          callback(file);
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

    deleteFile: function(fileId, updateDrive) {
      this._backing.markFileAsDeleted(fileId);

      if (typeof(updateDrive) == "undefined" || updateDrive) {
        if (this._driveBacking) {
          this._driveBacking.deleteFile(fileId, (function() {
            this._backing.deleteFile(fileId);
          }).bind(this));
        }
      }

      Event.trigger("fileRemoved", fileId);
    },

    close: function(file) {
      file.close();
      delete this._cachedFiles[file.fileInfo.id];
    },

    startDrive: function() {
      console.log("Drive connected");
      this._driveBacking = new DriveBacking();

      // add drive to our open files
      for (var i in this._cachedFiles) {
        this._cachedFiles[i].startDrive(this._newDriveInstance());
      }

      // Check for updates from drive every 30 seconds

      this._checkForUpdates(false);
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

    _checkForUpdates: function(updateOnlyFileChanges) {
      console.log("Checking for file updates on drive");
      this._driveBacking.getFiles((function(remoteFiles) {
        this._backing.getFiles((function(localFiles) {
          this._backing.getDeletedFiles((function(filesDeletedLocally) {
            var fileIdsDeletedLocally = filesDeletedLocally.map(function(item) {
              return item.id
            });

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
                var deletedLocally = fileIdsDeletedLocally.indexOf(file.id) !== -1;

                if (deletedLocally) {
                  // we need to see if the file remote actions match to 
                  // know whether we should actually delete it remotely.
                  var tempFile = new File(new this._backing.instance(this._backing));
                  tempFile.remoteActionsMatch(file.id, this._newDriveInstance(), (function(actionsMatch) {
                    if (actionsMatch) {
                      // delete it on the remote
                      this.deleteFile(file.id);
                    } else {
                      // unmark as deleted and load it so it will sync
                      this._backing.unmarkFileAsDeleted(file.id);

                      this.loadFile(file.id, (function() {

                      }).bind(this));
                    }
                  }).bind(this));
                } else {
                  // File wasn't found locally, make a file with the same
                  // id and then it will sync
                  var newFile = {
                    id: file.id,
                    name: file.title,
                    modifiedTime: new Date(file.modifiedDate).getTime(),
                  };

                  this._createFile(newFile);
                }
              } else {
                // we have this file on both local and server

                if (updateOnlyFileChanges) {
                  // File names don't match
                  if (file.title != localFiles[j].name) {

                    this.loadFile(file.id, (function(fileObj) {
                      fileObj.rename(file.title);
                    }).bind(this));
                  }
                  // We only want to update file name changes
                } else {

                  // make sure we have all the remote actions
                  this.loadFile(file.id, (function() {

                  }).bind(this));
                }
              }
            }


            // look for local files that are not on remote
            for (var i = 0; i < localFiles.length; i++) {
              var found = false;

              for (var j = 0; j < remoteFiles.length; j++) {
                if (localFiles[i].id == remoteFiles[j].id) {
                  found = true;
                  break;
                }
              }

              if (!found) {

                // we don't have it on remote, and we also marked it as deleted locally
                var deletedLocally = fileIdsDeletedLocally.indexOf(localFiles[i].id) !== -1;
                if (deletedLocally) {
                  this.deleteFile(localFiles[i].id, false);
                  continue;
                }

                // TODO: check if we deleted it remotely
                var deletedRemotely = !Helpers.isLocalGuid(localFiles[i].id);

                if (deletedRemotely) {
                  this.deleteFile(localFiles[i].id, false);
                  continue;
                }

                // load it and let it sync
                this.loadFile(localFiles[i].id, (function() {}).bind(this));
                continue;
              }
            }

            // This is going to run potentially before everything else finishes, where else could it go?
            this._scheduleUpdate();
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    _checkForFileChanges: function() {

    },

    _scheduleUpdate: function() {
      setTimeout((function() {
        this._checkForUpdates(true);
      }).bind(this), 30 * 1000);
    }
  });

  var data = new Data();
  window.dataLayer = data

  return data;
});