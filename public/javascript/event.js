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

      for(var i = 0; i < this.listeners[event].length; i++) {
        if (this.listeners[event][i] == callback) {
          this.listeners[event] = this.listeners[event].splice(i, 1);
          return true;
        }
      }
    },

    trigger: function(event, data) {
      if (!this.listeners[event]) {
        return false;
      }

      function callListener(listener) {
        setTimeout(function() {
          listener(data);
        }, 0);
      }

      for(var i = 0; i < this.listeners[event].length; i++) {
        callListener(this.listeners[event][i]);
      }

      return true;
    }
  }

  return new Event(); 

});