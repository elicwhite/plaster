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
          console.log(results);
          callback(results.items);
          // actual files are in .items
        });
      }).bind(this));
    },

    getFile: function(fileId, callback) {
      gapi.drive.realtime.load(fileId,
        function(doc) {
          // file was loaded
          callback({
            id: doc.id,
            name: doc.getModel().getRoot().get('title'),
            modifiedTime: new Date(doc.modifiedDate).getTime()
          });
        },
        function(model) {
          // file was created
          var actions = model.createList();
          var root = model.getRoot();
          root.set('title', 'Untitled File');
          root.set('actions', actions);
        }
      )
    },

    getFileActions: function(fileId, callback) {

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

    },

    deleteFile: function(fileId) {

    },

    addAction: function(fileId, action) {

    },

    removeAction: function(fileId, actionIndex) {

    },

    clearAll: function() {

    },
  });

  return DriveBacking;
});