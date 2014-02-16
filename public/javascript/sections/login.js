define(["event", "section", "tapHandler", "gauth"], function(Event, Section, TapHandler, GAuth) {

  var Login = Section.extend({
    id: "login",

    init: function() {
      this._super();
      
      var button = document.getElementById("loginbutton");
      new TapHandler(button, {tap: this._loginClicked.bind(this) });
    },

    _loginClicked: function() {
      GAuth.authorizeWithPopup();
    },
  });

  return Login;

});