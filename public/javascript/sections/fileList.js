define(["section", "tapHandler", "templates/fileList"], function(Section, TapHandler, FileListTemplate) {

  var FileList = Section.extend({
    id: "files-list-container",

    // The parent pane for this page
    _files: null,

    // The element
    _fileList: null,

    // The set of images we are displaying on the page
    _images: null,

    // When we add an image to the list, this is it's index
    // into images
    _imageIndex: 0, 

    init: function(files) {
      this._super();
      
      this._files = files;

      this._fileList = document.getElementById("files-list");

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