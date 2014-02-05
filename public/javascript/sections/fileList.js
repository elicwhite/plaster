define(["section", "tapHandler", "data", "templates/fileList"], function(Section, TapHandler, Data, FileListTemplate) {

  var FileList = Section.extend({
    id: "files-list-container",

    // The parent pane for this page
    _filesPane: null,

    // The element
    _fileListElement: null,

    // The set of files we are displaying on the page
    _files: null,

    init: function(files) {
      this._super();

      this._filesPane = files;

      this._fileListElement = document.getElementById("files-list");
      this._files = {};

      Data.getFiles((function(files) {
        
        console.log("got files", files);
        this._files = files;
        
        for (var i = 0; i < files.length; i++) {
          var file = files[i];
          var fileTemplate = this._newFileWrapper(file);
          this._fileListElement.appendChild(fileTemplate);
        } 
      }).bind(this));
    },

    
    _newFileWrapper: function(file) {
      var newEle = new FileListTemplate();
      newEle.children[0].innerText = file.id;
      newEle.fileId = file.id;

      this._files[file.id] = {element: newEle, file: file};

      return newEle;
    },

    _getImageId: function(ele) {
      console.log(ele);

      if (ele == null) {
        return false;
      }

      if (ele.imageId != null) {
        return ele.imageId;
      }

      return this._getImageId(ele.parentNode);
    }
    

  });

  return FileList;

});