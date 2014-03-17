var assert = buster.assert;
var refute = buster.refute;

define(['dataLayer/indexedDBBacking', 'dataLayer/file'], function(IndexedDBBacking, File) {
  buster.testCase("IndexedDBBacking", {
    setUp: function() {
      //this.timeout = 2000;

      this.dbName = "Draw-"+Date.now()+(Math.random()*100000);

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
          assert.equals(files.length, 0, "Should have no files");
        })
    },

    "Deleted Files is empty": function() {
      return this.backing.getDeletedFiles().then(function(files) {
        assert.isArray(files);
        assert.equals(files.length, 0, "Should have no deleted files");
      })
    },

    "instance": {
      setUp: function() {
        this.instance = new this.backing.instance(this.backing);

        this.fileName = this.dbName+Date.now()+(Math.random()*100000);
        this.fileInfo = {
          id: this.fileName,
          name: "File Name",
          localModifiedTime: 1234,
          driveModifiedTime: "Today",
          // I don't like this, but it is a 1px transparent png
          thumbnail: "thumbnail image",
        };
      },

      "Create file gives info": function() {
        return this.instance.create(this.fileInfo)
          .then((function(fileInfo) {
            assert.isObject(fileInfo);
            assert.equals(fileInfo.name, this.fileInfo.name)
          }).bind(this));
      }
    }
  });
});