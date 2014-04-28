var assert = buster.assert;
var refute = buster.refute;

// Syn attaches to window, so ignore the loaded variable from it
define(['promise', 'tests/vendor/syn', 'tapHandler'], function(Promise, s, TapHandler) {
  if (!window.Promise) {
    window.Promise = Promise;
  }

  buster.testCase("TapHandler", {
    setUp: function() {
      /*:DOC element = <div id="box" class="foo" style="width: 400px; height: 400px; position: absolute; top: 4px; left: 2px;"></div>*/
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

    "events fired": {
      setUp: function() {
        this.props = {
          clientX: 10,
          clientY: 10
        }

        this.createTouch = function() {
          this.props.identifier = 1;

          return {
            touches: [this.props]
          };
        }
      },

      "down calls start": {
        setUp: function() {
          this.startSpy = this.spy();

          this.handler = new TapHandler(this.element, {
            start: this.startSpy
          });
        },

        tearDown: function() {
          assert.calledOnce(this.startSpy);
        },

        "mouse": function() {
          this.dispatch('mousedown', this.props);
        },

        "touch": function() {
          this.dispatch('touchstart', this.createTouch());
        }
      },

      "calling start and end triggers tap": {
        setUp: function() {
          this.startSpy = this.spy();
          this.endSpy = this.spy();
          this.tapSpy = this.spy();

          this.handler = new TapHandler(this.element, {
            start: this.startSpy,
            end: this.endSpy,
            tap: this.tapSpy,
          });
        },

        tearDown: function() {
          assert.calledOnce(this.startSpy);
          assert.calledOnce(this.endSpy);
          assert.calledOnce(this.tapSpy);
        },

        "mouse": function() {
          this.dispatch('mousedown', this.props);
          this.dispatch('mouseup', this.props);
        },

        "touch": function() {
          var touch = this.createTouch();

          this.dispatch('touchstart', touch);
          touch.touches.length = 0;
          this.dispatch('touchend', touch);
        }
      },

      "tap called before end": {
        setUp: function() {
          this.endSpy = this.spy();
          this.tapSpy = this.spy();

          this.handler = new TapHandler(this.element, {
            end: this.endSpy,
            tap: this.tapSpy,
          });
        },

        tearDown: function() {
          assert.isTrue(this.tapSpy.calledBefore(this.endSpy));
        },

        "mouse": function() {
          this.dispatch('mousedown', this.props);
          this.dispatch('mouseup', this.props);
        },

        "touch": function() {
          var touch = this.createTouch();

          this.dispatch('touchstart', touch);
          touch.touches.length = 0;
          this.dispatch('touchend', touch);
        }
      },

      "calling start and end with pause does not triggers tap": {
        setUp: function() {
          this.tapSpy = this.spy();

          this.handler = new TapHandler(this.element, {
            tap: this.tapSpy,
          });
        },

        tearDown: function() {
          assert.isFalse(this.tapSpy.called);
        },

        "mouse": function() {
          this.dispatch('mousedown', this.props);
          this.clock.tick(1000);
          this.dispatch('mouseup', this.props);
        },

        "touch": function() {
          var touch = this.createTouch();

          this.dispatch('touchstart', touch);
          this.clock.tick(1000);
          touch.touches.length = 0;
          this.dispatch('touchend', touch);
        }
      },

      "multi touch": {
        setUp: function() {
          this.touch1Props = {
            clientX: 5,
            clientY: 5,
            identifier: 0
          };

          this.touch2Props = {
            clientX: 10,
            clientY: 10,
            identifier: 1
          };

          this.noTouch = {
            touches: []
          }

          this.touch1 = {
            touches: [this.touch1Props]
          };

          this.touch2 = {
            touches: [this.touch1Props, this.touch2Props]
          };

        },

        "without gestures": {
          "end is called after starting touch is up": {
            setUp: function() {
              this.endSpy = this.spy();
              this.handler = new TapHandler(this.element, {
                end: this.endSpy,
              });

              this.handler.ignoreGestures(true);

              this.dispatch('touchstart', this.touch1);
              this.dispatch('touchstart', this.touch2);
            },

            "start touch up last": function() {
              this.dispatch('touchend', this.touch1);
              assert.isFalse(this.endSpy.called);
              this.dispatch('touchend', this.noTouch);

              assert.isTrue(this.endSpy.called);
            },

            "start touch up first": function() {
              this.touch1Props.identifier = 1;

              this.dispatch('touchend', this.touch1);
              assert.isTrue(this.endSpy.called);
              this.dispatch('touchend', this.noTouch);
              assert.calledOnce(this.endSpy);
            },
          },
        },

        "with gestures": {
          "two touches calls end then gesture start": function() {
            var endSpy = this.spy();
            var gestureStartSpy = this.spy();

            this.handler = new TapHandler(this.element, {
              end: endSpy,
              gestureStart: gestureStartSpy
            });

            this.dispatch('touchstart', this.touch1);
            this.dispatch('touchstart', this.touch2);

            assert.calledOnce(endSpy);
            assert.calledOnce(gestureStartSpy);
            assert.isTrue(endSpy.calledBefore(gestureStartSpy));
          },

          "moved touch in gesture calls gesture changed": function() {
            var gestureChangedSpy = this.spy();

            this.handler = new TapHandler(this.element, {
              gesture: gestureChangedSpy
            });

            this.dispatch('touchstart', this.touch1);
            this.dispatch('touchstart', this.touch2);

            this.touch2.touches[0].clientX = 5;

            assert.isFalse(gestureChangedSpy.called);
            this.dispatch('touchmove', this.eObj2);
            assert.isTrue(gestureChangedSpy.called);
          },

          "gesture end is called when one touch left": function() {
            var gestureEndSpy = this.spy();

            this.handler = new TapHandler(this.element, {
              gestureEnd: gestureEndSpy,
            });

            this.dispatch('touchstart', this.touch1);
            this.dispatch('touchstart', this.touch2);
            this.dispatch('touchend', this.touch1);

            assert.calledOnce(gestureEndSpy);
          },

          "touch after gesture is not gesture": function() {
            var gestureChangedSpy = this.spy();
            var moveedSpy = this.spy();

            this.handler = new TapHandler(this.element, {
              move: moveedSpy,
              gesture: gestureChangedSpy
            });

            // do a gesture
            this.dispatch('touchstart', this.touch1);
            this.dispatch('touchstart', this.touch2);
            this.dispatch('touchend', this.touch1);
            this.dispatch('touchend', this.noTouch);

            // try a touch
            this.dispatch('touchstart', this.touch1);
            this.touch1.clientX = 3;

            assert.isFalse(moveedSpy.called);
            this.dispatch('touchmove', this.touch1);
            assert.isTrue(moveedSpy.called);
            this.dispatch('touchend', this.touch1);
          }
        }
      }
    },

    "correct values": {
      setUp: function() {
        this.props = {
          clientX: 10,
          clientY: 10
        }

        this.createTouch = function() {
          this.props.identifier = 1;

          return {
            touches: [this.props]
          };
        }

        this.xAndYMatch = function(e, x, y) {
          assert.equals(e.x, x);
          assert.equals(e.y, y);
        }

        this.distFromElement = function(e, x, y) {
          // These are set in the doc element added in the tests
          assert.equals(e.distFromLeft, x - 2);
          assert.equals(e.distFromTop, y - 4);
        }
      },

      "start gives loc and offset": {
        setUp: function() {
          var start = (function(e) {
            this.xAndYMatch(e, 10, 10);
            this.distFromElement(e, 10, 10);
          }).bind(this);

          this.handler = new TapHandler(this.element, {
            start: start
          });
        },

        "mouse": function() {
          this.dispatch('mousedown', this.props);
        },

        "touch": function() {
          this.dispatch('touchstart', this.createTouch());
        }
      },

      "move gives loc, offset, change, fromStart": {
        setUp: function() {
          var move = (function(e) {
            this.xAndYMatch(e, 11, 9);
            this.distFromElement(e, 11, 9);

            assert.equals(e.xFromLast, 1);
            assert.equals(e.yFromLast, -1);

            assert.equals(e.distFromStartX, 1);
            assert.equals(e.distFromStartY, -1);
          }).bind(this);

          this.handler = new TapHandler(this.element, {
            move: move
          });
        },

        "mouse": function() {
          this.dispatch('mousedown', this.props);

          this.props.clientX++;
          this.props.clientY--;

          this.dispatch('mousemove', this.props);
        },

        "touch": function() {
          this.dispatch('touchstart', this.createTouch());

          this.props.clientX++;
          this.props.clientY--;

          this.dispatch('touchmove', this.createTouch());
        }
      },

      "second move gives updated fromLast and fromStart": {
        setUp: function() {
          var called = 0;
          var move = (function(e) {
            called++;

            if (called !== 2) {
              return;
            }

            this.xAndYMatch(e, 12, 8);
            this.distFromElement(e, 12, 8);

            assert.equals(e.xFromLast, 1);
            assert.equals(e.yFromLast, -1);

            assert.equals(e.distFromStartX, 2);
            assert.equals(e.distFromStartY, -2);
          }).bind(this);

          this.handler = new TapHandler(this.element, {
            move: move
          });
        },

        "mouse": function() {
          this.dispatch('mousedown', this.props);

          this.props.clientX++;
          this.props.clientY--;

          this.dispatch('mousemove', this.props);

          this.props.clientX++;
          this.props.clientY--;

          this.dispatch('mousemove', this.props);
        },

        "touch": function() {
          this.dispatch('touchstart', this.createTouch());

          this.props.clientX++;
          this.props.clientY--;

          this.dispatch('touchmove', this.createTouch());

          this.props.clientX++;
          this.props.clientY--;

          this.dispatch('touchmove', this.createTouch());
        }
      },
    }
  });
});