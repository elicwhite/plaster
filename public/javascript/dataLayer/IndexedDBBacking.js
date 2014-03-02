define(["class", "helpers", "db", "event"], function(Class, Helpers, db, Event) {
  var instance = Class.extend({
    _parent: null,

    _fileInfo: null,

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

        this._parent._getFileInfo(fileId, (function(fileInfo) {
          if (typeof(fileInfo) == "undefined") {
            debugger;
          }
          
          this._fileInfo = fileInfo;
          callback(fileInfo);
        }).bind(this));
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
      var actionsObj = {
        local: null,
        remote: null,
      };

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
      this._fileServer.localActions
        .add(action)
        .done((function(item) {
          // item stored
          this._parent._updateFileModified(this._fileInfo.id);
        }).bind(this))
        .done(function(item) {
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
          this._fileServer.remoteActions
            .add.apply(this._fileServer, actions)
            .done(
              (function(items) {
                this._parent._updateFileModified(this._fileInfo.id);
              }).bind(this))
            .fail((function(e) {
              console.error("Failed to add remote actions", this._fileInfo.id, e);
            }).bind(this));
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
        .done((function(key) {
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
        }).bind(this));
    },

    replaceFileId: function(newId, callback) {
      this.getActions((function(oldActions) {

        var oldId = this._fileInfo.id;
        this._fileInfo.id = newId;
        var newFile = this._fileInfo;

        this._parent._addFile(newFile, (function() {
          this.load(newId, (function() {
            this._copyAllActions(oldActions, (function() {
              // Done copying
              console.log("ID Changed");
              this._parent.deleteFile(oldId);
              callback();
            }).bind(this));
          }).bind(this));
        }).bind(this));
      }).bind(this));
    },

    close: function() {
      // What happens if this is called before load callbacks happen
      this._fileServer.close();
    },

    _copyAllActions: function(oldActions, callback) {
      var copied = 0;

      this._copyActions(oldActions.local, this._fileServer.localActions, copyDone);
      this._copyActions(oldActions.remote, this._fileServer.remoteActions, copyDone);

      function copyDone() {
        copied++;

        // If we have copied everything
        if (copied == 2) {
          callback();
          return;
        }
      }
    },

    _copyActions: function(actions, toServer, callback) {
      var actionsCopied = 0;

      if (actions.length == 0) {
        callback();
      } else {
        for (var i = 0; i < actions.length; i++) {
          toServer
            .add(actions[i])
            .done(function(newItem) {
              if (actionsCopied == actions.length - 1) {
                callback();
                return;
              }

              actionsCopied++;
            });
        }
      }
    },
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
              },
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
        .filter(function(file) {
          return !file.deleted;
        })
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
          name: newName
        })
        .execute()
        .done((function(results) {
          this._updateFileModified(fileId);
        }).bind(this))
        .fail(function(e) {
          console.error("Couldn't find file", e);
        });
    },

    getDeletedFiles: function(callback) {
      this._server.files.query()
        .filter(function(file) {
          return file.deleted;
        })
        .execute()
        .done(function(results) {
          callback(results);
        })
        .fail(function(e) {
        });
    },

    markFileAsDeleted: function(fileId) {
      this._server.files.query('id')
        .only(fileId)
        .modify({
          deleted: true
        })
        .execute()
        .done((function(results) {
          // Delete settings from local storage
          
        }).bind(this))
        .fail(function(e) {
          console.error("Couldn't find file", e);
        })
    },

    unmarkFileAsDeleted: function(fileId) {
      this._server.files.query('id')
        .only(fileId)
        .modify({
          deleted: false
        })
        .execute()
        .done((function(results) {

          Event.trigger("fileAdded", results[0]);
          
        }).bind(this))
        .fail(function(e) {
          console.error("Couldn't find file", e);
        })
    },

    deleteFile: function(fileId) {
      this._server.files.query('id')
        .only(fileId)
        .remove()
        .execute()
        .done(function(key) {
          console.log("Deleted marked file");
          var f = indexedDB.deleteDatabase(fileId);
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