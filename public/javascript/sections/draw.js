define(["section", "tapHandler"], function(Section, TapHandler) {

  var Draw = Section.extend({
    id: "draw",

    _canvas: null,
    _ctx: null,

    // Offsets and scale
    _transform: null,

    // The lines we are drawing
    _lines: null,

    // Do we need to update on this frame?
    _needsUpdate: true,

    // Set this to false to stop the render loop
    _shouldRender: false,

    // The current tool, zoom or pan
    _currentTool: "pan",

    // When you move the mouse, what is the tool to use?
    _currentPointTool: "pencil",

    init: function() {
      this._super();

      this._canvas = document.getElementById('canvas');
      this._ctx = canvas.getContext("2d");
      window.ctx = this._ctx;

      this._transform = {
        offsetX: 130,
        offsetY: 260,
        scale: 2
      }

      this._resize();

      this._lines = [];
      window.lines = this._lines;

      this._resize = this._resize.bind(this);

      new TapHandler(canvas, {
        tap: this._tap.bind(this),
        start: this._start.bind(this),
        move: this._move.bind(this),
        end: this._end.bind(this),
        gesture: this._gesture.bind(this)
      });

      new TapHandler(document.getElementById("tools"), {
        tap: this._toolChanged.bind(this),
        start: this._toolStart.bind(this),
        end: this._toolEnd.bind(this)
      });

      canvas.addEventListener("mousewheel", this._mouseWheel.bind(this));

    },

    show: function() {
      this._shouldRender = true;
      this._resize();
      this._redraw();

      window.addEventListener("resize", this._resize);
    },

    hide: function() {
      this._shouldRender = false;

      window.removeEventListener("resize", this._resize);
    },

    _resize: function() {
      this._canvas.width = window.innerWidth;
      this._canvas.height = window.innerHeight;

      this._needsUpdate = true;
    },

    _zoom: function(x, y, scaleChange) {
      // Can't zoom that far!
      if (this._transform.scale + scaleChange < .001 || this._transform.scale + scaleChange > 20000) {
        return;
      }

      var world = this._screenToWorld(x, y);
      this._transform.scale += scaleChange;
      var scr = this._worldToScreen(world.x, world.y);

      var diffScr = {
        x: x - scr.x,
        y: y - scr.y
      };

      this._transform.offsetX += diffScr.x; // * this._transform.scale;
      this._transform.offsetY += diffScr.y; // * this._transform.scale;

      this._needsUpdate = true;
    },

    _pan: function(x, y) {
      this._transform.offsetX += x;
      this._transform.offsetY += y;

      this._needsUpdate = true;
    },

    _mouseWheel: function(e) {

      if (this._currentTool == "pan") {
        //console.log("pan", e);
        this._pan(-e.deltaX, -e.deltaY);
      } else if (this._currentTool == "zoom") {
        if (e.deltaY != 0) {
          //console.log(e);
          this._zoom(e.offsetX, e.offsetY, e.deltaY / 100 * this._transform.scale);
        }
      }
    },


    _tap: function(e) {

    },

    _start: function(e) {
      var world = this._screenToWorld(e.distFromLeft, e.distFromTop);
      this._lines.push({
        points: [world]
      });
    },

    _move: function(e) {
      var world = this._screenToWorld(e.distFromLeft, e.distFromTop);

      //console.log("world", e, world);
      var currentLine = this._lines[this._lines.length - 1];

      var points = currentLine.points;
      var lastPoint = points[points.length - 1];


      var dist = Math.sqrt(((lastPoint.x - world.x) * (lastPoint.x - world.x)) + ((lastPoint.y - world.y) * (lastPoint.y - world.y)));
      //console.log("dist", dist);

      if (dist < 0.0003) {
        return;
      }

      currentLine.points.push(world);
      this._needsUpdate = true;
    },

    _end: function(e) {
      var currentLine = this._lines[this._lines.length - 1];
      var controlPoints = this._getCurveControlPoints(currentLine.points);

      currentLine.controlPoints = controlPoints;
    },

    _gesture: function(e) {
      this._pan(e.xFromLast, e.yFromLast);
      this._zoom(e.x, e.y, e.scaleFromLast * this._transform.scale);
    },

    _redraw: function() {
      // If we shouldn't render, exit the loop
      if (!this._shouldRender) {
        return;
      }

      if (this._needsUpdate) {
        this._ctx.setTransform(this._transform.scale, 0, 0, this._transform.scale, this._transform.offsetX, this._transform.offsetY);

        var topLeft = this._screenToWorld(0, 0);
        var bottomRight = this._screenToWorld(canvas.width, canvas.height);

        this._ctx.clearRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);

        // Keep the line width the same no matter the zoom level
        this._ctx.lineWidth = 1 / this._transform.scale;

        for (var i = 0; i < this._lines.length; i++) {
          var line = this._lines[i];

          this._drawLine(this._ctx, line);
        }

        this._needsUpdate = false;
      }

      requestAnimationFrame(this._redraw.bind(this));
    },

    _drawLine: function(ctx, line) {
      if (line.length < 2) {
        return;
      }

      var controlPoints = [];
      var points = line.points;
      
      if (!line.controlPoints) {
        controlPoints = this._getCurveControlPoints(points);  
      }
      else {
        controlPoints = line.controlPoints;
      }

      var point = points[0];

      ctx.beginPath();
      ctx.moveTo(point.x, point.y);

      for (var i = 1; i < points.length; i++) {
        point = points[i];
        var cp1 = controlPoints.firstControlPoints[i - 1];
        var cp2 = controlPoints.secondControlPoints[i - 1];
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, point.x, point.y);
        //ctx.lineTo(point.x, point.y);
      }

      ctx.stroke();
    },

    _screenToWorld: function(x, y) {
      return {
        x: (x - this._transform.offsetX) / this._transform.scale,
        y: (y - this._transform.offsetY) / this._transform.scale
      };
    },

    _worldToScreen: function(x, y) {
      return {
        x: (x) * this._transform.scale + this._transform.offsetX,
        y: (y) * this._transform.scale + this._transform.offsetY
      };
    },

    _toolChanged: function(e) {
      if (e.srcElement.tagName == "LI") {
        this._currentTool = e.srcElement.dataset.tool;
      }
    },

    _toolStart: function(e) {
      if (e.srcElement.tagName == "LI") {
        //this._currentPointTool = e.srcElement.dataset.tool;
      }
    },

    _toolEnd: function(e) {
      //this._currentPointTool = "pencil";
    },



    /*
    // Create an image with all of the lines on it.
    _save: function() {
      // FIgure out the bounds of the lines
      var top = lines[0].startY;
      var left = lines[0].startX;
      var bottom = lines[0].startY;
      var right = lines[0].startX;

      for (var i = 0; i < lines.length; i++) {
        var top = Math.min(lines[i].startY, Math.min(lines[i].endY, top));
        var left = Math.min(lines[i].startX, Math.min(lines[i].endX, top));
        var bottom = Math.max(lines[i].startY, Math.max(lines[i].endY, top));
        var right = Math.max(lines[i].startX, Math.max(lines[i].endX, top));
      }

      // Create a canvas large enough that it can contain the bounds
      var width = right - left;
      var height = bottom - top;

      // Expand for some padding
      var paddingX = width * .05;
      var paddingY = height * .05;
      width *= 1.1;
      height *= 1.1;

      var transformations = {
        offsetX: paddingX,
        offsetY: paddingY,
        scale: 1
      }

      var canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      var ctx = canvas.getContext("2d");
    }
*/
    _getCurveControlPoints: function(knots) {
      var n = knots.length - 1;

      var firstControlPoints = [];
      var secondControlPoints = [];

      if (n < 1) {
        console.error("Must have at least two knots");
        return;
      }

      if (n == 1) {
        // Special case: should be a line
        firstControlPoints.push({});
        firstControlPoints[0].x = (2 * knots[0].x + knots[1].x) / 3;
        firstControlPoints[0].y = (2 * knots[0].y + knots[1].y) / 3;

        secondControlPoints.push({});
        secondControlPoints[0].x = 2 * firstControlPoints[0].x - knots[0].x;
        secondControlPoints[0].y = 2 * firstControlPoints[0].y - knots[0].y;

        return {
          firstControlPoints: firstControlPoints,
          secondControlPoints: secondControlPoints
        };
      }

      // Calculate first Bezier control points
      // Right hand side vector
      var rhs = new Array(n);


      // Set right hand side X values
      for (var i = 1; i < n - 1; ++i) {
        rhs[i] = 4 * knots[i].x + 2 * knots[i + 1].x;
      }

      rhs[0] = knots[0].x + 2 * knots[1].x;
      rhs[n - 1] = (8 * knots[n - 1].x + knots[n].x) / 2;

      // Get first control points x-values
      var x = this._getFirstControlPoints(rhs);

      // Set right hand side Y values
      for (var i = 1; i < n - 1; ++i) {
        rhs[i] = 4 * knots[i].y + 2 * knots[i + 1].y;
      }

      rhs[0] = knots[0].y + 2 * knots[1].y;
      rhs[n - 1] = (8 * knots[n - 1].y + knots[n].y) / 2;

      // Get first control points Y-values
      var y = this._getFirstControlPoints(rhs);

      // Fill output arrays.
      firstControlPoints = new Array(n);
      secondControlPoints = new Array(n);

      for (var i = 0; i < n; ++i) {
        // First control point
        firstControlPoints[i] = {
          x: x[i],
          y: y[i]
        };

        // Second control point
        if (i < n - 1) {
          secondControlPoints[i] = {
            x: 2 * knots[i + 1].x - x[i + 1],
            y: 2 * knots[i + 1].y - y[i + 1]
          };
        } else {
          secondControlPoints[i] = {
            x: (knots[n].x + x[n - 1]) / 2,
            y: (knots[n].y + y[n - 1]) / 2
          };
        }

      }


      return {
        firstControlPoints: firstControlPoints,
        secondControlPoints: secondControlPoints
      };
    },

    _getFirstControlPoints: function(rhs) {
      var n = rhs.length;
      var x = new Array(n); // Solution vector
      var tmp = new Array(n); // Temp workspace

      var b = 2.0;
      x[0] = rhs[0] / b;

      for (var i = 1; i < n; i++) { // Decomposition and forward substitution
        tmp[i] = 1 / b;
        b = (i < n - 1 ? 4 : 3.5) - tmp[i];
        x[i] = (rhs[i] - x[i - 1]) / b;
      }

      for (var i = 1; i < n; i++) {
        x[n - i - 1] -= tmp[n - i] * x[n - i]; // backsubstituion
      }

      return x;
    },

    _bezier: function() {
      ctx.beginPath();
      ctx.moveTo(20, 20);
      ctx.bezierCurveTo(20, 100, 200, 100, 200, 20);
      ctx.stroke();

      // rect
      ctx.lineWidth = 10;
      ctx.strokeRect(20, 20, 80, 100);

      ctx.beginPath();
      ctx.moveTo(20, 20);
      ctx.quadraticCurveTo(20, 100, 200, 20);
      ctx.stroke();
    }

  });

  return Draw;

});