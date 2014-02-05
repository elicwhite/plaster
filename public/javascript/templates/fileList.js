define([], function() {

  function FileList() {
    var template = '<li class="file-info">'+
                      '<span class="fileName"></span>'+
                      '<span data-action="delete">Delete</span>'+
                    '</li';
    var element = document.createElement("div");
    element.innerHTML = template;
    return element.firstChild;
  }

  return FileList;
});