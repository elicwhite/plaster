define(["section", "event", "managers/files"], function(Section, Event, Files) {

  var Main = Section.extend({
    id: "main-container",

    mainContent: null,

    // The panes we slide between in the main-content
    panes: null,
    currentPane: "",


    init: function() {
      this._super();

      this.mainContent = document.getElementById("main-content");
      this.panes = {};

      this.panes.files = new Files();

      Event.addListener("logout", this._logout.bind(this));

      this._setMode();
    },

    show: function() {
      if (localStorage.currentPane) {
        this.setPane(localStorage.currentPane);
      } else {
        this.setPane("files");
      }

      //this.showDrawer();
    },


    setPane: function(pane) {
      if (this.currentPane == pane)
        return;

      var paneobj = null;

      if (this.currentPane) {

        var paneobj = this.panes[this.currentPane];

        if (paneobj.hide) {
          paneobj.hide();
        }

        paneobj.afterHide();
      }

      paneobj = this.panes[pane];

      if (paneobj.show) {
        paneobj.show();
      }

      paneobj.afterShow();

      this.currentPane = pane;

      localStorage.currentPane = pane;
      Event.trigger("paneChanged", {
        pane: paneobj
      });
    },

    _logout: function() {
      delete localStorage.currentPane;
    },

    _setMode: function() {
      var element = document.getElementById("mode");

      if (window.gapi) {
        mode.classList.remove("offline");
      }
      else
      {
        mode.classList.add("offline");
      }
    }
  });

  return Main;

});