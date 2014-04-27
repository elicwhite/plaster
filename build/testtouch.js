window.log = console.log.bind(console);

function start() {
  document.body.addEventListener("touchmove", function(e) {
    e.preventDefault();
  });

  var canvas = document.getElementById("canvas");
  var tools = document.getElementById("tools");

  function l(ele) {
    return function() {
      log.apply(log, [ele].concat(arguments));
    }
  }

  var o = l("canvas");
  var i = l("tools");

  var oh = new TapHandler(canvas, {
    start: function(e) {o("start",e)},
    move: function(e) {o("move",e)},
    end: function(e) {o("end",e)},
    tap: function(e) {o("tap",e)},
    gestureStart: function(e) {o("gestureStart",e)},
    gesture: function(e) {o("gesture",e)},
    gestureEnd: function(e) {o("gestureEnd",e)},
  });

  var ih = new TapHandler(tools, {
    start: function(e) {
      i("start",e);
      oh.ignoreGestures(true);
      ih.ignoreGestures(true);
    },
    move: function(e) {i("move", e)},
    end: function(e) {
      i("end", e);
      oh.ignoreGestures(false);
      ih.ignoreGestures(false);
    },
    tap: function(e) {i("tap", e)},
    gestureStart: function(e) {i("gestureStart", e)},
    gesture: function(e) {i("gesture", e)},
    gestureEnd: function(e) {i("gestureEnd", e)},
  });
}



function TapHandler(element, options) {
    this.init(element, options);
  }

  TapHandler.prototype = {
    _element: null,
    _options: null,

    _distCutoff: 20,
    _timeCutoff: 500,

    // touch or mouse
    _startType: null,
    _startTouchId: null,
    _startTime: null,
    _startX: null,
    _startY: null,

    _startScale: null,

    _lastX: null,
    _lastY: null,

    _lastScale: null,

    // Object with x and why of where the element is on the page
    _offset: null,

    _inTouch: false,
    _inGesture: false,

    _ignoreGestures: false,

    init: function(element, options) {
      this._element = element;
      this._options = options;

      // Replace with binded events
      this._start = this._start.bind(this);
      this._move = this._move.bind(this);
      this._end = this._end.bind(this);
      this._gestureStart = this._gestureStart.bind(this);
      this._gestureChange = this._gestureChange.bind(this);
      this._gestureEnd = this._gestureEnd.bind(this);

      this._offset = {
        x: element.offsetLeft,
        y: element.offsetTop
      };

      this._element.addEventListener("mousedown", this._start);
      this._element.addEventListener("touchstart", this._start);
      this._element.addEventListener("gesturestart", this._gestureStart);
    },

    ignoreGestures: function(value) {
      this._ignoreGestures = value;
    },


    _start: function(e) {
      if (e.touches) {
        // start touch is the last touch
        this._startTouchId = e.touches[e.touches.length - 1].identifier;
      }

      this._processEvent(e);

      // Ignore these if we are currently gesturing
      if (this._inGesture) {
        return;
      }

      this._startType = "mouse";
      if (e.touches) {
        this._startType = "touch";
      }

      this._inTouch = true;


      this._startTime = e.timeStamp;

      this._startX = this._lastX = e.x;
      this._startY = this._lastY = e.y;

      if (this._options.start) {
        this._options.start(e);
      }

      if (this._startType == "touch") {
        document.addEventListener("touchmove", this._move);
        document.addEventListener("touchend", this._end);
      } else if (this._startType == "mouse") {
        document.addEventListener("mousemove", this._move);
        document.addEventListener("mouseup", this._end);
      }
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
      /*
        if e isn't set, end the handlers, call tap if it is within limits, call end
      */
      if (!e) {
        this._endTouchHandlers();
        if (this._options.end) {
          this._options.end();
        }

        this._inTouch = false;

        return;
      }

      e.wasTap = false;

      // The event still has our start touch, it hasn't ended
      if (e.touches && this._indexOfTouch(e, this._startTouchId) !== -1) {
        return;
      }

      this._endTouchHandlers();
      this._processEvent(e);

      var dist = Math.sqrt(((e.x - this._startX) * (e.x - this._startX)) + ((e.y - this._startY) * (e.y - this._startY)));

      if (dist < this._distCutoff && (e.timeStamp - this._startTime < this._timeCutoff)) {
        e.wasTap = true;
        if (this._options.tap) {
          this._options.tap(e);
        }
      }

      // It wasn't a tap, just an up
      if (this._options.end) {
        this._options.end(e);
      }

      this._inTouch = false;

      this._startX = null;
      this._startY = null;

      // Keep mouse events from being called
      if (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },

    _gestureStart: function(e) {
      if (this._ignoreGestures) {
        return;
      }

      this._inGesture = true;

      if (this._inTouch) {
        console.log("we are in a touch");
        // We need to end the touch
        this._end();
      }



      this._processEvent(e);
      this._processGesture(e);

      this._startTime = e.timeStamp;

      this._startX = this._lastX = e.x;
      this._startY = this._lastY = e.y;

      this._startScale = this._lastScale = e.scale;

      if (this._options.gestureStart) {
        this._options.gestureStart(e);
      }

      document.addEventListener("gesturechange", this._gestureChange);
      document.addEventListener("gestureend", this._gestureEnd);
    },

    _gestureChange: function(e) {
      this._processEvent(e);
      this._processGesture(e);

      this._lastX = e.x;
      this._lastY = e.y;
      this._lastScale = e.scale;

      this._lastScale = e.scale;

      if (this._options.gesture) {
        this._options.gesture(e);
      }
    },

    _gestureEnd: function(e) {
      this._processEvent(e);
      this._processGesture(e);

      if (this._options.gestureEnd) {
        this._options.gestureEnd(e);
      }

      document.removeEventListener("gesturechange", this._gestureChange);
      document.removeEventListener("gestureend", this._gestureEnd);

      this._inGesture = false;
    },

    // Unregister the regular touch handlers, used for when gestures start
    _endTouchHandlers: function() {
      if (this._startType == "touch") {
        document.removeEventListener("touchmove", this._move);
        document.removeEventListener("touchend", this._end);
      } else if (this._startType == "mouse") {
        document.removeEventListener("mousemove", this._move);
        document.removeEventListener("mouseup", this._end);
      }
    },

    // Given an e, add things like x and y regardless of touch or mouse
    _processEvent: function(e) {
      e.isTouch = e.touches ? true : false;

      var index = -1;
      // It's a touch
      if (e.touches && e.touches.length > 0 && (index = this._indexOfTouch(e, this._startTouchId)) !== -1) {
        // Use the last touch
        e.x = e.touches[index].clientX;
        e.y = e.touches[index].clientY;
      } else if (e.clientX) {
        // It's a click
        e.x = e.clientX;
        e.y = e.clientY;
      } else if (e.pageX) {
        // gesture events only get a layerx
        e.x = e.pageX;
        e.y = e.pageY;
      } else {
        // It's probably an end, there is no coords
        e.x = this._lastX;
        e.y = this._lastY;
      }

      e.distFromLeft = e.x - this._offset.x;
      e.distFromTop = e.y - this._offset.y;

      e.xFromLast = e.x - this._lastX;
      e.yFromLast = e.y - this._lastY;

      e.distFromStartX = (this._startX !== null) ? e.x - this._startX : 0;
      e.distFromStartY = (this._startY !== null) ? e.y - this._startY : 0;
    },

    _processGesture: function(e) {
      e.scaleFromLast = e.scale - this._lastScale;
    },

    _indexOfTouch: function(e, identifier) {
      var index = -1;
      if (e.touches && identifier !== null) {
        for (var i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier == identifier) {
            index = i;
            break;
          }
        }
      }

      return index;
    },

    clear: function() {
      if (this._inTouch) {
        this._endTouchHandlers();
      }

      this._element.removeEventListener("mousedown", this._start);
      this._element.removeEventListener("touchstart", this._start);
      this._element.removeEventListener("gesturestart", this._gestureStart);
    }


  };