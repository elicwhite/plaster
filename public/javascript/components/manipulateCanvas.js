define(["components/drawCanvas", "helpers"], function(DrawCanvas, Helpers) {

  var ManipulateCanvas = DrawCanvas.extend({
    zoom: function(x, y, dScale) {
      // Can't zoom that far!
      var modifiedScale = this._settings.scale + dScale;

      if (modifiedScale < .000001 || modifiedScale > 20) {
        return false;
      }

      if (this._zooming === false) {
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

      this._zooming = true;

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