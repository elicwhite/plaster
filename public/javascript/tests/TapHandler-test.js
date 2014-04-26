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
        e.timeStamp = Date.now();
        for (var prop in obj) {
          e[prop] = obj[prop];
        }

        this.element.dispatchEvent(e);
      }

      this.doTap = function() {
        this.dispatch('mousedown', {
          clientX: 10,
          clientY: 10
        });

        this.clock.tick(500);

        this.dispatch('mousemove', {
          clientX: 11,
          clientY: 10
        });

        this.clock.tick(500);

        this.dispatch('mouseup', {
          clientX: 11,
          clientY: 10
        });
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

      this.doTap();

      assert.calledOnce(startSpy);
      assert.calledOnce(endSpy);
      assert.calledOnce(tapSpy);
    },

    "tap caled before end": function() {
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