define(["sections/updateMessage"], function(UpdateMessage) {

  function CacheHandler() {
    this.init();
  }

  CacheHandler.prototype = {
    init: function() {
    },

    updateReady: function() {
      UpdateMessage.show();
    }
  }

  return new CacheHandler(); 
});