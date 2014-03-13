define([], function() {
  return {
    parentEleWithClassname: function(ele, className) {
      if (ele == null || !ele.classList) {
        return false;
      }

      if (ele.classList.contains(className)) {
        return ele;
      }

      return this.parentEleWithClassname(ele.parentNode, className);
    },


    screenToWorld: function(settings, x, y) {
      return {
        x: (x - settings.offsetX) / settings.scale,
        y: (y - settings.offsetY) / settings.scale
      };
    },

    worldToScreen: function(settings, x, y) {
      return {
        x: (x) * settings.scale + settings.offsetX,
        y: (y) * settings.scale + settings.offsetY
      };
    },

    getGuid: function() {
      return "T^" + Date.now() + "" + Math.round(Math.random() * 1000000);
    },

    isLocalGuid: function(id) {
      return id.indexOf("T^") === 0;
    },

    clone: function(obj) {
      var newObj = {};
      for (var prop in obj) {
        newObj[prop] = obj[prop];
      }

      return newObj;
    },

    cloneArray: function(array) {
      var arr = array.slice(0);
      
      for (var i = 0; i < array.length; i++) {
        if (typeof(array[i]) == "object") {
          //recursion
          arr[i] = this.cloneArray(array[i]);
        }
      }
      return arr;
    },
  };
});