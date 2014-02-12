define(["dataBacking/baseBacking", "db"], function(BaseBacking, db) {
  var IndexedDBBacking = BaseBacking.extend({
    _server: null,
    _files: null,

    // If we call other functions before the database is opened, 
    //these are the things we need to run
    _initCallbacks: null,

    init: function() {
      console.log("backing file used");
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
              modifiedTime: {
                //keyPath: 'modifiedTime'
              }
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
    },

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

    _getFileServer: function(fileId, callback) {
      if (this._files[fileId]) {
        callback(this._files[fileId]);
      } else {
        db.open({
          server: fileId,
          version: 1,
          schema: {
            actions: {
              key: {
                keyPath: 'id',
                autoIncrement: true
              }
              /*,
            indexes: {
              type: {},
              id: {
                unique: true
              }
            }
            */
            }
          }
        }).done((function(s) {
          this._files[fileId] = s;

          callback(s);
        }).bind(this))
          .fail(function(e) {
            console.error("Failed to create file database", e);
          });
      }
    },

    getFileActions: function(fileId, callback) {
      if (!this._server) {
        this._doLater(this.getFileActions, [fileId, callback]);
        return;
      }

      this._getFileServer(fileId, (function(server) {
        server.actions.query()
          .all()
          .execute()
          .done((function(results) {
            callback(results);
          }).bind(this));
      }).bind(this));
    },

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

          this._getFileServer(item.id, (function(s) {
            callback(item);
          }).bind(this));

        }).bind(this))
        .fail(function(e) {
          console.error("fail to add file to file list", e);
        });
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

    addAction: function(fileId, action) {
      console.log("Saving action", action);
      this._getFileServer(fileId, (function(server) {
        server.actions
          .add(action)
          .done(function(item) {
            console.log("After save", action, item);
            // item stored
          })
          .fail(function(e) {
            console.error("fail to write", e);
          });
      }).bind(this));
    },

    removeAction: function(fileId, actionIndex) {
      
      this._getFileServer(fileId, (function(server) {
        server.actions
          .remove(actionIndex)
          .done(function(key) {

            // item removed
          });
      }).bind(this));
      
    },

    updateFileModified: function(fileId, timestamp) {
      if (!this._server) {
        this._doLater(this.updateFileModified, [fileId, timestamp]);
        return;
      }

      this._server.files.query('id')
        .only(fileId)
        .modify({
          modifiedTime: timestamp
        })
        .execute()
        .done(function(results) {})
        .fail(function(e) {
          console.error("Couldn't find file", e);
        });
    },

    clearAll: function() {
      this.getFiles((function(files) {
        for (var i = 0; i < files.length; i++) {
          this.deleteFile(files[i].id);
        }
      }).bind(this));
    },

    _doLater: function(func, args) {
      this._initCallbacks.push({
        func: func,
        args: args
      })
    },
  });

  return IndexedDBBacking;
});