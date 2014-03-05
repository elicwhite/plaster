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

      Data.getFiles()
        .then((function(files) {
          for (var i = 0; i < files.length; i++) {
            var fileInfo = files[i];
            var fileTemplate = this._newFileWrapper(fileInfo);
            this._fileListElement.appendChild(fileTemplate);
          }

          this._actuallyResizeAndRender();
        }).bind(this));

      this.element.addEventListener("wheel", function(e) {
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
      Event.addListener("fileIdChanged", this._fileIdChanged.bind(this));
      Event.addListener("fileModifiedRemotely", this._fileModifiedRemotely.bind(this));

      window.fls = this;
    },

    show: function(fileInfo) {

      window.addEventListener("resize", this._resizeAndRender);
      if (fileInfo) {
        // We came from draw, it is the info of the file we were just looking at

        for (var i in this._files) {
          if (this._files[i].element.fileInfo.id == fileInfo.id) {
            this._files[i].thumbnail.render(this._files[i].element.fileInfo);
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

      // The element has a reference to fileInfo
      newEle.fileInfo = fileInfo;

      var canvas = newEle.getElementsByClassName("thumbnail")[0];
      var fileName = newEle.getElementsByClassName("file-name")[0];

      var thumbnail = new Thumbnail(canvas);
      fileName.innerText = fileInfo.name;

      this._files.push({
        fileInfo: fileInfo,
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
      for (var i in this._files) {
        var file = this._files[i];

        this._resizeAndRenderFile(file);
      }
    },

    _resizeAndRenderFile: function(file) {
      var canvasParent = file.canvas.parentElement;
      file.canvas.width = canvasParent.offsetWidth;
      file.canvas.height = canvasParent.offsetHeight;
      file.thumbnail.render(file.fileInfo);
    },

    _docSelected: function(e) {
      var element = e.target;
      var parent = Helpers.parentEleWithClassname(element, "file-info");

      if (parent) {
        if (parent.classList.contains("create")) {
          // Create was called
          return this._newDoc();
        } else {
          if (element.dataset.action && element.dataset.action == "delete") {
            // Delete was clicked
            return Data.deleteFile(parent.fileInfo.id);
          }

          // Regular file was clicked
          this._filesPane.setPane("draw", parent.fileInfo);
        }
      }
    },

    _newDoc: function() {
      return Data.createFile();
    },

    // EVENTS
    _fileAdded: function(fileInfo) {
      var fileTemplate = this._newFileWrapper(fileInfo);

      this._fileListElement.insertBefore(fileTemplate, this._fileListElement.children[1]);
      this._actuallyResizeAndRender();
    },

    _fileRemoved: function(fileId) {
      for (var i in this._files) {
        var file = this._files[i];
        if (file.fileInfo.id == fileId) {
          this._fileListElement.removeChild(file.element);
          delete this._files[i];
          return;
        }
      }
    },

    _fileModified: function(fileInfo) {
      for (var i in this._files) {
        var file = this._files[i];
        if (file.fileInfo.id == fileInfo.id) {
          file.fileInfo.modifiedTime = fileInfo.modifiedTime;

          this._fileListElement.removeChild(file.element);
          this._fileListElement.insertBefore(file.element, this._fileListElement.children[1]);
          return;
        }
      }
    },

    _fileRenamed: function(fileInfo) {
      for (var i in this._files) {
        var file = this._files[i];
        if (file.fileInfo.id == fileInfo.id) {
          file.fileInfo.name = fileInfo.name;

          var fileNameElement = file.element.getElementsByClassName("file-name")[0];
          fileNameElement.innerText = fileInfo.name;
          return;
        }
      }
    },

    _fileIdChanged: function(e) {
      for (var i in this._files) {
        var file = this._files[i];
        if (file.fileInfo.id == e.oldId) {
          file.fileInfo.id = e.newId;
          break;
        }
      }
    },

    _fileModifiedRemotely: function(fileInfo) {
      for (var i in this._files) {
        var file = this._files[i];
        if (file.fileInfo.id == fileInfo.id) {
          this._resizeAndRenderFile(file);
          return;
        }
      }
    },
  });

  return FileList;

});