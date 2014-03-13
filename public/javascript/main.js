function init() {
  window.log = console.log.bind(console);

  window.addEventListener("wheel", function(e) {
    e.preventDefault();
  });

  require(["event", "globals", "helpers", "managers/login", "gauth", "bezierCurve"], function(Event, g, Helpers, LoginManager, GAuth, BezierCurve) {
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


    var points = [
      [4, 10],
      [18, 20],
      [30, 15],
      [6, -4],
      [10, 15]
    ];

    var curve = new BezierCurve();

    var r1 = Helpers.getCurveControlPoints(points);
    var r2 = curve.getCurveControlPoints(points);

    console.log("Match?", arraysMatch(r1, r2), r1, r2);

    function arraysMatch(a1, a2) {
      if (a1.length != a2.length || typeof(a1) != typeof(a2)) {
        console.log("not same length or type");
        return false;
      }

      for (var i = 0; i < a1.length; i++) {
        if (typeof(a1[i]) == "object") {
          return arraysMatch(a1[i], a2[i]);
        }

        if (a1[i] != a2[i]) {

          console.log("a1 is ", a1[i], "a2 is", a2[i]);
          return false;
        }
      }

      return true;
    }

    //var result2 = Helpers.updateCurveControlPoints(cp, points);
  });
}

if (document.readyState === "interactive" || document.readyState === "complete") {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init, false);
}