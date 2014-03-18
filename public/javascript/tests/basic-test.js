var assert = buster.assert;
var refute = buster.refute;

var Help = {
  indexify: function(actions, startIndex) {
    var items = [];
    // put indexes on the items
    for (var i = 0; i < actions.length; i++) {
      var item = Helpers.clone(actions[i]);
      item.index = i + startIndex;
      items.push(item);
    }

    return items;
  },

  createAction: function(id) {
    return {
      id: id,
      type: "stroke",
      value: {
        points: [
          [2, 4]
        ],
        width: 2,
        lockWidth: true, // should the width stay the same regardless of zoom
        color: "#ccc"
      }
    };
  }
};

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

        this.fileId = this.dbName + Date.now() + Math.round((Math.random() * 100000));
        this.fileInfo = {
          id: this.fileId,
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

        "rename file": function() {
          return this.instance.rename("Test name")
            .then((function() {
              return this.backing.getFileInfo(this.fileInfo.id);
            }).bind(this))
            .then((function(fileInfo) {
              assert.equals(fileInfo.name, "Test name");
            }).bind(this));
        },

        "update local time": function() {
          return this.instance.updateLocalModifiedTime(2014)
            .then((function() {
              return this.backing.getFileInfo(this.fileInfo.id);
            }).bind(this))
            .then((function(fileInfo) {
              assert.equals(fileInfo.localModifiedTime, 2014);
            }).bind(this));
        },

        "update drive time": function() {
          return this.instance.updateDriveModifiedTime("Yesterday")
            .then((function() {
              return this.backing.getFileInfo(this.fileInfo.id);
            }).bind(this))
            .then((function(fileInfo) {
              assert.equals(fileInfo.driveModifiedTime, "Yesterday");
            }).bind(this));
        },

        "update thumbnail": function() {
          return this.instance.updateThumbnail("dataUrl:blahblah")
            .then((function() {
              return this.backing.getFileInfo(this.fileInfo.id);
            }).bind(this))
            .then((function(fileInfo) {
              assert.equals(fileInfo.thumbnail, "dataUrl:blahblah");
            }).bind(this));
        },

        "replace file id with empty actions": function() {
          var newFileId = this.fileInfo.id + "-temp";
          return this.instance.replaceFileId(newFileId)
            .then((function() {
              return this.backing.getFileInfo(this.fileInfo.id);
            }).bind(this))
            .then((function(fileInfo) {
              refute.defined(fileInfo);
            }).bind(this))
            .then((function() {
              return this.backing.getFileInfo(newFileId);
            }).bind(this))
            .then((function(fileInfo) {
              assert.isObject(fileInfo);
              assert.equals(fileInfo.id, newFileId);
              assert.equals(fileInfo.name, this.fileInfo.name);
            }).bind(this))
            .then((function() {
              // clean up so the file will be deleted
              this.fileInfo.id = newFileId
            }).bind(this))
        }
      },

      "file action operations": {
        setUp: function() {
          var actionId = this.fileInfo.id + Math.round((Math.random() * 100000));
          this.action1 = Help.createAction(actionId);
          this.action2 = Help.createAction(actionId + "2");
        },

        "has no actions": function() {
          return this.instance.getActions()
            .then(function(actions) {
              assert.isArray(actions.local);
              assert.isArray(actions.remote);
              assert.equals(actions.local.length, 0);
              assert.equals(actions.remote.length, 0);
            })
        },

        "has one local actions": function() {
          return this.instance.addLocalAction(this.action1)
            .then((function() {
              return this.instance.getActions();
            }).bind(this))
            .then((function(actions) {
              assert.equals(actions.remote.length, 0);
              assert.equals(actions.local.length, 1);
              assert.equals(actions.local[0], this.action1);
            }).bind(this))
        },

        "has two local actions in correct order": function() {
          return this.instance.addLocalAction(this.action1)
            .then((function() {
              return this.instance.addLocalAction(this.action2)
            }).bind(this))
            .then((function() {
              return this.instance.getActions();
            }).bind(this))
            .then((function(actions) {
              assert.equals(actions.local.length, 2);
              assert.equals(actions.local[0], this.action1);
              assert.equals(actions.local[1], this.action2);
            }).bind(this))
        },

        "two local actions removing first one": function() {
          return this.instance.addLocalAction(this.action1)
            .then((function() {
              return this.instance.addLocalAction(this.action2)
            }).bind(this))
            .then((function() {
              return this.instance.removeLocalAction(this.action1.id)
            }).bind(this))
            .then((function() {
              return this.instance.getActions();
            }).bind(this))
            .then((function(actions) {
              assert.equals(actions.local.length, 1);
              assert.equals(actions.local[0], this.action2);
            }).bind(this))
        },

        // Test remote actions

        "remote actions": {
          setUp: function() {
            this.action3 = Help.createAction(actionId + "3");
            this.action4 = Help.createAction(actionId + "4");
            Help.indexify([this.action3, this.action4], 0);

            this.action5 = Help.createAction(actionId + "4");
            Help.indexify([this.action5], 1);
          },

          "//replace file id with actions": function() {
            //console.log(document.body.children[0].id);
          }
        }
      }
    }
  });
});