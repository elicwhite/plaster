define(["section", "tapHandler", "event", "globals", "helpers", "online", "sections/statusIndicator", "data", "templates/fileList"], function(Section, TapHandler, Event, g, Helpers, Online, StatusIndicator, Data, FileListTemplate) {

  var FileList = Section.extend({
    id: "files-list-container",

    // The parent pane for this page
    _filesPane: null,

    // The element
    _fileListElement: null,

    _files: null,

    // The timer we use to schedule updates
    _updateTimeout: null,

    _indicator: null,

    _itemWidth: null,

    init: function(filesPane) {
      this._super();

      this._filesPane = filesPane;

      this._files = [];

      this._indicator = new StatusIndicator();

      this._fileListElement = document.getElementById("files-list");

      this._scheduleUpdate = this._scheduleUpdate.bind(this);
      this._onlineStatusChanged = this._onlineStatusChanged.bind(this);
      this._recalcWidth = this._recalcWidth.bind(this);

      Data.getFiles()
        .then((function(files) {
          for (var i = 0; i < files.length; i++) {
            var fileInfo = files[i];
            var fileTemplate = this._newFileWrapper(fileInfo);
            this._fileListElement.appendChild(fileTemplate);
          }

          this._recalcWidth();
        }).bind(this));

      this.element.addEventListener("wheel", function(e) {
        e.stopPropagation();
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
      Event.addListener("thumbnailUpdated", this._thumbnailUpdated.bind(this));

      window.addEventListener("resize", this._recalcWidth);
    },

    _recalcWidth: function() {
      var widthDiff = window.innerWidth / this._itemWidth;
      var columns = Math.floor(widthDiff);

      if (columns == 0) {
        // We are in some size of things that isn't supported
        // just skip resizing
        return;
      }

      this._fileListElement.style.width = (columns * this._itemWidth) + "px";
    },

    _newFileWrapper: function(fileInfo) {
      var newEle = new FileListTemplate();

      // The element has a reference to fileInfo
      newEle.fileInfo = fileInfo;
      var fileName = newEle.getElementsByClassName("file-name")[0];
      fileName.textContent = fileInfo.name;

      var thumbnail = newEle.getElementsByClassName("thumbnail")[0];
      thumbnail.src = fileInfo.thumbnail;

      this._files.push({
        fileInfo: fileInfo,
        element: newEle,
      });

      return newEle;
    },

    show: function() {
      console.log("Showing file list");
      Event.addListener("onlineStatusChanged", this._onlineStatusChanged);

      // This could happen if we are online and then navigate to this page
      if (Online.isOnline()) {
        Data.checkForUpdates()
          .then((function() {
            this._scheduleUpdate()
          }).bind(this));
      }


    },

    hide: function() {
      Event.removeListener("onlineStatusChanged", this._onlineStatusChanged);

      if (this._updateTimeout) {
        clearTimeout(this._updateTimeout);
      }
    },

    _scheduleUpdate: function() {
      if (this._updateTimeout) {
        clearTimeout(this._updateTimeout);
      }

      this._updateTimeout = setTimeout((function() {
        if (!this._visible || !Online.isOnline()) {
          return;
        }

        Data.checkForUpdates().then((function() {
          this._scheduleUpdate()
        }).bind(this));
      }).bind(this), 15 * 1000);
    },

    _docSelected: function(e) {
      var element = e.target;
      var parent = Helpers.parentEleWithClassname(element, "file-info");

      if (parent) {
        if (parent.classList.contains("create")) {
          // Create was called
          this._newDoc();
        } else {
          if (element.dataset.action) {
            var action = element.dataset.action;

            if (action == "delete") {
              // Delete was clicked
              return Data.deleteFile(parent.fileInfo.id);
            } else if (action == "share") {
              console.log(parent.fileInfo);
              return;
            }
          }

          // Regular file was clicked
          this._filesPane.setPane("draw", parent.fileInfo);
        }
      }
    },

    _newDoc: function() {
      return Data.createFile()
        .then(function(file) {
          return file.fileInfoPromise;
        })
        .then((function(fileInfo) {
          console.log("Showing draw for", fileInfo);
          this._filesPane.setPane("draw", fileInfo);
        }).bind(this));
    },

    // EVENTS
    _onlineStatusChanged: function(e) {
      // check for updates if we come online while looking at this page
      if (e.online) {
        Data.checkForUpdates()
          .then((function() {
            this._scheduleUpdate()
          }).bind(this))
          .
        catch (function(error) {
          console.error(error, error.stack, error.message);
        });
      }
    },

    _fileAdded: function(fileInfo) {
      var fileTemplate = this._newFileWrapper(fileInfo);

      this._fileListElement.insertBefore(fileTemplate, this._fileListElement.children[1]);
      this._recalcWidth();
    },

    _fileRemoved: function(fileId) {
      for (var i in this._files) {
        var file = this._files[i];
        if (file.fileInfo.id == fileId) {
          this._fileListElement.removeChild(file.element);
          this._recalcWidth();
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
          fileNameElement.textContent = fileInfo.name;
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

    },

    _thumbnailUpdated: function(fileInfo) {
      for (var i in this._files) {
        var file = this._files[i];
        if (file.fileInfo.id == fileInfo.id) {

          file.fileInfo.thumbnail = fileInfo.thumbnail;

          var thumbnailElement = file.element.getElementsByClassName("thumbnail")[0];
          thumbnailElement.src = fileInfo.thumbnail;
          return;
        }
      }
    },
  });

  return FileList;

});