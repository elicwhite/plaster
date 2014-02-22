define(["class", "helpers", "event", "dataBacking/indexedDBBacking", "dataBacking/webSQLBacking", "dataBacking/driveBacking", "event"], function(Class, Helpers, Event, IndexedDBBacking, WebSQLBacking, DriveBacking, Event) {
  var Data = Class.extend({
    _backing: null,
    _driveBacking: null,

    _cachedFiles: null,

    _currentFile: null,
    _cachedActions: null,


    // If other ops are called before getFiles is loaded, add them here and do them later
    _loadCallbacks: null,

    init: function() {
      this._loadCallbacks = [];


      var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

      if (indexedDB) {
        console.log("Using IndexedDB as data store");
        this._backing = new IndexedDBBacking();
      } else {
        console.log("Using WebSQL as data store");
        this._backing = new WebSQLBacking();
      }

      window.back = this._backing;

      //Event.addListener("fileModified", this._fileModified.bind(this));
    },

    // FILE METHODS
    getFiles: function(callback) {
      if (this._cachedFiles) {
        callbacks(this._cachedFiles);
      } else {
        this._backing.getFiles((function(files) {
          this._cachedFiles = files;
          callback(this._cachedFiles);

          // Go through all our delayed callbacks
          for (var i = 0; i < this._loadCallbacks.length; i++) {
            var loadCallback = this._loadCallbacks[i];
            loadCallback.func.apply(this, loadCallback.args);
          }
        }).bind(this));
      }
    },

    createFile: function() {
      var newFile = {
        id: Helpers.getGuid(),
        name: "Untitled File",
        modifiedTime: Date.now()
      };

      this._cachedFiles.push(newFile);

      Event.trigger("fileAdded", newFile);

      this._backing.createFile(newFile, (function(localFile) {
        if (this._driveBacking) {
          this._driveBacking.createFile((function(file) {
            // Google saved a file, redo the id of the file locally to match drive

            this._backing.replaceFileId(newFile, file.id)
          }).bind(this));
        }
      }).bind(this));
    },

    deleteFile: function(fileId) {
      var file = this._getFile(fileId);

      delete this._cachedFiles[this._cachedFiles.indexOf(file)];

      this._backing.deleteFile(file.id);

      if (this._driveBacking) {
        this._driveBacking.deleteFile(file.id);
      }

      Event.trigger("fileRemoved", file);
      return;
    },

    renameFile: function(fileId, newFileName) {
      var file = this._getFile(fileId);

      file.name = newFileName;

      this._backing.renameFile(file.id, newFileName);

      if (this._driveBacking) {
        this._driveBacking.renameFile(file.id, newFileName);
      }

      Event.trigger("fileRenamed", file);
      Event.trigger("fileModified", file);
      return;
    },

    loadFile: function(fileId, callback) {
      if (!this._cachedFiles) {
        this._doLater(this.loadFile, [fileId, callback]);
        return;
      }

      if (this._currentFile && this._currentFile.id == fileId) {
        callback();
      } else {

        console.log("Loading file", fileId);
        var file = this._getFile(fileId);

        var actionsObj = {
          file: file,
          remoteActions: [],
          localActions: [],
          redoStack: []
        };


        this._backing.getFileActions(fileId, (function(actions) {
          actionsObj.remoteActions = actions.remote;
          actionsObj.localActions = actions.local;

          this._currentFile = file;

          this._cachedActions = actionsObj;

          callback();
        }).bind(this));

        if (this._driveBacking) {
          this._driveBacking._getModel(fileId, function() {});
        }
      }
    },

    getFileActions: function() {
      if (!this._cachedFiles) {
        this._doLater(this.getFileActions, []);
        return;
      }

      return this._cachedActions.remoteActions.concat(this._cachedActions.localActions);
    },

    addAction: function(action) {
      console.log("adding action", action);
      this._cachedActions.localActions.push(action);
      Event.trigger("actionAdded", {
        isLocal: true,
        items: [action]
      });

      this._backing.addLocalAction(this._currentFile.id, action);

      if (this._driveBacking) {
        this._driveBacking.addAction(this._currentFile.id, action);
      }

      Event.trigger("fileModified", this._cachedActions.file);
    },

    undoAction: function() {
      if (this._driveBacking) {
        this._driveBacking.undo(this._currentFile.id);
        return;
      }

      if (this._cachedActions.localActions.length == 0) {
        return false; // no actions to undo
      } else {
        var lastAction = this._cachedActions.localActions.pop();
        this._cachedActions.redoStack.push(lastAction);

        this._backing.removeLocalAction(this._currentFile.id, lastAction.id);

        Event.trigger("actionRemoved");
        Event.trigger("fileModified", this._currentFile);
      }
    },

    redoAction: function() {
      if (this._driveBacking) {
        this._driveBacking.redo(this._currentFile.id);
        return;
      }


      if (this._cachedActions.redoStack.length == 0) {
        return false; // no actions to undo
      } else {
        var action = this._cachedActions.redoStack.pop();
        this.addAction(action);

        this._backing.addLocalAction(this._currentFile.id, action);
      }
    },



    startDrive: function() {
      console.log("Starting Drive Data");
      this._driveBacking = new DriveBacking(this._remoteActionsAdded.bind(this), this._remoteActionsRemoved.bind(this));
      window.drive = this._driveBacking;

      this._loadFromDrive();
    },

    _remoteActionsAdded: function(data) {
      console.log("added--", data);
      window.d = data;

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

          this._backing.removeLocalAction(this._currentFile.id, data.values[i].id);
        }
      }

      // put the items into the remoteActions
      Array.prototype.splice.apply(this._cachedActions.remoteActions, [data.index, 0].concat(data.values));

      var items = [];
      // put indexes on the items
      for (var i = 0; i < data.values.length; i++) {
        var item = Helpers.clone(data.values[i]);
        item.index = data.index + i;
        items.push(item);
      }

      console.log("adding to remote", items);

      // insert them into storage
      this._backing.addRemoteActions(this._currentFile.id, data.index, items);

      Event.trigger("actionAdded", {
        isLocal: data.isLocal,
        items: items
      });

      Event.trigger("fileModified", this._currentFile);
    },

    _remoteActionsRemoved: function(data) {
      console.log("removed", data);

      // remove it from the remoteActions
      this._cachedActions.remoteActions.splice(data.index, data.values.length);

      this._backing.removeRemoteActions(this._currentFile.id, data.index, data.values.length);

      Event.trigger("actionRemoved");
      Event.trigger("fileModified", this._currentFile);
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
          scale: 1,
          color: "#000",
          tools: {
            point: "pencil",
            gesture: null,
            scroll: "pan"
          }
        });
      }

      return JSON.parse(localStorage[fileId]);
    },

    _getFile: function(fileId) {
      for (var i in this._cachedFiles) {
        if (this._cachedFiles[i].id == fileId) {
          return this._cachedFiles[i];
        }
      }
    },

    _doLater: function(func, args) {
      this._loadCallbacks.push({
        func: func,
        args: args
      })
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


    // Called when we initialize drive. Grab everything new from drive and put it into 
    // storage
    _loadFromDrive: function(callback) {
      // Look for new files on drive
      // add them and all their actions

      // all local files, look for actions that are currently on files on drive and sync them

      console.log("checking drive for new files");
      this._driveBacking.getFiles((function(remoteFiles) {
        this._backing.getFiles((function(localFiles) {

          window.rem = remoteFiles;
          window.loc = localFiles;

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
              console.log("File", remoteFiles[i].id, "is new on drive");

              var newFile = {
                id: file.id,
                name: file.title,
                modifiedTime: (new Date(file.modifiedDate)).getTime()
              };

              // this file is remote, but not local, add it to local
              this._backing.createFile(newFile, (function() {
                console.log("file created locally");
                // we now need to get all the actions from drive and add them to local
                this._driveBacking.getFileActions(file.id, (function(actions) {
                  console.log("got actions", actions);


                  var items = this._indexify(actions, 0);
                  
                  console.log("got remote actions, saving", items);

                  this._backing.addRemoteActions(file.id, 0, items);

                  Event.trigger("fileAdded", newFile);
                }).bind(this));
              }).bind(this));
            } else {
              // we have this file on both local and server
              // make sure we have all the remote actions

              this._driveBacking.getFileActions(file.id, (function(remoteActions) {
                this._backing.getFileActions(file.id, (function(localActions) {
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
                    console.log("differences between remote and local actions");

                    debugger;
                    if (diverges != -1) {
                      // get the remote actions after the diverge
                      var remoteActionsAfterDiverge = remoteActions.slice(diverges);

                      // remove the actions in local after the diverge
                      this._backing.removeRemoteActions(file.id, diverges, localActions.remote.length - diverges);
                      
                      // we need to add indexes to these items
                      var items = this._indexify(remoteActionsAfterDiverge, diverges);
                      this._backing.addRemoteActions(file.id, diverges, remoteActionsAfterDiverge);
                      // insert the remote actions after diverge into local actions
                    } else if (shorter == remoteActions) {
                      // remove the actions after diverge from local
                      this._backing.removeRemoteActions(file.id, remote.length, localActions.remote.length - remoteActions.length);
                    } else {
                      // shorter must be the local one
                      // add the remote actions after the local ones
                      var remoteActionsAfterLocal = remoteActions.slice(localActions.remote.length);

                      var items = this._indexify(remoteActionsAfterLocal, localActions.remote.length);
                      this._backing.addRemoteActions(file.id, localActions.remote.length, items);
                    }

                    Event.trigger("actionAdded", {
                      isLocal: false,
                      items: []
                    });
                  }

                }).bind(this));
              }).bind(this));

              // and the remote has all the local actions
            }
          }

        }).bind(this));
      }).bind(this));
    }
  });

  var data = new Data();
  window.data = data

  return data;
});