define(["section", "analytics"], function(Section, Analytics) {

  var Page = Section.extend({
    name: null,

    show: function() {
      if (this.name) {
        Analytics.pageView(this.name);
      }
    },

  });

  return Page;
});