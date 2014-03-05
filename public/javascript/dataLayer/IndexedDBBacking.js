define(["class", "helpers", "db", "event"], function(Class, Helpers, db, Event) {
  var instance = Class.extend({
    _parent: null,

    _fileInfoPromise: null,
    _fileServerPromise: null,

    init: function(parent) {
      this._parent = parent;
    },

    load: function(fileId) {
      this._fileServerPromise = Promise.cast(
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
        }));

      this._fileInfoPromise = this._parent._getFileInfo(fileId);

      return Promise.all([this._fileServerPromise, this._fileInfoPromise])
        .then(function(results) {
          return results[1]
        });
    },

    create: function(file) {
      return this._parent._addFile(file)
        .then((function() {
          return this.load(file.id);
        }).bind(this));
    },

    getActions: function() {
      return this._fileServerPromise.then((function(server) {

        var localPromise = Promise.cast(
          server.localActions.query()
          .all()
          .execute()
        );

        var remotePromise = Promise.cast(
          server.remoteActions.query('index')
          .all()
          .execute()
        );

        return Promise.all([localPromise, remotePromise])
          .then(function(results) {
            return {
              local: results[0],
              remote: results[1],
            };
          });
      }).bind(this));
    },

    rename: function(newName) {
      return this._fileInfoPromise.then((function(fileInfo) {
        return this._parent._renameFile(fileInfo.id, newName)
          .then(function(newFile) {
            this._fileInfoPromise = Promise.cast(newFile);
          });
      }).bind(this));

    },

    addLocalAction: function(action) {
      return this._fileServerPromise.then((function(server) {
        var addPromise = Promise.cast(server.localActions.add(action));
        var updatePromise = this._fileInfoPromise
          .then((function(fileInfo) {
            return this._parent._updateFileModified(fileInfo.id);
          }).bind(this));

        return Promise.all([addPromise, updatePromise])
          .then(function(results) {
            return results[0];
          });
      }).bind(this));
    },

    removeLocalAction: function(actionId) {
      return this._fileServerPromise.then((function(server) {
        var addPromise = Promise.cast(server.localActions.remove(actionId));
        var updatePromise = this._fileInfoPromise
          .then((function(fileInfo) {
            return this._parent._updateFileModified(fileInfo.id);
          }).bind(this));

        return Promise.all([addPromise, updatePromise])
          .then(function(results) {
            return results[0];
          });
      }).bind(this));
    },

    addRemoteActions: function(index, actions) {
      return this._fileServerPromise.then((function(server) {
        var addPromise = Promise.cast(server.remoteActions
          .query('index')
          .lowerBound(index)
          .modify({
            index: function(action) {
              return action.index + actions.length;
            }
          })
          .execute()
        )
          .then(function() {
            return Promise.cast(server.remoteActions.add.apply(server, actions))
          });

        var updatePromise = this._fileInfoPromise
          .then((function(fileInfo) {
            return this._parent._updateFileModified(fileInfo.id);
          }).bind(this));

        return Promise.all([addPromise, updatePromise])
          .then(function(results) {
            return results[0];
          });
      }).bind(this));
    },

    removeRemoteActions: function(index, length) {

      return this._fileServerPromise.then((function(server) {
        var removePromise = Promise.cast(server.remoteActions
          .query('index')
          .lowerBound(index)
          .limit(length)
          .remove()
          .execute()
        )
          .then(function() {
            return Promise.cast(server
              .remoteActions
              .query('index')
              .lowerBound(index)
              .modify({
                index: function(action) {
                  return action.index - length;
                }
              })
              .execute())
          });

        var updatePromise = this._fileInfoPromise
          .then((function(fileInfo) {
            return this._parent._updateFileModified(fileInfo.id);
          }).bind(this));

        return Promise.all([removePromise, updatePromise])
          .then(function(results) {
            return results[0];
          });
      }).bind(this));
    },

    replaceFileId: function(newId) {
      return this._fileInfoPromise.then((function(fileInfo) {

        var oldActionsPromise = this.getActions();

        var oldId = fileInfo.id;
        fileInfo.id = newId;
        var newFile = fileInfo;

        this._fileInfoPromise = Promise.cast(fileInfo);

        return Promise.all([oldActionsPromise, this._fileInfoPromise])
          .then((function(results) {
            var oldActions = results[0];
            var newInfo = results[1];

            var createFilePromise = this._parent._addFile(newInfo)
              .then((function(newFile) {
                return this.load(newFile[0].id);
              }).bind(this))
              .then((function() {
                return this._copyAllActions(oldActions);
              }).bind(this));

            var deleteOldFilePromise = this._parent.deleteFile(oldId);

            return Promise.all([createFilePromise, deleteOldFilePromise])
              .then(function() {
                return newInfo;
              });
          }).bind(this));
      }).bind(this));
    },

    close: function() {
      return this._fileServerPromise.then(function(server) {
        return server.close();
      });
    },

    _copyAllActions: function(oldActions) {
      return this._fileServerPromise.then(function(server) {
        return Promise.all(
          [
            Promise.all(oldActions.local.map(server.localActions.add)),
            Promise.all(oldActions.remote.map(server.remoteActions.add)),
          ]);
      });
    },
  });

  var IndexedDBBacking = Class.extend({
    _serverPromise: null,

    init: function() {
      this._serverPromise = Promise.cast(db.open({
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
      }));
    },


    getFiles: function() {
      return this._serverPromise.then(function(server) {
        return Promise.cast(server.files.query('modifiedTime')
          .all()
          .filter(function(file) {
            return !file.deleted;
          })
          .desc()
          .execute()
        )
      });
    },

    _addFile: function(file) {
      return this._serverPromise.then(function(server) {
        return Promise.cast(
          server.files.add(file)
        );
      });
    },

    _renameFile: function(fileId, newName) {
      return this._serverPromise.then(function(server) {

        return Promise.cast(server.files.query('id')
          .only(fileId)
          .modify({
            name: newName
          })
          .execute()
        )
          .then((function(results) {
            this._updateFileModified(fileId);

            return results;
          }).bind(this));
      });
    },

    getDeletedFiles: function(callback) {
      return this._serverPromise.then(function(server) {
        return Promise.cast(server.files.query()
          .filter(function(file) {
            return file.deleted;
          })
          .execute()
        );
      });
    },

    markFileAsDeleted: function(fileId) {
      return this._serverPromise.then(function(server) {

        return Promise.cast(server.files.query('id')
          .only(fileId)
          .modify({
            deleted: true
          })
          .execute()
        )
      });
    },

    unmarkFileAsDeleted: function(fileId) {
      return this._serverPromise.then(function(server) {
        return Promise.cast(server.files.query('id')
          .only(fileId)
          .modify({
            deleted: false
          })
          .execute()
        )
          .then(function(results) {

            Event.trigger("fileAdded", results[0]);
            return results;
          });
      });
    },

    deleteFile: function(fileId) {
      return this._serverPromise.then(function(server) {

        return Promise.cast(server.files.query('id')
          .only(fileId)
          .remove()
          .execute()
        )
          .then(function(results) {
            console.log("Deleted marked file");
            var f = indexedDB.deleteDatabase(fileId);
            delete localStorage[fileId];

            return results;
          });
      });
    },

    _getFileInfo: function(fileId, callback) {
      return this._serverPromise.then(function(server) {
        return Promise.cast(server.files.query('id')
          .only(fileId)
          .execute()
        ).then(function(results) {
          return results[0];
        });
      });
    },

    _updateFileModified: function(fileId) {
      return this._serverPromise.then(function(server) {
        return Promise.cast(server.files.query('id')
          .only(fileId)
          .modify({
            modifiedTime: Date.now()
          })
          .execute()
        );
      });
    },

    instance: instance,
  });

  return IndexedDBBacking;
});