define([], function() {
  return {
    isiOS: function() {
      return this.getDeviceType().contains("iOS");
    },

    isPC: function() {
      return this.getDeviceType().contains("PC");
    },

    isMac: function() {
      return this.getDeviceType().contains("Mac");
    },

    getDeviceType: function() {
      if (localStorage.deviceType) {
        //return JSON.parse(localStorage.deviceType);
      }

      var devices = [];
      var userAgent = navigator.userAgent;

      if (userAgent.match(/OS 7/g)) {
        devices.push("iOS");

        if (userAgent.match(/iPad/g)) {
          devices.push("iPad");
          devices.push("tablet");
        }
        else if (userAgent.match(/iPhone/g)) {
          devices.push("iPhone");
          devices.push("phone");
        }
      }
      else if (userAgent.match(/Mac/g)) {
        devices.push("Mac");
        devices.push("computer");
      }
      else
      {
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
});