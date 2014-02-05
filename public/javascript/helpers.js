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

    getCurveControlPoints: function(knots) {

      function getFirstControlPoints(rhs) {
        var n = rhs.length;
        var x = new Array(n); // Solution vector
        var tmp = new Array(n); // Temp workspace

        var b = 2.0;
        x[0] = rhs[0] / b;

        for (var i = 1; i < n; i++) { // Decomposition and forward substitution
          tmp[i] = 1 / b;
          b = (i < n - 1 ? 4 : 3.5) - tmp[i];
          x[i] = (rhs[i] - x[i - 1]) / b;
        }

        for (var i = 1; i < n; i++) {
          x[n - i - 1] -= tmp[n - i] * x[n - i]; // backsubstituion
        }

        return x;
      };


      var n = knots.length - 1;

      var firstControlPoints = [];
      var secondControlPoints = [];

      if (n < 1) {
        console.error("Must have at least two knots");
        return;
      }

      if (n == 1) {
        // Special case: should be a line
        firstControlPoints.push({});
        firstControlPoints[0].x = (2 * knots[0].x + knots[1].x) / 3;
        firstControlPoints[0].y = (2 * knots[0].y + knots[1].y) / 3;

        secondControlPoints.push({});
        secondControlPoints[0].x = 2 * firstControlPoints[0].x - knots[0].x;
        secondControlPoints[0].y = 2 * firstControlPoints[0].y - knots[0].y;

        return [{
          first: firstControlPoints[0],
          second: secondControlPoints[0]
        }];
      }

      // Calculate first Bezier control points
      // Right hand side vector
      var rhs = new Array(n);


      // Set right hand side X values
      for (var i = 1; i < n - 1; ++i) {
        rhs[i] = 4 * knots[i].x + 2 * knots[i + 1].x;
      }

      rhs[0] = knots[0].x + 2 * knots[1].x;
      rhs[n - 1] = (8 * knots[n - 1].x + knots[n].x) / 2;

      // Get first control points x-values
      var x = getFirstControlPoints(rhs);

      // Set right hand side Y values
      for (var i = 1; i < n - 1; ++i) {
        rhs[i] = 4 * knots[i].y + 2 * knots[i + 1].y;
      }

      rhs[0] = knots[0].y + 2 * knots[1].y;
      rhs[n - 1] = (8 * knots[n - 1].y + knots[n].y) / 2;

      // Get first control points Y-values
      var y = getFirstControlPoints(rhs);

      // Fill output arrays.
      firstControlPoints = new Array(n);
      secondControlPoints = new Array(n);

      for (var i = 0; i < n; ++i) {
        // First control point
        firstControlPoints[i] = {
          x: x[i],
          y: y[i]
        };

        // Second control point
        if (i < n - 1) {
          secondControlPoints[i] = {
            x: 2 * knots[i + 1].x - x[i + 1],
            y: 2 * knots[i + 1].y - y[i + 1]
          };
        } else {
          secondControlPoints[i] = {
            x: (knots[n].x + x[n - 1]) / 2,
            y: (knots[n].y + y[n - 1]) / 2
          };
        }
      }

      var controlPoints = new Array(n);
      for (var i = 0; i < n; ++i) {
        controlPoints[i] = {
          first: firstControlPoints[i],
          second: secondControlPoints[i]
        }
      }

      return controlPoints;
    },
  };
});