define(["event", "section", "tapHandler"], function(Event, Section, TapHandler) {

  var Login = Section.extend({
    id: "login",

    init: function() {
      this._super();
      console.log("login init");
      
      var button = document.getElementById("loginbutton");
      new TapHandler(button, {tap: this._loginClicked.bind(this) });
    },

    _loginClicked: function() {
      setTimeout(function() {
        Event.trigger("login");  
      }, 400);
    },

    show: function() {
      console.log("login shown");
    },

    hide: function() {
      console.log("login hidden");
    }, 
  });

  return Login;

});