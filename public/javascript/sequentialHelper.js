define(["event"], function(Event) {

  function SequentialHelper() {
    this.init();
  }

  SequentialHelper.prototype = {

    _runningActions: null,
    _openFiles: null,

    init: function() {
      // This will have an array for each file
      this._runningActions = {};
      this._openFiles = 0;

      Event.addListener("fileIdChanged", this._fileIdChanged.bind(this));
    },

    startLockedAction: function(fileId) {
      if (!this._runningActions[fileId]) {
        this._runningActions[fileId] = [];
        this._openFiles++;
      }

      var obj = {
        promise: null,
        resolve: null,
        reject: null
      }

      var promise = new Promise(function(resolve, reject) {
        obj.resolve = resolve;
        obj.reject = reject;
      });

      obj.promise = promise;

      // If we are global and the first
      // or there is no global and we are the first
      if ((fileId == "global" || !this._runningActions["global"]) && this._runningActions[fileId].length == 0) {
        obj.resolve();
      }

      this._runningActions[fileId].push(obj);

      return obj.promise;
    },

    endLockedAction: function(fileId) {
      // Remove the first promise
      this._runningActions[fileId].shift();

      // If we have no more promises, delete the file array
      if (this._runningActions[fileId].length == 0) {
        delete this._runningActions[fileId];
        this._openFiles--;

        // If there is only one file left open, and it's a global, start the global action
        if (this._openFiles == 1 && this._runningActions["global"]) {
          this._runningActions["global"][0].resolve();
        }

        return;
      }

      // Resolve the next one
      this._runningActions[fileId][0].resolve();
    },

    startGlobalAction: function() {
      return this.startLockedAction("global");
    },

    endGlobalAction: function() {
      this.endLockedAction("global");

      // This was the last global action, start all of the open files
      for (var file in this._runningActions) {
        this._runningActions[file][0].resolve();
      }
    },

    hasActions: function() {
      return this._openFiles != 0;
    },

    _fileIdChanged: function(e) {
      if (this._runningActions[e.oldId]) {
        this._runningActions[e.newId] = this._runningActions[e.oldId];
        delete this._runningActions[e.oldId];
      }
    },
  }

  return new SequentialHelper();

});