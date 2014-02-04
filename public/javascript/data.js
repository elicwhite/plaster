define(["class", "db"], function(Class, db) {
  var Data = Class.extend({
    init: function() {
      
    },

    // Get the name of all the files we have
    getFileNames: function(callback) {
      callback(["file1", "file2"]);
    },

    // Create a new file and returns the file name
    createFile: function(callback) {
      //return ["file3"];
      callback("file3");
    },

    // Get the stored data for the file
    getFileStore: function(fileName, callback) {
      return server[fileNam];
    }


  });

  return Data;
});