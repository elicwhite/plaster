define(["class", "event", "vendor/sha256"], function(Class, Event, jsSHA) {
  var GAuth = Class.extend({
    CLIENT_ID: '450627732299-2d7jlo96ious5jmdmsd9t7hpclstf7ub.apps.googleusercontent.com',
    INSTALL_SCOPE: 'https://www.googleapis.com/auth/drive.install',
    DRIVE_SCOPE: 'https://www.googleapis.com/auth/drive',
    OPENID_SCOPE: 'openid',

    _user: null,
    _authenticated: null,

    init: function() {
      this._authenticated = false;

      Event.addListener("onlineStatusChanged", (function(status) {
        if (status.online) {
          // try to load gapi and authorize
          console.log("Starting auth");
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
          this.DRIVE_SCOPE,
          this.OPENID_SCOPE
        ],
        immediate: true
      }, this._handleAuthResult.bind(this));
    },

    _handleAuthResult: function(token) {
      if (token && !token.error) {
        // logged in

        this._fetchUserId()
          .then((function() {
            var hash = new jsSHA(this._user.id, "TEXT").getHash("SHA-256", "HEX");

            // Set the user ID using signed-in user_id.
            ga('set', '&uid', hash);
            ga('send', 'event', 'logged in');

            this._setStatus(true);

            // Refresh the token 10 minutes before it expires
            var expireMS = ((parseInt(token.expires_in) - 600) * 1000);


            setTimeout((function() {
              console.log("Refreshing GAuth token");
              this.authorize();
            }).bind(this), expireMS);
          }).bind(this));
      } else {
        this._setStatus(false);
      }
    },

    authorizeWithPopup: function() {
      gapi.auth.authorize({
        client_id: this.CLIENT_ID,
        scope: [
          this.INSTALL_SCOPE,
          this.DRIVE_SCOPE,
          this.OPENID_SCOPE
        ],
        immediate: false
      }, this._handleAuthResult.bind(this));
    },

    isAuthenticated: function() {
      return this._authenticated;
    },

    _fetchUserId: function() {
      return new Promise((function(resolve, reject) {
        gapi.client.load('oauth2', 'v2', (function() {
          gapi.client.oauth2.userinfo.get()
            .execute((function(resp) {
              if (resp.id) {
                this._user = resp.result;
              }

              resolve();
            }).bind(this));
        }).bind(this));
      }).bind(this));

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