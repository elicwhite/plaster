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

      this.transitionEnd = {
        'transition': 'transitionend',
        'webkitTransition': 'webkitTransitionEnd',
        'MozTransition': 'transitionEnd',
        'OTransition': 'oTransitionEnd'
      }[this.transition];

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

    addPrefix: function(property) {
      var prefix = '';
      var vendor = ['ms', 'webkit', 'mox', 'o'];
      var style = this._b.style;

      if (typeof style[property] == 'string') {
        prefix = '';
      } else {
        for (var i = 0; i < vendor.length; i++) {
          if (typeof style['-' + vendor[i] + '-' + property] == 'string') {
            prefix = vendor[i];
            break;
          }
        }
      }

      var styleString = (prefix.length > 0) ? property.charAt(0).toUpperCase() + property.slice(1) : property;

      if (prefix) {
        return prefix + styleString;
      } else {
        return styleString;
      }
    }
  });

  var platform = new Platform();
  return platform;
});