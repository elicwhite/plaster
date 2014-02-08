define(["class", "db", "event"], function(Class, db, Event) {
  var Data = Class.extend({
    _server: null,
    _files: null,

    // If we call other functions before the database is opened, 
    //these are the things we need to run
    _initCallbacks: null,

    init: function() {
      this._files = [];

      this._initCallbacks = [];

      db.open({
        server: 'draw',
        version: 1,
        schema: {
          files: {
            key: {
              keyPath: 'id',
            },
            indexes: {
              id: {
                unique: true
              },
              modifiedTime: {}
            }
          }
        }
      })
        .done((function(server) {
          console.log("Set up files server");
          this._server = server;

          // Go through all our delayed callbacks
          for (var i = 0; i < this._initCallbacks.length; i++) {
            var callback = this._initCallbacks[i];
            callback.func.apply(this, callback.args);
          }

        }).bind(this))
        .fail(function(e) {
          console.error("Failed setting up database", e);
        });

      Event.addListener("fileModified", this._fileModified.bind(this));
    },

    _doLater: function(func, args) {
      this._initCallbacks.push({
        func: func,
        args: args
      })
    },

    // Get the name of all the files we have
    getFiles: function(callback) {
      if (!this._server) {
        this._doLater(this.getFiles, [callback]);
        return;
      }

      if (!callback) {
        throw "You must specify a callback";
      }

      this._server.files.query('modifiedTime')
        .all()
        .desc()
        .execute()
        .done((function(results) {
          callback(results);
        }).bind(this));

    },

    // Create a new file and returns the file name
    createFile: function(callback) {
      if (!this._server) {
        this._doLater(this.createFile, [callback]);
        return;
      }

      if (!callback) {
        throw "You must specify a callback";
      }

      var fileId = this._getGuid();

      var file = {
        id: fileId,
        name: "Untitled File",
        modifiedTime: Date.now()
      }

      this._server.files.add(file)
        .done((function(items) {
          var item = items[0];

          this.getFile(item.id, (function(s) {
            callback(item);
          }).bind(this));

        }).bind(this))
        .fail(function(e) {
          console.error("fail to add file to file list", e);
        });
    },

    getFile: function(fileId, callback) {
      if (!this._server) {
        this._doLater(this.getFile, [fileId, callback]);
        return;
      }

      db.open({
        server: fileId,
        version: 1,
        schema: {
          actions: {
            key: {
              keyPath: 'id',
              autoIncrement: true
            },
            indexes: {
              type: {},
              id: {
                unique: true
              }
            }
          }
        }
      }).done((function(s) {
        this._files[fileId] = s;
        callback(s);
      }).bind(this))
        .fail(function(e) {
          console.error("Failed to create file database", e);
        });;
    },

    renameFile: function(fileId, newFileName) {
      if (!this._server) {
        this._doLater(this.renameFile, [fileId]);
        return;
      }

      this._server.files.query('id')
        .only(fileId)
        .modify({
          name: newFileName
        })
        .execute()
        .done(function(results) {
          console.log("Want to rename file", results);
        })
        .fail(function(e) {
          console.error("Couldn't find file", e);
        })
    },

    deleteFile: function(fileId) {
      if (!this._server) {
        this._doLater(this.deleteFile, [fileId]);
        return;
      }

      this._server.files.remove(fileId)
        .done(function(key) {
          // item removed
          console.log("Deleted file from file table", fileId);

          var f = indexedDB.deleteDatabase(fileId);
          f.onsuccess = function(e) {
            console.log("Deleted Database for file", key);
          }
          f.onerror = function(e) {
            console.log("Error deleting database", e);
          }

          // Delete settings from local storage
          delete localStorage[fileId];

        })
        .fail(function(e) {
          console.error("Failed to delete file from file table", fileId);
        });
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
          scale: 1
        });
      }

      return JSON.parse(localStorage[fileId]);

    },

    deleteAllDatabases: function() {
      var f = indexedDB.webkitGetDatabaseNames();
      f.onsuccess = function(e) {
        var list = e.target.result;
        for (var i = 0; i < list.length; i++) {
          console.log("Deleting", list[i]);
          var d = indexedDB.deleteDatabase(list[i]);
          window.d = d;
          d.onerror = function(e) {
            console.error("Error deleting database", e);
          }
        }
        console.log(e);
      }
    },

    _getGuid: function() {
      return 'T^' + Date.now() + "-" + Math.round(Math.random() * 1000000);
    },

    _fileModified: function(data) {
      if (!this._server) {
        this._doLater(this._fileModified, [data]);
        return;
      }

      this._server.files.query('id')
        .only(data.fileId)
        .modify({
          modifiedTime: data.timestamp
        })
        .execute()
        .done(function(results) {
        })
        .fail(function(e) {
          console.error("Couldn't find file", e);
        })
    }
  });

  var data = new Data();
  window.data = data

  return data;
});