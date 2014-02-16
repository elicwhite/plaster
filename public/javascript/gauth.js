define(["class", "event"], function(Class, Event) {
  var GAuth = Class.extend({
    _clientId: '450627732299-2d7jlo96ious5jmdmsd9t7hpclstf7ub.apps.googleusercontent.com',
    _params: null,
    _user: null,

    INSTALL_SCOPE: 'https://www.googleapis.com/auth/drive.install',
    FILE_SCOPE: 'https://www.googleapis.com/auth/drive.file',
    OPENID_SCOPE: 'openid',

    init: function() {
      window.g = this;

      this._params = this._getParams();
      this._userId = this._params['userId'];
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

      var userId = this._userId;

      // Try with no popups first.
      gapi.auth.authorize({
        client_id: this._clientId,
        scope: [
          this.INSTALL_SCOPE,
          this.FILE_SCOPE,
          this.OPENID_SCOPE
        ],
        user_id: this._userId,
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
        user_id: this._userId,
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

    // Get the URL State params
    _getParams: function() {
      var params = {};
      var hashFragment = window.location.hash;
      if (hashFragment) {
        // split up the query string and store in an object
        var paramStrs = hashFragment.slice(1).split("&");
        for (var i = 0; i < paramStrs.length; i++) {
          var paramStr = paramStrs[i].split("=");
          params[paramStr[0]] = unescape(paramStr[1]);
        }
      }
      return params;
    }
  });

  return new GAuth();
});