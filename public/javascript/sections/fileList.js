define(["section", "tapHandler", "helpers", "data", "templates/fileList", "components/thumbnail"], function(Section, TapHandler, Helpers, Data, FileListTemplate, Thumbnail) {

  var FileList = Section.extend({
    id: "files-list-container",

    // The parent pane for this page
    _filesPane: null,

    // The element
    _fileListElement: null,

    // The set of files we are displaying on the page
    _files: null,

    // The canvas we will be drawing thumbs to
    _canvas: null,

    init: function(filesPane) {
      this._super();

      this._filesPane = filesPane;

      this._fileListElement = document.getElementById("files-list");
      this._files = {};

      Data.getFiles((function(files) {

        console.log("got files", files);

        for (var i = 0; i < files.length; i++) {
          var file = files[i];
          this._files[file.id] = file;
          var fileTemplate = this._newFileWrapper(file);
          this._fileListElement.appendChild(fileTemplate);
        }
      }).bind(this));

      new TapHandler(document.getElementById("file-create"), {
        tap: this._newDoc.bind(this)
      });

      new TapHandler(this._fileListElement, {
        tap: this._docSelected.bind(this)
      });

      this._canvas = document.getElementById("thumb");
      this._canvas.width = 500;
      this._canvas.height = 500;
    },


    _newFileWrapper: function(file) {
      var newEle = new FileListTemplate();
      newEle.children[0].innerText = file.id + " - " + file.name;
      newEle.fileId = file.id;

      this._files[file.id] = {
        element: newEle,
        file: file
      };

      return newEle;
    },

    _newDoc: function() {
      console.log("new doc");
      data.createFile((function(file) {
        var fileTemplate = this._newFileWrapper(file);
        this._fileListElement.appendChild(fileTemplate);
      }).bind(this));
    },

    _docSelected: function(e) {
      var element = e.srcElement;
      var parent = Helpers.parentEleWithClassname(e.srcElement, "file-info");

      if (parent) {
        if (element.dataset.action && element.dataset.action == "delete") {

          var file = this._files[parent.fileId];
          this._fileListElement.removeChild(file.element);
          delete this._files[parent.fileId];
          data.deleteFile(parent.fileId);

          // delete file
          return;
        }
        else if (element.dataset.action && element.dataset.action == "show") {
          this._filesPane.setPane("draw", this._files[parent.fileId].file)
          return;  
        }

        // draw the thumb
        var thumb = new Thumbnail(this._canvas);
        thumb.render(this._files[parent.fileId].file);

        
      }

    },

  });

  return FileList;

});