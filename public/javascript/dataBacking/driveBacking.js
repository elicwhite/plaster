define(["dataBacking/baseBacking", "db"], function(BaseBacking, db) {
  var DriveBacking = BaseBacking.extend({
    _driveFileName: "DrawingFile",
    _appId: 450627732299,

    _cachedFile: null,

    _addedCallback: null,
    _removedCallback: null,

    //application/vnd.google-apps.drive-sdk.450627732299

    REALTIME_MIMETYPE: 'application/vnd.google-apps.drive-sdk',

    init: function(added, removed) {
      this._files = [];
      this._addedCallback = added;
      this._removedCallback = removed;

      this._actionsAdded = this._actionsAdded.bind(this);
      this._actionsRemoved = this._actionsRemoved.bind(this);
    },

    getFiles: function(callback) {
      gapi.client.load('drive', 'v2', (function() {
        gapi.client.drive.files.list({
          'q': "trashed=false and mimeType='" + this.REALTIME_MIMETYPE + '.' + this._appId + "'"
        }).execute(function(results) {
          console.log("files", results);
          if (results.items) {
            callback(results.items);
          } else {
            callback([]);
          }
        });
      }).bind(this));
    },

    getFile: function(fileId, callback) {
      gapi.client.load('drive', 'v2', (function() {
        var request = gapi.client.drive.files.get({
          'fileId': fileId
        }).execute(function(result) {
          window.r = result;
          callback({
            id: result.id,
            name: result.title,
            modifiedTime: new Date(result.modifiedDate).getTime(),
          });
        });

      }).bind(this));
    },

    _getModel: function(fileId, callback) {
      if (this._cachedFile) {
        if (this._cachedFile.getModel().getRoot().get('id') == fileId) {
          callback(this._cachedFile.getModel());
          return;
        } else {
          // they don't match, remove our event handlers because we are going to be adding new ones
          var actions = this._cachedFile.getModel().getRoot().get("actions");
          actions.removeEventListener(gapi.drive.realtime.EventType.VALUES_ADDED, this._actionsAdded);
          actions.removeEventListener(gapi.drive.realtime.EventType.VALUES_REMOVED, this._actionsRemoved);
        }
      }

      gapi.client.load('drive', 'v2', (function() {
        gapi.drive.realtime.load(fileId, (function(doc) {
            // file was loaded
            this._cachedFile = doc;

            var actions = doc.getModel().getRoot().get('actions');
            actions.addEventListener(gapi.drive.realtime.EventType.VALUES_ADDED, this._actionsAdded);
            actions.addEventListener(gapi.drive.realtime.EventType.VALUES_REMOVED, this._actionsRemoved);

            callback(doc.getModel());
          }).bind(this),
          function(model) {
            // file was created
            var actions = model.createList();
            var root = model.getRoot();
            root.set('title', 'Untitled File');
            root.set('actions', actions);
            root.set('id', fileId);
          }
        );
      }).bind(this));
    },

    _actionsAdded: function(e) {
      console.log("got actions", e);

      this._addedCallback(e);
    },

    _actionsRemoved: function(e) {
      this._removedCallback(e);
    },

    getFileActions: function(fileId, callback) {
      this._getModel(fileId, (function(model) {
        callback(model.getRoot().get('actions').asArray());
      }).bind(this));
    },

    createFile: function(callback) {
      gapi.client.load('drive', 'v2', (function() {
        gapi.client.drive.files.insert({
          'resource': {
            mimeType: this.REALTIME_MIMETYPE,
            title: this._driveFileName
          }
        }).execute((function(result) {
          // we have created, a drive file, now we need to initialize it as a realtime file
          this.getFile(result.id, callback);

        }).bind(this));
      }).bind(this));
    },

    renameFile: function(fileId, newFileName) {
      // rename both the file itself and the file name in the 
      // model

      var body = {
        'title': newFileName
      };

      gapi.client.load('drive', 'v2', (function() {
        var request = gapi.client.drive.files.patch({
          'fileId': fileId,
          'resource': body
        });
        request.execute(function(resp) {});
      }).bind(this));

      this._getModel(fileId, function(model) {
        model.getRoot().set("title", newFileName);
      });
    },

    deleteFile: function(fileId) {
      gapi.client.load('drive', 'v2', (function() {
        var request = gapi.client.drive.files.delete({
          'fileId': fileId
        }).execute(function(result) {});

      }).bind(this));
    },

    addAction: function(fileId, action) {
      this._getModel(fileId, (function(model) {
        // If we got in here, we know cached file is set
        model.getRoot().get('actions').insert(model.getRoot().get('actions').length, action);
      }).bind(this));
    },

    removeAction: function(fileId, actionIndex) {
      this._getModel(fileId, function(model) {
        model.getRoot().get('actions').remove(actionIndex);
      })
    },

    undo: function(fileId) {
      this._getModel(fileId, function(model) {
        model.undo();
      });
    },

    redo: function(fileId) {
      this._getModel(fileId, function(model) {
        model.redo();
      });
    },

    clearAll: function() {

    },
  });

  return DriveBacking;
});