var assert = buster.assert;
var refute = buster.refute;

define(['promise', 'tests/Helpers/backingHelpers', 'tests/GenericBackingTest', 'dataLayer/indexedDBBacking', 'dataLayer/webSQLBacking'], function(Promise, Helpers, GenericBackingTest, IndexedDBBacking, WebSQLBacking) {
  if (!window.Promise) {
    window.Promise = Promise;
  }

  var indexedDBBackingTest = new GenericBackingTest();
  indexedDBBackingTest.setUp = function() {
    this.dbName = Helpers.randomName();
    this.backing = new IndexedDBBacking(this.dbName);
  };

  indexedDBBackingTest.requiresSupportFor = {
    "indexedDb": 'indexedDB' in window
  };

  var webSQLBackingTest = new GenericBackingTest();
  webSQLBackingTest.setUp = function() {
    this.dbName = Helpers.randomName();
    this.backing = new WebSQLBacking(this.dbName);
  };

  webSQLBackingTest.requiresSupportFor = {
    "WebSQL": 'openDatabase' in window
  };


  buster.testCase("IndexedDBBacking", indexedDBBackingTest);
  buster.testCase("webSQLBackingTest", webSQLBackingTest);
});