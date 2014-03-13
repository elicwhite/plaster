define([], function() {

  function BezierCurve() {
    this.init();
  }

  BezierCurve.prototype = {
    _rhs: null,
    _controlPoints: null,
    _tmp: null,

    init: function() {
      this._rhs = [
        [],
        []
      ];
      this._controlPoints = [];
      this._tmp = [];
    },

    getCurveControlPoints: function(knots) {
      var n = knots.length - 1;

      // Add space to our working arrays or make them shorter if needed
      this._rhs[0].length = n;
      this._rhs[1].length = n;
      this._controlPoints.length = n;
      this._tmp.length = n;

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

      // Calculate first Bezier control points
      // Right hand side vector

      // Set right hand side X and Y values
      this._rhs[0][0] = knots[0][0] + 2 * knots[1][0];
      this._rhs[1][0] = knots[0][1] + 2 * knots[1][1];

      for (var i = 1; i < n - 1; ++i) {
        this._rhs[0][i] = 4 * knots[i][0] + 2 * knots[i + 1][0];
        this._rhs[1][i] = 4 * knots[i][1] + 2 * knots[i + 1][1];
      }

      this._rhs[0][n - 1] = (8 * knots[n - 1][0] + knots[n][0]) / 2;
      this._rhs[1][n - 1] = (8 * knots[n - 1][1] + knots[n][1]) / 2;


      // Get first control points x-values
      this.getFirstControlPoints(this._rhs);

      for (var i = 0; i < n; ++i) {
        this._controlPoints[i] = new Array(2);

        // First control point
        this._controlPoints[i][0] = [
          this._rhs[0][i],
          this._rhs[1][i]
        ];

        // Second control point
        if (i < n - 1) {
          this._controlPoints[i][1] = [
            2 * knots[i + 1][0] - this._rhs[0][i + 1],
            2 * knots[i + 1][1] - this._rhs[1][i + 1]
          ];
        } else {
          this._controlPoints[i][1] = [
            (knots[n][0] + this._rhs[0][n - 1]) / 2, (knots[n][1] + this._rhs[1][n - 1]) / 2
          ];
        }
      }


      return this._controlPoints;

    },

    getFirstControlPoints: function() {
      var n = this._rhs[0].length;

      // Temp workspace
      var b = 2.0;

      this._rhs[0][0] /= b;
      this._rhs[1][0] /= b;

      for (var i = 1; i < n; i++) { // Decomposition and forward substitution
        this._tmp[i] = 1 / b;

        if (i < n - 1) {
          b = 4 - this._tmp[i];
        } else {
          b = 3.5 - this._tmp[i];
        }

        this._rhs[0][i] -= this._rhs[0][i - 1];
        this._rhs[0][i] /= b;


        this._rhs[1][i] -= this._rhs[1][i - 1];
        this._rhs[1][i] /= b;
      }


      for (var i = n - 1; i >= 0; i--) {
        this._rhs[0][i - 1] -= this._tmp[i] * this._rhs[0][i];
        this._rhs[1][i - 1] -= this._tmp[i] * this._rhs[1][i];
      }
    },

  }

  return BezierCurve;

});