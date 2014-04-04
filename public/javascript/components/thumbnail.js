define(["class", "globals", "helpers", "components/manipulateCanvas"], function(Class, g, Helpers, ManipulateCanvas) {

  var Thumbnail = Class.extend({
    _canvas: null,

    init: function() {
      var canvas = document.createElement("canvas");

      var vars = g.getCSSVars();

      var thumbnailWidth = vars.outerWidth ? parseInt(vars.outerWidth) : 200;
      var thumbnailHeight = vars.innerHeight ? parseInt(vars.innerHeight) : 200;

      thumbnailWidth *= window.devicePixelRatio;
      thumbnailHeight *= window.devicePixelRatio;
      
      canvas.width = thumbnailWidth;
      canvas.height = thumbnailHeight;

      this._canvas = canvas;
    },

    render: function(settings, actions) {

      var manipulateCanvas = new ManipulateCanvas(this._canvas, settings);

      // Find out what world point is in the middle
      var centerScreen = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      };
      var centerWorld = Helpers.screenToWorld(settings, centerScreen.x, centerScreen.y);

      var scale = Math.min(this._canvas.width / window.innerWidth, this._canvas.height / window.innerHeight);
      var zoomDiff = (settings.scale * scale) - settings.scale;
      manipulateCanvas.zoom(0, 0, zoomDiff);

      // Now that we have zoomed, find the middle of the canvas
      var centerScreenAfter = {
        x: this._canvas.width / 2,
        y: this._canvas.height / 2
      };

      // And where the middle point was from before
      var centerScreenPointAfter = Helpers.worldToScreen(settings, centerWorld.x, centerWorld.y);

      // pan the difference
      var diffScreen = {
        x: centerScreenAfter.x - centerScreenPointAfter.x,
        y: centerScreenAfter.y - centerScreenPointAfter.y
      };
      manipulateCanvas.pan(diffScreen.x, diffScreen.y);

      manipulateCanvas.doAll(actions);
      manipulateCanvas.render();

      return this._canvas.toDataURL("image/png");
    }
  });

  return new Thumbnail();
});