define(["event"], function(Event) {
  function Analytics() {
    this.init();
  };

  Analytics.prototype = {
    init: function() {

    },

    pageview: function(pageName) {
      ga('send', 'pageview', {
        'title': pageName
      });
    },

    event: function(eventName) {
      ga('send', 'event', eventName);
    },
  }

  return new Analytics();
});