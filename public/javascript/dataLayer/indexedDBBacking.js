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
          version: 2,
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

      this._fileInfoPromise = this._parent.getFileInfo(fileId);

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

    updateThumbnail: function(dataURL) {
      return this._fileInfoPromise.then((function(fileInfo) {
        return this._parent._updateThumbnail(fileInfo.id, dataURL);
      }).bind(this));
    },

    addLocalAction: function(action) {
      return this._fileServerPromise.then((function(server) {
        return Promise.cast(server.localActions.add(action));
      }).bind(this));
    },

    removeLocalAction: function(actionId) {
      return this._fileServerPromise.then((function(server) {
        return Promise.cast(server.localActions.remove(actionId));
      }).bind(this));
    },

    addRemoteActions: function(index, actions) {
      return this._fileServerPromise.then((function(server) {
        return Promise.cast(server.remoteActions
          .query('index')
          .lowerBound(index)
          .desc()
          .modify({
            index: function(action) {
              return action.index + actions.length;
            }
          })
          .execute()
        )
          .then(function() {
            return Promise.cast(server.remoteActions.add.apply(server.remoteActions, actions))
          })
      }).bind(this));
    },

    removeRemoteActions: function(index, length) {

      return this._fileServerPromise.then((function(server) {
        return Promise.cast(server.remoteActions
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

            return this._parent._addFile(newInfo)
              .then((function(newFile) {
                return this.load(newFile[0].id);
              }).bind(this))
              .then((function() {
                return this._copyAllActions(oldActions);
              }).bind(this))
              .then((function() {
                return this._parent.deleteFile(oldId);
              }).bind(this))
              .then(function() {
                return newInfo;
              });
          }).bind(this))
      }).bind(this));
    },

    close: function() {
      return this._fileServerPromise.then((function(server) {
        this._fileServerPromise = Promise.reject(new Error("File Server has been closed"));
        this._fileInfoPromise = Promise.reject(new Error("File has been closed"));
        return server.close();
      }).bind(this));
    },

    updateLocalModifiedTime: function(time) {
      return this._fileInfoPromise
        .then((function(fileInfo) {
          fileInfo.localModifiedTime = time;
          this._fileInfoPromise = Promise.resolve(fileInfo);
          return this._parent._updateLocalModifiedTime(fileInfo.id, time);
        }).bind(this));
    },

    updateDriveModifiedTime: function(time) {
      return this._fileInfoPromise
        .then((function(fileInfo) {
          fileInfo.driveModifiedTime = time;
          this._fileInfoPromise = Promise.resolve(fileInfo);
          return this._parent._updateDriveModifiedTime(fileInfo.id, time);
        }).bind(this));
    },

    _copyAllActions: function(oldActions) {
      return this._fileServerPromise.then(function(server) {
        return Promise.all(
          [
            Promise.cast(server.localActions.add.apply(server, oldActions.local)),
            Promise.cast(server.remoteActions.add.apply(server, oldActions.remote)),
          ])
          .
        catch (function(error) {
          console.error("Failed copying actions", error, error.stack, error.message);
        });
      });
    },
  });

  var IndexedDBBacking = Class.extend({
    readyPromise: null,

    _serverName: null,

    init: function(serverName) {
      this._serverName = serverName ? serverName : "draw";

      this.readyPromise = Promise.cast(db.open({
        server: this._serverName,
        version: 2,
        schema: {
          files: {
            key: {
              keyPath: 'id',
            },
            indexes: {
              id: {
                unique: true
              },
              localModifiedTime: {},
            }
          }
        }
      }));
    },

    fileExists: function(fileId) {
      return this.readyPromise.then((function(server) {
        return Promise.cast(server.files.query('id')
          .only(fileId)
          .count()
          .execute()
        )
          .then((function(count) {
            return count !== 0;
          }).bind(this));
      }).bind(this));
    },

    getFiles: function() {
      return this.readyPromise.then((function(server) {
        return Promise.cast(server.files.query('localModifiedTime')
          .all()
          .filter(function(file) {
            return !file.deleted;
          })
          .desc()
          .execute()
        )
          .then((function(results) {
            return results.map(this._cleanFields);
          }).bind(this));
      }).bind(this))
    },

    _addFile: function(file) {
      return this.readyPromise.then(function(server) {
        return Promise.cast(
          server.files.add(file)
        );
      });
    },

    _renameFile: function(fileId, newName) {
      return this.readyPromise.then((function(server) {

        return Promise.cast(server.files.query('id')
          .only(fileId)
          .modify({
            name: newName
          })
          .execute()
        )
          .then((function(results) {
            return results;
          }).bind(this));
      }).bind(this));
    },

    _updateThumbnail: function(fileId, dataURL) {
      return this.readyPromise.then((function(server) {
        return Promise.cast(server.files.query('id')
          .only(fileId)
          .modify({
            thumbnail: dataURL
          })
          .execute()
        )
          .then((function(results) {
            return results;
          }).bind(this));
      }).bind(this));
    },

    getDeletedFiles: function() {
      return this.readyPromise.then((function(server) {
        return Promise.cast(server.files.query()
          .filter(function(file) {
            return file.deleted;
          })
          .execute()
        )
          .then((function(results) {
            return results.map(this._cleanFields);
          }).bind(this));
      }).bind(this));
    },

    markFileAsDeleted: function(fileId) {
      return this.readyPromise.then(function(server) {

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
      return this.readyPromise.then(function(server) {
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
      return this.readyPromise.then(function(server) {

        return Promise.cast(server.files.query('id')
          .only(fileId)
          .remove()
          .execute()
        )
          .then(function(results) {
            indexedDB.deleteDatabase(fileId);

            return results;
          });
      });
    },

    getFileInfo: function(fileId) {
      return this.readyPromise.then(function(server) {
        return Promise.cast(server.files.query('id')
          .only(fileId)
          .execute()
        ).then(function(results) {
          if (results.length == 0) {
            return undefined;
          }
          return results[0];
        });
      }).then((function(result) {
        if (result) {
          this._cleanFields(result)
        }

        return result;
      }).bind(this));;
    },

    _updateLocalModifiedTime: function(fileId, time) {
      return this.readyPromise.then(function(server) {
        return Promise.cast(server.files.query('id')
          .only(fileId)
          .modify({
            localModifiedTime: time
          })
          .execute()
        );
      });
    },

    _updateDriveModifiedTime: function(fileId, time) {
      return this.readyPromise.then(function(server) {
        return Promise.cast(server.files.query('id')
          .only(fileId)
          .modify({
            driveModifiedTime: time
          })
          .execute()
        );
      });
    },

    clearAll: function() {
      return Promise.all([this.getFiles(), this.getDeletedFiles()])
        .then((function(results) {
          return results[0].concat(results[1]);
        }).bind(this))
        .then((function(files) {
          files.map((function(file) {
            return this.deleteFile(file.id);
          }).bind(this))

          return Promise.all(files).then((function() {
            indexedDB.deleteDatabase(this._serverName);
          }).bind(this));
        }).bind(this))
    },

    _cleanFields: function(fileInfo) {
      if (fileInfo.deleted) {
        delete fileInfo.deleted;
      }

      return fileInfo;
    },

    instance: instance,
  });

  return IndexedDBBacking;
});