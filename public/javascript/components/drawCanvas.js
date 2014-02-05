define(["class", "helpers"], function(Class, Helpers) {
  var DrawCanvas = Class.extend({
    _canvas: null,
    _ctx: null,

    _settings: null,

    init: function(canvas, settings) {
      this._canvas = canvas;
      this._ctx = canvas.getContext("2d");

      this._settings = settings;
    },

    drawAll: function(actions) {
      this._ctx.setTransform(this._settings.scale, 0, 0, this._settings.scale, this._settings.offsetX, this._settings.offsetY);

      var topLeft = Helpers.screenToWorld(this._settings, 0, 0);
      var bottomRight = Helpers.screenToWorld(this._settings, this._canvas.width, this._canvas.height);

      this._ctx.clearRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);

      // Keep the line width the same no matter the zoom level
      var strokeSize = 1;
      this._ctx.lineWidth = strokeSize / this._settings.scale;

      for (var i = 0; i < actions.length; i++) {
        var action = actions[i];

        this.doAction(action);
        
      }
    },

    doAction: function(action) {
      if (action.type == "stroke") {
        this._drawStroke(action.stroke);
      }
    },

    updateSettings: function(settings) {
      this._settings = settings;
    },

    _drawStroke: function(stroke) {
      if (stroke.points.length < 2) {
        return;
      }

      var controlPoints = [];
      var points = stroke.points;

      if (!stroke.controlPoints) {
        controlPoints = Helpers.getCurveControlPoints(points);
      } else {
        controlPoints = stroke.controlPoints;
      }

      var point = points[0];

      this._ctx.beginPath();
      this._ctx.moveTo(point.x, point.y);

      for (var i = 1; i < points.length; i++) {
        point = points[i];
        var cp1 = controlPoints[i - 1].first;
        var cp2 = controlPoints[i - 1].second;
        this._ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, point.x, point.y);
      }

      this._ctx.stroke();
    },
  });

  return DrawCanvas;

});