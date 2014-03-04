define(["class", "helpers"], function(Class, Helpers) {
  var instance = Class.extend({
    _parent: null,

    _docPromise: null,

    _addedCallback: null,
    _removedCallback: null,

    init: function(parent) {
      this._parent = parent;

      this._actionsAdded = this._actionsAdded.bind(this);
      this._actionsRemoved = this._actionsRemoved.bind(this);
    },

    listen: function(addedCallback, removedCallback) {
      this._addedCallback = addedCallback;
      this._removedCallback = removedCallback;
    },

    load: function(fileId) {
      return this._parent._open(fileId)
        .then((function(fileInfo) {
          return this._openForRealtime(fileInfo.id);
        }).bind(this));
    },

    create: function(file) {
      return this._parent._add(file)
        .then((function(fileInfo) {
          return this._openForRealtime(fileInfo.id)
            .then(function() {
              return fileInfo;
            })
        }).bind(this));
    },

    _openForRealtime: function(fileId) {
      return new Promise(function(resolve, reject) {

        gapi.drive.realtime.load(fileId, (function(doc) {
            // file was loaded
            this._docPromise = Promise.resolve(doc);

            this._docPromise.then((function(doc) {
              var actions = doc.getModel().getRoot().get('actions');
              actions.addEventListener(gapi.drive.realtime.EventType.VALUES_ADDED, this._actionsAdded);
              actions.addEventListener(gapi.drive.realtime.EventType.VALUES_REMOVED, this._actionsRemoved);

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
            reject(error);
          }
        );
      });
    },

    _actionsAdded: function(e) {
      this._addedCallback(e);
    },

    _actionsRemoved: function(e) {
      this._removedCallback(e);
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
      return this._docPromise.then(function(doc) {
        doc.close();
      });
    },
  });

  var DriveBacking = Class.extend({
    _driveFileName: "Untitled File",
    _appId: 450627732299,
    REALTIME_MIMETYPE: 'application/vnd.google-apps.drive-sdk',

    init: function() {

    },

    getFiles: function() {
      return new Promise((function(resolve, reject) {
        gapi.client.load('drive', 'v2', (function() {
          gapi.client.drive.files.list({
            'q': "trashed=false and mimeType='" + this.REALTIME_MIMETYPE + '.' + this._appId + "'"
          }).execute(function(resp) {
            if (resp.error) {
              reject(resp);

            } else {
              var items = [];

              if (resp.items) {
                items = resp.items;
              }

              resolve(items);
            }
          });
        }).bind(this));
      }).bind(this));
    },

    _open: function(fileId) {
      return new Promise(function(resolve, reject) {
        gapi.client.load('drive', 'v2', function() {
          var request = gapi.client.drive.files.get({
            'fileId': fileId
          }).execute(function(resp) {

            if (resp.error) {
              reject(resp);
            } else {
              resolve({
                id: resp.id,
                name: resp.title,
                modifiedTime: new Date(resp.modifiedDate).getTime(),
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
              title: file.name
            }
          }).execute(function(resp) {
            if (resp.error) {
              reject(resp);
            } else {
              resolve({
                id: resp.id,
                name: resp.title,
                modifiedTime: new Date(resp.modifiedDate).getTime(),
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
            'resource': body
          });
          request.execute(function(resp) {
            if (resp.error) {
              reject(resp);
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
            'fileId': fileId
          }).execute(function(resp) {
            if (resp.error) {
              reject(resp);
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