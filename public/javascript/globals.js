define([], function() {
  return {
    isiOS: function() {
      return navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false;
    },

    isPC: function() {
      return this.getDeviceType() == "PC";
    },

    isMac: function() {
      return this.getDeviceType() == "Mac";
    },

    getDeviceType: function() {
      if (localStorage.deviceType) {
        return localStorage.deviceType;
      }

      var deviceType = "PC";

      var userAgent = navigator.userAgent;
      if (userAgent.match(/iPad/g)) {
        deviceType = "iPad";
      }
      else if (userAgent.match(/Mac/g)) {
        deviceType = "Mac";
      }

      localStorage.deviceType = deviceType;

      return deviceType;
    }


  }
});