define(["class", "helpers", "event", "dataBacking/indexedDBBacking", "dataBacking/webSQLBacking", "dataBacking/driveBacking", "event"], function(Class, Helpers, Event, IndexedDBBacking, WebSQLBacking, DriveBacking, Event) {
  var Data = Class.extend({
    _backing: null,
    _driveBacking: null,

    _cachedFiles: null,
    _cachedActions: null,

    init: function() {
      this._actionsAddedCallbacks = [];
      this._actionsRemovedCallbacks = [];

      this._cachedFiles = [];

      this._cachedActions = {
        file: this._cachedFiles[0],
        remoteActions: [],
        localActions: [],
        redoStack: []
      };

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
        callback(this._cachedFiles);
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
    },

    deleteFile: function(fileId) {
      for (var i = 0; i < this._cachedFiles.length; i++) {
        if (this._cachedFiles[i].id == fileId) {
          var file = this._cachedFiles[i];
          delete this._cachedFiles[i];
          Event.trigger("fileRemoved", file);
          return;
        }
      }
    },

    renameFile: function(fileId, newFileName) {
      for (var i = 0; i < this._cachedFiles.length; i++) {
        if (this._cachedFiles[i].id == fileId) {
          var file = this._cachedFiles[i];
          file.name = newFileName;

          Event.trigger("fileRenamed", file);
          Event.trigger("fileModified", file);
          return;
        }
      }
    },

    loadFile: function(fileId, callback) {
      if (this._cachedActions && this._cachedActions.file && this._cachedActions.file.id == fileId) {
        callback();
      } else {
        // set up the cached actions to be for the file
        this._cachedActions.file = this._cachedFiles[0];
        //console.error("Requesting a different file!");
        callback();
      }
    },

    getFileActions: function() {
      return this._cachedActions.remoteActions.concat(this._cachedActions.localActions);
    },

    addAction: function(action) {
      console.log("adding action", action);
      this._cachedActions.localActions.push(action);
      Event.trigger("actionAdded", {
        isLocal: true,
        items: [action]
      });

      Event.trigger("fileModified", this._cachedActions.file);
    },

    undoAction: function() {
      if (this._cachedActions.localActions.length == 0) {
        return false; // no actions to undo
      } else {
        var lastAction = this._cachedActions.localActions.pop();
        this._cachedActions.redoStack.push(lastAction);
        Event.trigger("actionRemoved");
      }
    },

    redoAction: function() {
      if (this._cachedActions.redoStack.length == 0) {
        return false; // no actions to undo
      } else {
        this.addAction(this._cachedActions.redoStack.pop());
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

    /*

        _remoteActionsAdded: function(e) {
      for (var i = 0; i < this._actionsAddedCallbacks.length; i++) {
        this._actionsAddedCallbacks[i](e);
      }
    },

    _remoteActionsRemoved: function(e) {
      for (var i = 0; i < this._actionsRemovedCallbacks.length; i++) {
        this._actionsRemovedCallbacks[i](e);
      }
    }

    addEventListener: function(type, callback) {
      if (type == "actionsAdded") {
        this._actionsAddedCallbacks.push(callback);
      }
      else if (type == "actionsRemoved") {
        this._actionsRemovedCallbacks.push(callback);
      }
    },

    removeEventListener: function(type, callback) {
      var array = null;
      if (type == "actionsAdded") {
        array = this._actionsAddedCallbacks;
      }
      else if (type == "actionsRemoved") {
        array = this._actionsRemovedCallbacks;
      }

      array.splice(array.indexOf(callback), 1);
    }
    */
  });

  var data = new Data();
  window.data = data

  return data;
});