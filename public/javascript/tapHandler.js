define([], function() {
  function TapHandler(element, options) {
    this.init(element, options);
  }

  TapHandler.prototype = {
    _element: null,
    _options: null,

    _distCutoff: 20,
    _timeCutoff: 500,

    _startTime: null,
    _startX: null,
    _startY: null,

    _lastX: null,
    _lastY: null,

    // Object with x and why of where the element is on the page
    _offset: null,

    init: function(element, options) {
      this._element = element;
      this._options = options;

      // Replace with binded events
      this._move = this._move.bind(this);
      this._end = this._end.bind(this);

      this._offset = {x: element.offsetLeft, y: element.offsetTop};

      this._element.addEventListener("touchstart", this._start.bind(this));
      this._element.addEventListener("mousedown", this._start.bind(this));
    },

    _start: function(e) {
      this._processEvent(e);
      this._startTime = e.timeStamp;

      this._startX = this._lastX = e.x;
      this._startY = this._lastY = e.y;

      document.addEventListener("touchmove", this._move);
      document.addEventListener("mousemove", this._move);
      document.addEventListener("touchend", this._end);
      document.addEventListener("mouseup", this._end);
    },

    _move: function(e) {
      this._processEvent(e);

      this._lastX = e.x;
      this._lastY = e.y;

      if (this._options.move) {
        this._options.move(e);
      }
    },

    _end: function(e) {
      this._processEvent(e);

      document.removeEventListener("touchmove", this._move);
      document.removeEventListener("mousemove", this._move);
      document.removeEventListener("touchend", this._end);
      document.removeEventListener("mouseup", this._end);

      var dist = Math.sqrt(((e.x - this._startX) * (e.x - this._startX)) + ((e.y - this._startY) * (e.y - this._startY)));
      if (dist < this._distCutoff && (e.timeStamp - this._startTime < this._timeCutoff)) {
        if (this._options.tap) {
          this._options.tap(e);
        }
      }
    },

    // Given an e, add things like x and y regardless of touch or mouse
    _processEvent: function(e) {
      // It's a touch
      if (e.touches && e.touches.length > 0) {
        e.x = e.touches[0].clientX;
        e.y = e.touches[0].clientY;
      } else if (e.clientX) {
        // It's a click
        e.x = e.clientX;
        e.y = e.clientY;
      } else {
        // It's probably an end, there is no coords
        e.x = this._lastX;
        e.y = this._lastY;
      }

      e.distFromLeft = e.x - this._offset.x;
      e.distFromTop = e.y - this._offset.y;

      e.xFromLast = e.x - this._lastX;
      e.yFromLast = e.y - this._lastY;
    }
  };

  return TapHandler;
});