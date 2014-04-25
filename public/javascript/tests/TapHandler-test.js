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
    },

    tearDown: function() {
      this.element.remove();
    },

    "test1": function() {
      refute.equals(this.element.className, "yeah");
      assert.equals(this.element.className, "foo");
    },

    "test2": function(done) {
      this.element.addEventListener("click", function(e) {
        assert.isObject(e);
        done();
      });

      Syn.click({}, 'box');
    }
  });
});