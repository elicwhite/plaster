define(["class", "helpers"], function(Class, Helpers) {
  var instance = Class.extend({
    _parent: null,

    _doc: null,

    _addedCallback: null,
    _removedCallback: null,

    _loadCallbacks: null,

    init: function(parent) {
      this._parent = parent;

      this._loadCallbacks = [];

      this._actionsAdded = this._actionsAdded.bind(this);
      this._actionsRemoved = this._actionsRemoved.bind(this);
    },

    listen: function(addedCallback, removedCallback) {
      this._addedCallback = addedCallback;
      this._removedCallback = removedCallback;
    },

    load: function(fileId, callback) {
      this._parent._open(fileId, (function(fileInfo) {
        this._openForRealtime(fileId, function() {
          callback(fileInfo);
        });
      }).bind(this));
    },

    create: function(file, callback) {
      this._parent._add(file, (function(fileInfo) {
        this._openForRealtime(fileInfo.id, function() {
          callback(fileInfo);
        });
      }).bind(this));
    },

    _openForRealtime: function(fileId, callback) {
      gapi.drive.realtime.load(fileId, (function(doc) {
          // file was loaded
          this._doc = doc;

          var actions = doc.getModel().getRoot().get('actions');
          actions.addEventListener(gapi.drive.realtime.EventType.VALUES_ADDED, this._actionsAdded);
          actions.addEventListener(gapi.drive.realtime.EventType.VALUES_REMOVED, this._actionsRemoved);

          callback();

          for (var i = 0; i < this._loadCallbacks.length; i++) {
            var loadCallback = this._loadCallbacks[i];
            loadCallback.func.apply(this, loadCallback.args);
          }
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
    },

    _actionsAdded: function(e) {
      console.log("got actions", e);

      this._addedCallback(e);
    },

    _actionsRemoved: function(e) {
      this._removedCallback(e);
    },

    getActions: function(callback) {
      callback(this._doc.getModel().getRoot().get('actions').asArray());
    },

    rename: function(newName) {
      if (!this._doc) {
        this._doAfterLoad(this.rename, [newName]);
        return;
      }

      this._parent._renameFile(this._doc.getModel().getRoot().get('id'), newName)
      this._doc.getModel().getRoot().set("title", newName);
    },

    addAction: function(action) {
      var actions = this._doc.getModel().getRoot().get('actions');
      actions.insert(actions.length, action);
    },

    removeAction: function(actionIndex) {
      var actions = this._doc.getModel().getRoot().get('actions');
      actions.remove(actionIndex);
    },

    undo: function() {
      this._doc.getModel().undo();
    },

    redo: function() {
      this._doc.getModel().redo();
    },

    _doAfterLoad: function(func, args) {
      this._loadCallbacks.push({
        func: func,
        args: args
      })
    },
  });

  var DriveBacking = Class.extend({
    _driveFileName: "Untitled File",
    _appId: 450627732299,
    REALTIME_MIMETYPE: 'application/vnd.google-apps.drive-sdk',

    init: function() {

    },

    getFiles: function(callback) {
      gapi.client.load('drive', 'v2', (function() {
        gapi.client.drive.files.list({
          'q': "trashed=false and mimeType='" + this.REALTIME_MIMETYPE + '.' + this._appId + "'"
        }).execute((function(results) {
          var items = [];

          if (results.items) {
            items = results.items;
          }

          callback(items);
        }).bind(this));
      }).bind(this));
    },

    _open: function(fileId, callback) {
      gapi.client.load('drive', 'v2', (function() {
        var request = gapi.client.drive.files.get({
          'fileId': fileId
        }).execute(function(result) {
          callback({
            id: result.id,
            name: result.title,
            modifiedTime: new Date(result.modifiedDate).getTime(),
          });
        });

      }).bind(this));
    },

    _add: function(file, callback) {
      gapi.client.load('drive', 'v2', (function() {
        gapi.client.drive.files.insert({
          'resource': {
            mimeType: this.REALTIME_MIMETYPE,
            title: file.name
          }
        }).execute((function(result) {
          callback({
            id: result.id,
            name: result.title,
            modifiedTime: new Date(result.modifiedDate).getTime(),
          });
        }).bind(this));
      }).bind(this));
    },

    _renameFile: function(fileId, newName) {
      var body = {
        'title': newName
      };

      gapi.client.load('drive', 'v2', (function() {
        var request = gapi.client.drive.files.patch({
          'fileId': fileId,
          'resource': body
        });
        request.execute(function(resp) {});
      }).bind(this));
    },

    deleteFile: function(fileId, callback) {
      gapi.client.load('drive', 'v2', (function() {
        var request = gapi.client.drive.files.delete({
          'fileId': fileId
        }).execute(function(result) {
          callback();
        });

      }).bind(this));
    },

    instance: instance,
  });

  return DriveBacking;
});