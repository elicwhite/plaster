define(["class", "dataBacking/indexedDBBacking", "dataBacking/webSQLBacking", "dataBacking/driveBacking", "event"], function(Class, IndexedDBBacking, WebSQLBacking, DriveBacking, Event) {
  var Data = Class.extend({
    _backing: null,
    _driveBacking: null,

    init: function() {
      var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

      if (indexedDB) {
        console.log("Using IndexedDB as data store");
        this._backing = new IndexedDBBacking();
      } else {
        console.log("Using WebSQL as data store");
        this._backing = new WebSQLBacking();
      }

      //Event.addListener("fileModified", this._fileModified.bind(this));
    },

    startDrive: function() {
      console.log("Starting Drive Data");
      this._driveBacking = new DriveBacking();
      window.drive = this._driveBacking;

      //this._useDrive = true;
    },

    // Get the name of all the files we have
    getFiles: function(callback) {
      this._backing.getFiles(callback);
    },

    getFile: function(fileId, callback) {
      this._backing.getFile(fileId, callback);
    },

    getFileActions: function(fileId, callback) {
        //this._driveBacking.getFileActions(fileId, function() {});
        this._backing.getFileActions(fileId, callback);
    },

    // Create a new file and returns the file name
    createFile: function(callback) {
      this._backing.createFile(undefined, function(localFile) {
        if (this._driveBacking) {
          this._driveBacking.createFile(function(file) {
            // Google saved a file, redo the id of the file locally to match drive

            this._backing.replaceFileId(localFile.id, file.id)
          });
        }  
      });
    },

    renameFile: function(fileId, newFileName) {
      if (this._driveBacking) {
        this._driveBacking.renameFile(fileId, newFileName);
      } else {
        this._backing.renameFile(fileId, newFileName);
      }
    },

    deleteFile: function(fileId) {
      if (this._driveBacking) {
        this._driveBacking.deleteFile(fileId);
      } else {
        this._backing.deleteFile(fileId);
      }
    },

    addAction: function(fileId, action) {
      if (this._driveBacking) {
        this._driveBacking.addAction(fileId, action);
      } else {
        this._backing.addAction(fileId, action);
      }
    },

    removeAction: function(fileId, actionIndex) {
      if (this._driveBacking) {
        this._driveBacking.removeAction(fileId, actionIndex);
      } else {
        this._backing.removeAction(fileId, actionIndex);
      }
    },

    // Delete all the file rows, delete all the file databases,
    // delete everything for files from local storage
    clearAll: function() {
      this._backing.clearAll();
    },

    //_fileModified: function(data) {
    //  this._backing.updateFileModified(data.fileId, data.timestamp);
    //},

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
  });

  var data = new Data();
  window.data = data

  return data;
});