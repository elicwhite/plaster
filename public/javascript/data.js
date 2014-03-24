define(["dataLayer/data", "dataLayer/indexedDBBacking", "dataLayer/webSQLBacking"], function(Data, IndexedDBBacking, WebSQLBacking) {
  var backing;

  //if (window.indexedDB) {
  //  backing = new IndexedDBBacking();
  //} else {
    backing = new WebSQLBacking();
  //}

  return new Data(backing);
})