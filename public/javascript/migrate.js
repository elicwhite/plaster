define(["data"], function(Data) {
  var Migrate = function Migrate() {
    this.init();
  };

  Migrate.prototype = {
    init: function() {},

    run: function() {
      //debugger;
      var version = localStorage.dataVersion;

      var sequence = Promise.resolve();

      if (!version) {
        // no version, just clear everything
        sequence = sequence.then((function() {
          //return Data.clearLocal()
        }).bind(this))
        .then(function() {
          //localStorage.dataVersion = 1;  
        });
      }

      return sequence;
    }
  }

  return new Migrate();
});