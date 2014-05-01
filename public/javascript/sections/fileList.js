define(["section", "tapHandler", "analytics", "event", "globals", "helpers", "online", "gauth", "sections/statusIndicator", "sections/fileItem", "data"], function(Section, TapHandler, Analytics, Event, g, Helpers, Online, GAuth, StatusIndicator, FileItem, Data) {

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
      this._authenticatedStatusChanged = this._authenticatedStatusChanged.bind(this);

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

      new TapHandler(document.getElementById("create-file"), {
        tap: this._createTapped.bind(this)
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
      var fileItem = new FileItem(this, fileInfo);

      fileItem.element.fileInfo = fileInfo;

      this._files.push({
        fileInfo: fileInfo,
        fileItem: fileItem,
        element: fileItem.element,
      });

      return fileItem.element;
    },

    show: function() {
      console.log("Showing file list");
      Event.addListener("onlineStatusChanged", this._onlineStatusChanged);
      Event.addListener("authenticatedStatusChanged", this._authenticatedStatusChanged);

      // This could happen if we are online and then navigate to this page
      if (Online.isOnline()) {
        Data.checkForUpdates()
          .then((function() {
            this._scheduleUpdate()
          }).bind(this));
      }
    },

    hide: function() {
      console.log("hiding file list");
      Event.removeListener("onlineStatusChanged", this._onlineStatusChanged);
      Event.removeListener("authenticatedStatusChanged", this._authenticatedStatusChanged);

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

    drawFile: function(fileInfo) {
      this._filesPane.setPane("draw", fileInfo);
    },

    _createTapped: function(e) {
      return Data.createFile()
        .then(function(file) {
          return file.fileInfoPromise;
        })
        .then((function(fileInfo) {
          console.log("Showing draw for", fileInfo);
          this._filesPane.setPane("draw", fileInfo);

          Analytics.event("create file");
        }).bind(this));
    },

    // EVENTS
    _onlineStatusChanged: function(e) {
      // check for updates if we come online while looking at this page
      if (e.online && GAuth.isAuthenticated()) {
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

    _authenticatedStatusChanged: function(e) {
      if (e.authenticated) {
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
          file.fileItem.updateFileName(fileInfo.name);
          file.fileInfo.name = fileInfo.name;
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
          file.fileItem.updateThumbnail(fileInfo.thumbnail);
          file.fileInfo.thumbnail = fileInfo.thumbnail;
          return;
        }
      }
    },
  });

  return FileList;

});