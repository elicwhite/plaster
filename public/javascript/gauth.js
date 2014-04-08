define(["class", "event"], function(Class, Event) {
  var GAuth = Class.extend({
    _clientId: '450627732299-2d7jlo96ious5jmdmsd9t7hpclstf7ub.apps.googleusercontent.com',
    _user: null,

    _startCallback: null,

    INSTALL_SCOPE: 'https://www.googleapis.com/auth/drive.install',
    FILE_SCOPE: 'https://www.googleapis.com/auth/drive.file',
    OPENID_SCOPE: 'openid',

    init: function() {},

    start: function(callback) {
      this._startCallback = callback;

      gapi.load('auth:client,drive-realtime,drive-share', (function() {
        this.authorize();
      }).bind(this));
    },

    authorize: function() {
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

    _handleAuthResult: function(token) {
      if (token && !token.error) {
        // logged in
        localStorage.loggedIn = true;
        Event.trigger("login", token);
        this._fetchUser();

        if (this._startCallback) {
          this._startCallback();
        }

        // Refresh the token 10 minutes before it expires
        var expireMS = ((parseInt(token.expires_in) - 600) * 1000);

        setTimeout((function() {
          console.log("Refreshing GAuth token");
          this.authorize();
        }).bind(this), expireMS);

      } else {
        localStorage.loggedIn = false;
        Event.trigger("logout");
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
    },

    authenticated: function() {
      if (localStorage.loggedIn) {
        return localStorage.loggedIn;
      }

      return false;
    }
  });

  return new GAuth();
});