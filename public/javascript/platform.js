define(["class"], function(Class) {
  var Platform = Class.extend({
    // shortcut to body
    _b: null,

    standalone: null,

    transition: null,
    transitionEnd: null,
    animation: null,
    transform: null,
    transformOrigin: null,
    mouseWheel: null,

    init: function() {
      this._b = document.body;

      this.standalone = !! window.navigator.standalone;

      this.transition = this.addPrefix('transition');
      this.transitionEnd = this.addPrefix('transitionEnd');
      this.animation = this.addPrefix('animation');
      this.transform = this.addPrefix('transform');
      this.transformOrigin = this.addPrefix('transformOrigin');

      this.mouseWheel = typeof(window.onwheel) != "undefined" ? "wheel" : "mousewheel";

      window.requestAnimationFrame = window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        function(callback) {
          window.setTimeout(callback, 1000 / 60);
      };

      window.indexedDB = window.indexedDB ||
        window.webkitIndexedDB ||
        window.mozIndexedDB || 
        window.msIndexedDB ||
        window.oIndexedDB;
    },

    addPrefix: function(p) {
      var prefix = '';
      var v = ['ms', 'webkit', 'mox', 'o'];
      var s = this._b.style;

      if (typeof s[p] == 'string') {
        prefix = '';
      } else {
        for (var i = 0; i < v.length; i++) {
          if (typeof s['-' + v[i] + '-' + p] == 'string') {
            prefix = v[i];
            break;
          }
        }
      }

      var styleString = (prefix.length > 0) ? p.charAt(0).toUpperCase() + p.slice(1) : p;

      if (prefix) {
        return prefix + styleString;
      } else {
        return styleString;
      }
    }
  });

  var platform = new Platform();
  window.platform = platform;
  return platform;
});