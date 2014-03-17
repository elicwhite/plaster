var assert = buster.assert;
var refute = buster.refute;

define(['dataLayer/indexedDBBacking', 'dataLayer/file'], function(IndexedDBBacking, File) {
  buster.testCase("IndexedDBBacking", {
    setUp: function() {
      //this.timeout = 2000;

      this.dbName = "Draw-" + Date.now() + Math.round((Math.random() * 100000));

      this.backing = new IndexedDBBacking(this.dbName);
      return this.backing.readyPromise;
    },

    tearDown: function() {
      return this.backing.clearAll();
    },

    "Has no files": function() {
      return this.backing.getFiles()
        .then(function(files) {
          assert.isArray(files);
          assert.equals(files.length, 0);
        })
    },

    "Deleted Files is empty": function() {
      return this.backing.getDeletedFiles().then(function(files) {
        assert.isArray(files);
        assert.equals(files.length, 0);
      })
    },

    "File operations": {
      setUp: function() {
        this.instance = new this.backing.instance(this.backing);

        this.fileName = this.dbName + Date.now() + Math.round((Math.random() * 100000));
        this.fileInfo = {
          id: this.fileName,
          name: "File Name",
          localModifiedTime: 1234,
          driveModifiedTime: "Today",
          thumbnail: "thumbnail image"
        }

        return this.instance.create(this.fileInfo);
      },

      tearDown: function() {
        return this.backing.deleteFile(this.fileInfo.id)
      },

      "CRUD": {
        "file list with a file": function() {
          return this.backing.getFiles()
            .then((function(files) {
              assert.equals(files.length, 1);
              assert.equals(files[0], this.fileInfo);
            }).bind(this));
        },

        "get file by id": function() {
          return this.backing.getFiles()
            .then((function(files) {
              assert.equals(files.length, 1);
              assert.equals(files[0], this.fileInfo);
            }).bind(this));
        },

        "create then delete file": function() {
          return this.backing.deleteFile(this.fileInfo.id)
            .then((function(results) {
              return this.backing.getFiles()
            }).bind(this))
            .then((function(files) {
              assert.equals(files.length, 0);
            }).bind(this));
        },

        "marked file doesn't show up": function() {
          return this.backing.markFileAsDeleted(this.fileInfo.id)
            .then((function(results) {
              return this.backing.getFiles()
            }).bind(this))
            .then((function(files) {
              assert.equals(files.length, 0);
            }).bind(this));
        },

        "marked file has one deleted file": function() {
          return this.backing.markFileAsDeleted(this.fileInfo.id)
            .then((function() {
              return this.backing.getDeletedFiles();
            }).bind(this))
            .then(function(files) {
              assert.equals(files.length, 1);
            })
        },

        "unmark file": function() {
          return this.backing.markFileAsDeleted(this.fileInfo.id)
            .then((function() {
              return this.backing.unmarkFileAsDeleted(this.fileInfo.id);
            }).bind(this))
            .then((function(results) {
              return this.backing.getFiles()
            }).bind(this))
            .then((function(files) {
              assert.equals(files.length, 1);
            }).bind(this));
        },

        "update local time": function() {
          return this.instance.updateLocalModifiedTime(2014)
            .then((function() {
              return this.backing.getFileInfo(this.fileInfo.id);
            }).bind(this))
            .then((function(fileInfo) {
              assert.isObject(fileInfo);
              assert.equals(fileInfo.localModifiedTime, 2014);
            }).bind(this));
        },

        "update drive time": function() {
          return this.instance.updateDriveModifiedTime("Yesterday")
            .then((function() {
              return this.backing.getFileInfo(this.fileInfo.id);
            }).bind(this))
            .then((function(fileInfo) {
              assert.isObject(fileInfo);
              assert.equals(fileInfo.driveModifiedTime, "Yesterday");
            }).bind(this));
        },

        "//rename file": function() {

        },

        "//update thumbnail": function() {

        },

        "//replace file id with empty actions": function() {

        }
      },

      "file action operations": {
        "//replace file id with actions" : function() {

        }
      }
    }
  });
});