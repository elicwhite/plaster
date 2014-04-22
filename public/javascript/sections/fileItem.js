define(["section", "tapHandler", "event", "globals", "helpers", "online", "gauth", "data", "templates/fileList"], function(Section, TapHandler, Event, g, Helpers, Online, GAuth, Data, FileListTemplate) {

  var FileItem = Section.extend({
    _fileList: null,

    _itemWidth: null,

    _fileNameElement: null,
    _thumbnailElement: null,

    _fileInfo: null,


    init: function(fileList, fileInfo) {
      this._super();

      this._fileList = fileList;
      this._fileInfo = fileInfo;

      var ele = new FileListTemplate();
      this.setElement(ele);

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
    },

    _docTapped: function(e) {
      var element = e.target;

      if (element.dataset.action) {
        var action = element.dataset.action;

        if (action == "delete") {
          // Delete was clicked
          return Data.deleteFile(this._fileInfo.id);
        } else if (action == "share") {
          console.log(this._fileInfo);
          return;
        }
      }

      this._fileList.drawFile(this._fileInfo);
    },

    _docStarted: function(e) {
      //console.log("started", e);
    },

    _docMoved: function(e) {
      // console.log("moved", e);
    },

    _docEnded: function(e) {
      // console.log("ended", e);
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