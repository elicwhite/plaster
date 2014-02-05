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

      Data.getFiles(function(files) {
        console.log("got files", files);
      });

      //this._files = Data.
      /*
      this._images = [];

      for (var i = 1; i <= 4; i++) {
        var image = this._newImageWrapper(i);
        this._images.push(image);
        this._photoList.appendChild(image);
      }   
      */
    },

    /*
    _newImageWrapper: function(fileName) {
      var newEle = new PhotoListTemplate();

      var fullPath = "images/me/"+fileName+".jpg";
      newEle.children[0].style.backgroundImage = "url('"+fullPath+"')";

      var imageId = this._imageIndex++;
      newEle.imageId = imageId;
      this._images[imageId] = {element: newEle, path: fullPath};

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
    */

  });

  return FileList;

});