define(["class", "event", "helpers", "sequentialHelper", "components/thumbnail"], function(Class, Event, Helpers, SequentialHelper, Thumbnail) {
  var File = Class.extend({
    fileInfoPromise: null,

    _cachedActions: null,

    _backing: null,
    _driveBacking: null,

    _addedCallback: null,
    _removedCallback: null,

    _loadCallbacks: null,

    _syncPromise: null,

    init: function(backing) {
      // Create our backing instance
      this._backing = backing;

      this._loadCallbacks = [];
    },

    remoteActionsMatch: function(fileId, driveBacking) {
      return Promise.all([this._backing.load(fileId), driveBacking.load(fileId)])
        .then((function() {
          var localActionsPromise = this._backing.getActions();
          var remoteActionsPromise = driveBacking.getActions();

          return Promise.all([localActionsPromise, remoteActionsPromise])
            .then(function(results) {
              var localActions = results[0];
              var remoteActions = results[1];

              // If the lengths don't match, they aren't equal
              if (localActions.remote.length != remoteActions) {
                return false;
              }

              for (var i = 0; i < localActions.remote.length; i++) {
                if (localActions.remote[i].id != remoteActions[i]) {
                  return false;
                }
              }

              return true;
            });
        }).bind(this));
    },

    load: function(fileId, callback) {
      var fileInfoPromise = this._backing.load(fileId);

      return fileInfoPromise
        .then((function() {
          return this._backing.getActions()
        }).bind(this))
        .then((function(actions) {
          var actionsObj = {
            remoteActions: [],
            localActions: [],
            redoStack: []
          };

          actionsObj.remoteActions = actions.remote;
          actionsObj.localActions = actions.local;

          this._cachedActions = actionsObj;

          this.fileInfoPromise = fileInfoPromise;
          return this;
        }).bind(this));
    },

    create: function(file, callback) {
      return this._backing.create(file)
        .then((function() {
          return this.load(file.id);
        }).bind(this));
    },

    rename: function(newName) {

      return this.fileInfoPromise.then((function(fileInfo) {


        fileInfo.name = newName;
        Event.trigger("fileRenamed", fileInfo);
        Event.trigger("fileModified", fileInfo);

        this.fileInfoPromise = Promise.cast(fileInfo);

        var promises = [];
        promises.push(this.fileInfoPromise);
        promises.push(this._backing.rename(newName));

        if (this._driveBacking) {
          promises.push(SequentialHelper.startLockedAction(fileInfo.id)
            .then((function() {
              return this._driveBacking.rename(newName);
            }).bind(this))
            .then((function() {
              SequentialHelper.endLockedAction(fileInfo.id);
            }).bind(this)))

        }

        return Promise.all(promises)
      }).bind(this));
    },

    startDrive: function(driveBacking) {
      // process things on drive for updates
      driveBacking.listen(this._remoteActionsAdded.bind(this), this._remoteActionsRemoved.bind(this));


      return this.fileInfoPromise
        .then((function(fileInfo) {
          console.log("Starting drive for file", fileInfo.id);
          return this.sync(driveBacking)
            .then((function() {
              this._driveBacking = driveBacking;
            }).bind(this))
            .
          catch (function(error) {
            console.error(error.stack, error.message);
          })
            .then(function() {
              console.log("Completed file sync", fileInfo.id);
            });

        }).bind(this))
    },

    sync: function(driveBacking) {
      driveBacking = this._driveBacking || driveBacking;



      // if this fileId exists on drive, great, it's a match
      // if it doesn't, then it either has never been uploaded, or was deleted on the server
      // regardless, it's open, so we should upload it to drive

      this._syncPromise = Promise.all([this.fileInfoPromise, driveBacking._parent.getFiles()])
        .then((function(results) {
          var fileInfo = results[0];
          var driveFiles = results[1];

          console.log("Starting file sync", fileInfo.id);

          var promises = [];

          var found = false;
          for (var i in driveFiles) {
            if (!driveFiles[i] || !fileInfo) {
              debugger;
            }

            if (driveFiles[i].id == fileInfo.id) {
              found = i;
              break;
            }
          }


          if (found !== false) {
            console.log("Found file", fileInfo.id, "on drive");
            // the file was found on drive
            // load it and sync actions
            // sync actions

            if (driveFiles[i].title != fileInfo.name) {
              // File names don't match, remote wins
              promises.push(this.rename(driveFiles[i].title));
            }

            promises.push(this._syncRemoteActionsFromDrive(driveBacking));
          } else {
            console.log("File not found on drive", fileInfo.id);
            // this file was not found
            // so we will create a new file on drive, 
            // and then copy everything over to it

            var oldId = fileInfo.id;

            promises.push(
              SequentialHelper.startLockedAction(oldId)
              .then(function() {
                return driveBacking.create(fileInfo)
              })
              .then((function(newFile) {
                // Google saved a file, redo the id of the file locally to match drive
                return this._backing.replaceFileId(newFile.id)
                  .then((function() {
                    return this.load(newFile.id);
                  }).bind(this))
                  .then((function() {

                    return this._moveSettings(oldId)
                  }).bind(this))
                  .then(function() {
                    Event.trigger("fileIdChanged", {
                      oldId: oldId,
                      newId: newFile.id
                    });
                  })
                  .then((function() {
                    return this._backing.getActions();
                  }).bind(this))
                  .then((function(localActions) {
                    return this._sendAllActions(localActions.local, driveBacking)
                  }).bind(this))
                  .then(function() {
                    SequentialHelper.endLockedAction(newFile.id);
                  });

              }).bind(this)));
          }

          return Promise.all(promises)
        }).bind(this))
        .then((function() {
          this._syncPromise = null;
        }).bind(this))
        .
      catch (function(error) {
        console.error(error, error.stack, error.message);
      });

      return this._syncPromise;
    },

    listen: function(addedCallback, removedCallback) {
      this._addedCallback = addedCallback;
      this._removedCallback = removedCallback;
    },

    stopListening: function() {
      this._addedCallback = null;
      this._removedCallback = null;
    },

    getActions: function() {
      return this._cachedActions.remoteActions.concat(this._cachedActions.localActions);
    },

    localSettings: function(settings) {
      return this.fileInfoPromise
        .then((function(fileInfo) {

          if (settings) {
            localStorage[fileInfo.id] = JSON.stringify(settings);
          }

          if (!localStorage[fileInfo.id]) {
            localStorage[fileInfo.id] = JSON.stringify({
              offsetX: 0,
              offsetY: 0,
              scale: 1,
              color: "#000",
              tools: {
                point: "pencil",
                gesture: null,
                scroll: "pan"
              }
            });
          }

          return JSON.parse(localStorage[fileInfo.id]);
        }).bind(this));
    },

    _moveSettings: function(oldId) {
      if (localStorage[oldId]) {
        return this.fileInfoPromise
          .then(function(fileInfo) {
            localStorage[fileInfo.id] = localStorage[oldId];
            delete localStorage[oldId];
          });
      }

      return Promise.resolve();
    },

    undo: function() {
      if (this._driveBacking) {
        return this._driveBacking.undo();
      }

      if (this._cachedActions.localActions.length == 0) {
        return Promise.cast(false); // no actions to undo
      } else {
        var lastAction = this._cachedActions.localActions.pop();
        this._cachedActions.redoStack.push(lastAction);

        this.fileInfoPromise.then(function(fileInfo) {
          Event.trigger("fileModified", fileInfo);
        });

        return this._backing.removeLocalAction(lastAction.id);
      }
    },

    redo: function() {
      if (this._driveBacking) {
        return this._driveBacking.redo();
      }

      if (this._cachedActions.redoStack.length == 0) {
        return Promise.cast(false); // no actions to undo
      } else {
        var action = this._cachedActions.redoStack.pop();
        return this.addAction(action);
      }
    },

    addAction: function(action) {
      this._cachedActions.localActions.push(action);

      this.fileInfoPromise.then(function(fileInfo) {
        Event.trigger("fileModified", fileInfo);
      });


      var promises = [];

      promises.push(this._backing.addLocalAction(action));

      if (this._driveBacking) {
        promises.push(this._driveBacking.addAction(action));
      }

      return Promise.all(promises)
        .then((function() {
          return this.fileInfoPromise;
        }).bind(this))
        .
      catch (function(error) {
        console.error(error.stack, error.message);
      });
    },

    delete: function() {
      this.close()
        .then(this._backing.delete);
    },

    close: function() {
      var prom = Promise.resolve();

      // Only close after sync is done, if sync is running
      if (this._syncPromise) {
        prom = this._syncPromise;
      }

      return prom.then((function() {
        this.fileInfoPromise.then((function(fileInfo) {
          console.log("Closing file", fileInfo.id);
          this.fileInfoPromise = Promise.reject(new Error("File has been closed"));
        }).bind(this));

        var promises = [];

        promises.push(this._backing.close());

        if (this._driveBacking) {
          promises.push(this._driveBacking.close());
        }

        return Promise.all(promises);
      }).bind(this))
    },

    _syncRemoteActionsFromDrive: function(driveBacking) {

      return this.fileInfoPromise.then((function(fileInfo) {

        var driveActionsPromise = driveBacking.load(fileInfo.id)
          .then((function() {
            return driveBacking.getActions()
          }).bind(this));


        // TODO: THIS LINE SUCKS! the file is already closed, can't get the actions
        var localActionsPromise = this._backing.getActions();

        return Promise.all([fileInfo, driveActionsPromise, localActionsPromise]);
      }).bind(this))
        .then((function(results) {
          var fileInfo = results[0]
          var remoteActions = results[1];
          var localActions = results[2];

          var promises = [];


          var shorter = remoteActions.length < localActions.remote.length ? remoteActions : localActions.remote;
          var diverges = -1;

          for (var j = 0; j < shorter.length; j++) {
            if (remoteActions[j].id != localActions.remote[j].id) {
              diverges = j;
              break;
            }
          }

          // Did we get new changes from drive that we should notify about
          var sendUpdate = false;

          // Only modify things if we need to
          if (diverges !== -1 || remoteActions.length != localActions.remote.length) {
            console.log("Differences between remote and local actions", fileInfo.id);
            sendUpdate = true;

            if (diverges != -1) {
              // get the remote actions after the diverge
              var remoteActionsAfterDiverge = remoteActions.slice(diverges);

              // we need to add indexes to these items
              var items = this._indexify(remoteActionsAfterDiverge, diverges);

              // remove the actions in local after the diverge
              promises.push(this._backing.removeRemoteActions(diverges, localActions.remote.length - diverges)
                .then((function() {

                  // insert the remote actions after diverge into local actions
                  this._backing.addRemoteActions(diverges, items);
                }).bind(this)));

            } else if (shorter == remoteActions) {
              // remove the actions after diverge from local
              promises.push(this._backing.removeRemoteActions(remoteActions.length, localActions.remote.length - remoteActions.length));
            } else {
              // shorter must be the local one
              // add the remote actions after the local ones
              var remoteActionsAfterLocal = remoteActions.slice(localActions.remote.length);

              var items = this._indexify(remoteActionsAfterLocal, localActions.remote.length);
              promises.push(this._backing.addRemoteActions(localActions.remote.length, items));
            }

            // there was a difference, lets fix our cachedActions
            this._cachedActions.remoteActions = remoteActions;
          }

          promises.push(this._sendAllActions(localActions.local, driveBacking));

          return Promise.all(promises)
            .then((function() {
              if (sendUpdate) {
                Event.trigger("fileModifiedRemotely", fileInfo);

                return this.updateThumbnail();
              }
            }).bind(this));
        }).bind(this));
    },

    _sendAllActions: function(actions, driveBacking) {
      var promises = [];

      for (var j = 0; j < actions.length; j++) {
        promises.push(driveBacking.addAction(actions[j]));
      }

      return Promise.all(promises);
    },

    _remoteActionsAdded: function(data) {
      var promises = [];

      if (data.isLocal) {
        // go through each item to insert
        for (var i = 0; i < data.values.length; i++) {
          // delete them from local
          for (var j = 0; j < this._cachedActions.localActions.length; j++) {
            if (this._cachedActions.localActions[j].id == data.values[i].id) {
              this._cachedActions.localActions.splice(j, 1);
              break;
            }
          }

          promises.push(this._backing.removeLocalAction(data.values[i].id));
        }
      }

      // put the items into the remoteActions
      Array.prototype.splice.apply(this._cachedActions.remoteActions, [data.index, 0].concat(data.values));

      var items = this._indexify(data.values, data.index);

      // insert them into storage
      promises.push(this._backing.addRemoteActions(data.index, items));

      if (this._addedCallback) {
        this._addedCallback({
          isLocal: data.isLocal,
          items: items
        });
      }

      promises.push(this.fileInfoPromise.then(function(fileInfo) {
        Event.trigger("fileModifiedRemotely", fileInfo);
        Event.trigger("fileModified", fileInfo);
      }));

      return Promise.all(promises).then((function() {
        return this.updateThumbnail();
      }).bind(this));
    },

    _remoteActionsRemoved: function(data) {
      // remove it from the remoteActions
      this._cachedActions.remoteActions.splice(data.index, data.values.length);

      var promises = [];
      promises.push(this._backing.removeRemoteActions(data.index, data.values.length));

      if (this._removedCallback) {
        promises.push(this._removedCallback());
      }

      promises.push(this.fileInfoPromise.then(function(fileInfo) {
        Event.trigger("fileModified", fileInfo);
      }));

      return Promise.all(promises).then((function() {
        return this.updateThumbnail();
      }).bind(this));
    },

    updateThumbnail: function() {
      return this.localSettings()
        .then((function(settings) {
          var dataURL = Thumbnail.render(settings, this.getActions());

          return this.fileInfoPromise.then((function(fileInfo) {
            fileInfo.thumbnail = dataURL;
            Event.trigger("thumbnailUpdated", fileInfo);
            this.fileInfoPromise = Promise.cast(fileInfo);

            return this._backing.updateThumbnail(dataURL);
          }).bind(this))
        }).bind(this));
    },

    _indexify: function(actions, startIndex) {
      var items = [];
      // put indexes on the items
      for (var i = 0; i < actions.length; i++) {
        var item = Helpers.clone(actions[i]);
        item.index = i + startIndex;
        items.push(item);
      }

      return items;
    },
  });

  return File;
});