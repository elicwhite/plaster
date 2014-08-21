var i = new db.instance(db);
window.i = i;
i.load("0B9XIM4D3BWcWOU44bzVmNWJSd1k")
  .then(function(info) {
    i.getActions().then(function(actions) {
      console.log(actions);
      var promises = [];
      for (var i = 0; i < actions.length; i++) {
        for (var j = i + 1; j < actions.length; j++) {
          if (actions[i].id == actions[j].id) {
            console.log("repeat at", i, "/", j, actions[j]);
            promises.push(i.removeAction(j));
          }
        }
      }
      return Promise.all(promises);
    });
  });