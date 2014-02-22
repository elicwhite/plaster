define(["helpers", "dataBacking/localBacking", "db"], function(Helpers, LocalBacking, db) {
  var IndexedDBBacking = LocalBacking.extend({
    _server: null,
    _fileServers: null,

    // If we call other functions before the database is opened, 
    //these are the things we need to run
    _initCallbacks: null,

    init: function() {
      this._fileServers = [];

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
      if (this._fileServers[fileId]) {
        callback(this._fileServers[fileId]);
      } else {
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
          this._fileServers[fileId] = s;

          callback(s);
        }).bind(this))
          .fail(function(e) {
            console.error("Failed to create file database", e);
          });
      }
    },

    getFileActions: function(fileId, callback) {
      if (!this._server) {
        this._doLater(this.getLocalFileActions, [fileId, callback]);
        return;
      }

      var actionsObj = {};

      this._getFileServer(fileId, (function(server) {

        server.localActions.query()
          .all()
          .execute()
          .done((function(actions) {
            actionsObj.local = actions;

            if (actionsObj.local && actionsObj.remote) {
              callback(actionsObj);
            }

          }).bind(this));

        server.remoteActions.query('index')
          .all()
          .execute()
          .done((function(actions) {
            actionsObj.remote = actions;

            if (actionsObj.local && actionsObj.remote) {
              callback(actionsObj);
            }
          }).bind(this));

      }).bind(this));
    },

    createFile: function(file, callback) {
      if (!this._server) {
        this._doLater(this.createFile, [file, callback]);
        return;
      }

      if (!callback) {
        throw "You must specify a callback";
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
        .done((function(results) {
          this._updateFileModified(fileId);
        }).bind(this))
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

    // Make this work
    replaceFileId: function(oldFile, newId) {
      this.getFileActions(oldFile.id, (function(oldActions) {

        // store the old id
        var oldId = oldFile.id;

        // and update it
        oldFile.id = newId;

        // new variable name
        var newFile = oldFile;


        this._server.files.add(newFile)
          .done((function(items) {
            var item = items[0];

            this._getFileServer(item.id, (function(newServer) {
              this._getFileServer(oldId, (function(oldServer) {
                this._copyServer(oldServer, newServer, (function() {
                  // Done copying
                  console.log("ID Changed");
                  this.deleteFile(oldId);
                }).bind(this));
              }).bind(this));
            }).bind(this));
          }).bind(this))
      }).bind(this));
    },

    _copyServer: function(fromServer, toServer, callback) {
      var copied = 0;

      this._copyActions(fromServer.localActions, toServer.localActions, copyDone);
      this._copyActions(fromServer.remoteActions, toServer.remoteActions, copyDone);

      function copyDone() {
        copied++;

        // If we have copied everything
        if (copied == 2) {
          callback();
          return;
        }
      }
    },

    _copyActions: function(fromServer, toServer, callback) {
      fromServer.query()
        .all()
        .execute()
        .done(function(fromResults) {
          var resultsCopied = 0;

          if (fromResults.length == 0) {
            callback();
          } else {
            for (var i = 0; i < fromResults.length; i++) {
              toServer
                .add(fromResults[i])
                .done(function(newItem) {
                  if (resultsCopied == fromResults.length - 1) {
                    callback();
                    return;
                  }

                  resultsCopied++;
                });
            }
          }
        });
    },

    addLocalAction: function(fileId, action) {
      this._getFileServer(fileId, (function(server) {
        server.localActions
          .add(action)
          .done((function(item) {
            // item stored
            this._updateFileModified(fileId);
          }).bind(this))
          .fail(function(e) {
            console.error("fail to write", e);
          });
      }).bind(this));
    },

    removeLocalAction: function(fileId, actionId) {

      this._getFileServer(fileId, (function(server) {
        server.localActions
          .remove(actionId)
          .done((function(key) {
            // item removed
            this._updateFileModified(fileId);
          }).bind(this));
      }).bind(this));
    },

    _updateFileModified: function(fileId) {
      if (!this._server) {
        this._doLater(this.updateFileModified, [fileId, Date.now()]);
        return;
      }

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

    addRemoteActions: function(fileId, index, actions) {
      // Shift all the actions up
      this._getFileServer(fileId, (function(server) {
        server.remoteActions
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
                  this._updateFileModified(fileId);
                }).bind(this));
          }).bind(this))
          .fail(function(e) {
            console.error("fail to write", e);
          });
      }).bind(this));
    },

    removeRemoteActions: function(fileId, index, actions) {
      this._getFileServer(fileId, (function(server) {
        window.s = server;
        for (var i = 0; i < actions.length; i++) {

          //server.remoteActions
          server.remoteActions.remove(actions[i].id).done(function(key) {
            // item removed
          });
        }

        // it's okay that this happens async
        // decrement all the other indexes
        server.remoteActions
          .query('index')
          .lowerBound(index)
          .modify({
            index: function(action) {
              return action.index - actions.length;
            }
          })
          .execute()
          .done((function(item) {
            this._updateFileModified(fileId);
          }).bind(this));
      }).bind(this));
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