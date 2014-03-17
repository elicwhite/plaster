function init() {
  window.log = console.log.bind(console);

  window.addEventListener("wheel", function(e) {
    e.preventDefault();
  });

  require(["promise", "event", "globals", "helpers", "managers/login", "gauth"], function(Promise, Event, g, Helpers, LoginManager, GAuth) {
    if (!window.Promise) {
      window.Promise = Promise;
    }


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
  });
}

if (document.readyState === "interactive" || document.readyState === "complete") {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init, false);
}


/*
    var a = [];
var before = window.performance.memory;
for (var i = 0; i < 1; i++) {
  a = new Error();
}
var after = window.performance.memory;
console.log("before", before);
console.log("after", after);
    var wrap = Error;

    wrap.prototype.write = function(message) {
      var suffix = (this.lineNumber ? this.fileName + ':' + this.lineNumber + ":1" // add arbitrary column value for chrome linking
        : this.extractLineNumberFromStack()
      )

      var args = Array.prototype.slice.call(arguments, 0);

      //var suffix = this.lineNumber ? 'line: ' + this.lineNumber : 'stack: ' + this.stack;

      console.log.apply(console, args.concat([suffix]));
    }

    wrap.prototype.extractLineNumberFromStack = function() {
      /// <summary>
      /// Get the line/filename detail from a Webkit stack trace.  See http://stackoverflow.com/a/3806596/1037948
      /// </summary>
      /// <param name="stack" type="String">the stack string</param>

      // correct line number according to how Log().write implemented
      var line = this.stack.split('\n')[2];
      // fix for various display text
      line = (line.indexOf(' (') >= 0 ? line.split(' (')[1].substring(0, line.length - 1) : line.split('at ')[1]);
      return line;
    };

    wrap().write("Books");
    */