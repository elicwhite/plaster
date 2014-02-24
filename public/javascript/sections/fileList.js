define(["section", "tapHandler", "event", "globals", "helpers", "dataLayer/data", "templates/fileList", "components/thumbnail"], function(Section, TapHandler, Event, g, Helpers, Data, FileListTemplate, Thumbnail) {

  var FileList = Section.extend({
    id: "files-list-container",

    // The parent pane for this page
    _filesPane: null,

    // The element
    _fileListElement: null,

    _files: null,

    _resizeTimeout: null,

    init: function(filesPane) {
      this._super();

      this._filesPane = filesPane;

      this._files = [];

      this._fileListElement = document.getElementById("files-list");

      this._resizeAndRender = this._resizeAndRender.bind(this);
      this._actuallyResizeAndRender = this._actuallyResizeAndRender.bind(this);

      // Don't have the big create button on phone
      if (g.isPhone()) {
        this._fileListElement.innerHTML = "";
      }

      Data.getFiles((function(files) {
        for (var i = 0; i < files.length; i++) {
          var fileInfo = files[i];
          var fileTemplate = this._newFileWrapper(fileInfo);
          this._fileListElement.appendChild(fileTemplate);
        }

        this._actuallyResizeAndRender();
      }).bind(this));

      this.element.addEventListener("mousewheel", function(e) {
        e.stopPropagation();
      });

      new TapHandler(document.getElementById("file-create"), {
        tap: this._newDoc.bind(this)
      });

      new TapHandler(this._fileListElement, {
        tap: this._docSelected.bind(this)
      });

      Event.addListener("fileAdded", this._fileAdded.bind(this));
      Event.addListener("fileRemoved", this._fileRemoved.bind(this));
      Event.addListener("fileModified", this._fileModified.bind(this));
      Event.addListener("fileRenamed", this._fileRenamed.bind(this));
    },

    show: function(fileInfo) {

      window.addEventListener("resize", this._resizeAndRender);
      if (fileInfo) {
        // We came from draw, it is the info of the file we were just looking at

        for (var i = 0; i < this._files.length; i++) {
          if (this._files[i].element.file.id == fileInfo.id) {
            this._files[i].thumbnail.render(this._files[i].element.file);
            return;
          }
        }

        console.error("We somehow came from a file that doesn't exist");
      }
    },

    hide: function(fileInfo) {
      window.removeEventListener("resize", this._resizeAndRender);
    },

    _newFileWrapper: function(fileInfo) {
      var newEle = new FileListTemplate();
      newEle.fileInfo = fileInfo;

      var canvas = newEle.getElementsByClassName("thumbnail")[0];
      var fileName = newEle.getElementsByClassName("file-name")[0];

      var thumbnail = new Thumbnail(canvas);
      fileName.innerText = fileInfo.name;

      this._files.push({
        element: newEle,
        canvas: canvas,
        thumbnail: thumbnail
      });

      return newEle;
    },

    // Resize every thumbnail canvas and re-render them
    _resizeAndRender: function() {
      if (this._resizeTimeout) {
        clearTimeout(this._resizeTimeout);
      } else {
        // we should clear canvases here
      }

      this._resizeTimeout = setTimeout(this._actuallyResizeAndRender.bind(this), 500);
    },

    _actuallyResizeAndRender: function() {
      for (var i = 0; i < this._files.length; i++) {
        var file = this._files[i];

        this._resizeAndRenderFile(file);
      }
    },

    _resizeAndRenderFile: function(file) {
      var canvasParent = file.canvas.parentElement;
      file.canvas.width = canvasParent.offsetWidth;
      file.canvas.height = canvasParent.offsetHeight;
      file.thumbnail.render(file.element.fileInfo);
    },

    _docSelected: function(e) {
      var element = e.srcElement;
      var parent = Helpers.parentEleWithClassname(e.srcElement, "file-info");

      if (parent) {
        if (parent.classList.contains("create")) {
          // Create was called
          this._newDoc();
          return;
        } else {
          if (element.dataset.action && element.dataset.action == "delete") {
            // Delete was clicked
            debugger;
            Data.deleteFile(parent.fileInfo.id);
            return;
          }

          // Regular file was clicked
          this._filesPane.setPane("draw", parent.fileInfo);
        }
      }
    },

    _newDoc: function() {
      Data.createFile();
    },

    // EVENTS
    _fileAdded: function(file) {
      console.log("file was added", file);
      var fileTemplate = this._newFileWrapper(file);

      this._fileListElement.insertBefore(fileTemplate, this._fileListElement.children[1]);
      this._actuallyResizeAndRender();
    },

    _fileRemoved: function(fileId) {
      console.log("file was removed", fileId);
      for (var i = 0; i < this._files.length; i++) {
        var element = this._files[i].element;
        if (element.fileInfo.id == file.id) {
          this._fileListElement.removeChild(element);
          return;
        }
      }
    },

    _fileModified: function(file) {
      for (var i = 0; i < this._files.length; i++) {
        var element = this._files[i].element;

        if (element.fileInfo.id == file.id) {
          this._fileListElement.removeChild(element);
          this._fileListElement.insertBefore(element, this._fileListElement.children[1]);
          return;
        }
      }
    },

    _fileRenamed: function(file) {
      for (var i = 0; i < this._files.length; i++) {
        var element = this._files[i].element;
        if (element.fileInfo.id == file.id) {

          var fileNameElement = element.getElementsByClassName("file-name")[0];
          fileNameElement.innerText = element.fileInfo.name;
          return;
        }
      }
    }

  });

  return FileList;

});