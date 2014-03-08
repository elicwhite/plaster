define(["class", "helpers", "event", "sequentialHelper", "dataLayer/file", "dataLayer/IndexedDBBacking", "dataLayer/DriveBacking"], function(Class, Helpers, Event, SequentialHelper, File, IndexedDBBacking, DriveBacking) {
  var Data = Class.extend({
    _backing: null,
    _cachedFiles: null,
    _fileReferences: null,

    _driveBacking: null,

    init: function() {
      this._cachedFiles = {};
      this._fileReferences = {};

      console.log("Using IndexedDB as data store");
      this._backing = new IndexedDBBacking();

      Event.addListener("fileIdChanged", this._fileIdChanged.bind(this));
    },

    // FILE METHODS
    getFiles: function(callback) {
      return this._backing.getFiles();
    },

    createFile: function(callback) {
      var newFile = {
        id: Helpers.getGuid(),
        name: "Untitled File",
        modifiedTime: Date.now(),
      };

      return this._createFile(newFile);
    },

    _createFile: function(fileInfo) {
      var file = new File(new this._backing.instance(this._backing));

      this._fileReferences[fileInfo.id] = 0;

      this._cachedFiles[fileInfo.id] = file.create(fileInfo)
        .then((function(fileInfo, file) {
          Event.trigger("fileAdded", fileInfo);
          return file;
        }).bind(this, fileInfo))
        .
      catch (function(error) {
        console.error(error, error.stack, error.message);
      });

      if (this._driveBacking) {
        this._cachedFiles[fileInfo.id].then((function() {
          file.startDrive(this._newDriveInstance());
        }).bind(this));
      }

      return this._cachedFiles[fileInfo.id];
    },

    loadFile: function(fileId, waitForSync) {
      if (this._cachedFiles[fileId]) {
        this._fileReferences[fileId]++;
        return this._cachedFiles[fileId];
      }

      // file was not found
      var file = new File(new this._backing.instance(this._backing));

      this._fileReferences[fileId] = 1;

      this._cachedFiles[fileId] = file.load(fileId)
        .then((function() {
          return file;
        }).bind(this));


      if (this._driveBacking) {

        // If we have drive, start drive outside of this promise
        this._cachedFiles[fileId].then((function() {
          var startingDrive = file.startDrive(this._newDriveInstance());

          if (waitForSync) {
            return startingDrive;
          }
        }).bind(this));
      }

      return this._cachedFiles[fileId];
    },

    deleteFile: function(fileId, updateDrive) {
      var promises = [];

      Event.trigger("fileRemoved", fileId);

      if (this._fileReferences[fileId]) {
        delete this._fileReferences[fileId];
      }

      // If it is in the cached files, close the file and remove it
      if (this._cachedFiles[fileId]) {

        promises.push(this._cachedFiles[fileId]
          .then((function(file) {
            delete this._cachedFiles[fileId];
            return this._close(file);
          }).bind(this)));
      }

      var markDeleted = this._backing.markFileAsDeleted(fileId);
      promises.push(markDeleted);

      if (updateDrive !== false) { // could be true or undefined
        if (this._driveBacking) {
          promises.push(this._driveBacking.deleteFile(fileId)
            .then((function() {
              return this._backing.deleteFile(fileId);
            }).bind(this)));
        }
      } else {
        // We don't want to update drive first, just delete it
        promises.push(markDeleted.then((function() {
          promises.push(this._backing.deleteFile(fileId));
        }).bind(this)));
      }

      return Promise.all(promises);
    },

    close: function(file) {
      return file.fileInfoPromise
        .then((function(fileInfo) {
          if (this._fileReferences[fileInfo.id]) {
            this._fileReferences[fileInfo.id]--;
          }

          if (this._fileReferences[fileInfo.id] > 0) {
            // Not actually closing
            return Promise.resolve();
          } else {
            // it is equal to 0
            delete this._fileReferences[fileInfo.id];


            delete this._cachedFiles[fileInfo.id];
            return file.close();

          }
        }).bind(this));
    },

    startDrive: function() {
      console.log("Drive connected");

      var driveBacking = new DriveBacking();

      var promises = [];

      var self = this;
      var sequence = Promise.resolve();

      for (var i in this._cachedFiles) {

        sequence = sequence.then((function(i) {
          return this._cachedFiles[i];
        }).bind(this, i))
          .then(function(file) {
            var driveInstance = new driveBacking.instance(driveBacking);
            return file.startDrive(driveInstance);
          });
      }

      promises.push(sequence);

      return Promise.all(promises)
        .then((function() {
          this._driveBacking = driveBacking;
        }).bind(this))
        .then((function() {
          // Check for updates from drive every 30 seconds
          // after the open files are synced
          this._checkForUpdates(false);
        }).bind(this))
        .
      catch (function(e) {
        console.error(e, e.stack, e.message);
      });
    },

    _fileIdChanged: function(e) {
      if (this._cachedFiles[e.oldId]) {
        this._fileReferences[e.newId] = this._fileReferences[e.oldId];
        delete this._fileReferences[e.oldId];

        this._cachedFiles[e.newId] = this._cachedFiles[e.oldId];
        delete this._cachedFiles[e.oldId];
      }
    },

    _newDriveInstance: function(driveBacking) {
      return new this._driveBacking.instance(this._driveBacking);
    },

    _checkForUpdates: function(updateOnlyFileChanges) {
      if (SequentialHelper.hasActions()) {
        setTimeout((function() {
          this._checkForUpdates();
        }).bind(this), 3 * 1000);

        console.log("Actions currently running, delaying checking for updates");
        return;
      }

      console.log("Checking for file updates on drive");

      function getFileId(file) {
        return file.id;
      }

      SequentialHelper.startGlobalAction()
        .then((function() {

          var driveFilesPromise = this._driveBacking.getFiles();
          var localFilesPromise = this._backing.getFiles();
          var locallyDeletedFilesPromise = this._backing.getDeletedFiles();

          return Promise.all([driveFilesPromise, localFilesPromise, locallyDeletedFilesPromise])
            .then((function(results) {
              var remoteFiles = results[0];
              var localFiles = results[1];
              var filesDeletedLocally = results[2];

              var localFileIds = localFiles.map(getFileId);
              var remoteFileIds = remoteFiles.map(getFileId);

              var fileIdsDeletedLocally = filesDeletedLocally.map(getFileId);
              var fileIdsDeletedOnBoth = fileIdsDeletedLocally.filter(function(id) {
                return remoteFileIds.indexOf(id) === -1;
              });

              var promises = [];

              // Delete all the files that were deleted on both local and remote
              fileIdsDeletedOnBoth.map((function(id) {
                promises.push(this._backing.deleteFile(id));
              }).bind(this));

              var sequence = Promise.resolve();
              promises.push(sequence);


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
                  sequence = sequence.then((function(file) {
                    return this._fileNotFoundLocally(fileIdsDeletedLocally, file);
                  }).bind(this, file));

                } else {
                  // we have this file on both local and server

                  if (updateOnlyFileChanges) {
                    // File names don't match
                    if (file.title != localFiles[j].name) {

                      // Wrap this so we keep the context of file

                      sequence = sequence.then((function(file) {
                        return this.loadFile(file.id, true)
                          .then((function(remoteFile, fileObj) {

                            return fileObj.rename(remoteFile.title)
                              .then((function(fileObj) {
                                return this.close(fileObj);
                              }).bind(this, fileObj))
                          }).bind(this, file))
                      }).bind(this, file));

                    }
                    // We only want to update file name changes
                  } else {
                    // make sure we have all the remote actions
                    sequence = sequence.then((function(file) {

                      return this.loadFile(file.id)
                        .then((function(fileObj) {
                          return this.close(fileObj);
                        }).bind(this))
                    }).bind(this, file))
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
                    promises.push(this.deleteFile(localFiles[i].id, false));
                    continue;
                  }

                  // TODO: check if we deleted it remotely
                  var deletedRemotely = !Helpers.isLocalGuid(localFiles[i].id);

                  if (deletedRemotely) {
                    promises.push(this.deleteFile(localFiles[i].id, false));
                    continue;
                  }

                  // load it and let it sync
                  sequence = sequence.then((function(fileId) {
                    return this.loadFile(fileId)
                      .then((function(file) {
                        return this.close(file);
                      }).bind(this));
                  }).bind(this, localFiles[i].id));
                  continue;
                }
              }

              return Promise.all(promises)
            }).bind(this))
            .
          catch (function(error) {
            console.error(error.stack, error.message);
          })
            .then((function() {
              console.log("Completed checking for Drive updates");
              this._scheduleUpdate();
            }).bind(this))
            .
          catch (function(error) {
            console.error(error.stack, error.message);
          });
        }).bind(this))
        .then(function() {
          SequentialHelper.endGlobalAction();
        });
    },

    _fileNotFoundLocally: function(fileIdsDeletedLocally, file) {

      var deletedLocally = fileIdsDeletedLocally.indexOf(file.id) !== -1;

      if (deletedLocally) {
        console.log(file.id, "was deleted");
        // we need to see if the file remote actions match to 
        // know whether we should actually delete it remotely.
        var tempFile = new File(new this._backing.instance(this._backing));
        return tempFile.remoteActionsMatch(file.id, this._newDriveInstance())

        .then((function(actionsMatch) {
          console.log("inside for", file.id);
          if (actionsMatch) {
            // delete it on the remote
            return this.deleteFile(file.id);
          } else {
            // unmark as deleted and load it so it will sync
            var loadClose = this.loadFile(file.id)
              .then((function(file) {
                return this.close(file);
              }).bind(this));

            return Promise.all([this._backing.unmarkFileAsDeleted(file.id), loadClose]);
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

        return this._createFile(newFile)
          .then((function(file) {
            return this.close(file);
          }).bind(this));
      }
    },

    _scheduleUpdate: function() {
      setTimeout((function() {
        this._checkForUpdates(true);
      }).bind(this), 13 * 1000);
    }
  });

  var data = new Data();
  return data;
});