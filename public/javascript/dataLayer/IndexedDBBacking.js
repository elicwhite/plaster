define(["class", "helpers", "db"], function(Class, Helpers, db) {
  var instance = Class.extend({
    _parent: null,

    _fileServer: null,

    init: function(parent) {
      this._parent = parent;
    },

    load: function(fileId, callback) {
      if (!fileId) {
        debugger;
      }
      
      db.open({
        server: fileId,
        version: 1,
        schema: {
          localActions: {
            key: {
              keyPath: 'id'
            }
          },
          remoteActions: {
            key: {
              keyPath: 'id'
            },
            indexes: {
              id: {
                unique: true
              },
              index: {
                unique: true
              }
            }
          }
        }
      }).done((function(s) {
        this._fileServer = s;

        this._parent._getFileInfo(fileId, function(fileInfo) {
          callback(fileInfo);
        });
      }).bind(this))
        .fail(function(e) {
          console.error("Failed to create file database", e);
        });
    },

    create: function(file, callback) {
      this._parent._addFile(file, (function() {
        this.load(file.id, function(fileInfo) {
          callback(fileInfo);
        });
      }).bind(this));
    },

    getActions: function(callback) {
      var actionsObj = {};

      this._fileServer.localActions.query()
        .all()
        .execute()
        .done((function(actions) {
          actionsObj.local = actions;
          if (actionsObj.local && actionsObj.remote) {
            callback(actionsObj);
          }
        }).bind(this));

      this._fileServer.remoteActions.query('index')
        .all()
        .execute()
        .done((function(actions) {
          actionsObj.remote = actions;
          if (actionsObj.local && actionsObj.remote) {
            callback(actionsObj);
          }
        }).bind(this));
    },

    rename: function(newName) {
      this._parent._renameFile(this._fileInfo.id, newName);
    },

    addLocalAction: function(action) {
      this.fileServer.localActions
        .add(action)
        .done((function(item) {
          // item stored
          this._parent._updateFileModified(this._fileInfo.id);
        }).bind(this))
        .fail(function(e) {
          console.error("fail to write", e);
        });
    },

    removeLocalAction: function(actionId) {
      this._fileServer.localActions
        .remove(actionId)
        .done((function(key) {
          // item removed
          this._parent._updateFileModified(this._fileInfo.id);
        }).bind(this));
    },

    addRemoteActions: function(index, actions) {
      // Shift all the actions up
      this._fileServer.remoteActions
        .query('index')
        .lowerBound(index)
        .modify({
          index: function(action) {
            return action.index + actions.length;
          }
        })
        .execute()
        .done((function(item) {
          // item stored
          server.remoteActions
            .add.apply(server, actions)
            .done(
              (function() {
                this._parent._updateFileModified(this._fileInfo.id);
              }).bind(this))
            .fail(function(e) {
              console.error("failed to add actions", e);
            });
        }).bind(this))
        .fail(function(e) {
          console.error("fail to write", e);
        });
    },

    removeRemoteActions: function(index, length) {
      this._fileServer.remoteActions.query('index')
        .lowerBound(index)
        .limit(length)
        .remove()
        .execute()
        .done(function(key) {
          // item removed

          this._fileServer.remoteActions
            .query('index')
            .lowerBound(index)
            .modify({
              index: function(action) {
                return action.index - length;
              }
            })
            .execute()
            .done((function(item) {
              this._parent._updateFileModified(this._fileInfo.id);
            }).bind(this));
        });
    }
  });

  var IndexedDBBacking = Class.extend({
    _server: null,
    _initCallbacks: null,

    init: function() {
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

      this._server.files.query('modifiedTime')
        .all()
        .desc()
        .execute()
        .done((function(results) {
          callback(results);
        }).bind(this));
    },

    _addFile: function(file, callback) {
      if (!this._server) {
        this._doLater(this._addFile, [file, callback]);
        return;
      }

      this._server.files.add(file)
        .done((function(items) {

          callback();

        }).bind(this))
        .fail(function(e) {
          console.error("fail to add file to file list", e);
        });
    },

    _renameFile: function(fileId, newName) {
      this._server.files.query('id')
        .only(fileId)
        .modify({
          name: newFileName
        })
        .execute()
        .done((function(results) {
          this._updateFileModified(fileId);
        }).bind(this))
        .fail(function(e) {
          console.error("Couldn't find file", e);
        })
    },

    deleteFile: function(fileId) {
      this._server.files.remove(fileId)
        .done(function(key) {
          var f = indexedDB.deleteDatabase(fileId);
          f.onerror = function(e) {
            console.error("Error deleting database", e);
          }

          // Delete settings from local storage
          delete localStorage[fileId];
        })
        .fail(function(e) {
          console.error("Failed to delete file from file table", fileId);
        });
    },

    _getFileInfo: function(fileId, callback) {
      this._server.files.query('id')
        .only(fileId)
        .execute()
        .done(function(results) {
          callback(results[0]);
        });
    },

    _updateFileModified: function(fileId) {
      this._server.files.query('id')
        .only(fileId)
        .modify({
          modifiedTime: Date.now()
        })
        .execute()
        .done(function(results) {})
        .fail(function(e) {
          console.error("Couldn't find file", e);
        });
    },

    _doLater: function(func, args) {
      this._initCallbacks.push({
        func: func,
        args: args
      })
    },

    instance: instance,
  });

  return IndexedDBBacking;
});