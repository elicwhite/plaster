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

    getFirstControlPoints: function(rhs) {
      var n = rhs[0].length;
      
      // Temp workspace
      var tmp = new Array(n);

      //tmp[0] = 1 / 2.0;

      var b = 2.0;

      rhs[0][0] /= b;
      rhs[1][0] /= b;

      for (var i = 1; i < n; i++) { // Decomposition and forward substitution
        tmp[i] = 1 / b;

        if (i < n - 1) {
          b = 4 - tmp[i];
        } else {
          b = 3.5 - tmp[i];
        }

        rhs[0][i] -= rhs[0][i - 1];
        rhs[0][i] /= b;

        
        rhs[1][i] -= rhs[1][i - 1];
        rhs[1][i] /= b;
      }


      for (var i = n - 1; i >= 0; i--) {
        rhs[0][i - 1] -= tmp[i] * rhs[0][i];
        rhs[1][i - 1] -= tmp[i] * rhs[1][i];
      }

      //return rhs;
    },

    getCurveControlPoints: function(knots) {

      var n = knots.length - 1;

      var controlPoints = new Array(n);

      if (n < 1) {
        console.error("Must have at least two knots");
        return;
      }

      if (n == 1) {
        // Special case: should be a line
        var firstControlPoint = [
          (2 * knots[0][0] + knots[1][0]) / 3, (2 * knots[0][1] + knots[1][1]) / 3
        ];

        var secondControlPoint = [
          2 * firstControlPoint[0] - knots[0][0],
          2 * firstControlPoint[1] - knots[0][1]
        ];

        return [[
          firstControlPoint,
          secondControlPoint
        ]];
      }

      var rhs = new Array(2);
      rhs[0] = new Array(n);
      rhs[1] = new Array(n);

      // Calculate first Bezier control points
      // Right hand side vector


      // Set right hand side X and Y values
      rhs[0][0] = knots[0][0] + 2 * knots[1][0];
      rhs[1][0] = knots[0][1] + 2 * knots[1][1];

      for (var i = 1; i < n - 1; ++i) {
        rhs[0][i] = 4 * knots[i][0] + 2 * knots[i + 1][0];
        rhs[1][i] = 4 * knots[i][1] + 2 * knots[i + 1][1];
      }

      rhs[0][n - 1] = (8 * knots[n - 1][0] + knots[n][0]) / 2;
      rhs[1][n - 1] = (8 * knots[n - 1][1] + knots[n][1]) / 2;


      // Get first control points x-values
      var firstControlPoints = this.getFirstControlPoints(rhs);

      for (var i = 0; i < n; ++i) {
        controlPoints[i] = new Array(2);

        // First control point
        controlPoints[i][0] = [
          rhs[0][i],
          rhs[1][i]
        ];

        // Second control point
        if (i < n - 1) {
          controlPoints[i][1] = [
            2 * knots[i + 1][0] - rhs[0][i + 1],
            2 * knots[i + 1][1] - rhs[1][i + 1]
          ];
        } else {
          controlPoints[i][1] = [
            (knots[n][0] + rhs[0][n - 1]) / 2, (knots[n][1] + rhs[1][n - 1]) / 2
          ];
        }
      }


      return controlPoints;
    },

    recalculateControlPoints: function() {

    },


  };
});