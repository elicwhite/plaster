var assert = buster.assert;
var refute = buster.refute;



define(['tests/GenericBackingTest', 'dataLayer/indexedDBBacking', 'dataLayer/webSQLBacking', 'dataLayer/file'], function(GenericBackingTest, IndexedDBBacking, WebSQLBacking, File) {
  function randomName() {
    return "Draw-" + Date.now() + Math.round((Math.random() * 100000));
  }

  var indexedDBBackingTest = new GenericBackingTest();
  indexedDBBackingTest.setUp = function() {
    this.dbName = randomName();
    this.backing = new IndexedDBBacking(this.dbName);
  };

  indexedDBBackingTest.requiresSupportFor = {
    "indexedDb": 'indexedDB' in window
  };

  buster.testCase("IndexedDBBacking", indexedDBBackingTest);



  var webSQLBackingTest = new GenericBackingTest();
  webSQLBackingTest.setUp = function() {
    this.dbName = randomName();
    this.backing = new WebSQLBacking(this.dbName);
  };

  webSQLBackingTest.requiresSupportFor = {
    "WebSQL": 'openDatabase' in window
  };

  buster.testCase("webSQLBackingTest", webSQLBackingTest);
});