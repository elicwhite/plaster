define([], function() {

  function Template(templateId) {
    var script = document.getElementById("template-"+templateId);

    var element = document.createElement("div");
    element.innerHTML = script.innerHTML;
    return element.children[0];
  }

  return Template;

});