define(["class"], function(Class) {
  var File = Class.extend({
    _fileInfo: null,
    _cachedActions: null,

    _backing: null,

    init: function(backing) {
      // Create our backing instance
      this._backing = backing;
    },

    load: function(file, callback) {
      /*
        populate _cachedActions from indexedDB
      */

      this._backing.load(file.id, (function() {
        var actionsObj = {
          file: file,
          remoteActions: [],
          localActions: [],
          redoStack: []
        };

        this._backing.getFileActions((function(actions) {
          actionsObj.remoteActions = actions.remote;
          actionsObj.localActions = actions.local;

          this._currentFile = file;
          this._cachedActions = actionsObj;

          callback();
        }).bind(this));
      }).bind(this));
    },

    create: function(file, callback) {
      /*
        create a file in indexeddb with the info from file, and then load it
      */

      this._backing.create(file, (function() {
        this.load(file, function() {
          callback();
        });
      }).bind(this));
    },

    connectDrive: function() {
      // process things on drive for updates
    },


    getFileActions: function(fileId, callback) {
      return this._cachedActions.remoteActions.concat(this._cachedActions.localActions);
    },

    localSettings: function(settings) {
      if (settings) {
        localStorage[this._fileInfo.id] = JSON.stringify(settings);
      }

      if (!localStorage[this._fileInfo.id]) {
        localStorage[this._fileInfo.id] = JSON.stringify({
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

      return JSON.parse(localStorage[this._fileInfo.id]);
    },

    undo: function() {
      if (this._cachedActions.localActions.length == 0) {
        return false; // no actions to undo
      } else {
        var lastAction = this._cachedActions.localActions.pop();
        this._cachedActions.redoStack.push(lastAction);

        this._backing.removeLocalAction(lastAction.id);

        Event.trigger("actionRemoved");
        Event.trigger("fileModified", this._fileInfo);
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

      Event.trigger("fileModified", this._cachedActions.file);
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