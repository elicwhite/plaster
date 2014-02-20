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

      this._backing.createFile(newFile, (function(localFile) {}).bind(this));
    },

    deleteFile: function(fileId) {
      var file = this._getFile(fileId);

      delete this._cachedFiles[this._cachedFiles.indexOf(file)];

      this._backing.deleteFile(file.id);

      Event.trigger("fileRemoved", file);
      return;
    },

    renameFile: function(fileId, newFileName) {
      var file = this._getFile(fileId);

      file.name = newFileName;

      this._backing.renameFile(file.id, newFileName);

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

        this._currentFile = file;

        var actionsObj = {
          file: file,
          remoteActions: [],
          localActions: [],
          redoStack: []
        };

        this._backing.getFileActions(fileId, (function(actions) {
          console.log("got results for", fileId, actions);
          actionsObj.remoteActions = actions.remote;
          actionsObj.localActions = actions.local;

          this._cachedActions = actionsObj;

          callback();
        }).bind(this));
      }
    },

    getFileActions: function() {
      if (!this._cachedFiles) {
        this._doLater(this.getFileActions, []);
        return;
      }

      if (!this._cachedActions) {
        debugger;
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

      Event.trigger("fileModified", this._cachedActions.file);
    },

    undoAction: function() {
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
      if (this._cachedActions.redoStack.length == 0) {
        return false; // no actions to undo
      } else {
        var action = this._cachedActions.redoStack.pop();
        this.addAction(action);

        this._backing.addLocalAction(this._currentFile.id, action);
      }
    },

    // events fileAdded(file), fileRemoved(file)

    /*

    startDrive: function() {
      console.log("Starting Drive Data");
      this._driveBacking = new DriveBacking(this._remoteActionsAdded.bind(this), this._remoteActionsRemoved.bind(this));
      window.drive = this._driveBacking;

      //this._useDrive = true;
    },

    getFiles: function(callback) {
      this._backing.getFiles(function(files) {
        console.log("loading files from indexeddb", files);
        callback(files);
      });
    },
    
    getFile: function(fileId, callback) {
      this._backing.getFile(fileId, callback);
    },

    getFileActions: function(fileId, callback) {
      if (this._driveBacking) {
        this._driveBacking._getModel(fileId, function() {});
      }

      //this._driveBacking.getFileActions(fileId, function() {});
      this._backing.getFileActions(fileId, callback);
    },

    // Create a new file and returns the file name
    .createFile: function(callback) {
      this._backing.createFile(undefined, (function(localFile) {
        if (this._driveBacking) {
          this._driveBacking.createFile((function(file) {
            // Google saved a file, redo the id of the file locally to match drive

            this._backing.replaceFileId(localFile.id, file.id)
            callback(file);
          }).bind(this));
        }
      }).bind(this));
    },

    .renameFile: function(fileId, newFileName) {
      if (this._driveBacking) {
        this._driveBacking.renameFile(fileId, newFileName);
      }

      this._backing.renameFile(fileId, newFileName);
    },

    .deleteFile: function(fileId) {
      if (this._driveBacking) {
        this._driveBacking.deleteFile(fileId);
      }

      this._backing.deleteFile(fileId);
    },

    addAction: function(fileId, action) {
      if (this._driveBacking) {
        this._driveBacking.addAction(fileId, action);
      }

      this._backing.addLocalAction(fileId, action);
    },

    undoAction: function(fileId) {
      var online;

      // remove the last action from localActions if there is one
      this._backing.removeLastLocalAction(fileId);

      if (online) {
        // call drive undo
      }
    },
    

    undoAction: function(fileId) {

    },

    removeAction: function(fileId, actionId) {
      //if (this._driveBacking) {
      //  this._driveBacking.removeAction(fileId, actionId);
      //}

      this._backing.removeAction(fileId, actionIndex);
    },

    removeRemoteAction: function(fileId, actionId) {
      this._backing.removeRemoteAction(fileId, actionId);
    },

    // Delete all the file rows, delete all the file databases,
    // delete everything for files from local storage
    clearAll: function() {
      this._backing.clearAll();
    },

    //_fileModified: function(data) {
    //  this._backing.updateFileModified(data.fileId, data.timestamp);
    //},

    */

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
      for (var i = 0; i < this._cachedFiles.length; i++) {
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
  });

  var data = new Data();
  window.data = data

  return data;
});