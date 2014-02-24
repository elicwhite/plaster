define(["class", "event"], function(Class, Event) {
  var File = Class.extend({
    fileInfo: null,

    _cachedActions: null,

    _backing: null,
    _driveBacking: null,

    init: function(backing) {
      // Create our backing instance
      this._backing = backing;
    },

    load: function(fileId, callback) {
      /*
        populate _cachedActions from indexedDB
      */

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
        }).bind(this));
      }).bind(this));
    },

    create: function(file, callback) {
      /*
        create a file in indexeddb with the info from file, and then load it
      */

      this._backing.create(file, (function() {
        this.load(file.id, function() {
          callback();
        });
      }).bind(this));
    },

    rename: function(newName) {
      this.fileInfo.name = newName;
      this._backing.rename(newName);

      if (this._driveBacking) {
        this._driveBacking.rename(newFileName);
      }

      Event.trigger("fileRenamed", this.fileInfo);
      Event.trigger("fileModified", this.fileInfo);
    },

    startDrive: function(driveBacking) {
      // process things on drive for updates
      this._driveBacking = driveBacking;

      // if this fileId exists on drive, great, it's a match
      // if it doesn't, then it either has never been uploaded, or was deleted on the server
      // regardless, it's open, so we should upload it to drive

      this._driveBacking.getFiles((function(driveFiles) {
        
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
          this._syncRemoteActionsFromDrive();
          this._driveBacking.load(this.fileInfo.id, (function() {

          }).bind(this));
        } else {
          console.log("File not found on drive", this.fileInfo.id);
          // this file was not found
          // so we will create a new file on drive, 
          // and then copy everything over to it

          this._driveBacking.create(this.fileInfo, (function(newFile) {
            // Google saved a file, redo the id of the file locally to match drive
            this._backing.replaceFileId(newFile.id, (function() {
              Event.trigger("fileIdChanged", {
                oldId: file.id,
                newFile: this.fileInfo
              });

              this.load(file.id, function() {

              });
            }).bind(this));
          }).bind(this));
        }

      }).bind(this));
    },

    _syncRemoteActionsFromDrive: function() {
      this._driveBacking.load(this.fileInfo.id, (function() {
        this._driveBacking.getActions((function(remoteActions) {
          var localActions = this.getActions();

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

          //TODO: Make these also update the cached actions

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

      // and the remote has all the local actions
    }


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

    undo: function() {
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
  });

  return File;
});