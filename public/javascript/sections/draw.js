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

    init: function() {
      this._super();

      this._canvas = document.getElementById('canvas');
      this._ctx = canvas.getContext("2d");

      this._canvas.width = window.innerWidth - 40;
      this._canvas.height = window.innerHeight - 40;

      this._transform = {
        offsetX: 130,
        offsetY: 260,
        scale: 1
      }

      this._lines = [];

      this._lines.push({
        startX: -200 / this._transform.scale,
        startY: 0,
        endX: 200 / this._transform.scale,
        endY: 0
      }, {
        startX: 0,
        startY: -200 / this._transform.scale,
        endX: 0,
        endY: 200 / this._transform.scale,
      }, {
        startX: -200 / this._transform.scale,
        startY: -200 / this._transform.scale,
        endX: 150 / this._transform.scale,
        endY: 150 / this._transform.scale,
      });


      window.scr2wor = this._screenToWorld.bind(this);
      window.wor2scr = this._worldToScreen.bind(this);

      new TapHandler(canvas, {
        tap: this._tap.bind(this),
        move: this._move.bind(this)
      });
    },

    show: function() {
      this._shouldRender = true;
      this._redraw();
    },

    hide: function() {
      this._shouldRender = false;
    },

    _tap: function(e) {
      console.log("tap", e);
      var x = e.distFromLeft;
      var y = e.distFromTop;
      console.log("clicked at screen",x,y);

      var scaleChange = .2;

      var world = this._screenToWorld(x, y);
      console.log("world", world);

      this._transform.scale += scaleChange;
      var scr = this._worldToScreen(world.x, world.y);
      console.log("new screen", scr);

      //var diffWorld = {x: world2.x - world.x, y: world2.y - world.y};
      var diffScr = {
        x: x - scr.x,
        y: y - scr.y
      };
      //console.log(diffWorld);
      console.log("diff", diffScr);

      this._transform.offsetX += diffScr.x * this._transform.scale;
      this._transform.offsetY += diffScr.y * this._transform.scale;

      this._needsUpdate = true;
    },

    _move: function(e) {
      this._transform.offsetX += e.xFromLast;
      this._transform.offsetY += e.yFromLast;
      this._needsUpdate = true;
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

        this._ctx.clearRect(topLeft.x, topLeft.y, canvas.width / this._transform.scale, canvas.height / this._transform.scale);
        //ctx.clearRect(topLeft.x, topLeft.y, canvas.width, canvas.height);

        for (var i = 0; i < this._lines.length; i++) {
          var line = this._lines[i];

          this._drawLine(this._ctx, line.startX, line.startY, line.endX, line.endY);
        }

        this._needsUpdate = false;
      }

      requestAnimationFrame(this._redraw.bind(this));
    },

    _drawLine: function(ctx, startX, startY, endX, endY) {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
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

    _bezier: function() {
      ctx.beginPath();
      ctx.moveTo(20, 20);
      ctx.bezierCurveTo(20, 100, 200, 100, 200, 20);
      ctx.stroke();

      // rect
      ctx.lineWidth = 10;
      ctx.strokeRect(20, 20, 80, 100);
    }

  });

  return Draw;

});