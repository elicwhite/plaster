define(["event"], function(Event) {
  function Analytics() {
    this.init();
  };

  Analytics.prototype = {
    init: function() {
    },

    pageView: function(pageName) {
      ga('send', 'pageview', {
        'page': window.location.pathname + window.location.hash,
        'title': pageName
      });
    },

    event: function() {
      var args = [].splice.call(arguments,0);
      var args = ['send', 'event'].concat(args);
      ga.apply(ga, args);
    },
  }

  return new Analytics();
});