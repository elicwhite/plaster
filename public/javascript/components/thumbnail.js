define(["class", "globals", "helpers", "components/manipulateCanvas"], function(Class, g, Helpers, ManipulateCanvas) {

  var Thumbnail = Class.extend({
    _canvas: null,
    _thumbnailWidth: null,
    _thumbnailHeight: null,

    init: function() {
      var canvas = document.createElement("canvas");

      this.setThumbnailSizes();

      canvas.width = this._thumbnailWidth;
      canvas.height = this._thumbnailHeight;

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
    },


    setThumbnailSizes: function() {

      var space = 15;
      var thumbnailHeight = 200;
      var thumbnailWidth = 300;

      if (g.isComputer()) {
        space = 15;
        thumbnailHeight = 200;
        thumbnailWidth = 300;
      }
      else if (g.isTablet()) {
        space = 15;
        thumbnailHeight = 200;
        thumbnailWidth = 330;
      }
      else if (g.isPhone()) {
        space = 10;
        thumbnailHeight = 100;
        thumbnailWidth = 160;
      }


      var stylesheet = g.getStylesheet();
      if (stylesheet) {

        var rules = g.getStylesheetRules();

        var newRules = [];

        newRules.push("#files-list { padding-top: "+space+"px !important; }");

        newRules.push("#files-list li {"+
          "width: "+(thumbnailWidth)+"px;"+
          "padding: 0px "+(space/2)+"px "+space+"px "+(space/2)+"px;"+
          "}");

        newRules.push("#files-list .create .icon { font-size: "+(thumbnailHeight * 0.5)+"px; }");

        newRules.push("#files-list .create, #files-list .thumbnail, #files-list .overlay, #files-list .thumbnail-info {"+
          "height: "+thumbnailHeight+"px !important;"+
          "}");


        newRules.forEach(function(rule) {
          stylesheet.insertRule(rule, rules.length);
        });

      }

      this._thumbnailHeight = thumbnailHeight * window.devicePixelRatio;
      this._thumbnailWidth = thumbnailWidth * window.devicePixelRatio;
    }
  });

  return new Thumbnail();
});