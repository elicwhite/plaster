var assert = buster.assert;
var refute = buster.refute;

define(['promise', 'tests/Helpers/backingHelpers', 'dataLayer/data'], function(Promise, Helpers, Data) {
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

      "create then load returns same instance": function() {
        assert.isObject(this.file);
      }
    }
  });
});