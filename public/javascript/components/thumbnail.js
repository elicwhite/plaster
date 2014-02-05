define(["class", "helpers", "data", "components/manipulateCanvas"], function(Class, Helpers, Data, ManipulateCanvas) {

  var Thumbnail = Class.extend({
    _canvas: null,

    init: function(canvas) {
      this._canvas = canvas;
    },

    render: function(file) {
      var fileInfo = file;

      data.getFile(file.id, (function(server) {
        server.actions.query()
          .all()
          .execute()
          .done((function(actions) {

            var settings = data.localFileSettings(file.id);

            var manipulateCanvas = new ManipulateCanvas(this._canvas, settings);

            //var centerScreen = {x: window.innerWidth/2, y: window.innerHeight/2};
            //var centerWorld = Helpers.screenToWorld(settings, centerScreen.x, centerScreen.y);

            var scale = this._canvas.width / window.innerWidth;
            var zoomDiff = (settings.scale * scale) - settings.scale;
            manipulateCanvas.zoom(0, 0, zoomDiff);
            
            
            //var centerScreenAfter = {x: canvas.width/2, y: canvas.height/2};
            //var centerWorldAfter = Helpers.screenToWorld(settings, centerScreen.x, centerScreen.y);
            //manipulateCanvas.pan(centerWorld.x - centerWorldAfter.x, centerWorld.y - centerWorldAfter.y);

            manipulateCanvas.drawAll(actions);

            window.a = actions;
            window.c = manipulateCanvas;
          }).bind(this));
      }).bind(this));
    }
  });

  return Thumbnail;
});