define(["section", "event", "sections/fileList", "sections/draw"], function(Section, Event, FileList, Draw) {

  var Files = Section.extend({
    id: "files",

    _paneWrapper: null,

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

      this._paneWrapper = document.getElementById("files-pane-wrapper");

      this.panes = {};

      // Add these in order
      this.panes.list = {
        offsetX: 0,
        pane: new FileList(this)
      };

      this.panes.draw = {
        offsetX: 0,
        pane: new Draw(this)
      };

      var state = {
        pane: "list",
        details: null
      };

      // var screenWidth = window.innerWidth;
      // this.panes.draw.offsetX = screenWidth;
      // this.panes.draw.pane.element.style.webkitTransform = 'translate(' + screenWidth + "px, 0)";


      if (localStorage.filesPane) {
        state = JSON.parse(localStorage.filesPane);
      }



      this.setPane(state.pane, state.details);

      this._paneWrapper.addEventListener("webkitTransitionEnd", this._changePaneComplete.bind(this));

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

      var totalPane = this.panes[pane];
      this._paneWrapper.classList.add("ani4");
      setTimeout((function() {
        this._paneWrapper.style.webkitTransform = "translate3d(" + totalPane.offsetX + "px, 0px, 0px)";
      }).bind(this), 0);
      

      if (pane == "list") {
        delete localStorage["filesPane"];
      } else {
        localStorage.filesPane = JSON.stringify({
          pane: pane,
          details: details
        });
      }
    },

    _changePaneComplete: function() {
      console.log("Done changing panes");

      var paneIndex = 0;
      for (var paneName in this.panes) {
        if (paneName != this.currentPane) {
          paneIndex++;
        }
      }

      var screenWidth = window.innerWidth;

      var widthOffset = -1 * paneIndex * screenWidth;

      for (var paneName in this.panes) {
        this.panes[paneName].offsetX = widthOffset;
        this.panes[paneName].pane.element.style.webkitTransform = 'translate(' + widthOffset + "px, 0)";

        widthOffset += screenWidth;
      }

      // Move it back to 0
      this._paneWrapper.style.webkitTransform = "translate3d(0px, 0px, 0px)";
    }
  });

  return Files;

});