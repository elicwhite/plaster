function init() {
  window.log = console.log.bind(console);

  window.addEventListener("wheel", function(e) {
    e.preventDefault();
  });

  require(["event", "globals", "managers/login", "gauth"], function(Event, g, LoginManager, GAuth) {
    g.setHTMLDevices();

    var loginManager = new LoginManager();

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
      console.log("GAuth Loaded");
      require(["dataLayer/data"], function(Data) {
        Data.startDrive();
      });
    });

    //var realtime = new RealtimeData();
    //realtime.startRealtime();

    /*
    var o = (localStorage.fail !== "true");
    localStorage.fail = o;
    console.log("status", localStorage.fail);

    var promise = new Promise(function(resolve, reject) {
        if (o) {
          resolve(40);
        }else {
          reject(new Error("blah"));
        }
    });


    promise
    .then(function(result) {
      console.log("success", result);
    })
    .then(function(result) {
      console.log("result 2", result);
    })
    .catch(function(err) {
      console.error("error", err);
    });
    */

  });
}

if (document.readyState === "interactive" || document.readyState === "complete") {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init, false);
}