define(["section", "tapHandler", "event", "globals", "helpers", "data", "templates/fileList", "components/thumbnail"], function(Section, TapHandler, Event, g, Helpers, Data, FileListTemplate, Thumbnail) {

  var FileList = Section.extend({
    id: "files-list-container",

    // The parent pane for this page
    _filesPane: null,

    // The element
    _fileListElement: null,

    // The set of files we are displaying on the page
    // fileId => info
    _files: null,

    // Th order the files appear on the page
    // index => fileId
    _fileOrder: null,

    _resizeTimeout: null,

    init: function(filesPane) {
      this._super();

      this._filesPane = filesPane;

      this._fileListElement = document.getElementById("files-list");
      this._files = {};
      this._fileOrder = [];

      this._resizeAndRender = this._resizeAndRender.bind(this);
      this._actuallyResizeAndRender = this._actuallyResizeAndRender.bind(this);

      // Don't have the big create button on phone
      if (g.isPhone()) {
        this._fileListElement.innerHTML = "";
      }

      Data.getFiles((function(files) {
        for (var i = 0; i < files.length; i++) {
          var file = files[i];
          this._files[file.id] = file;
          this._fileOrder[i] = file.id;
          var fileTemplate = this._newFileWrapper(file);
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

      Event.addListener("fileModified", this._fileModified.bind(this));
      Event.addListener("fileRenamed", this._fileRenamed.bind(this));

      window.addEventListener("resize", this._resizeAndRender);
    },

    show: function(fileInfo) {
      if (fileInfo) {
        // We came from draw, it is the info of the file we were just looking at
        var file = this._files[fileInfo.id];
        if (!file) {
          console.error("We somehow came from a file that doesn't exist");
        }

        file.thumbnail.render(file.file);
      }
    },

    _newFileWrapper: function(file) {
      var newEle = new FileListTemplate();

      var canvas = newEle.getElementsByClassName("thumbnail")[0];
      var fileName = newEle.getElementsByClassName("file-name")[0];

      var thumbnail = new Thumbnail(canvas);
      fileName.innerText = file.name;

      newEle.fileId = file.id;

      this._files[file.id] = {
        element: newEle,
        file: file,
        canvas: canvas,
        thumbnail: thumbnail
      };

      return newEle;
    },

    // Resize every thumbnail canvas and re-render them
    _resizeAndRender: function() {
      if (this._resizeTimeout) {
        clearTimeout(this._resizeTimeout);
      }
      else {
        // we should clear canvases here
      }

      this._resizeTimeout = setTimeout(this._actuallyResizeAndRender.bind(this), 500);
    },

    _actuallyResizeAndRender: function() {
      for (var fileId in this._files) {
        var file = this._files[fileId];

        this._resizeAndRenderFile(file);
      }
    },

    _resizeAndRenderFile: function(file) {
      var canvasParent = file.canvas.parentElement;
      file.canvas.width = canvasParent.offsetWidth;
      file.canvas.height = canvasParent.offsetHeight;
      file.thumbnail.render(file.file);
    },

    _newDoc: function() {
      data.createFile((function(file) {
        var fileTemplate = this._newFileWrapper(file);
        this._fileOrder.unshift(file.id);
        this._fileListElement.insertBefore(fileTemplate, this._fileListElement.children[1]);
        this._actuallyResizeAndRender();
      }).bind(this));
    },

    _docSelected: function(e) {
      var element = e.target;
      var parent = Helpers.parentEleWithClassname(element, "file-info");

      if (parent) {
        if (parent.classList.contains("create")) {
          // Create was called
          this._newDoc();
        }
        else
        {

          if (element.dataset.action && element.dataset.action == "delete") {
            // Delete was clicked
            var file = this._files[parent.fileId];
            this._fileListElement.removeChild(file.element);
            delete this._files[parent.fileId];
            data.deleteFile(parent.fileId);

            this._actuallyResizeAndRender();
            return;
          }

          // Regular file was clicked
          this._filesPane.setPane("draw", this._files[parent.fileId].file);
        }
      }

    },

    _fileModified: function(data) {
      var index = this._fileOrder.indexOf(data.fileId);

      // Move every element up
      for (var i = index; i < this._files.length - 1; i++) {
        this._fileOrder[i] = this._fileOrder[i + 1];
      }

      // Change the length to get rid of the last element
      this._fileOrder.length = this._fileOrder.length - 1;

      // Put this one at the beginning
      this._fileOrder.unshift(data.fileId);

      // Now actually take the element out and put it at the beginning too
      var element = this._files[data.fileId].element;
      this._fileListElement.removeChild(element);
      this._fileListElement.insertBefore(element, this._fileListElement.children[1]);
      this._actuallyResizeAndRender();
    },

    _fileRenamed: function(data) {
      this._files[data.fileId].name = data.name;
      var element = this._files[data.fileId].element;
      var fileNameElement = element.getElementsByClassName("file-name")[0];
      fileNameElement.innerText = data.name;
    }

  });

  return FileList;

});