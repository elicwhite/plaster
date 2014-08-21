define(["class", "helpers", "event", "gauth", "online", "sequentialHelper", "dataLayer/file"], function(Class, Helpers, Event, GAuth, Online, SequentialHelper, File) {
  var Data = Class.extend({
    _backing: null,
    _cachedFiles: null,
    _fileReferences: null,

    _driveBacking: null,

    init: function(backing, driveBacking) {
      this._cachedFiles = {};
      this._fileReferences = {};

      this._backing = backing;
      this._driveBacking = driveBacking;

      Event.addListener("fileIdChanged", this._fileIdChanged.bind(this));
    },

    // FILE METHODS
    getFiles: function() {
      return this._backing.getFiles()
        .
      catch (function(error) {
        console.error(error, error.stack, error.message);
        throw error;
      });
    },

    createFile: function() {
      var newFile = {
        id: Helpers.getGuid(),
        name: "Untitled File",
        localModifiedTime: Date.now(),
        driveModifiedTime: "",
        // I don't like this, but it is a 1px transparent png
        thumbnail: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==",
      };

      return this._createFile(newFile);
    },

    _createFile: function(fileInfo) {
      var file = new File(new this._backing.instance(this._backing));

      this._fileReferences[fileInfo.id] = 1;

      this._cachedFiles[fileInfo.id] = file.create(fileInfo)
        .then((function(fileInfo, file) {
          Event.trigger("fileAdded", fileInfo);
          return file;
        }).bind(this, fileInfo))
        .
      catch (function(error) {
        console.error(error, error.stack, error.message);
        throw error;
      });

      if (GAuth.isAuthenticated()) {
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

      return this.fileExists(fileId)
        .then((function(exists) {
          if (!exists) {
            throw new Error("This file does not exist");
          }

          // file not already loaded
          var file = new File(new this._backing.instance(this._backing));

          this._fileReferences[fileId] = 1;

          this._cachedFiles[fileId] = file.load(fileId)
            .then((function() {
              return file;
            }).bind(this));


          if (Online.isOnline()) {

            // If we have drive, start drive outside of this promise
            this._cachedFiles[fileId].then((function() {
              var startingDrive = file.startDrive(this._newDriveInstance());

              if (waitForSync) {
                return startingDrive;
              }
            }).bind(this));
          }

          return this._cachedFiles[fileId];
        }).bind(this));
    },

    deleteFile: function(fileId, skipDrive) {
      var promises = [];

      Event.trigger("fileRemoved", fileId);

      if (this._fileReferences[fileId]) {
        delete this._fileReferences[fileId];
      }

      // If it is in the cached files, close the file and remove it
      if (this._cachedFiles[fileId]) {
        var filePromise = this._cachedFiles[fileId];
        delete this._cachedFiles[fileId];

        promises.push(filePromise
          .then((function(file) {
            return this.close(file);
          }).bind(this)));
      }

      if (Helpers.isLocalGuid(fileId)) {
        return this._backing.deleteFile(fileId);
      } else {
        if (!skipDrive && GAuth.isAuthenticated()) {
          return this._driveBacking.deleteFile(fileId)
            .then((function() {
              return this._backing.deleteFile(fileId);
            }).bind(this));
        } else {
          return this._backing.markFileAsDeleted(fileId);
        }
      }
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

    syncOpenFiles: function() {
      var sequence = Promise.resolve();

      for (var fileId in this._cachedFiles) {
        var filePromise = this._cachedFiles[fileId];

        sequence = sequence.then((function(filePromise) {
          return filePromise;
        }).bind(this, filePromise))
          .then((function(file) {
            var driveInstance = new this._driveBacking.instance(this._driveBacking);
            return file.startDrive(driveInstance);
          }).bind(this));

      }

      return sequence;
    },

    openReferences: function(fileId) {
      if (this._fileReferences[fileId]) {
        return this._fileReferences[fileId];
      }

      return 0;
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


    checkForUpdates: function() {
      if (!GAuth.isAuthenticated()) {
        return Promise.resolve();
      }

      if (SequentialHelper.hasActions()) {
        console.warn("Actions currently running, can't sync");
        return Promise.reject();
      }

      function getFileId(file) {
        return file.id;
      }

      function sortById(file1, file2) {
        return file1.id < file2.id;
      }

      function fileIdsMatch(file1, file2) {
        return file1.id == file2.id;
      }

      function intersectFiles(drive, local, compare) {
        var intersection = [];

        for (var i = 0; i < drive.length; i++) {
          for (var j = 0; j < local.length; j++) {
            if (match(drive[i], local[j], compare)) {
              intersection.push({
                drive: drive[i],
                local: local[j]
              });
              break;
            }
          }
        }

        return intersection;
      }

      function onlyInLeft(array1, array2, compare) {
        var result = [];

        for (var i = 0; i < array1.length; i++) {
          var found = false;

          for (var j = 0; j < array2.length; j++) {
            if (compare(array1[i], array2[j])) {
              found = true;
              break;
            }
          }

          if (!found) {
            result.push(array1[i]);
          }
        }

        return result;
      }

      function match(item1, item2, compare) {
        return compare(item1, item2);
      }

      return SequentialHelper.startGlobalAction()
        .then((function() {

          console.log("Checking for file updates on drive");

          var driveFilesPromise = this._driveBacking.getFiles();
          var localFilesPromise = this._backing.getFiles();
          var locallyDeletedFilesPromise = this._backing.getDeletedFiles();

          return Promise.all([driveFilesPromise, localFilesPromise, locallyDeletedFilesPromise])
            .then((function(results) {
              var remoteFiles = results[0].sort(sortById);
              var localFiles = results[1].sort(sortById);
              var filesDeletedLocally = results[2].sort(sortById);

              var localFileIds = localFiles.map(getFileId);
              var remoteFileIds = remoteFiles.map(getFileId);

              var fileIdsDeletedLocally = filesDeletedLocally.map(getFileId);
              var fileIdsDeletedOnBoth = fileIdsDeletedLocally.filter(function(id) {
                return remoteFileIds.indexOf(id) === -1;
              });

              var filesOnlyOnDrive = onlyInLeft(remoteFiles, localFiles, fileIdsMatch);
              var filesOnlyOnLocal = onlyInLeft(localFiles, remoteFiles, fileIdsMatch);
              var filesOnBoth = intersectFiles(remoteFiles, localFiles, fileIdsMatch);

              var promises = [];
              var sequence = Promise.resolve();

              // Delete all the files that were deleted on both local and remote
              fileIdsDeletedOnBoth.map((function(id) {
                promises.push(this._backing.deleteFile(id));
              }).bind(this));


              sequence = filesOnlyOnDrive.reduce((function(sequence, driveFileInfo) {

                return sequence.then((function(driveFileInfo) {
                  var deletedLocally = fileIdsDeletedLocally.indexOf(driveFileInfo.id) !== -1;
                  return this._fileNotFoundLocally(driveFileInfo, deletedLocally);
                }).bind(this, driveFileInfo));

              }).bind(this), sequence);


              sequence = filesOnlyOnLocal.reduce((function(sequence, localFileInfo) {

                return sequence.then((function(localFileInfo) {
                  // we don't have it on remote, and we also marked it as deleted locally
                  var deletedLocally = fileIdsDeletedLocally.indexOf(localFileInfo.id) !== -1;
                  return this._fileNotFoundOnRemote(localFileInfo, deletedLocally);
                }).bind(this, localFileInfo));

              }).bind(this), sequence);


              sequence = filesOnBoth.reduce((function(sequence, files) {

                return sequence
                  .then((function(files) {
                    var driveFileInfo = files.drive;
                    var localFileInfo = files.local;


                    var tempFile = new File(new this._backing.instance(this._backing));
                    var hasLocalActionsPromise = tempFile.hasLocalActions(localFileInfo.id);

                    return hasLocalActionsPromise.then((function(hasLocalActions) {

                      if (
                        driveFileInfo.modifiedDate != localFileInfo.driveModifiedTime ||
                        hasLocalActions ||
                        driveFileInfo.title != localFileInfo.name) {

                        // Let the file check to make sure it is named properly and has all the actions
                        return this.loadFile(localFileInfo.id, true)
                          .then((function(fileObj) {

                            return fileObj.updateDriveModifiedTime(driveFileInfo.modifiedDate)
                              .then((function() {
                                return this.close(fileObj);
                              }).bind(this));
                          }).bind(this));
                      } else {
                        console.log("No local changes, skipping", localFileInfo.id);
                      }
                    }).bind(this));

                  }).bind(this, files));
              }).bind(this), sequence);

              promises.push(sequence);

              return Promise.all(promises)
            }).bind(this))
            .
          catch (function(error) {
            Rollbar.error("Sync failure", error);
            console.error(error, error.stack, error.message);
          })
            .then((function() {
              console.log("Completed checking for Drive updates");
            }).bind(this))
            .
          catch (function(error) {
            console.error(error, error.stack, error.message);
          });
        }).bind(this))
        .then(function() {
          SequentialHelper.endGlobalAction();
        });
    },


    _fileNotFoundLocally: function(fileInfo, deletedLocally) {
      if (deletedLocally) {
        console.log(fileInfo.id, "was deleted");
        // we need to see if the file remote actions match to
        // know whether we should actually delete it remotely.
        var tempFile = new File(new this._backing.instance(this._backing));
        return tempFile.remoteActionsMatch(fileInfo.id, this._newDriveInstance())
          .then((function(actionsMatch) {
            if (actionsMatch) {
              console.log("Deleting", fileInfo.id, "on remote");
              // delete it on the remote
              return this.deleteFile(fileInfo.id);
            } else {
              // unmark as deleted and load it so it will sync
              console.log("Readding", fileInfo.id, "on remote");
              var loadClose = this.loadFile(fileInfo.id)
                .then((function(file) {
                  return this.close(file);
                }).bind(this));

              return Promise.all([this._backing.unmarkFileAsDeleted(fileInfo.id), loadClose]);
            }
          }).bind(this));
      } else {

        return this._createFileFromRemote(fileInfo);
      }
    },

    _fileNotFoundOnRemote: function(fileInfo, deletedLocally) {
      if (deletedLocally) {
        return this.deleteFile(fileInfo.id, true);
      }

      // TODO: check if we deleted it remotely
      var deletedRemotely = !Helpers.isLocalGuid(fileInfo.id);

      if (deletedRemotely) {
        return this.deleteFile(fileInfo.id, true);
      }

      // load it and let it sync
      return this.loadFile(fileInfo.id, true)
        .then((function(file) {
          return this.close(file);
        }).bind(this));
    },

    getRemoteFileInfo: function(fileId) {
      return this.isReadableRemoteFile(fileId)
        .then((function(readable) {
          if (readable) {
            return this._driveBacking.getFileInfo(fileId);
          } else {
            throw "File does not exist or is not readable";
          }
        }).bind(this))
    },

    loadFileFromRemote: function(fileId) {
      return this.getRemoteFileInfo(fileId)
        .then((function(driveFileInfo) {
          return Promise.all([this._driveBacking.touchFile(fileId), this._createFileFromRemote(driveFileInfo)])
            .then(function(results) {
              return results[1];
            });
        }).bind(this))
    },

    _createFileFromRemote: function(driveFileInfo) {
      var newFile = {
        id: driveFileInfo.id,
        name: driveFileInfo.title,
        localModifiedTime: Date.now(),
        driveModifiedTime: driveFileInfo.modifiedDate,

        // I don't like this, but it is a 1px transparent png
        thumbnail: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==",
      };

      return this._createFile(newFile)
        .then((function(file) {
          return this.close(file);
        }).bind(this))
        .then((function() {
          return newFile
        }).bind(this))
    },

    isReadableRemoteFile: function(fileId) {
      if (!Online.isOnline()) {
        return Promise.reject(new Error("Not connected to drive"));
      }

      return this._driveBacking.canReadFile(fileId);
    },

    shareFilePublicly: function(fileId) {
      if (!Online.isOnline()) {
        return Promise.reject(new Error("Not connected to drive"));
      }

      return this._driveBacking.shareFilePublicly(fileId);
    },

    disablePublicFile: function(fileId) {
      if (!Online.isOnline()) {
        return Promise.reject(new Error("Not connected to drive"));
      }

      return this._driveBacking.disablePublicFile(fileId);
    },

    getFilePermissions: function(fileId) {
      if (!Online.isOnline()) {
        return Promise.reject(new Error("Not connected to drive"));
      }

      return this._driveBacking.getFilePermissions(fileId);
    },

    clearLocal: function() {
      return this._backing.clearAll()
        .then((function() {
          // Reinit a new database
          this._backing.init();
        }).bind(this));
    },

    fileExists: function(fileId) {
      return this._backing.fileExists(fileId);
    }
  });

  return Data;
});