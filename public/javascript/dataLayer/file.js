define(["class", "event"], function(Class, Event) {
  var File = Class.extend({
    fileInfo: null,

    _cachedActions: null,

    _backing: null,
    _driveBacking: null,

    init: function(backing) {
      // Create our backing instance
      this._backing = backing;
    },

    load: function(fileId, callback) {
      /*
        populate _cachedActions from indexedDB
      */

      this._backing.load(fileId, (function(fileInfo) {
        var actionsObj = {
          remoteActions: [],
          localActions: [],
          redoStack: []
        };

        this._backing.getActions((function(actions) {
          actionsObj.remoteActions = actions.remote;
          actionsObj.localActions = actions.local;

          this.fileInfo = fileInfo;
          this._cachedActions = actionsObj;

          callback();
        }).bind(this));
      }).bind(this));

      if (this._driveBacking) {
        this._driveBacking.load(fileId, function() {
          // file loaded from drive
        });
      }
    },

    create: function(file, callback) {
      /*
        create a file in indexeddb with the info from file, and then load it
      */

      this._backing.create(file, (function() {
        if (this._driveBacking) {
          this._driveBacking.create(file, (function(newFile) {
            // Google saved a file, redo the id of the file locally to match drive
            this._backing.replaceFileId(newFile.id, (function() {
              this.load(file.id, function() {
                callback();
              });

              Event.trigger("fileIdChanged", {
                oldId: file.id,
                newFile: this.fileInfo
              });
            }).bind(this));
          }).bind(this));
        } else {
          this.load(file.id, function() {
            callback();
          });
        }
      }).bind(this));
    },

    rename: function(newName) {
      this.fileInfo.name = newName;
      this._backing.rename(newName);

      if (this._driveBacking) {
        this._driveBacking.rename(newFileName);
      }

      Event.trigger("fileRenamed", this.fileInfo);
      Event.trigger("fileModified", this.fileInfo);
    },

    startDrive: function(driveBacking) {
      // process things on drive for updates
      this._driveBacking = driveBacking;
    },


    getActions: function() {
      return this._cachedActions.remoteActions.concat(this._cachedActions.localActions);
    },

    localSettings: function(settings) {
      if (settings) {
        localStorage[this.fileInfo.id] = JSON.stringify(settings);
      }

      if (!localStorage[this.fileInfo.id]) {
        localStorage[this.fileInfo.id] = JSON.stringify({
          offsetX: 0,
          offsetY: 0,
          scale: 1,
          color: "#000",
          tools: {
            point: "pencil",
            gesture: null,
            scroll: "pan"
          }
        });
      }

      return JSON.parse(localStorage[this.fileInfo.id]);
    },

    undo: function() {
      if (this._cachedActions.localActions.length == 0) {
        return false; // no actions to undo
      } else {
        var lastAction = this._cachedActions.localActions.pop();
        this._cachedActions.redoStack.push(lastAction);

        this._backing.removeLocalAction(lastAction.id);

        Event.trigger("actionRemoved");
        Event.trigger("fileModified", this.fileInfo);
      }
    },

    redo: function() {
      if (this._cachedActions.redoStack.length == 0) {
        return false; // no actions to undo
      } else {
        var action = this._cachedActions.redoStack.pop();
        this.addAction(action);

        this._backing.addLocalAction(action);
      }
    },

    addAction: function(action) {
      console.log("adding action", action);
      this._cachedActions.localActions.push(action);
      Event.trigger("actionAdded", {
        isLocal: true,
        items: [action]
      });

      this._backing.addLocalAction(action);

      Event.trigger("fileModified", this.fileInfo);
    },

    delete: function() {
      this.close();
      this._backing.delete();
    },

    close: function() {

    },

    clearAll: function() {
      console.error("Implement this function");
    },
  });

  return File;
});