define([], function() {

  var Helpers = {
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
    }
  };

  return Helpers;

});