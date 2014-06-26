
var i = new db.instance(db);
window.i = i;
i.load("0B9XIM4D3BWcWRHpGa1pwRGtYa1k")
i.getActions().then(function(actions) {
  // var promises = [];
  for (var i = 0; i < actions.length; i++) {
    for (var j = i + 1; j < actions.length; j++) {
      if (actions[i].id == actions[j].id) {
        console.log("repeat at", i, "/", j, actions[j]);
        //promises.push(i.removeAction(j));
      }
    }
  }
  // return Promise.all(promises);
});