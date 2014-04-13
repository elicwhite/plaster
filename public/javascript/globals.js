define(["event"], function(Event) {
  var Globals = function Globals() {
    this.init();
    window.g = this;
  };

  Globals.prototype = {
    init: function() {},

    isiOS: function() {
      return this.hasDeviceType("iOS");
    },

    isPC: function() {
      return this.hasDeviceType("PC");
    },

    isMac: function() {
      return this.hasDeviceType("Mac");
    },

    isComputer: function() {
      return this.hasDeviceType("computer");
    },

    isPhone: function() {
      return this.hasDeviceType("phone");
    },

    isTablet: function() {
      return this.hasDeviceType("tablet");
    },

    hasDeviceType: function(type) {
      return this.getDeviceType().indexOf(type) !== -1;
    },

    getDeviceType: function() {
      if (localStorage.deviceType) {
        //return JSON.parse(localStorage.deviceType);
      }

      var devices = [];
      var userAgent = navigator.userAgent;

      if (userAgent.match(/iPad/g)) {
        devices.push("iOS");
        devices.push("iPad");
        devices.push("tablet");
      } else if (userAgent.match(/iPhone/g)) {
        devices.push("iOS");
        devices.push("iPhone");
        devices.push("phone");
      } else if (userAgent.match(/Mac/g)) {
        devices.push("Mac");
        devices.push("computer");
      } else if (userAgent.match(/Android/g)) {
        devices.push("Android");

        if (userAgent.match(/Mobile/g)) {
          devices.push("phone");
        } else {
          devices.push("tablet");
        }
      } else {
        devices.push("PC");
        devices.push("computer");
      }

      localStorage.deviceType = JSON.stringify(devices);

      return devices;
    },

    setHTMLDevices: function() {
      var devices = this.getDeviceType();

      var body = document.body;
      body.className = devices.join(" ");
    },

    getStylesheet: function() {
      var index = 0;

      for (var i = 0; i < document.styleSheets.length; i++) {
        if (document.styleSheets[i].href.indexOf("total.css")) {
          index = i;
          break;
        }
      }

      return document.styleSheets[index];
    },

    getStylesheetRules: function() {
      var stylesheet = this.getStylesheet();
      if (!stylesheet) {
        return {};
      }

      var rules = stylesheet.cssRules || stylesheet.rules;

      return rules;
    },

    getCSSVars: function() {
      var rules = this.getStylesheetRules();

      var lastRule = rules[rules.length - 1];
      var noQuotes = this.removeQuotes(lastRule.style.content);
      return JSON.parse(noQuotes);
    },

    removeQuotes: function(string) {
      if (typeof string === 'string' || string instanceof String) {
        string = string.replace(/^['"]+|\s+|\\|(;\s?})+|['"]$/g, '');
      }
      return string;
    }
  }

  return new Globals();
});