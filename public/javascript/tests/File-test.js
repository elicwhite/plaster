var assert = buster.assert;
var refute = buster.refute;

define(['promise', 'tests/Helpers/backingHelpers', 'dataLayer/file'], function(Promise, Helpers, File) {
  if (!window.Promise) {
    window.Promise = Promise;
  }

  buster.testCase("File", {
    setUp: function() {
      this.backing = Helpers.createBacking();
      this.file = new File(this.backing);

      this.fileInfo = {
        id: Helpers.randomName(),
        name: "Untitled File",
        localModifiedTime: Date.now(),
        driveModifiedTime: "",
        // I don't like this, but it is a 1px transparent png
        thumbnail: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==",
      };
    },

    tearDown: function() {
      // we only need to close the file if it is loaded
      this.backing.clearAll();
    },

    "Test": function() {
      assert.isObject(this.backing);
    }
  });


});