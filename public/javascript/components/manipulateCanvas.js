define(["components/drawCanvas", "helpers"], function(DrawCanvas, Helpers) {

  var ManipulateCanvas = DrawCanvas.extend({
    zoom: function(x, y, dScale) {
      // Can't zoom that far!
      if (this._settings.scale + dScale < .001 || this._settings.scale + dScale > 20000) {
        return false;
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

      return true;
    },

    pan: function(dx, dy) {
      this._settings.offsetX += dx;
      this._settings.offsetY += dy;

      return true;
    },

    panTo: function(x, y) {
      this._settings.offsetX = x;
      this._settings.offsetY = y;
    }
  });

  return ManipulateCanvas;
});