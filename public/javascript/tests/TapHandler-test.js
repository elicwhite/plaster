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

      this.getEvent = function(obj) {
        obj.timeStamp = Date.now();

        return obj;
      }

      this.doTap = function() {
        this.handler._start(this.getEvent({
          clientX: 10,
          clientY: 10
        }));

        this.clock.tick(500);

        this.handler._move(this.getEvent({
          clientX: 11,
          clientY: 10
        }));

        this.clock.tick(500);

        this.handler._end(this.getEvent({
          clientX: 11,
          clientY: 10
        }));
      }
    },

    tearDown: function() {
      this.element.remove();

      if (this.handler) {
        this.handler.clear();
      }

      this.clock.restore();
    },

    "bah": function() {
      var a = document.createEvent("UIEvent");
      a.initUIEvent("mousedown", true, true, document.defaultView);
      document.addEventListener("mousedown", function(e) { console.log("rec", e); });
      document.dispatchEvent(a)

      function UIEvent(e) {
        this.prototype = {};
        for (var prop in e) {
          this[prop] = e[prop];
        }

        return this;
      }
    }

    "mousedown calls start": function() {
      var startSpy = this.spy();

      this.handler = new TapHandler(this.element, {
        start: startSpy
      });

      this.handler._start(this.getEvent({
        clientX: 10,
        clientY: 10
      }));

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

      this.doTap();

      assert.calledOnce(startSpy);
      assert.calledOnce(endSpy);
      assert.calledOnce(tapSpy);
    },

    "//tap caled before end": function() {
      var startSpy = this.spy();
      var endSpy = this.spy();
      var tapSpy = this.spy();

      this.handler = new TapHandler(this.element, {
        start: startSpy,
        end: endSpy,
        tap: tapSpy,
      });

      this.doTap();

      assert.isTrue(tapSpy.calledBefore(endSpy));
    },


  });

});