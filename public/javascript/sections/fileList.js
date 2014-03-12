define(["section", "tapHandler", "event", "globals", "helpers", "dataLayer/data", "templates/fileList"], function(Section, TapHandler, Event, g, Helpers, Data, FileListTemplate) {

  var FileList = Section.extend({
    id: "files-list-container",

    // The parent pane for this page
    _filesPane: null,

    // The element
    _fileListElement: null,

    _files: null,

    // The timer we use to schedule updates
    _updateTimeout: null,

    init: function(filesPane) {
      this._super();

      this._filesPane = filesPane;

      this._files = [];

      this._fileListElement = document.getElementById("files-list");

      // Don't have the big create button on phone
      if (g.isPhone()) {
        this._fileListElement.innerHTML = "";
      }

      this._scheduleUpdate = this._scheduleUpdate.bind(this);
      this._onlineStatusChanged = this._onlineStatusChanged.bind(this);

      Data.getFiles()
        .then((function(files) {
          for (var i = 0; i < files.length; i++) {
            var fileInfo = files[i];
            var fileTemplate = this._newFileWrapper(fileInfo);
            this._fileListElement.appendChild(fileTemplate);
          }
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
      Event.addListener("thumbnailUpdated", this._thumbnailUpdated.bind(this));
    },

    _newFileWrapper: function(fileInfo) {
      var newEle = new FileListTemplate();

      // The element has a reference to fileInfo
      newEle.fileInfo = fileInfo;

      var fileName = newEle.getElementsByClassName("file-name")[0];
      var thumbnail = newEle.getElementsByClassName("thumbnail")[0];

      fileName.textContent = fileInfo.name;
      thumbnail.src = fileInfo.thumbnail;

      this._files.push({
        fileInfo: fileInfo,
        element: newEle,
      });

      return newEle;
    },

    show: function() {
      console.log("Showing file list");


      // This could happen if we are online and then navigate to this page
      if (g.isOnline()) {
        Data.checkForUpdates()
          .then((function() {
            this._scheduleUpdate()
          }).bind(this));
      }

      Event.addListener("onlineStatusChanged", this._onlineStatusChanged);
    },

    hide: function() {
      if (this._updateTimeout) {
        clearTimeout(this._updateTimeout);
      }

      Event.removeListener("onlineStatusChanged", this._onlineStatusChanged);
    },

    _onlineStatusChanged: function() {
      // check for updates if we come online while looking at this page
      Data.checkForUpdates()
        .then((function() {
          this._scheduleUpdate()
        }).bind(this))
        .
      catch (function(error) {
        console.error(error.stack, error.message);
      });
    },

    _scheduleUpdate: function() {
      if (this._updateTimeout) {
        clearTimeout(this._updateTimeout);
      }

      this._updateTimeout = setTimeout((function() {
        if (!this._visible) {
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
    _fileAdded: function(fileInfo) {
      var fileTemplate = this._newFileWrapper(fileInfo);

      this._fileListElement.insertBefore(fileTemplate, this._fileListElement.children[1]);
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