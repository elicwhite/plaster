var assert = buster.assert;
var refute = buster.refute;

// Syn attaches to window, so ignore the loaded variable from it
define(['promise', 'tests/vendor/customEventPolyfill', 'tests/vendor/syn', 'tapHandler'], function(Promise, Polyfill, s, TapHandler) {
  if (!window.Promise) {
    window.Promise = Promise;
  }

  buster.testCase("TapHandler", {
    setUp: function() {
      /*:DOC element = <div id="box" class="foo" style="width: 400px; height: 400px;"></div>*/
      document.body.appendChild(this.element);

      this.clock = this.useFakeTimers();

      this.dispatch = function(type, obj) {
        var e = document.createEvent('UIEvent');
        e.initUIEvent(type, true, true, document.defaultView);

        Object.defineProperty(e, "timeStamp", {
          get: function() {
            return Date.now();
          }
        });

        for (var prop in obj) {
          e[prop] = obj[prop];
        }

        this.element.dispatchEvent(e);
      }
    },

    tearDown: function() {
      this.element.remove();

      if (this.handler) {
        this.handler.clear();
      }

      this.clock.restore();
    },

    "dispatching event works (browser sanity check)": function(done) {
      this.element.addEventListener("mousedown", function(e) {
        assert.isObject(e);
        assert.equals(e.clientX, 30);
        assert.equals(e.clientY, 40);

        done();
      });

      this.dispatch('mousedown', {
        'clientX': 30,
        'clientY': 40
      });
    },

    "mouse": {

      setUp: function() {
        this.doClick = function() {
          this.dispatch('mousedown', {
            clientX: 10,
            clientY: 10
          });

          this.clock.tick(50);

          this.dispatch('mousemove', {
            clientX: 11,
            clientY: 10
          });

          this.clock.tick(50);

          this.dispatch('mouseup', {
            clientX: 11,
            clientY: 10
          });
        };

        this.propsMatch = function(e, x, y) {
          assert.equals(e.x, x);
          assert.equals(e.y, y);
        }
      },

      "mousedown calls start": function() {
        var startSpy = this.spy();

        this.handler = new TapHandler(this.element, {
          start: startSpy
        });

        this.dispatch('mousedown', {
          clientX: 10,
          clientY: 10
        });

        assert.calledOnce(startSpy);
      },

      "start gives x and y": function() {
        var start = (function(e) {
          this.propsMatch(e, 10, 10);
        }).bind(this);

        this.handler = new TapHandler(this.element, {
          start: start
        });

        this.dispatch('mousedown', {
          clientX: 10,
          clientY: 10
        });
      },

      "calling start and end in the same place calls all three": function() {
        var startSpy = this.spy();
        var endSpy = this.spy();
        var tapSpy = this.spy();

        this.handler = new TapHandler(this.element, {
          start: startSpy,
          end: endSpy,
          tap: tapSpy,
        });

        this.doClick();

        assert.calledOnce(startSpy);
        assert.calledOnce(endSpy);
        assert.calledOnce(tapSpy);
      },

      "tap caled before end": function() {
        var endSpy = this.spy();
        var tapSpy = this.spy();

        this.handler = new TapHandler(this.element, {
          end: endSpy,
          tap: tapSpy,
        });

        this.doClick();

        assert.isTrue(tapSpy.calledBefore(endSpy));
      }
    },

    "touch": {
      setUp: function() {
        this.eObj = {
          touches: [{
            clientX: 5,
            clientY: 5,
            identifier: 0
          }]
        };

        this.doTap = function() {
          this.dispatch('touchstart', this.eObj);
          this.clock.tick(50);
          this.dispatch('touchend', this.eObj);
        }

        this.propsMatch = function(e, x, y) {
          assert.equals(e.x, x);
          assert.equals(e.y, y);
        }
      },

      "touchstart calls start": function() {
        var startSpy = this.spy();

        this.handler = new TapHandler(this.element, {
          start: startSpy
        });

        this.dispatch('touchstart', this.eObj);

        assert.calledOnce(startSpy);
      },

      "start gives x and y": function() {
        var start = (function(e) {
          this.propsMatch(e, 5, 5);
        }).bind(this);

        this.handler = new TapHandler(this.element, {
          start: start
        });

        this.dispatch('touchstart', this.eObj);
      },
    }


  });
});