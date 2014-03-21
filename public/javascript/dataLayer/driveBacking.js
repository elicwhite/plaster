define(["class", "helpers", "gauth"], function(Class, Helpers, GAuth) {
  var instance = Class.extend({
    _parent: null,

    _docPromise: null,

    _addedCallback: null,
    _removedCallback: null,

    // Delay if we need to change the file modified time of a file
    _updateFileTimeout: null,

    init: function(parent) {
      this._parent = parent;

      this._actionsAdded = this._actionsAdded.bind(this);
      this._actionsRemoved = this._actionsRemoved.bind(this);
      this._saveStateChanged = this._saveStateChanged.bind(this);
    },

    listen: function(addedCallback, removedCallback) {
      this._addedCallback = addedCallback;
      this._removedCallback = removedCallback;
    },

    stopListening: function() {
      this._addedCallback = null;
      this._removedCallback = null;
    },

    load: function(fileId) {
      return this._parent._open(fileId)
        .then((function(fileInfo) {
          return this._openForRealtime(fileInfo.id);
        }).bind(this))
        .
      catch (function(error) {
        console.error(error, error.stack, error.message);
      });
    },

    create: function(file) {
      return this._parent._add(file)
        .then((function(fileInfo) {
          return this._openForRealtime(fileInfo.id)
            .then(function() {
              return fileInfo;
            })
        }).bind(this))
        .
      catch (function(error) {
        console.error(error, error.stack, error.message);
      });
    },

    _openForRealtime: function(fileId) {
      return new Promise((function(resolve, reject) {

        gapi.drive.realtime.load(fileId, (function(doc) {
            // file was loaded
            this._docPromise = Promise.resolve(doc);

            this._docPromise.then((function(doc) {
              var actions = doc.getModel().getRoot().get('actions');
              actions.addEventListener(gapi.drive.realtime.EventType.VALUES_ADDED, this._actionsAdded);
              actions.addEventListener(gapi.drive.realtime.EventType.VALUES_REMOVED, this._actionsRemoved);

              doc.addEventListener(gapi.drive.realtime.EventType.DOCUMENT_SAVE_STATE_CHANGED, this._saveStateChanged);

              resolve(this._docPromise);
            }).bind(this));
          }).bind(this),
          function(model) {
            // file was created
            var actions = model.createList();
            var root = model.getRoot();
            root.set('title', 'Untitled File');
            root.set('actions', actions);
            root.set('id', fileId);
          },
          function(error) {

            if (error.type == gapi.drive.realtime.ErrorType.TOKEN_REFRESH_REQUIRED) {
              console.warn("Token expired, reauthorizing");
              GAuth.authorize();
              return;
              //reject(error);
            } else if (error.type == gapi.drive.realtime.ErrorType.CLIENT_ERROR) {
              //reject(new Error(error));
            } else if (error.type == gapi.drive.realtime.ErrorType.NOT_FOUND) {
              //reject(new Error(error));
              //alert("The file was not found. It does not exist or you do not have read access to the file.");
            }

            reject(new Error(error));
          }
        );
      }).bind(this));
    },

    _actionsAdded: function(e) {
      if (this._addedCallback) {
        this._addedCallback(e);
      }
    },

    _actionsRemoved: function(e) {
      if (this._removedCallback) {
        this._removedCallback(e);
      }
    },

    _saveStateChanged: function(e) {
      if (this._updateFileTimeout) {

        // Clear it and set a new one
        clearTimeout(this._updateFileTimeout);
      }

      // one second delay
      this._updateFileTimeout = setTimeout((function() {
        this._docPromise.then((function(doc) {
          this._parent.touchFile(doc.getModel().getRoot().get('id'))
            .then(function(result) {
              console.log("Touched file", result);
            })
            .
          catch (function(e) {
            console.error("Error touching file", e);
          });
        }).bind(this));
      }).bind(this), 2000);
    },

    getActions: function() {
      return this._docPromise.then(function(doc) {
        return doc.getModel().getRoot().get('actions').asArray();
      });
    },

    rename: function(newName) {
      return this._docPromise.then((function(doc) {
        doc.getModel().getRoot().set("title", newName);
        return this._parent._renameFile(doc.getModel().getRoot().get('id'), newName)
      }).bind(this));
    },

    addAction: function(action) {
      return this._docPromise.then(function(doc) {
        var actions = doc.getModel().getRoot().get('actions');
        actions.insert(actions.length, action);
      });
    },

    removeAction: function(actionIndex) {
      return this._docPromise.then(function(doc) {
        var actions = doc.getModel().getRoot().get('actions');
        actions.remove(actionIndex);
      });
    },

    undo: function() {
      return this._docPromise.then(function(doc) {
        doc.getModel().undo();
      });
    },

    redo: function() {
      return this._docPromise.then(function(doc) {
        doc.getModel().redo();
      });
    },

    close: function() {
      if (!this._docPromise) {
        debugger;
      }
      
      return this._docPromise.then(function(doc) {
        doc.close();
      });
    },
  });

  var DriveBacking = Class.extend({
    _driveFileName: "Untitled File",
    _appId: 450627732299,
    REALTIME_MIMETYPE: 'application/vnd.google-apps.drive-sdk',
    _fields: 'id, title, modifiedDate',

    init: function() {

    },

    getFiles: function() {
      return new Promise((function(resolve, reject) {
        gapi.client.load('drive', 'v2', (function() {
          gapi.client.drive.files.list({
            'q': "trashed=false and mimeType='" + this.REALTIME_MIMETYPE + '.' + this._appId + "'",
            'fields': 'items('+this._fields+')',
          }).execute(function(resp) {
            if (!resp) {
              resolve([]);
              return;
            }

            if (resp.error) {
              reject(new Error(resp));
            } else {
              resolve(resp.items);
            }
          });
        }).bind(this));
      }).bind(this));
    },

    _open: function(fileId) {
      return new Promise(function(resolve, reject) {
        gapi.client.load('drive', 'v2', function() {
          var request = gapi.client.drive.files.get({
            'fileId': fileId,
            'fields': this._fields,
          }).execute(function(resp) {

            if (resp.error) {
              reject(new Error(resp));
            } else {
              resolve({
                id: resp.id,
              });
            }
          });
        });
      });
    },

    _add: function(file) {
      return new Promise((function(resolve, reject) {
        gapi.client.load('drive', 'v2', (function() {
          gapi.client.drive.files.insert({
            'resource': {
              mimeType: this.REALTIME_MIMETYPE,
              title: file.name,
            },
            'fields': this._fields
          }).execute(function(resp) {
            if (resp.error) {
              reject(new Error(resp));
            } else {
              resolve({
                id: resp.id,
              });
            }
          });
        }).bind(this));
      }).bind(this));
    },

    _renameFile: function(fileId, newName) {
      return new Promise(function(resolve, reject) {

        var body = {
          'title': newName
        };

        gapi.client.load('drive', 'v2', function() {
          var request = gapi.client.drive.files.patch({
            'fileId': fileId,
            'resource': body,
            'fields': this._fields,
          });
          request.execute(function(resp) {
            if (resp.error) {
              reject(new Error(resp));
            } else {
              resolve(resp);
            }
          });
        });

      });
    },

    deleteFile: function(fileId) {
      return new Promise(function(resolve, reject) {

        gapi.client.load('drive', 'v2', function() {
          var request = gapi.client.drive.files.delete({
            'fileId': fileId,
            'fields': this._fields,
          }).execute(function(resp) {
            if (resp.error) {
              reject(new Error(resp));
            } else {
              resolve(resp);
            }
          });
        });
      });
    },

    touchFile: function(fileId) {
      return new Promise(function(resolve, reject) {
        gapi.client.load('drive', 'v2', function() {
          var request = gapi.client.drive.files.touch({
            'fileId': fileId,
            'fields': this._fields,
          }).execute(function(resp) {
            if (resp.error) {
              reject(new Error(resp));
            } else {
              resolve(resp);
            }
          });
        });
      });
    },

    instance: instance,
  });

  return DriveBacking;
});