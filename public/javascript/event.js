define([], function() {

  function Event() {
    this.init();
  }

  Event.prototype = {
    listeners: null,

    init: function() {
      this.listeners = [];
    },

    addListener: function(event, callback) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }

      this.listeners[event].push(callback);
    },

    removeListener: function(event, callback) {
      if (!this.listeners[event]) {
        return false;
      }

      var index = this.listeners[event].indexOf(callback);
      if (index !== -1) {
        delete this.listeners[event][index];
        return true;
      }

      return false;
    },

    trigger: function(event, data) {
      console.log("Triggering", event, data, this.listeners[event] ? this.listeners[event].length : 0, "listeners");

      if (!this.listeners[event]) {
        return false;
      }

      this.listeners[event].forEach(function(listener) {
        listener(data);
      });

      return true;
    }
  }

  return new Event(); 

});