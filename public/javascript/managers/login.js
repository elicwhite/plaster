define(["event", "sections/login", "sections/main"], function(Event, LoginSection, MainSection) {
  function LoginManager() {
    this.init();
  }

  LoginManager.prototype = {
    pages: null,
    currentPage: "",

    init: function() {
      this.pages = {};

      Event.addListener("login", this._login.bind(this));
      Event.addListener("logout", this._logout.bind(this));

      this.pages.login = new LoginSection();
      this.pages.main = new MainSection();

      var hash = location.hash;
      if (hash.indexOf("#") === 0) {
        this.setPage("main");
        return;
      }

      if (localStorage.loggedIn == "true") {
        this.setPage("main");
      }
      else
      {
        this.setPage("login");
      }
    },

    setPage: function(page) {
      var pageobj = null;

      if (this.currentPage) {

        pageobj = this.pages[this.currentPage];

        if (pageobj.hide) {
          pageobj.hide();
        }
        pageobj.afterHide();
      }

      pageobj = this.pages[page];

      if (pageobj.show) {
        pageobj.show();
      }
      pageobj.afterShow();

      this.currentPage = page;
    },

    _login: function() {
      localStorage.loggedIn = true;
      this.setPage("main");
    },

    _logout: function() {
      // https://accounts.google.com/Logout
      localStorage.loggedIn = false;
      this.setPage("login");
    }
  };

  return LoginManager;
});