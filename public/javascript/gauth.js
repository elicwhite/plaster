define(["class", "event"], function(Class, Event) {
  var GAuth = Class.extend({
    _clientId: '450627732299-2d7jlo96ious5jmdmsd9t7hpclstf7ub.apps.googleusercontent.com',
    _user: null,

    INSTALL_SCOPE: 'https://www.googleapis.com/auth/drive.install',
    FILE_SCOPE: 'https://www.googleapis.com/auth/drive.file',
    OPENID_SCOPE: 'openid',

    init: function() {
      window.g = this;
    },

    start: function() {
      if (window.gapi) {
        gapi.load('auth:client,drive-realtime,drive-share', (function() {
          this._authorize();
        }).bind(this));
      } else {
        console.log("Offline mode");
      }
    },

    _authorize: function() {
      // Try with no popups first.
      gapi.auth.authorize({
        client_id: this._clientId,
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
        // logged in
        Event.trigger("login", authResult);
        this._fetchUser();
      } else {
        Event.trigger("logout", authResult);
      }
    },

    authorizeWithPopup: function() {
      gapi.auth.authorize({
        client_id: this._clientId,
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
  });

  return new GAuth();
});