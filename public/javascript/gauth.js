define(["class", "event"], function(Class, Event) {
  var GAuth = Class.extend({
    CLIENT_ID: '450627732299-2d7jlo96ious5jmdmsd9t7hpclstf7ub.apps.googleusercontent.com',
    INSTALL_SCOPE: 'https://www.googleapis.com/auth/drive.install',
    FILE_SCOPE: 'https://www.googleapis.com/auth/drive.file',
    OPENID_SCOPE: 'openid',

    _user: null,
    _authenticated: null,

    init: function() {
      this._authenticated = false;

      Event.addListener("onlineStatusChanged", (function(status) {
        if (status.online) {
          // try to load gapi and authorize
          console.log("starting auth");
          this.start();
        } else {
          // now offline
        }
      }).bind(this));
    },

    start: function() {
      this.authorize();
    },

    authorize: function() {
      // Try with no popups first.
      gapi.auth.authorize({
        client_id: this.CLIENT_ID,
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

        this._setStatus(true);

        // Refresh the token 10 minutes before it expires
        var expireMS = ((parseInt(token.expires_in) - 600) * 1000);

        setTimeout((function() {
          console.log("Refreshing GAuth token");
          this.authorize();
        }).bind(this), expireMS);

      } else {
        this._setStatus(false);
      }
    },

    authorizeWithPopup: function() {
      gapi.auth.authorize({
        client_id: this.CLIENT_ID,
        scope: [
          this.INSTALL_SCOPE,
          this.FILE_SCOPE,
          this.OPENID_SCOPE
        ],
        immediate: false
      }, this._handleAuthResult.bind(this));
    },

    isAuthenticated: function() {
      return this._authenticated;
    },

    _setStatus: function(status) {
      if (this._authenticated == status) {
        // if we are changing to the same status we currently have, skip
        return;
      }

      this._authenticated = status;

      Event.trigger("authenticatedStatusChanged", {
        authenticated: status
      });
    }
  });

  return new GAuth();
});