define(["event"], function(Event) {
  var Globals = function Globals() {
    this.init();
  };

  Globals.prototype = {
    init: function() {
    },

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
    }
  }

  return new Globals();
});