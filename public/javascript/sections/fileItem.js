define(["section", "tapHandler", "event", "globals", "helpers", "platform", "template", "online", "gauth", "data"], function(Section, TapHandler, Event, g, Helpers, Platform, Template, Online, GAuth, Data) {

  var FileItem = Section.extend({
    _fileList: null,

    _thumbnailInfoElement: null,
    _fileNameElement: null,
    _thumbnailElement: null,

    _fileInfo: null,

    _slideMax: null,


    init: function(fileList, fileInfo) {
      this._super();

      this._fileList = fileList;
      this._fileInfo = fileInfo;

      var ele = new Template("fileListItem");
      this.setElement(ele);

      this._thumbnailInfoElement = ele.getElementsByClassName("thumbnail-info")[0];
      this._fileNameElement = ele.getElementsByClassName("file-name")[0];
      this._thumbnailElement = ele.getElementsByClassName("thumbnail")[0];

      this._fileNameElement.textContent = fileInfo.name;
      this._thumbnailElement.src = fileInfo.thumbnail;

      new TapHandler(this.element, {
        tap: this._docTapped.bind(this),
        start: this._docStarted.bind(this),
        move: this._docMoved.bind(this),
        end: this._docEnded.bind(this)
      });

      if (g.isMobile()) {
        this._thumbnailElement.style[Platform.transform] = "translateX(0px);"
        this._thumbnailElement.translateX = 0;

        var deleteButton = ele.getElementsByClassName("delete")[0];
        window.a = deleteButton;
        // this._slideMax
      }
    },

    _docTapped: function(e) {
      var element = e.target;

      if (element.dataset.action) {
        var action = element.dataset.action;

        if (action == "delete") {
          // Delete was clicked
          return Data.deleteFile(this._fileInfo.id);
          // } else if (action == "share") {
          //   console.log(this._fileInfo);
          //   return;
        }
      } else if (Helpers.parentEleIsElement(element, this._thumbnailInfoElement)) {
        this._fileList.drawFile(this._fileInfo);
      }
    },

    _docStarted: function(e) {
      if (g.isMobile()) {
        var deleteButton = this._thumbnailInfoElement.getElementsByClassName("delete")[0];
        this._slideMax = -1 * deleteButton.offsetWidth;
      }
    },

    _docMoved: function(e) {
      if (g.isMobile()) {

        if (e.target != this._thumbnailElement) {
          return;
        }


        var attemptedX = this._thumbnailElement.translateX + e.xFromLast;

        // sliding left means this will be negative

        var slide = Math.max(this._slideMax, Math.min(attemptedX, 0));

        this._thumbnailElement.style[Platform.transform] = "translateX(" + slide + "px)";
        this._thumbnailElement.translateX = slide;

        e.preventDefault();
      }
    },

    _docEnded: function(e) {
      if (g.isMobile()) {
        this._thumbnailElement.classList.add("animating");
        // You have to slide half way to go all the way
        if (this._thumbnailElement.translateX < this._slideMax / 3) {

          this._thumbnailElement.style[Platform.transform] = "translateX(" + this._slideMax + "px)";
          this._thumbnailElement.translateX = this._slideMax;
        } else {
          this._thumbnailElement.style[Platform.transform] = "translateX(0px)";
          this._thumbnailElement.translateX = 0;
        }

        window.setTimeout((function() {
          this._thumbnailElement.classList.remove("animating");
        }).bind(this), 300);
        // console.log("ended", e);
      }
    },

    updateFileName: function(fileName) {
      this._fileNameElement.textContent = fileName;
    },

    updateThumbnail: function(thumbnail) {
      this._thumbnailElement.src = thumbnail;
    },
  });

  return FileItem;

});