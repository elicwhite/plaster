var assert = buster.assert;
var refute = buster.refute;

define(['promise', 'tests/Helpers/backingHelpers', 'tests/Fixture/driveFixture', 'dataLayer/file'], function(promise, Helpers, DriveFixture, File) {
  if (!window.Promise) {
    window.Promise = promise;
  }

  buster.testCase("File", {
    setUp: function() {
      this.backing = Helpers.createBacking();
      this.instance = new this.backing.instance(this.backing);
      this.file = new File(this.instance);

      this.originalId = Helpers.randomName();
      this.fileInfo = {
        id: this.originalId,
        name: "Untitled File",
        localModifiedTime: 1234,
        driveModifiedTime: "1",
        thumbnail: "thumb",
      };
    },

    tearDown: function() {
      // we only need to close the file if it is loaded
      return this.file.close()
        .then((function() {
          return this.backing.clearAll();
        }).bind(this));
    },

    "Creating file adds to backing": function() {
      return this.file.create(this.fileInfo)
        .then((function(file) {
          return this.backing.getFiles()
        }).bind(this))
        .then((function(files) {
          assert.equals(files.length, 1);
          assert.equals(files[0], this.fileInfo);
        }).bind(this))
    },

    "created file": {
      setUp: function() {
        this.actionId = this.fileInfo.id + Math.round((Math.random() * 100000));
        this.action1 = Helpers.createAction(this.actionId);
        this.action2 = Helpers.createAction(this.actionId + "2");
        this.action3 = Helpers.createAction(this.actionId + "3");

        return this.file.create(this.fileInfo);
      },

      "New file has no actions": function() {
        var actions = this.file.getActions()
        assert.equals(actions.length, 0);
      },

      "has one action": function() {
        return this.file.addAction(this.action1)
          .then((function() {
            return this.file.getActions();
          }).bind(this))
          .then((function(actions) {
            assert.equals(actions.length, 1);
            assert.equals(actions[0], this.action1);
          }).bind(this));
      },

      "has two actions": function() {
        return this.file.addAction(this.action1)
          .then((function() {
            return this.file.addAction(this.action2)
          }).bind(this))
          .then((function() {
            return this.file.getActions();
          }).bind(this))
          .then((function(actions) {
            assert.equals(actions.length, 2);
            assert.equals(actions[0], this.action1);
            assert.equals(actions[1], this.action2);
          }).bind(this));
      },

      "has one action after undo": function() {
        return this.file.addAction(this.action1)
          .then((function() {
            return this.file.addAction(this.action2)
          }).bind(this))
          .then((function() {
            return this.file.undo();
          }).bind(this))
          .then((function() {
            return this.file.getActions();
          }).bind(this))
          .then((function(actions) {
            assert.equals(actions.length, 1);
            assert.equals(actions[0], this.action1);
          }).bind(this));
      },

      "has zero actions after undo twice": function() {
        return this.file.addAction(this.action1)
          .then((function() {
            return this.file.addAction(this.action2)
          }).bind(this))
          .then((function() {
            return this.file.undo();
          }).bind(this))
          .then((function() {
            return this.file.undo();
          }).bind(this))
          .then((function() {
            return this.file.getActions();
          }).bind(this))
          .then((function(actions) {
            assert.equals(actions.length, 0);
          }).bind(this));
      },

      "has two actions after undo redo": function() {
        return this.file.addAction(this.action1)
          .then((function() {
            return this.file.addAction(this.action2)
          }).bind(this))
          .then((function() {
            return this.file.undo();
          }).bind(this))
          .then((function() {
            return this.file.redo();
          }).bind(this))
          .then((function() {
            return this.file.getActions();
          }).bind(this))
          .then((function(actions) {
            assert.equals(actions.length, 2);
            assert.equals(actions[0], this.action1);
            assert.equals(actions[1], this.action2);
          }).bind(this));
      },

      "cant redo without undoing": function() {
        return this.file.addAction(this.action1)
          .then((function() {
            return this.file.redo();
          }).bind(this))
          .then((function() {
            return this.file.getActions();
          }).bind(this))
          .then((function(actions) {
            assert.equals(actions.length, 1);
            assert.equals(actions[0], this.action1);
          }).bind(this));
      },

      "cant redo without adding actions": function() {
        return this.file.redo()
          .then((function() {
            return this.file.getActions();
          }).bind(this))
          .then((function(actions) {
            assert.equals(actions.length, 0);
          }).bind(this));
      },

      "can redo twice": function() {
        return this.file.addAction(this.action1)
          .then((function() {
            return this.file.addAction(this.action2)
          }).bind(this))
          .then((function() {
            return this.file.undo();
          }).bind(this))
          .then((function() {
            return this.file.undo();
          }).bind(this))
          .then((function() {
            return this.file.redo();
          }).bind(this))
          .then((function() {
            return this.file.redo();
          }).bind(this))
          .then((function() {
            return this.file.getActions();
          }).bind(this))
          .then((function(actions) {
            assert.equals(actions.length, 2);
            assert.equals(actions[0], this.action1);
            assert.equals(actions[1], this.action2);
          }).bind(this));
      },

      "cant redo after adding action": function() {
        return this.file.addAction(this.action1)
          .then((function() {
            return this.file.addAction(this.action2)
          }).bind(this))
          .then((function() {
            return this.file.undo();
          }).bind(this))
          .then((function() {
            return this.file.addAction(this.action3)
          }).bind(this))
          .then((function() {
            return this.file.redo();
          }).bind(this))
          .then((function() {
            return this.file.getActions();
          }).bind(this))
          .then((function(actions) {
            assert.equals(actions.length, 2);
            assert.equals(actions[0], this.action1);
            assert.equals(actions[1], this.action3);
          }).bind(this));
      },

      "remote actions": {
        setUp: function() {
          this.payload = {
            index: 0,
            isLocal: false,
            values: null
          };
        },

        "one remote action is first and only": function() {
          this.payload.values = [this.action1];

          return this.file.remoteActionsAdded(this.payload)
            .then((function() {
              return this.file.getActions();
            }).bind(this))
            .then((function(actions) {
              assert.equals(actions.length, 1);
              assert.equals(actions[0], this.action1);
            }).bind(this));
        },

        "one remote added after local is first": function() {
          this.payload.values = [this.action1];

          return this.file.addAction(this.action2)
            .then((function() {
              return this.file.remoteActionsAdded(this.payload)
            }).bind(this))
            .then((function() {
              return this.file.getActions();
            }).bind(this))
            .then((function(actions) {
              assert.equals(actions.length, 2);
              assert.equals(actions[0], this.action1);
              assert.equals(actions[1], this.action2);
            }).bind(this));
        }
      },

      "file info updated": {
        "rename changes name": function() {

          var newName = "blah";
          return this.file.rename(newName)
            .then((function() {
              return this.file.fileInfoPromise;
            }).bind(this))
            .then((function(fileInfo) {
              assert.equals(fileInfo.name, newName);
            }).bind(this))
        },

        "rename changes localTime": function() {

          var newName = "blah";
          return this.file.rename(newName)
            .then((function() {
              return this.file.fileInfoPromise;
            }).bind(this))
            .then((function(fileInfo) {
              refute.equals(fileInfo.localModifiedTime, this.fileInfo.localModifiedTime);
            }).bind(this))
        }
      },

      "with drive": {
        setUp: function() {
          this.drive = new DriveFixture();
          this.driveInstance = new this.drive.instance(this.drive);
        },

        "not on drive": {
          setUp: function() {
            this.driveInstance.create = (function(fileInfo) {
              var newInfo = Helpers.clone(fileInfo);

              this.newId = Helpers.randomName();
              newInfo.id = this.newId;
              return newInfo;
            }).bind(this)
          },

          "changes id": function() {
            this.file.sync(this.driveInstance)
              .then((function() {
                return this.file.fileInfoPromise;
              }).bind(this))
              .then((function(fileInfo) {
                refute.equals(fileInfo, this.fileInfo);
                this.fileInfo.id = this.newId;
                assert.equals(fileInfo, this.fileInfo);
              }).bind(this))
          },

          "has one action before has one after": function() {
            return this.file.addAction(this.action1)
              .then((function() {
                return this.file.sync(this.driveInstance);
              }).bind(this))
              .then((function() {
                return this.file.getActions();
              }).bind(this))
              .then((function(actions) {
                assert.equals(actions.length, 1);
                assert.equals(actions[0], this.action1);
              }).bind(this));
          },

          "has two actions before has two after": function() {
            return this.file.addAction(this.action1)
              .then((function() {
                return this.file.addAction(this.action2)
              }).bind(this))
              .then((function() {
                return this.file.sync(this.driveInstance);
              }).bind(this))
              .then((function() {
                return this.file.getActions();
              }).bind(this))
              .then((function(actions) {
                assert.equals(actions.length, 2);
                assert.equals(actions[0], this.action1);
                assert.equals(actions[1], this.action2);
              }).bind(this));
          },

          "updates drive": {
            setUp: function() {
              this.dAction1 = Helpers.createAction(this.actionId + "d", true);
              this.dAction2 = Helpers.createAction(this.actionId + "d2", true);
            },

            "has one action before has one after without control points": function() {
              return this.file.addAction(this.action1)
                .then((function() {
                  return this.file.sync(this.driveInstance);
                }).bind(this))
                .then((function() {
                  return this.driveInstance.getActions();
                }).bind(this))
                .then((function(actions) {
                  assert.equals(actions.length, 1);
                  refute.defined(actions[0].value.controlPoints);
                  assert.match(this.action1, actions[0]);
                }).bind(this));
            },

            "file with actions not on drive keeps actions": function() {
              var payload = {
                index: 0,
                isLocal: false,
                values: [this.dAction1, this.dAction2]
              }

              // two remote actions, one local action
              return this.file.remoteActionsAdded(payload)
                .then((function() {
                  return this.file.addAction(this.action1);
                }).bind(this))
                .then((function() {
                  return this.file.sync(this.driveInstance);
                }).bind(this))
                .then((function() {
                  return this.driveInstance.getActions();
                }).bind(this))
                .then((function(actions) {
                  assert.equals(actions.length, 3);

                  // Remove all the indexes
                  actions.map(function(action) {
                    delete action.index;
                  });

                  assert.match(this.dAction1, actions[0]);
                  assert.match(this.dAction2, actions[1]);
                  assert.match(this.action1, actions[2]);
                }).bind(this));
            },

            "file gets renamed": function() {
              var newName = "blah";

              return this.file.rename(newName)
                .then((function() {
                  return this.file.sync(this.driveInstance)
                }).bind(this))
                .then((function() {
                  assert.equals(this.driveInstance._title, newName)
                }).bind(this))
            }
          }
        },

        "is on drive": {

          "renames locally if drive is newer": function() {
            var newName = "blahs";

            this.drive.getFileInfo = (function() {
              var fileInfo = Helpers.clone(this.fileInfo);
              delete fileInfo.name;
              fileInfo.title = newName;
              fileInfo.driveModifiedTime = "2";
              return Promise.resolve(fileInfo);
            }).bind(this)

            return this.driveInstance.rename(newName)
              .then((function() {
                return this.file.sync(this.driveInstance)
              }).bind(this))
              .then((function() {
                return this.file.fileInfoPromise;
              }).bind(this))
              .then((function(fileInfo) {
                assert.equals(fileInfo.name, newName);
                assert.equals(this.driveInstance._title, newName)
              }).bind(this))
          },

          "renames drive if drive hasn't changed": function() {
            var newName = "blahs";

            this.drive.getFileInfo = (function() {
              var fileInfo = Helpers.clone(this.fileInfo);
              fileInfo.title = fileInfo.name;
              delete fileInfo.name;
              return Promise.resolve(fileInfo);
            }).bind(this)

            return this.file.rename(newName)
              .then((function() {
                return this.file.sync(this.driveInstance)
              }).bind(this))
              .then((function() {
                return this.file.fileInfoPromise;
              }).bind(this))
              .then((function(fileInfo) {
                assert.equals(fileInfo.name, newName);
                assert.equals(this.driveInstance._title, newName)
              }).bind(this))
          }
        }
      }
    }
  });
});