require(["event", "globals", "managers/login"], function(Event, g, LoginManager) {

  function init() {
    window.log = console.log.bind(console);

    document.addEventListener("touchmove", function(e) {
      e.preventDefault();
    });

    document.addEventListener("mousewheel", function(e) {
      e.preventDefault();
    });

    g.setHTMLDevices();

    var loginManager = new LoginManager();
    window.login = loginManager;
  }

  if (document.readyState === "interactive" || document.readyState === "complete") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init, false);
  }
});