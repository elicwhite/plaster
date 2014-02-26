define(["section", "event", "sections/fileList", "sections/draw"], function(Section, Event, FileList, Draw) {

  var Files = Section.extend({
    id: "files",

    _paneWrapper: null,

    _screenWidth: 0,

    panes: null,

    currentPaneName: null,

    _currentState: null,

    init: function() {
      this._super();

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

      this._currentState = {
        pane: "list",
        details: null
      };

      if (localStorage.filesPane) {
        this._currentState = JSON.parse(localStorage.filesPane);
      }

      this.setPane(this._currentState.pane, this._currentState.details);
      this._redoOffsets();

      Event.addListener("fileIdChanged", this._fileIdChanged.bind(this));
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


      this._currentState = {
        pane: "list",
        details: null
      };

      if (pane != "list") {
        this._currentState.pane = pane;
        this._currentState.details = details;
      }

      localStorage.filesPane = JSON.stringify(this._currentState);
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
    },

    _fileIdChanged: function(e) {      
      // the current state details is a reference, so the id will change out from under us
      // if it is the new id, then save it
      if (this._currentState.details && this._currentState.details.id == e.newId) {
        localStorage.filesPane = JSON.stringify(this._currentState);
      }
    },
  });

  return Files;

});