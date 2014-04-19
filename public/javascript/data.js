define(["dataLayer/data", "event", "dataLayer/indexedDBBacking", "dataLayer/webSQLBacking", "dataLayer/driveBacking"], function(Data, Event, IndexedDBBacking, WebSQLBacking, DriveBacking) {
  var backing;

  if (window.indexedDB) {
   backing = new IndexedDBBacking();
  } else {
    backing = new WebSQLBacking();
  }

  var driveBacking = new DriveBacking();
  var data = new Data(backing, driveBacking);

  Event.addListener("authenticatedStatusChanged", function(status) {
    if (status.authenticated) {
      console.log("Syncing open files");
      data.syncOpenFiles();
    }
  });

  return data;
})