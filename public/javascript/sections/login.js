define(["event", "page", "tapHandler", "online", "gauth", "data"], function(Event, Page, TapHandler, Online, GAuth, Data) {

  var Login = Page.extend({
    id: "login",
    name: "Login",

    _basicBox: null,
    _fileBox: null,

    _fileTitleElement: null,
    _fileOwnersElement: null,

    _button: null,

    init: function() {
      this._super();

      this._onlineStatusChanged = this._onlineStatusChanged.bind(this);
      this._basicBox = document.getElementById("login-basic");
      this._fileBox = document.getElementById("login-file");

      this._fileTitleElement = document.getElementById("login-file-title");
      this._fileOwnersElement = document.getElementById("login-file-owners");

      this._button = document.getElementById("loginbutton");
      new TapHandler(this._button, {tap: this._loginClicked.bind(this) });
    },

    show: function() {
      this._super();

      if (Online.isOnline()) {
        console.log("already online");
        this._turnOnline();
      }

      Event.addListener("onlineStatusChanged", this._onlineStatusChanged);
    },

    hide: function() {
      Event.removeListener("onlineStatusChanged", this._onlineStatusChanged);
    },

    _onlineStatusChanged: function(e) {
      this._turnOnline();
    },

    displayFileInfo: function(fileInfo) {
      this._waitAnimationEnd()
        .then((function() {
          var firstOwner = fileInfo.owners[0];

          this._fileTitleElement.textContent = fileInfo.title;
          this._fileOwnersElement.textContent = firstOwner.displayName;

          this._fileBox.classList.remove("hidden");

        }).bind(this));
    },

    _turnOnline: function() {
      this.element.classList.add("online");
      this._button.classList.remove("disabled");

      var hash = location.hash;
      if (hash.indexOf("#") === 0) {
        hash = hash.slice(1);

        Data.getRemoteFileInfo(hash)
        .then((function(fileInfo) {
          this.displayFileInfo(fileInfo);
        }).bind(this));
      }
    },

    _waitAnimationEnd: function() {
      return new Promise((function(resolve) {
        setTimeout(function() {
          resolve()
        }, 500);
      }).bind(this));
    },

    _loginClicked: function() {
      if (Online.isOnline()) {
        GAuth.authorizeWithPopup();
      }
    },
  });

  return Login;

});