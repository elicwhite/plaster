var assert = buster.assert;
var refute = buster.refute;

// Syn attaches to window, so ignore the loaded variable from it
define(['promise', 'tests/vendor/syn', 'tapHandler'], function(Promise, s, TapHandler) {
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

    "events fired": {

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
        },

        "pause between down and up doesnt call tap": function() {
          var tapSpy = this.spy();

          this.handler = new TapHandler(this.element, {
            tap: tapSpy,
          });

          this.dispatch('mousedown', {
            clientX: 10,
            clientY: 10
          });

          this.clock.tick(1000);

          this.dispatch('mouseup', {
            clientX: 10,
            clientY: 10
          });

          assert.isFalse(tapSpy.called);
        }
      },

      "touch": {
        setUp: function() {
          this.touch = {
            clientX: 5,
            clientY: 5,
            identifier: 0
          };

          this.eObj = {
            touches: [this.touch]
          };

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

        "pause between down and up doesnt call tap": function() {
          var tapSpy = this.spy();

          this.handler = new TapHandler(this.element, {
            tap: tapSpy,
          });

          this.dispatch('touchstart', this.eObj);
          this.clock.tick(1000);
          this.dispatch('touchend', this.eObj);

          assert.isFalse(tapSpy.called);
        },

        "multitouch": {
          setUp: function() {
            this.touch2 = {
              clientX: 10,
              clientY: 10,
              identifier: 1
            };

            this.eObj2 = {
              touches: [this.touch, this.touch2]
            };
          },

          "without gestures": {
            "end is called after starting touch is up last": function() {
              var endSpy = this.spy();
              this.handler = new TapHandler(this.element, {
                end: endSpy,
              });

              this.handler.ignoreGestures(true);

              this.dispatch('touchstart', this.eObj);
              this.dispatch('touchstart', this.eObj2);

              this.dispatch('touchend', this.eObj);
              assert.isFalse(endSpy.called);
              this.dispatch('touchend', {
                touches: []
              });

              assert.isTrue(endSpy.called);
            },

            "end is called after starting touch is up first": function() {
              var endSpy = this.spy();
              this.handler = new TapHandler(this.element, {
                end: endSpy,
              });

              this.handler.ignoreGestures(true);

              // starting with id 0
              this.dispatch('touchstart', this.eObj);
              // then id 1
              this.dispatch('touchstart', this.eObj2);

              // end id 0 by only telling it about id 1
              this.touch.identifier = 1;

              this.dispatch('touchend', this.eObj);
              assert.isTrue(endSpy.called);

              this.dispatch('touchend', {
                touches: []
              });

              assert.calledOnce(endSpy);
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

              this.dispatch('touchstart', this.eObj);
              this.dispatch('touchstart', this.eObj2);

              assert.calledOnce(endSpy);
              assert.calledOnce(gestureStartSpy);
              assert.isTrue(endSpy.calledBefore(gestureStartSpy));
            },

            "moved touch in gesture calls gesture changed": function() {
              var gestureChangedSpy = this.spy();

              this.handler = new TapHandler(this.element, {
                gesture: gestureChangedSpy
              });

              this.dispatch('touchstart', this.eObj);
              this.dispatch('touchstart', this.eObj2);

              this.eObj2.touches[0].clientX = 5;

              assert.isFalse(gestureChangedSpy.called);
              this.dispatch('touchmove', this.eObj2);
              assert.isTrue(gestureChangedSpy.called);
            },

            "gesture end is called when one touch left": function() {
              var gestureEndSpy = this.spy();

              this.handler = new TapHandler(this.element, {
                gestureEnd: gestureEndSpy,
              });

              this.dispatch('touchstart', this.eObj);
              this.dispatch('touchstart', this.eObj2);
              this.dispatch('touchend', this.eObj);

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
              this.dispatch('touchstart', this.eObj);
              this.dispatch('touchstart', this.eObj2);
              this.dispatch('touchend', this.eObj);
              this.dispatch('touchend', {
                touches: []
              });

              // try a touch
              this.dispatch('touchstart', this.eObj);
              this.touch.clientX = 3;

              assert.isFalse(moveedSpy.called);
              this.dispatch('touchmove', this.eObj);
              assert.isTrue(moveedSpy.called);
              this.dispatch('touchend', this.eObj);
            }
          }
        }
      }
    },

    "correct values": {
      setUp: function() {
        this.propsMatch = function(e, x, y) {
          assert.equals(e.x, x);
          assert.equals(e.y, y);
        }
      },

      "mouse": {
        "move gives x and y": function() {
          var move = (function(e) {
            this.propsMatch(e, 15, 15);
          }).bind(this);

          this.handler = new TapHandler(this.element, {
            move: move
          });

          this.dispatch('mousedown', {
            clientX: 10,
            clientY: 10
          });

          this.dispatch('mousemove', {
            clientX: 15,
            clientY: 15
          });
        },
      },

      "touch": {
        setUp: function() {
          this.touch = {
            clientX: 5,
            clientY: 5,
            identifier: 0
          };

          this.eObj = {
            touches: [this.touch]
          };
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
    }
  });
});