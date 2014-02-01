require(["event", "sections/draw"], function(Event, Draw) {

  function init() {
    window.log = console.log.bind(console);

    document.addEventListener("touchmove", function(e) {
      e.preventDefault();
    });

    document.addEventListener("mousewheel", function(e) {
      e.preventDefault();
    });
    
    var draw = new Draw();
    draw.show();
  }

  if (document.readyState === "interactive" || document.readyState === "complete") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init, false);
  }
});