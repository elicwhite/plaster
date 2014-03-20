define(["dataLayer/indexedDBBacking", "dataLayer/webSQLBacking"], function(IndexedDBBacking, WebSQLBacking) {

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

    createAction: function(id) {
      return {
        id: id,
        type: "stroke",
        value: {
          points: [
            [2, 4]
          ],
          width: 2,
          lockWidth: true, // should the width stay the same regardless of zoom
          color: "#ccc"
        }
      };
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
      return "Draw-" + Date.now() + Math.round((Math.random() * 100000));
    },
    
    clone: function(obj) {
      var newObj = {};
      for (var prop in obj) {
        newObj[prop] = obj[prop];
      }

      return newObj;
    },
  };

  return BackingHelpers;

});