define([], function() {
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
    _startDistance: null,

    _lastX: null,
    _lastY: null,

    // Object with x and why of where the element is on the page
    _offset: null,

    _inGesture: false,
    _ignoreGestures: false,

    init: function(element, options) {
      this._element = element;
      this._options = options;

      // Replace with binded events
      this._mouseDown = this._mouseDown.bind(this);
      this._touchDown = this._touchDown.bind(this);

      this._mouseMove = this._mouseMove.bind(this);
      this._touchMove = this._touchMove.bind(this);

      this._mouseUp = this._mouseUp.bind(this);
      this._touchUp = this._touchUp.bind(this);

      this._touchCancel = this._touchCancel.bind(this);


      this._down = this._down.bind(this);
      this._move = this._move.bind(this);
      this._end = this._end.bind(this);
      this._gestureStart = this._gestureStart.bind(this);
      this._gestureChange = this._gestureChange.bind(this);
      this._gestureEnd = this._gestureEnd.bind(this);

      this._offset = {
        x: element.offsetLeft,
        y: element.offsetTop
      };

      this._element.addEventListener("mousedown", this._mouseDown);
      this._element.addEventListener("touchstart", this._touchDown);
    },

    ignoreGestures: function(value) {
      this._ignoreGestures = value;
    },

    _calculateMouseXY: function(e) {
      e.x = e.clientX;
      e.y = e.clientY;
    },

    _calculateTouchXY: function(e) {
      var index = this._indexOfTouch(e, this._startTouchId);

      e.x = e.touches[index].clientX;
      e.y = e.touches[index].clientY;
    },

    _calculateGestureXY: function(e) {
      // use the first two touches
      e.x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      e.y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    },

    _mouseDown: function(e) {
      this._startType = "mouse";

      this._calculateMouseXY(e);
      this._down(e);

      document.addEventListener("mousemove", this._mouseMove);
      document.addEventListener("mouseup", this._mouseUp);
    },

    _touchDown: function(e) {
      this._startType = "touch";

      // If we have no startId, this is our first touch, set it
      if (this._startTouchId === null) {
        this._startTouchId = e.touches[e.touches.length - 1].identifier;
      }

      if (e.touches.length >= 2 && !this._ignoreGestures) {
        this._gestureStart(e);
      } else {
        this._calculateTouchXY(e)
        this._down(e);
      }

      document.addEventListener("touchmove", this._touchMove);
      document.addEventListener("touchend", this._touchUp);
      this._element.addEventListener("touchcancel", this._touchCancel);
    },


    _down: function(e) {
      this._processEvent(e);

      // We need to use our own instead of timeStamp so that we can run tests
      this._startTime = Date.now();

      this._startX = this._lastX = e.x;
      this._startY = this._lastY = e.y;

      if (this._options.start) {
        this._options.start(e);
      }
    },

    _gestureStart: function(e) {
      this._inGesture = true;

      // end the touch, trigger gesturestart
      if (this._options.end) {
        this._options.end(e);
        this._startTouchId = null;
      }

      this._calculateGestureXY(e);

      this._startTime = Date.now();

      this._startX = this._lastX = e.x;
      this._startY = this._lastY = e.y;


      this._startDistance = this._getGestureDistance(e);
      this._lastScale = 1;

      if (this._options.gestureStart) {
        this._options.gestureStart(e);
      }
    },

    _mouseMove: function(e) {
      this._calculateMouseXY(e);
      this._move(e);
    },

    _touchMove: function(e) {
      if (this._inGesture) {
        this._gestureChange(e);
      } else {
        this._calculateTouchXY(e);
        this._move(e);
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

    _gestureChange: function(e) {
      this._calculateGestureXY(e);

      this._processEvent(e);

      var newDistance = this._getGestureDistance(e);

      e.scale = newDistance / this._startDistance;
      e.scaleFromLast = e.scale - this._lastScale;

      this._lastX = e.x;
      this._lastY = e.y;
      this._lastScale = e.scale;

      if (this._options.gesture) {
        this._options.gesture(e);
      }
    },

    _mouseUp: function(e) {
      document.removeEventListener("mousemove", this._mouseMove);
      document.removeEventListener("mouseup", this._mouseUp);
      this._end(e);
    },

    _touchUp: function(e) {
      if (this._inGesture) {
        this._gestureEnd(e);
        return;
      }

      // Only end if we no longer have the starting touch
      if (this._containsTouch(e, this._startTouchId)) {
        return;
      }

      this._end(e);

      document.removeEventListener("touchmove", this._touchMove);
      document.removeEventListener("touchend", this._touchUp);

      this._touchCancel();
    },

    _end: function(e) {
      this._processEvent(e);

      e.wasTap = false;

      var dist = Math.sqrt(((this._lastX - this._startX) * (this._lastX - this._startX)) + ((this._lastY - this._startY) * (this._lastY - this._startY)));

      if (dist < this._distCutoff && (Date.now() - this._startTime < this._timeCutoff)) {
        e.wasTap = true;
        if (this._options.tap) {
          this._options.tap(e);
        }
      }

      if (this._options.end) {
        this._options.end(e);
      }

      this._startX = null;
      this._startY = null;

      e.preventDefault();
      e.stopImmediatePropagation();
    },

    _touchCancel: function() {
      this._startTouchId = null;
      this._element.removeEventListener("touchcancel", this._touchCancel);
    },

    _gestureEnd: function(e) {
      if (e.touches.length >= 2) {
        return;
      }

      this._inGesture = false;

      // No longer in a multi touch gesture
      if (this._options.gestureEnd) {
        this._options.gestureEnd(e);
      }

      document.removeEventListener("touchmove", this._touchMove);
      document.removeEventListener("touchend", this._touchUp);
    },

    // Unregister the regular touch handlers, used for when gestures start

    // Given an e, add things like x and y regardless of touch or mouse
    _processEvent: function(e) {
      e.distFromLeft = e.x - this._offset.x;
      e.distFromTop = e.y - this._offset.y;

      e.xFromLast = e.x - this._lastX;
      e.yFromLast = e.y - this._lastY;

      e.distFromStartX = (this._startX !== null) ? e.x - this._startX : 0;
      e.distFromStartY = (this._startY !== null) ? e.y - this._startY : 0;
    },

    _getGestureDistance: function(e) {
      var xDist = (e.touches[0].clientX - e.touches[1].clientX);
      var yDist = (e.touches[0].clientY - e.touches[1].clientY);

      var dist = Math.sqrt((xDist * xDist) + (yDist * yDist));
      return dist;
    },

    _containsTouch: function(e, identifier) {
      return this._indexOfTouch(e, this._startTouchId) !== -1;
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

      // hard code all these removes, might as well, this is only used in the test suite for now
      this._element.removeEventListener("mousedown", this._mouseDown);
      this._element.removeEventListener("touchstart", this._touchDown);

      document.removeEventListener("mousemove", this._mouseMove);
      document.removeEventListener("mouseup", this._mouseUp);

      document.removeEventListener("touchmove", this._touchMove);
      document.removeEventListener("touchend", this._touchUp);
    }
  };

  return TapHandler;
});