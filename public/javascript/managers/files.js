define(["section", "event", "sections/fileList", "sections/draw"], function(Section, Event, FileList, Draw) {

  var Files = Section.extend({
    id: "files",

    _paneWrapper: null,

    _screenWidth: 0,

    _defaultSettings: {},

    panes: null,

    currentPaneName: null,

    init: function() {
      this._super();

      this._defaultSettings = {
        title: {
          text: "Photos"
        }
      };

      this._screenWidth = window.innerWidth;

      this._paneWrapper = document.getElementById("files-pane-wrapper");

      this._windowResized = this._windowResized.bind(this);
      this._finishedSliding = this._finishedSliding.bind(this);

      this._paneWrapper.addEventListener("webkitTransitionEnd", this._finishedSliding);

      this.panes = {};

      this.panes.list = {
        offsetX: 0,
        pane: new FileList(this)
      };

      this.panes.draw = {
        offsetX: this._screenWidth,
        pane: new Draw(this)
      };

      this.panes.draw.pane.element.style.webkitTransform = 'translate(' + this._screenWidth + "px, 0px)";

      var state = {
        pane: "list",
        details: null
      };
      if (localStorage.filesPane) {
        state = JSON.parse(localStorage.filesPane);
      }

      this.setPane(state.pane, state.details);
      this._redoOffsets();


      window.files = this;
    },

    show: function() {
      window.addEventListener("resize", this._windowResized);
    },

    hide: function() {
      window.removeEventListener("resize", this._windowResized);
    },

    setPane: function(pane, details) {
      if (this.currentPaneName == pane)
        return;

      var paneobj = null;

      if (this.currentPaneName) {

        var paneobj = this.panes[this.currentPaneName].pane;

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

      this.currentPaneName = pane;


      // Finish up
      var totalPane = this.panes[pane];

      var translate = "translate(" + (-1 * totalPane.offsetX) + "px, 0px)";
      if (this._paneWrapper.style.webkitTransform != translate) {
        this._paneWrapper.classList.add("ani4");
        this._paneWrapper.style.webkitTransform = translate;
      }


      if (pane == "list") {
        delete localStorage["filesPane"];
      } else {
        localStorage.filesPane = JSON.stringify({
          pane: pane,
          details: details
        });
      }
    },

    _finishedSliding: function(e) {
      if (e.srcElement != this._paneWrapper) {
        return;
      }

      // Remove the animation
      this._paneWrapper.classList.remove("ani4");

      this._redoOffsets();
    },

    _windowResized: function() {
      this._redoOffsets();
    },

    _redoOffsets: function() {
      window.current = this;

      this._screenWidth = window.innerWidth;

      // Set the offsets on all the panes so that the current pane is 0,0
      var currentIndex = 0;
      for (var pane in this.panes) {
        if (this.currentPaneName == pane) {
          break;
        }

        currentIndex++;

      }

      var startX = -1 * currentIndex * this._screenWidth;
      for (var pane in this.panes) {
        this.panes[pane].offsetX = startX;
        this.panes[pane].pane.element.style.webkitTransform = 'translate(' + startX + "px, 0px)";
        startX += this._screenWidth;
      }

      this._paneWrapper.style.webkitTransform = "";
    }
  });

  return Files;

});