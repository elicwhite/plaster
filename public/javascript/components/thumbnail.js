define(["class", "helpers", "data", "components/manipulateCanvas"], function(Class, Helpers, Data, ManipulateCanvas) {

  var Thumbnail = Class.extend({
    _canvas: null,

    init: function(canvas) {
      this._canvas = canvas;
    },

    render: function(file) {
      var fileInfo = file;

      data.getFileActions(file.id, (function(actions) {
        var settings = data.localFileSettings(file.id);

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

        manipulateCanvas.drawAll(actions);

        window.a = actions;
        window.c = manipulateCanvas;
      }).bind(this));
    }
  });

  return Thumbnail;
});