require(["event", "globals", "managers/login", "gauth"], function(Event, g, LoginManager, GAuth) {

  function init() {
    if (localStorage.lastActive < Date.now() - 10) {
      console.error("You can't open multiple copies in the same browser");
      return;
    }

    window.log = console.log.bind(console);

    window.addEventListener("mousewheel", function(e) {
      e.preventDefault();
    });

    g.setHTMLDevices();

    var loginManager = new LoginManager();
    window.login = loginManager;

    window.addEventListener("resize", function() {
      // make sure we are scrolled to 0. Without this there are problems 
      // when changing device orientation
      window.scroll(0, 0);
      setHeight();
    });

    function setHeight() {
      document.body.style.height = window.innerHeight + "px";
    }

    setHeight();

    GAuth.start(function() {
      console.log("guath done");
      require(["data"], function(Data) {
        console.log("drive callback");
        Data.startDrive();
      });
    });

    setInterval(function() {
      localStorage.lastActive = Date.now();
    }, 5000);

    //var realtime = new RealtimeData();
    //realtime.startRealtime();
  }

  if (document.readyState === "interactive" || document.readyState === "complete") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init, false);
  }
});