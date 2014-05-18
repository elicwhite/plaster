define(["components/modalBase", "tapHandler", "data", "event", "online", "platform", "gauth", "analytics"], function(ModalBase, tapHandler, Data, Event, Online, Platform, GAuth, Analytics) {

  var Share = ModalBase.extend({
    id: "share-modal",
    name: "Share",

    _titleElement: null,
    _shareButton: null,

    _fileInfo: null,

    _offlineElement: null,
    _onlineElement: null,
    _loadingElement: null,
    _permissionsElement: null,
    _guestElement: null,
    _ownerElement: null,
    _linkElement: null,
    _linkTextElement: null,

    init: function() {
      this._super();

      this._titleElement = document.getElementById("share-modal-title");
      this._shareButton = document.getElementById("share-modal-share-button");
      this._shareButtonText = document.getElementById("share-modal-share-text");

      this._offlineElement = document.getElementById("share-modal-offline");
      this._onlineElement = document.getElementById("share-modal-online");
      this._loadingElement = document.getElementById("share-modal-loading");
      this._permissionsElement = document.getElementById("share-modal-permissions");
      this._guestElement = document.getElementById("share-modal-guest");
      this._ownerElement = document.getElementById("share-modal-owner");
      this._linkElement = document.getElementById("share-modal-link");
      this._linkTextElement = document.getElementById("share-modal-link-text");

      this._onlineStatusChanged = this._onlineStatusChanged.bind(this);

      new tapHandler(this._shareButton, {
        start: function(e) {
          e.stopPropagation();
        },
        tap: this._shareTapped.bind(this)
      })
    },

    show: function(fileInfo) {
      this._super();

      this._fileInfo = fileInfo;
      this._titleElement.textContent = fileInfo.name;
      var url = window.location.origin + window.location.pathname + "#" + fileInfo.id;
      this._linkTextElement.textContent = url;
      this._linkTextElement.href = url;

      // set visible states
      this._loadingElement.classList.remove("hidden");
      this._permissionsElement.classList.add("hidden");


      if (Online.isOnline()) {
        this._showOnline(true, false);
      } else {
        this._showOnline(false, false);
      }

      Event.addListener("onlineStatusChanged", this._onlineStatusChanged);
      this.afterShow();
    },

    hide: function() {
      this._super();

      Event.removeListener("onlineStatusChanged", this._onlineStatusChanged);

      this.afterHide();
    },

    _shareTapped: function(e) {
      var shared = this._shareButton.dataset.shared === "true";

      if (!shared) {
        Promise.resolve()
          .then((function() {
            this._shareButtonText.textContent = "Sharing...";
          }).bind(this))
          .then((function() {
            return Data.shareFilePublicly(this._fileInfo.id)
          }).bind(this))
          .then((function(result) {
            this._showShared(true);
            Analytics.event("file", "shared", "enabled");
          }).bind(this))
          .
        catch (function(error) {
          console.error("failed to share", error);
        });
      } else {
        Promise.resolve()
          .then((function() {
            this._shareButtonText.textContent = "Disabling...";
          }).bind(this))
          .then((function() {
            return Data.disablePublicFile(this._fileInfo.id)
          }).bind(this))
          .then((function(result) {
            this._showShared(false);
            Analytics.event("file", "shared", "disabled");
          }).bind(this))
          .
        catch (function(error) {
          console.error("failed to disable sharing", error);
        });
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

          this._showPermission(owner, shared);
        }).bind(this));
    },

    _showOnline: function(online, animate) {
      if (online) {
        if (animate) {
          this._swapVisible(this._offlineElement, this._onlineElement, true);
        } else {
          this._offlineElement.classList.add("hidden");
          this._onlineElement.classList.remove("hidden");
        }

        this._checkForPermissions();
      } else {
        this._swapVisible(this._onlineElement, this._offlineElement, true);
      }
    },

    _showPermission: function(owner, shared) {
      var swapOwner = this._showOwned(owner);
      this._showShared(shared);

      swapOwner
        .then((function() {
          this._swapVisible(this._loadingElement, this._permissionsElement, true);
        }).bind(this));

    },

    _showOwned: function(owned) {
      if (owned) {
        return this._swapVisible(this._guestElement, this._ownerElement, false)
      } else {
        return this._swapVisible(this._ownerElement, this._guestElement, false)
      }
    },

    _showShared: function(shared) {
      this._shareButton.dataset.shared = shared;

      if (shared) {
        this._shareButton.classList.remove("primary");
        this._shareButton.classList.add("alert");
        this._shareButtonText.textContent = "Disable Sharing";

        this._linkElement.classList.remove("invisible");
      } else {
        this._shareButton.classList.remove("alert");
        this._shareButton.classList.add("primary");
        this._shareButtonText.textContent = "Share this file";

        this._linkElement.classList.add("invisible");
      }
    },

    _swapVisible: function(fromElement, toElement, animate) {
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