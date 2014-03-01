define(["class", "event", "helpers"], function(Class, Event, Helpers) {
  var File = Class.extend({
    fileInfo: null,

    _cachedActions: null,

    _backing: null,
    _driveBacking: null,

    _addedCallback: null,
    _removedCallback: null,

    _loadCallbacks: null,

    init: function(backing) {
      // Create our backing instance
      this._backing = backing;

      this._loadCallbacks = [];
    },

    remoteActionsMatch: function(fileId, driveBacking, callback) {
      this._backing.load(fileId, (function(localInfo) {
        driveBacking.load(fileId, (function() {
          this._backing.getActions((function(localActions) {
            driveBacking.getActions((function(remoteActions) {

              // If the lengths don't match, they aren't equal
              if (localActions.remote.length != remoteActions) {
                callback(false);
                return;
              }

              for (var i = 0; i < localActions.remote.length; i++) {
                if (localActions.remote[i].id != remoteActions[i]) {
                  callback(false);
                  return;
                }
              }

              callback(true);
              return;
            }).bind(this));
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    load: function(fileId, callback) {
      this._backing.load(fileId, (function(fileInfo) {
        var actionsObj = {
          remoteActions: [],
          localActions: [],
          redoStack: []
        };

        this._backing.getActions((function(actions) {
          actionsObj.remoteActions = actions.remote;
          actionsObj.localActions = actions.local;

          this.fileInfo = fileInfo;
          this._cachedActions = actionsObj;

          callback();

          console.log("loaded for", this.fileInfo.id);

          // now that we have loaded, make sure we call all the things that
          // want to know when we are loaded
          for (var i = 0; i < this._loadCallbacks.length; i++) {
            var loadCallback = this._loadCallbacks[i];
            loadCallback.func.apply(this, loadCallback.args);
          }
        }).bind(this));
      }).bind(this));
    },

    create: function(file, callback) {
      this._backing.create(file, (function() {
        this.load(file.id, function() {
          callback();
        });
      }).bind(this));
    },

    afterLoad: function(callback) {
      // If we have already loaded, call the callback immediately
      if (this.fileInfo) {
        callback();
        return;
      }

      this._doAfterLoad(callback, []);
    },

    _doAfterLoad: function(func, args) {
      console.log("Do after load", func, args);
      this._loadCallbacks.push({
        func: func,
        args: args
      })
    },

    rename: function(newName) {
      this.fileInfo.name = newName;
      this._backing.rename(newName);

      if (this._driveBacking) {
        this._driveBacking.rename(newName);
      }

      Event.trigger("fileRenamed", this.fileInfo);
      Event.trigger("fileModified", this.fileInfo);
    },

    startDrive: function(driveBacking) {
      console.log("Want to start drive for", this.fileInfo.id);

      if (!this.fileInfo) {
        this._doAfterLoad(this.startDrive, [driveBacking]);
        return;
      }

      console.log("Starting drive for", this.fileInfo.id);
      // process things on drive for updates

      driveBacking.listen(this._remoteActionsAdded.bind(this), this._remoteActionsRemoved.bind(this));

      this.sync(driveBacking);

    },

    sync: function(driveBacking) {
      driveBacking = this._driveBacking || driveBacking;

      // if this fileId exists on drive, great, it's a match
      // if it doesn't, then it either has never been uploaded, or was deleted on the server
      // regardless, it's open, so we should upload it to drive

      driveBacking._parent.getFiles((function(driveFiles) {

        var found = false;
        for (var i in driveFiles) {
          if (driveFiles[i].id == this.fileInfo.id) {
            found = i;
            break;
          }
        }

        if (found !== false) {
          console.log("Found file", this.fileInfo.id, "on drive");
          // the file was found on drive
          // load it and sync actions
          // sync actions

          this._driveBacking = driveBacking;

          if (driveFiles[i].title != this.fileInfo.name) {
            // File names don't match, remote wins
            this.rename(driveFiles[i].title);
          }

          this._syncRemoteActionsFromDrive();
        } else {
          console.log("File not found on drive", this.fileInfo.id);
          // this file was not found
          // so we will create a new file on drive, 
          // and then copy everything over to it

          var oldId = this.fileInfo.id;

          driveBacking.create(this.fileInfo, (function(newFile) {
            this._driveBacking = driveBacking;

            // Google saved a file, redo the id of the file locally to match drive
            this._backing.replaceFileId(newFile.id, (function() {
              this.load(newFile.id, (function() {
                this._moveSettings(oldId);

                Event.trigger("fileIdChanged", {
                  oldId: oldId,
                  newId: this.fileInfo.id
                });
              }).bind(this));
            }).bind(this));
          }).bind(this));
        }
      }).bind(this));
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
      if (settings) {
        localStorage[this.fileInfo.id] = JSON.stringify(settings);
      }

      if (!localStorage[this.fileInfo.id]) {
        localStorage[this.fileInfo.id] = JSON.stringify({
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

      return JSON.parse(localStorage[this.fileInfo.id]);
    },

    _moveSettings: function(oldId) {
      if (localStorage[oldId]) {
        localStorage[this.fileInfo.id] = localStorage[oldId];
        delete localStorage[oldId];
      }
    },

    undo: function() {
      if (this._driveBacking) {
        this._driveBacking.undo();
        return;
      }

      if (this._cachedActions.localActions.length == 0) {
        return false; // no actions to undo
      } else {
        var lastAction = this._cachedActions.localActions.pop();
        this._cachedActions.redoStack.push(lastAction);

        this._backing.removeLocalAction(lastAction.id);

        Event.trigger("actionRemoved");
        Event.trigger("fileModified", this.fileInfo);
      }
    },

    redo: function() {
      if (this._driveBacking) {
        this._driveBacking.redo();
        return;
      }

      if (this._cachedActions.redoStack.length == 0) {
        return false; // no actions to undo
      } else {
        var action = this._cachedActions.redoStack.pop();
        this.addAction(action);

        this._backing.addLocalAction(action);
      }
    },

    addAction: function(action) {
      console.log("adding action", action);
      this._cachedActions.localActions.push(action);

      Event.trigger("actionAdded", {
        isLocal: true,
        items: [action]
      });

      this._backing.addLocalAction(action);

      if (this._driveBacking) {
        this._driveBacking.addAction(action);
      }

      Event.trigger("fileModified", this.fileInfo);
    },

    delete: function() {
      this.close();
      this._backing.delete();
    },

    close: function() {

    },

    clearAll: function() {
      console.error("Implement this function");
    },

    _syncRemoteActionsFromDrive: function() {
      this._driveBacking.load(this.fileInfo.id, (function() {
        this._driveBacking.getActions((function(remoteActions) {
          this._backing.getActions((function(localActions) {

            // if local is shorter, then something was added to remote
            // if remote is shorter, then something was removed from remote

            var shorter = remoteActions.length < localActions.remote.length ? remoteActions : localActions.remote;
            var diverges = -1;

            for (var j = 0; j < shorter.length; j++) {
              if (remoteActions[j].id != localActions.remote[j].id) {
                diverges = j;
                break;
              }
            }

            // Only modify things if we need to
            if (diverges !== -1 || remoteActions.length != localActions.remote.length) {
              console.log("differences between remote and local actions", this.fileInfo.id);

              if (diverges != -1) {
                // get the remote actions after the diverge
                var remoteActionsAfterDiverge = remoteActions.slice(diverges);

                // remove the actions in local after the diverge
                this._backing.removeRemoteActions(diverges, localActions.remote.length - diverges);

                // we need to add indexes to these items
                var items = this._indexify(remoteActionsAfterDiverge, diverges);
                this._backing.addRemoteActions(diverges, items);
                // insert the remote actions after diverge into local actions
              } else if (shorter == remoteActions) {
                // remove the actions after diverge from local
                this._backing.removeRemoteActions(remoteActions.length, localActions.remote.length - remoteActions.length);
              } else {
                // shorter must be the local one
                // add the remote actions after the local ones
                var remoteActionsAfterLocal = remoteActions.slice(localActions.remote.length);

                var items = this._indexify(remoteActionsAfterLocal, localActions.remote.length);
                this._backing.addRemoteActions(localActions.remote.length, items);
              }

              Event.trigger("actionAdded", {
                isLocal: false,
                items: []
              });
            }

            // send all of the local actions
            for (var j = 0; j < localActions.local.length; j++) {
              this._driveBacking.addAction(localActions.local[j]);
            }
          }).bind(this));
        }).bind(this));
      }).bind(this));

      // and the remote has all the local actions
    },

    _remoteActionsAdded: function(data) {
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

          this._backing.removeLocalAction(data.values[i].id);
        }
      }

      // put the items into the remoteActions
      Array.prototype.splice.apply(this._cachedActions.remoteActions, [data.index, 0].concat(data.values));

      var items = this._indexify(data.values, data.index);

      console.log("adding to remote", this.fileInfo.id, items);

      // insert them into storage
      this._backing.addRemoteActions(data.index, items);

      if (this._addedCallback) {
        this._addedCallback({
          isLocal: data.isLocal,
          items: items
        });
      }

      Event.trigger("fileModified", this.fileInfo);
    },

    _remoteActionsRemoved: function(data) {
      console.log("removed", data);

      // remove it from the remoteActions
      this._cachedActions.remoteActions.splice(data.index, data.values.length);

      this._backing.removeRemoteActions(data.index, data.values.length);

      if (this._removedCallback) {
        this._removdCallback();
      }

      Event.trigger("fileModified", this.fileInfo);
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