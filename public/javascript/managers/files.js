define(["section", "event", "sections/fileList", "sections/draw"], function(Section, Event, FileList, Draw) {

  var Files = Section.extend({
    id: "files",

    _paneWrapper: null,

    _screenWidth: 0,

    _defaultSettings: {},

    panes: null,
    currentPane: null,

    init: function() {
      this._super();

      this._defaultSettings = {
        title: {
          text: "Photos"
        }
      };

      this._screenWidth = window.innerWidth;
      

      this._paneWrapper = document.getElementById("files-pane-wrapper");

      this.panes = {};


      this.panes.list = {
        offsetX: 0,
        pane: new FileList(this)
      };

      this.panes.draw = {
        offsetX: this._screenWidth,
        pane: new Draw(this)
      };
      
      this.panes.draw.pane.element.style.left = this._screenWidth + "px";

      this.setPane("list");

      window.files = this;
    },

    setPane: function(pane, details) {
      if (this.currentPane == pane) 
        return;

      var paneobj = null;

      if (this.currentPane) {

        var paneobj = this.panes[this.currentPane].pane;

        if (paneobj.hide) {
          paneobj.hide();
        }

        paneobj.afterHide();
      }


      paneobj = this.panes[pane].pane;
      
      if (paneobj.show) {
        paneobj.show(details);
      }

      paneobj.afterShow();

      this.currentPane = pane;


      // Finish up
      /*
      var totalPane = this.panes[pane];
      this.navbarSettings = Helpers.mergeNavbarSettings(this._defaultSettings, totalPane.pane.navbarSettings);
      this._paneWrapper.style.webkitTransform = "translate3d(-"+totalPane.offsetX+"px, 0px, 0px)";
      Event.trigger("paneChanged", {
        pane: this
      });
*/
    }
  });

  return Files;

});