define(["modal", "tapHandler", "data", "event", "online", "platform", "gauth"], function(Modal, tapHandler, Data, Event, Online, Platform, GAuth) {

  var Share = Modal.extend({
    id: "share-modal",

    _titleElement: null,
    _shareButton: null,

    _fileInfo: null,

    _offlineElement: null,
    _onlineElement: null,
    _loadingElement: null,
    _permissionsElement: null,
    _guestElement: null,
    _ownerElement: null,

    init: function() {
      this._super();

      this._titleElement = document.getElementById("share-modal-title");
      this._shareButton = document.getElementById("share-modal-share");

      this._offlineElement = document.getElementById("share-modal-offline");
      this._onlineElement = document.getElementById("share-modal-online");
      this._loadingElement = document.getElementById("share-modal-loading");
      this._permissionsElement = document.getElementById("share-modal-permissions");
      this._guestElement = document.getElementById("share-modal-guest");
      this._ownerElement = document.getElementById("share-modal-owner");

      this._onlineStatusChanged = this._onlineStatusChanged.bind(this);

      new tapHandler(this._shareButton, {
        start: function(e) {
          // We need this to keep from going to the overlay
          e.stopPropagation()
        },
        tap: this._shareTapped.bind(this)
      })
    },

    show: function(fileInfo) {
      this._fileInfo = fileInfo;
      this._titleElement.textContent = fileInfo.name;

      // set visible states
      this._loadingElement.classList.remove("hidden");
      this._permissionsElement.classList.add("hidden");

      if (Online.isOnline()) {
        this._showOnline(true, false);
      }
      else
      {
        this._showOnline(false, false);
      }

      Event.addListener("onlineStatusChanged", this._onlineStatusChanged);

      this.afterShow();
    },

    hide: function() {
      Event.removeListener("onlineStatusChanged", this._onlineStatusChanged);

      this.afterHide();
    },

    _shareTapped: function(e) {
      console.log("tapped", e);

      Data.shareFilePublicly(this._fileInfo.id)
        .then((function(result) {
          console.log("shared", result);
        }).bind(this))
        .
      catch (function(error) {
        console.error("failed to share", error);
      });
    },

    _showOnline: function(online, animate) {
      if (online) {
        if (animate) {
          this.swapVisible(this._offlineElement, this._onlineElement, true);
        } else {
          this._offlineElement.classList.add("hidden");
          this._onlineElement.classList.remove("hidden");
        }

        this._checkForPermissions();
      } else {
        this.swapVisible(this._onlineElement, this._offlineElement, true);
      }
    },

    _checkForPermissions: function() {
      Promise.all([Data.getRemoteFileInfo(this._fileInfo.id), Data.getFilePermissions(this._fileInfo.id)])

        .then((function(results) {
          var remoteInfo = results[0];
          var permissions = results[1];

          var owner = remoteInfo.userPermission.role == "owner";
          var shared = permissions.some(function(permission) {
            return permission.type == "anyone" && permission.role == "writer";
          });

          console.log("owner", owner, "shared", shared);

          var swapOwner;
          if (owner) {
            swapOwner = this.swapVisible(this._guestElement, this._ownerElement, false)
          }
          else
          {
            swapOwner = this.swapVisible(this._ownerElement, this._guestElement, false)
          }

          swapOwner
            .then((function() {
              this.swapVisible(this._loadingElement, this._permissionsElement, true);
            }).bind(this));

        }).bind(this));
    },

    swapVisible: function(fromElement, toElement, animate) {
      if (animate) {
        return new Promise(function(resolve, reject) {
          function fromTransitionEnd() {
            fromElement.removeEventListener(Platform.transitionEnd, fromTransitionEnd);
            fromElement.classList.add("hidden");
            fromElement.classList.remove("invisible");

            toElement.classList.add("invisible");
            toElement.classList.remove("hidden");

            setTimeout(function() {
              toElement.classList.remove("invisible");
            }, 10);

            toElement.addEventListener(Platform.transitionEnd, toTransitionEnd);
          }

          function toTransitionEnd() {
            toElement.removeEventListener(Platform.transitionEnd, toTransitionEnd);
            resolve();
          }

          fromElement.addEventListener(Platform.transitionEnd, fromTransitionEnd)
          fromElement.classList.add("invisible");
        });
      } else {
        fromElement.classList.add("hidden");
        toElement.classList.remove("hidden");
        return Promise.resolve();
      }
    },

    _onlineStatusChanged: function(e) {
      this._showOnline(e.online, true);
    },
  });

  return new Share();

});