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

      "create then load returns same reference": function() {
        this.data.loadFile(this.fileInfo.id)
        .then((function(file) {
          assert.same(this.file, file);
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
          .then((function(file) {
            assert.equals(1, this.data.openReferences(fId));
            return this.data.close(this.file);
          }).bind(this))
          .then((function(file) {
            assert.equals(0, this.data.openReferences(fId));
          }).bind(this))

      }
    }
  });
});