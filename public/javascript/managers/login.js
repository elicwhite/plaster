define(["event", "gauth", "sections/login", "sections/main"], function(Event, GAuth, LoginSection, MainSection) {
  function LoginManager() {
    this.init();
  }

  LoginManager.prototype = {
    pages: null,
    currentPage: "",

    init: function() {
      this.pages = {};

      Event.addListener("authenticatedStatusChanged", this._authenticatedStatusChanged.bind(this));

      this.pages.login = new LoginSection();
      this.pages.main = new MainSection();

      var hash = location.hash;
      if (hash.indexOf("#") === 0) {
        this.setPage("main");
        return;
      }

      if (GAuth.isAuthenticated()) {
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

    _authenticatedStatusChanged: function(status) {
      if (status.authenticated) {
        this.setPage("main");
      }
    },
  };

  return LoginManager;
});