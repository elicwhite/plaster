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

      if (this._zooming) {
        var startTopLeft = Helpers.screenToWorld(this._initialZoomSettings, 0, 0);
        var offsetScreen = Helpers.worldToScreen(this._settings, startTopLeft.x, startTopLeft.y);

        var startBottomRight = Helpers.screenToWorld(this._initialZoomSettings, canvas.width, canvas.height);
        var endBottomRight = Helpers.worldToScreen(this._settings, startBottomRight.x, startBottomRight.y);

        var width = endBottomRight.x - offsetScreen.x;
        var height = endBottomRight.y - offsetScreen.y;

        this._ctx.drawImage(this._backCanvas, offsetScreen.x, offsetScreen.y, width, height);
      }
      else
      {
        this._ctx.drawImage(this._backCanvas, 0, 0, this._backCanvas.width, this._backCanvas.height);
      }

      this._ctx.drawImage(this._tempCanvas, 0, 0, this._tempCanvas.width, this._tempCanvas.height);
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
        }
        else
        {
          ctx.lineTo(point[0], point[1]);
        }
      }

      ctx.stroke();
    },
  });

  return DrawCanvas;

  /*
  drawAll(actions) // Draw all actions to a back canvas
  drawTemporary(action) // draw action on front canvas
  addAction(action) // add action to back canvas
  */

});