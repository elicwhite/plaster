define(["dataLayer/data", "dataLayer/indexedDBBacking", "dataLayer/webSQLBacking", "dataLayer/driveBacking"], function(Data, IndexedDBBacking, WebSQLBacking, DriveBacking) {
  var backing;

  if (window.indexedDB) {
   backing = new IndexedDBBacking();
  } else {
    backing = new WebSQLBacking();
  }

  return new Data(backing, new DriveBacking());
})