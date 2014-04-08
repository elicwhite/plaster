var assert = buster.assert;
var refute = buster.refute;

define(['promise', 'tests/Helpers/backingHelpers', 'tests/Fixture/driveFixture', 'dataLayer/data'], function(Promise, Helpers, DriveFixture, Data) {
  if (!window.Promise) {
    window.Promise = Promise;
  }

  buster.testCase("Data", {
    setUp: function() {
      this.backing = Helpers.createBacking();
      this.data = new Data(this.backing);

      this.fileInfo = {
        id: Helpers.randomName(),
        name: "Untitled File",
        localModifiedTime: 1234,
        driveModifiedTime: "",
        thumbnail: "thumb",
      };
    },

    tearDown: function() {
      return this.backing.clearAll();
    },

    "create returns file": function() {
      return this.data._createFile(this.fileInfo)
        .then((function(file) {
          assert.isObject(file);
        }).bind(this))
    },

    "delete with localId actually deletes": function() {
      return this.data._createFile(this.fileInfo)
        .then((function() {
          return this.data.deleteFile(this.fileInfo.id)
        }).bind(this))
        .then((function() {
          return this.backing.getDeletedFiles()
        }).bind(this))
        .then(function(files) {
          assert.equals(files.length, 0);
        });
    },

    "delete with non localId markes as delete": function() {
      // Doesn't start with T^
      this.fileInfo.id = "a" + this.fileInfo.id;

      return this.data._createFile(this.fileInfo)
        .then((function() {
          return this.data.deleteFile(this.fileInfo.id)
        }).bind(this))
        .then((function() {
          return this.backing.getDeletedFiles()
        }).bind(this))
        .then(function(files) {
          assert.equals(files.length, 1);
        });
    },

    "with file": {
      setUp: function() {
        return this.data._createFile(this.fileInfo)
          .then((function(file) {
            this.file = file;
          }).bind(this));
      },

      tearDown: function() {
        return this.data.deleteFile(this.fileInfo.id);
      },

      "create then load returns same reference": function() {
        return this.data.loadFile(this.fileInfo.id)
          .then((function(file) {
            assert.same(this.file, file );
          }).bind(this));
      },

      "one reference should have one reference": function() {
        assert.equals(1, this.data.openReferences(this.fileInfo.id));
      },

      "closing instance during other instance counts references properly": function() {
        var fId = this.fileInfo.id;

        return this.data.loadFile(fId)
          .then((function(file) {
            assert.equals(2, this.data.openReferences(fId));
            return this.data.close(file);
          }).bind(this))
          .then((function() {
            assert.equals(1, this.data.openReferences(fId));
            return this.data.close(this.file);
          }).bind(this))
          .then((function() {
            assert.equals(0, this.data.openReferences(fId));
          }).bind(this))
      },

      "closing instance then opening same file has 0 references": function() {
        var fId = this.fileInfo.id;
        return this.data.close(this.file)
          .then((function() {
            return this.data.loadFile(fId);
          }).bind(this))
          .then((function(file) {
            this.file = file;
            return this.data.close(this.file);
          }).bind(this))
          .then((function() {
            assert.equals(0, this.data.openReferences(fId));
          }).bind(this))
      }
    },

    "sync": {
      setUp: function() {
        this.drive = new DriveFixture();
        this.driveInstance = new this.drive.instance(this.drive);
      },


      "not authenticated": {
        "with one local file": {
          setUp: function() {
            return this.data._createFile(this.fileInfo)
              .then((function(file) {
                this.file = file;
              }).bind(this));
          },

          tearDown: function() {
            return this.data.deleteFile(this.fileInfo.id);
          },

          "//runs": function() {
            return this.data.checkForUpdates()
          }
        }
      }
    }
  });
});