gapi.drive.realtime.load("0B9XIM4D3BWcWOU44bzVmNWJSd1k", function(doc) {
  var root = doc.getModel().getRoot();

  var actions = root.get('actions');


  for (var i = 0; i < actions.length; i++) {
    for (var j = i + 1; j < actions.length; j++) {
      if (actions.get(i).id == actions.get(j).id) {
        console.log("repeat at", i, "/", j, actions.get(j));
        actions.remove(j);
        // promises.push(i.removeAction(j));
      }
    }
  }
  console.log("done");
});

// i.load("0B9XIM4D3BWcWOU44bzVmNWJSd1k")
//   .then(function(info) {
//     i.getActions().then(function(actions) {
//       console.log(actions);
//       var promises = [];
//       for (var i = 0; i < actions.length; i++) {
//         for (var j = i + 1; j < actions.length; j++) {
//           if (actions[i].id == actions[j].id) {
//             console.log("repeat at", i, "/", j, actions[j]);
//             promises.push(i.removeAction(j));
//           }
//         }
//       }
//       return Promise.all(promises);
//     });
//   });

// 0B9XIM4D3BWcWOU44bzVmNWJSd1k reddit 1010 lines 37163 to 6068 84% reduction
// 0Bw_qLfK5fXvYMXNSVlhodl9wSzg hackernews 20 lines: 101 / 1093

// 0B9XIM4D3BWcWNmRobUtEWTFJSUU offline 132 lines 1157/2814 59%
// 0Bw_qLfK5fXvYRGpfRUI2NU5oWGc tictactoe 159 lines 1235 / 6744

// This is an offline file 132 lines 1157 to 1157 0% reduction
// Untitled File 0 lines 0 to 0 NaN% reduction
// Tic tac toe 159 lines 1235 to 1235 0% reduction
// Hacker News Drawing 20 lines 1093 to 99 91% reduction
// This is an offline file 8 lines 244 to 60 75% reduction
// Untitled File 20 lines 2741 to 227 92% reduction
// This is an offline file 9 lines 270 to 65 76% reduction
// Bikini Bottom Dinosaur 1010 lines 6068 to 6068 0% reduction
// a16z intro  8 lines 653 to 41 94% reduction
// Greylock Intro 13 lines 1228 to 140 89% reduction
// Geekwire Demo 19 lines 554 to 126 77% reduction
// Launch Document 27 lines 1237 to 194 84% reduction
// Ui 541 lines 19895 to 3108 84% reduction
// Reddit HTML5 Drawing 632 lines 43046 to 4659 89% reduction
// Online/login 327 lines 4799 to 2028 58% reduction
// Hacker News Drawing 20 lines 101 to 101 0% reduction

function simplifyFile(fileId) {
  return new Promise(function(resolve, reject) {
    gapi.drive.realtime.load(fileId, function(doc) {
      var root = doc.getModel().getRoot();
      window.root = root;



      var actions = root.get('actions').asArray();
      var startLength = 0;

      for (var i = 0; i < actions.length; i++) {
        startLength += actions[i].value.points.length;
      }

      var lines = root.get('actions').length;

      var newLength = 0;

      for (var j = 0; j < root.get('actions').length; j++) {

        var line = root.get('actions').get(j);

        var points = line.value.points;

        var bounds = {
          left: points[0][0],
          top: points[0][1],
          right: points[0][0],
          bottom: points[0][1]
        };

        for (i = 1; i < points.length; i++) {
          bounds.left = Math.min(points[i][0], bounds.left);
          bounds.top = Math.min(points[i][1], bounds.top);
          bounds.right = Math.max(points[i][0], bounds.right);
          bounds.bottom = Math.max(points[i][1], bounds.bottom);
        }

        var epsilon = ((bounds.bottom - bounds.top) + (bounds.right - bounds.left)) / 2 / 20;

        var newPoints = Smooth(points, epsilon);
        newLength += newPoints.length;

        line.value.points = newPoints;

        root.get('actions').set(j, line);
      }

      console.log(root.get('title'), lines, "lines", startLength, "to", newLength, Math.round(100 - (newLength / startLength) * 100) + "% reduction");
      resolve();
    });
  });
}

db.getFiles().then(function(files) {
  console.log("Simplifying", files.length, "files");

  return Promise.all(files.map(function(file) {
    return simplifyFile(file.id);
  }));
}).then(null, function(error) {
  console.error(error);
})
.then(function() {
  console.log("Complete");
});

