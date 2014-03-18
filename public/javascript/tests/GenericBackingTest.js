define(["tests/helpers"], function(Helpers) {
  var BackingTest = function() {
    return {
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

          // "get file by id": function() {
          //   return this.backing.getFiles()
          //     .then((function(files) {
          //       assert.equals(files.length, 1);
          //       assert.equals(files[0], this.fileInfo);
          //     }).bind(this));
          // },

          // "create then delete file": function() {
          //   return this.backing.deleteFile(this.fileInfo.id)
          //     .then((function(results) {
          //       return this.backing.getFiles()
          //     }).bind(this))
          //     .then((function(files) {
          //       assert.equals(files.length, 0);
          //     }).bind(this));
          // },

          // "marked file doesn't show up": function() {
          //   return this.backing.markFileAsDeleted(this.fileInfo.id)
          //     .then((function(results) {
          //       return this.backing.getFiles()
          //     }).bind(this))
          //     .then((function(files) {
          //       assert.equals(files.length, 0);
          //     }).bind(this));
          // },

          "marked file has one deleted file": function() {
            return this.backing.markFileAsDeleted(this.fileInfo.id)
              .then((function() {
                return this.backing.getDeletedFiles();
              }).bind(this))
              .then((function(files) {
                assert.equals(files.length, 1);
                assert.match(files[0], this.fileInfo);
              }).bind(this))
          },

          // "unmark file": function() {
          //   return this.backing.markFileAsDeleted(this.fileInfo.id)
          //     .then((function() {
          //       return this.backing.unmarkFileAsDeleted(this.fileInfo.id);
          //     }).bind(this))
          //     .then((function(results) {
          //       return this.backing.getFiles()
          //     }).bind(this))
          //     .then((function(files) {
          //       assert.equals(files.length, 1);
          //     }).bind(this));
          // },

          // "rename file": function() {
          //   return this.instance.rename("Test name")
          //     .then((function() {
          //       return this.backing.getFileInfo(this.fileInfo.id);
          //     }).bind(this))
          //     .then((function(fileInfo) {
          //       assert.equals(fileInfo.name, "Test name");
          //     }).bind(this));
          // },

          // "update local time": function() {
          //   return this.instance.updateLocalModifiedTime(2014)
          //     .then((function() {
          //       return this.backing.getFileInfo(this.fileInfo.id);
          //     }).bind(this))
          //     .then((function(fileInfo) {
          //       assert.equals(fileInfo.localModifiedTime, 2014);
          //     }).bind(this));
          // },

          // "update drive time": function() {
          //   return this.instance.updateDriveModifiedTime("Yesterday")
          //     .then((function() {
          //       return this.backing.getFileInfo(this.fileInfo.id);
          //     }).bind(this))
          //     .then((function(fileInfo) {
          //       assert.equals(fileInfo.driveModifiedTime, "Yesterday");
          //     }).bind(this));
          // },

          // "update thumbnail": function() {
          //   return this.instance.updateThumbnail("dataUrl:blahblah")
          //     .then((function() {
          //       return this.backing.getFileInfo(this.fileInfo.id);
          //     }).bind(this))
          //     .then((function(fileInfo) {
          //       assert.equals(fileInfo.thumbnail, "dataUrl:blahblah");
          //     }).bind(this));
          // },

          // "replace file id with empty actions": function() {
          //   var newFileId = this.fileInfo.id + "-temp";
          //   return this.instance.replaceFileId(newFileId)
          //     .then((function() {
          //       return this.backing.getFileInfo(this.fileInfo.id);
          //     }).bind(this))
          //     .then((function(fileInfo) {
          //       refute.defined(fileInfo);
          //     }).bind(this))
          //     .then((function() {
          //       return this.backing.getFileInfo(newFileId);
          //     }).bind(this))
          //     .then((function(fileInfo) {
          //       assert.isObject(fileInfo);
          //       assert.equals(fileInfo.id, newFileId);
          //       assert.equals(fileInfo.name, this.fileInfo.name);
          //     }).bind(this))
          //     .then((function() {
          //       // clean up so the file will be deleted
          //       this.fileInfo.id = newFileId
          //     }).bind(this))
          // }
        },

        // "file action operations": {
        //   setUp: function() {
        //     this.actionId = this.fileInfo.id + Math.round((Math.random() * 100000));
        //     this.action1 = Helpers.createAction(this.actionId);
        //     this.action2 = Helpers.createAction(this.actionId + "2");
        //   },

        //   "has no actions": function() {
        //     return this.instance.getActions()
        //       .then(function(actions) {
        //         assert.isArray(actions.local);
        //         assert.isArray(actions.remote);
        //         assert.equals(actions.local.length, 0);
        //         assert.equals(actions.remote.length, 0);
        //       })
        //   },

        //   "has one local actions": function() {
        //     return this.instance.addLocalAction(this.action1)
        //       .then((function() {
        //         return this.instance.getActions();
        //       }).bind(this))
        //       .then((function(actions) {
        //         assert.equals(actions.remote.length, 0);
        //         assert.equals(actions.local.length, 1);
        //         assert.equals(actions.local[0], this.action1);
        //       }).bind(this))
        //   },

        //   "has two local actions in correct order": function() {
        //     return this.instance.addLocalAction(this.action1)
        //       .then((function() {
        //         return this.instance.addLocalAction(this.action2)
        //       }).bind(this))
        //       .then((function() {
        //         return this.instance.getActions();
        //       }).bind(this))
        //       .then((function(actions) {
        //         assert.equals(actions.local.length, 2);
        //         assert.equals(actions.local[0], this.action1);
        //         assert.equals(actions.local[1], this.action2);
        //       }).bind(this))
        //   },

        //   "two local actions removing first one": function() {
        //     return this.instance.addLocalAction(this.action1)
        //       .then((function() {
        //         return this.instance.addLocalAction(this.action2)
        //       }).bind(this))
        //       .then((function() {
        //         return this.instance.removeLocalAction(this.action1.id)
        //       }).bind(this))
        //       .then((function() {
        //         return this.instance.getActions();
        //       }).bind(this))
        //       .then((function(actions) {
        //         assert.equals(actions.local.length, 1);
        //         assert.equals(actions.local[0], this.action2);
        //       }).bind(this))
        //   },

        //   // Test remote actions

        //   "remote actions": {
        //     setUp: function() {
        //       this.action3 = Helpers.createAction(this.actionId + "3");
        //       this.action4 = Helpers.createAction(this.actionId + "4");
        //       Helpers.indexify([this.action3, this.action4], 0);

        //       this.action5 = Helpers.createAction(this.actionId + "5");
        //       Helpers.indexify([this.action5], 1);
        //     },

        //     "has one remote actions": function() {
        //       return this.instance.addRemoteActions(0, [this.action3])
        //         .then((function() {
        //           return this.instance.getActions();
        //         }).bind(this))
        //         .then((function(actions) {
        //           assert.equals(actions.remote.length, 1);
        //           assert.equals(actions.local.length, 0);
        //           assert.equals(actions.remote[0], this.action3);
        //         }).bind(this))
        //     },

        //     "has two remote actions": function() {
        //       return this.instance.addRemoteActions(0, [this.action3, this.action4])
        //         .then((function() {
        //           return this.instance.getActions();
        //         }).bind(this))
        //         .then((function(actions) {
        //           assert.equals(actions.remote.length, 2);
        //           assert.equals(actions.remote[0], this.action3);
        //           assert.equals(actions.remote[1], this.action4);
        //         }).bind(this))
        //     },

        //     "has two remote actions insert in beginning": function() {
        //       return this.instance.addRemoteActions(0, [this.action3, this.action4])
        //         .then((function() {
        //           this.action5.index = 0;
        //           return this.instance.addRemoteActions(0, [this.action5]);
        //         }).bind(this))
        //         .then((function() {
        //           return this.instance.getActions();
        //         }).bind(this))
        //         .then((function(actions) {
        //           assert.equals(actions.remote.length, 3);

        //           this.action3.index = 1;
        //           this.action4.index = 2;
        //           this.action5.index = 0;

        //           assert.equals(actions.remote[0], this.action5);
        //           assert.equals(actions.remote[1], this.action3);
        //           assert.equals(actions.remote[2], this.action4);
        //         }).bind(this))
        //     },

        //     "has two remote actions insert in middle": function() {
        //       return this.instance.addRemoteActions(0, [this.action3, this.action4])
        //         .then((function() {
        //           return this.instance.addRemoteActions(1, [this.action5]);
        //         }).bind(this))
        //         .then((function() {
        //           return this.instance.getActions();
        //         }).bind(this))
        //         .then((function(actions) {
        //           assert.equals(actions.remote.length, 3);

        //           this.action3.index = 0;
        //           this.action4.index = 2;
        //           this.action5.index = 1;

        //           assert.equals(actions.remote[0], this.action3);
        //           assert.equals(actions.remote[1], this.action5);
        //           assert.equals(actions.remote[2], this.action4);
        //         }).bind(this))
        //     },

        //     "has two remote actions insert at end": function() {
        //       return this.instance.addRemoteActions(0, [this.action3, this.action4])
        //         .then((function() {
        //           this.action5.index = 2;
        //           return this.instance.addRemoteActions(2, [this.action5]);
        //         }).bind(this))
        //         .then((function() {
        //           return this.instance.getActions();
        //         }).bind(this))
        //         .then((function(actions) {
        //           assert.equals(actions.remote.length, 3);

        //           this.action3.index = 0;
        //           this.action4.index = 1;
        //           this.action5.index = 2;

        //           assert.equals(actions.remote[0], this.action3);
        //           assert.equals(actions.remote[1], this.action4);
        //           assert.equals(actions.remote[2], this.action5);
        //         }).bind(this))
        //     },

        //     "removing actions": {
        //       setUp: function() {
        //         this.action5.index = 2;
        //         var actions = [this.action3, this.action4, this.action5];
        //         return this.instance.addRemoteActions(0, actions)
        //       },

        //       "removing last": function() {
        //         return this.instance.removeRemoteActions(2, 1)
        //           .then((function() {
        //             return this.instance.getActions();
        //           }).bind(this))
        //           .then((function(actions) {
        //             assert.equals(actions.remote.length, 2);

        //             assert.equals(actions.remote[0], this.action3);
        //             assert.equals(actions.remote[1], this.action4);
        //           }).bind(this))
        //       },

        //       "removing middle one": function() {
        //         return this.instance.removeRemoteActions(1, 1)
        //           .then((function() {
        //             return this.instance.getActions();
        //           }).bind(this))
        //           .then((function(actions) {
        //             assert.equals(actions.remote.length, 2);
        //             assert.equals(actions.remote[0], this.action3);

        //             this.action5.index = 1;
        //             assert.equals(actions.remote[1], this.action5);
        //           }).bind(this))
        //       },

        //       "removing last two": function() {
        //         return this.instance.removeRemoteActions(1, 2)
        //           .then((function() {
        //             return this.instance.getActions();
        //           }).bind(this))
        //           .then((function(actions) {
        //             assert.equals(actions.remote.length, 1);
        //             assert.equals(actions.remote[0], this.action3);
        //           }).bind(this))
        //       },

        //       "removing first one": function() {
        //         return this.instance.removeRemoteActions(0, 1)
        //           .then((function() {
        //             return this.instance.getActions();
        //           }).bind(this))
        //           .then((function(actions) {
        //             assert.equals(actions.remote.length, 2);
        //             this.action4.index = 0;
        //             this.action5.index = 1;
        //             assert.equals(actions.remote[0], this.action4);
        //             assert.equals(actions.remote[1], this.action5);
        //           }).bind(this))
        //       },

        //       "removing all": function() {
        //         return this.instance.removeRemoteActions(0, 3)
        //           .then((function() {
        //             return this.instance.getActions();
        //           }).bind(this))
        //           .then((function(actions) {
        //             assert.equals(actions.remote.length, 0);
        //           }).bind(this))
        //       },
        //     },

        //     "replace file id with actions": function() {
        //       var newFileId = this.fileInfo.id + "-temp";

        //       return this.instance.addLocalAction(this.action1)
        //         .then((function() {
        //           return this.instance.addLocalAction(this.action2)
        //         }).bind(this))
        //         .then((function() {
        //           this.action5.index = 2;
        //           return this.instance.addRemoteActions(0, [this.action3, this.action4, this.action5])
        //         }).bind(this))
        //         .then((function() {
        //           return this.instance.replaceFileId(newFileId)
        //         }).bind(this))
        //         .then((function() {
        //           return this.backing.getFileInfo(this.fileInfo.id);
        //         }).bind(this))
        //         .then((function(fileInfo) {
        //           // the old one is undefined
        //           refute.defined(fileInfo);
        //         }).bind(this))
        //         .then((function() {
        //           return this.backing.getFileInfo(newFileId);
        //         }).bind(this))
        //         .then((function(fileInfo) {
        //           assert.isObject(fileInfo);
        //           assert.equals(fileInfo.id, newFileId);
        //           assert.equals(fileInfo.name, this.fileInfo.name);
        //         }).bind(this))
        //         .then((function() {
        //           // the new one's actions need to match
        //           return this.instance.getActions();
        //         }).bind(this))
        //         .then((function(actions) {
        //           assert.equals(actions.remote.length, 3);
        //           assert.equals(actions.local.length, 2);

        //           assert.equals(actions.remote[0], this.action3);
        //           assert.equals(actions.remote[1], this.action4);
        //           assert.equals(actions.remote[2], this.action5);

        //           assert.equals(actions.local[0], this.action1);
        //           assert.equals(actions.local[1], this.action2);
        //         }).bind(this))
        //         .then((function() {
        //           // clean up so the file will be deleted
        //           this.fileInfo.id = newFileId
        //         }).bind(this))
        //     }
        //   }
        // }
      }
    }
  }

  return BackingTest;
});