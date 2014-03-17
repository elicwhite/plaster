function start() {
  window.clientId = '450627732299-2d7jlo96ious5jmdmsd9t7hpclstf7ub.apps.googleusercontent.com';

  function GAuth() {}

  GAuth.prototype = {
    _user: null,

    _startCallback: null,

    INSTALL_SCOPE: 'https://www.googleapis.com/auth/drive.install',
    FILE_SCOPE: 'https://www.googleapis.com/auth/drive.file',
    OPENID_SCOPE: 'openid',

    start: function(callback) {
      if (window.gapi) {
        this._startCallback = callback;

        gapi.load('auth:client,drive-realtime,drive-share', (function() {
          this.authorize();
        }).bind(this));
      } else {
        console.log("Offline mode");
      }
    },

    authorize: function() {
      // Try with no popups first.
      gapi.auth.authorize({
        client_id: window.clientId,
        scope: [
          this.INSTALL_SCOPE,
          this.FILE_SCOPE,
          this.OPENID_SCOPE
        ],
        immediate: true
      }, this._handleAuthResult.bind(this));
    },

    _handleAuthResult: function(authResult) {
      if (authResult && !authResult.error) {
        this._fetchUser();

        if (this._startCallback) {
          this._startCallback();
        }
      }
    },

    authorizeWithPopup: function() {
      gapi.auth.authorize({
        client_id: window.clientId,
        scope: [
          this.INSTALL_SCOPE,
          this.FILE_SCOPE,
          this.OPENID_SCOPE
        ],
        immediate: false
      }, this._handleAuthResult.bind(this));
    },

    _fetchUser: function() {
      gapi.client.load('oauth2', 'v2', (function() {
        gapi.client.oauth2.userinfo.get().execute((function(resp) {
          if (resp.id) {
            this._user = resp;
          }
        }).bind(this));
      }).bind(this));
    }
  }

  function GData() {}

  GData.prototype = {
    _driveFileName: "Untitled File",
    REALTIME_MIMETYPE: 'application/vnd.google-apps.drive-sdk',

    add: function(callback) {
      gapi.client.load('drive', 'v2', (function() {
        gapi.client.drive.files.insert({
          'resource': {
            mimeType: this.REALTIME_MIMETYPE,
            title: "Test File"
          }
        }).execute(function(resp) {
          if (resp.error) {
            throw new Error(resp.error);
          } else {
            callback({
              id: resp.id,
            });
          }
        });
      }).bind(this));
    },

    delete: function(fileId, callback) {
      gapi.client.load('drive', 'v2', function() {
        var request = gapi.client.drive.files.delete({
          'fileId': fileId
        }).execute(function(resp) {
          if (resp.error) {
            throw new Error(resp.error);
          } else {
            callback(resp);
          }
        });
      });
    },

    openForRealtime: function(fileId, callback) {
      gapi.drive.realtime.load(fileId, function(doc) {
          callback(doc);
        },

        function(model) {
          // file was created
          var actions = model.createList();
          actions.addEventListener(gapi.drive.realtime.EventType.VALUES_ADDED, function() {});
          var root = model.getRoot();
          root.set('actions', actions);
        },
        function(error) {
          throw error;
        }
      );
    },
  }

  function startTest() {
    // create a file
    // open it for realtime
    // close the doc
    // delete the file

    var data = new GData();
    console.log("Starting test");

    for (var i = 0; i < 10; i++) {
      data.add(function(file) {
        console.log("Added", file.id);
        data.openForRealtime(file.id, function(doc) {
          console.log("Opened for realtime", file.id);
          doc.close();

          // Adding a timeout just to be clear that the doc closed.
          //window.setTimeout(function() {
          data.delete(file.id, function() {
            console.log("Deleting", file.id);
          });
          //}, 1000);


        });
      })
    }
  }

  function startDelayTest() {
    // create a file
    // open it for realtime
    // close the doc
    // delete the file

    var data = new GData();
    console.log("Starting test");

    for (var i = 0; i < 1; i++) {
      data.add(function(file) {
        console.log("Added", file.id);
        data.openForRealtime(file.id, function(doc) {
          console.log("Opened for realtime", file.id);

          window.setTimeout(function() {
            doc.close();
            data.delete(file.id, function() {
              console.log("Deleting", file.id);
            });
          }, 10000);
        })
      })
    }
  }

  var a = new GAuth();
  a.start(function() {
    console.log("GAuth Loaded");
    startDelayTest();
  });
}