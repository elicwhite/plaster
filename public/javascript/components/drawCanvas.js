define(["class", "helpers", "bezierCurve"], function(Class, Helpers, BezierCurve) {
  var DrawCanvas = Class.extend({
    _canvas: null,
    _ctx: null,
    _settings: null,

    _backCanvas: null,
    _backCtx: null,

    // Holds at most one action
    _tempCanvas: null,
    _tempCtx: null,

    _useCurves: null,

    _raster: false,

    _zooming: false,
    _initialZoomSettings: null,

    init: function(canvas, settings) {
      this._canvas = canvas;
      this._ctx = canvas.getContext("2d");
      this._settings = settings;

      this._useCurves = true;

      this._backCanvas = document.createElement("canvas");
      this._backCtx = this._backCanvas.getContext("2d");

      this._tempCanvas = document.createElement("canvas");
      this._tempCtx = this._tempCanvas.getContext("2d");
    },

    useCurves: function(value) {
      this._useCurves = value;
    },

    rasterMode: function(raster) {
      this._raster = raster;

      if (!raster) {
        this._initialZoomSettings = null;
      }
    },

    // Creates a back canvas and draws all the actions to it and renders it on the main canvas
    doAll: function(actions) {
      this._backCanvas.width = this._canvas.width;
      this._backCanvas.height = this._canvas.height;

      this._clearCanvas(this._backCanvas, this._backCtx);

      // Also clear the temp canvas
      this._clearCanvas(this._tempCanvas, this._tempCtx);

      for (var i = 0; i < actions.length; i++) {
        var action = actions[i];

        this._doAction(this._backCtx, action);
      }
    },

    // The action is done to a temporary canvas
    doTemporaryAction: function(action) {
      this._tempCanvas.width = this._canvas.width;
      this._tempCanvas.height = this._canvas.height;

      this._clearCanvas(this._tempCanvas, this._tempCtx);

      this._doAction(this._tempCtx, action);
    },

    addAction: function(action) {
      this._doAction(this._backCtx, action);

      // Clears the temp canvas when you add something to the back
      this._clearCanvas(this._tempCanvas, this._tempCtx);
    },

    // Clears the main screen
    clear: function() {
      this._clearCanvas(this._canvas, this._ctx);
    },

    _clearCanvas: function(canvas, ctx) {
      ctx.setTransform(this._settings.scale, 0, 0, this._settings.scale, this._settings.offsetX, this._settings.offsetY);

      var topLeft = Helpers.screenToWorld(this._settings, 0, 0);
      var bottomRight = Helpers.screenToWorld(this._settings, canvas.width, canvas.height);

      ctx.clearRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    },

    render: function() {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

      var x = 0;
      var y = 0;
      var width = this._backCanvas.width;
      var height = this._backCanvas.height;

      if (this._raster) {
        var startTopLeft = Helpers.screenToWorld(this._initialZoomSettings, 0, 0);
        var offsetScreen = Helpers.worldToScreen(this._settings, startTopLeft.x, startTopLeft.y);

        var startBottomRight = Helpers.screenToWorld(this._initialZoomSettings, canvas.width, canvas.height);
        var endBottomRight = Helpers.worldToScreen(this._settings, startBottomRight.x, startBottomRight.y);

        x = offsetScreen.x;
        y = offsetScreen.y;
        width = endBottomRight.x - offsetScreen.x;
        height = endBottomRight.y - offsetScreen.y;
      }

      this._ctx.drawImage(this._backCanvas, x, y, width, height);
      this._ctx.drawImage(this._tempCanvas, x, y, width, height);
    },

    _doAction: function(ctx, action) {
      if (action.type == "stroke") {

        this._drawStroke(ctx, action.value);
      }
    },

    updateSettings: function(settings) {
      this._settings = settings;
    },

    _drawStroke: function(ctx, stroke) {
      if (stroke.points.length < 2) {
        return;
      }

      var controlPoints = stroke.controlPoints;
      var points = stroke.points;

      var point = points[0];

      var lineWidth = stroke.width;
      if (stroke.lockWidth) { // the width stays the same regardless of zoom
        lineWidth /= this._settings.scale;
      }

      ctx.lineJoin = "round";
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = stroke.color;
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(point.x, point.y);

      for (var i = 1; i < points.length; i++) {
        point = points[i];

        // Curve the first one, even if we are using lines
        if (this._useCurves || i == 1) {
          var cp1 = controlPoints[i - 1][0];
          var cp2 = controlPoints[i - 1][1];
          ctx.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], point[0], point[1]);
        } else {
          ctx.lineTo(point[0], point[1]);
        }
      }

      ctx.stroke();
    },

    zoom: function(x, y, dScale) {
      // Can't zoom that far!
      var modifiedScale = this._settings.scale + dScale;

      if (modifiedScale < .000001 || modifiedScale > 20) {
        return false;
      }

      if (this._raster === false) {
        this._initialZoomSettings = Helpers.clone(this._settings);
      }

      var world = Helpers.screenToWorld(this._settings, x, y);
      this._settings.scale += dScale;
      var scr = Helpers.worldToScreen(this._settings, world.x, world.y);

      var diffScr = {
        x: x - scr.x,
        y: y - scr.y
      };

      this._settings.offsetX += diffScr.x; // * this._settings.scale;
      this._settings.offsetY += diffScr.y; // * this._settings.scale;

      this._raster = true;

      return true;
    },

    pan: function(dx, dy) {
      if (this._raster === false) {
        this._initialZoomSettings = Helpers.clone(this._settings);
      }

      this._settings.offsetX += dx;
      this._settings.offsetY += dy;

      return true;
    },

    panTo: function(x, y) {
      this._settings.offsetX = x;
      this._settings.offsetY = y;
    }
  });

  return DrawCanvas;

  /*
  drawAll(actions) // Draw all actions to a back canvas
  drawTemporary(action) // draw action on front canvas
  addAction(action) // add action to back canvas
  */

});