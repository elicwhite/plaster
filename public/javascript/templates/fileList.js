define([], function() {

  function FileList() {
    var template = '<li>'+
                      '<span class="fileName"></span>'+
                    '</li';
    var element = document.createElement("div");
    element.innerHTML = template;
    return element.firstChild;
  }

  return FileList;
});