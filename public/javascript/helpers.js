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
    }
  };
});