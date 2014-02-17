define(["class", "event"], function(Class, Event) {
  var GData = Class.extend({
    _driveFileName: "DrawingFile",
    _files: null,

    init: function() {},

    start: function() {
      console.log("data");
      gapi.client.load('drive', 'v2', (function() {
        gapi.client.drive.files.list({
          'q': 'title=' + "'" + this._driveFileName + "'"
        }).execute(function(results) {
          this._files = results;
        });
      }).bind(this));
    },

    initializeModel: function(model) {
      var string = model.createString('Hello Realtime World!');
      model.getRoot().set('text', string);
    },

    onFileLoaded: function(doc) {
      window.doc = doc;
      console.log(doc);

      var string = doc.getModel().getRoot().get('text');
      console.log(string);
    },
  });

  return new GData();
});