var assert = buster.assert;
var refute = buster.refute;

define(['promise', 'tests/Helpers/backingHelpers', 'tests/Fixture/driveFixture', 'dataLayer/file'], function(Promise, Helpers, DriveFixture, File) {
  if (!window.Promise) {
    window.Promise = Promise;
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
        driveModifiedTime: "",
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

          "// gets both files": function() {
            this.stub(this.drive, "getFiles", function() {
              return [{
                id: 1
              }, {
                id: 2
              }];
            });

            return this.file.sync(this.driveInstance, true)
              .then(function() {
                assert(true);
              })
          }
        },
      }
    }
  });
});