define(["dataLayer/indexedDBBacking", "dataLayer/webSQLBacking", "bezierCurve"], function(IndexedDBBacking, WebSQLBacking, BezierCurve) {

  var BackingHelpers = {
    indexify: function(actions, startIndex) {
      var items = [];
      // put indexes on the items
      for (var i = 0; i < actions.length; i++) {
        var item = actions[i];
        item.index = i + startIndex;
        items.push(item);
      }

      return items;
    },

    createAction: function(id, noControlPoints) {
      var stroke = {
        id: id,
        type: "stroke",
        value: {
          points: [
            [2, 4],
            [4, 2]
          ],
          width: 2,
          lockWidth: true,
          color: "#ccc"
        }
      };

      if (!noControlPoints) {
        var controlPoints = this.cloneArray(BezierCurve.getCurveControlPoints(stroke.value.points));
        stroke.value.controlPoints = controlPoints;
      }

      return stroke;
    },

    createBacking: function() {
      var name = this.randomName();
      if ("indexedDB" in window) {
        return new IndexedDBBacking(name);
      } else {
        return new WebSQLBacking(name);
      }
    },

    randomName: function() {
      return "T^" + Date.now() + "" + Math.round(Math.random() * 1000000);
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

  return BackingHelpers;

});