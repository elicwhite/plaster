define(["dataBacking/baseBacking", "db"], function(BaseBacking, db) {
  var DriveBacking = BaseBacking.extend({
    _driveFileName: "DrawingFile",
    _appId: 450627732299,

    //application/vnd.google-apps.drive-sdk.450627732299

    REALTIME_MIMETYPE: 'application/vnd.google-apps.drive-sdk',

    init: function() {
      this._files = [];
    },

    getFiles: function(callback) {
      gapi.client.load('drive', 'v2', (function() {
        gapi.client.drive.files.list({
          'q': "trashed=false and mimeType='" + this.REALTIME_MIMETYPE + '.' + this._appId + "'"
        }).execute(function(results) {
          console.log("files", results);
          callback(results.items);
          // actual files are in .items
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

    getFileActions: function(fileId, callback) {
      gapi.client.load('drive', 'v2', (function() {
        gapi.drive.realtime.load(fileId,
          function(doc) {
            // file was loaded
            console.log("file", doc);
            window.doc = doc;

            var actions = doc.getModel().getRoot().get('actions');
            window.actions = actions;
            callback(actions.asArray());
          },
          function(model) {
            console.log("new file");
            // file was created
            var actions = model.createList();
            var root = model.getRoot();
            root.set('title', 'Untitled File');
            root.set('actions', actions);
          }
        );
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
          console.log("create", result);
          // we have created, a drive file, now we need to initialize it as a realtime file
          this.getFile(result.id, callback);

        }).bind(this));
      }).bind(this));
    },

    renameFile: function(fileId, newFileName) {

    },

    deleteFile: function(fileId) {

    },

    addAction: function(fileId, action) {
      this.getFileActions(fileId, function(actions) {
        window.actions = actions;
        actions.insert(actions.length, action);
      });
    },

    removeAction: function(fileId, actionIndex) {
      this.getFileActions(fileId, function(actions) {
        actions.remove(actionIndex);
      })
    },

    clearAll: function() {

    },
  });

  return DriveBacking;
});