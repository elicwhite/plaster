define([], function() {

  function FileList() {
    var template = '<li class="file-info">'+
                      '<div class="thumbnail-wrapper">'+
                        '<canvas class="thumbnail"></canvas>'+
                      '</div>'+
                      '<div class="file-details">'+
                        '<span class="file-name"></span>'+
                        '<span data-action="delete">Delete</span>'+
                      '</div>'+
                    '</li';
    var element = document.createElement("div");
    element.innerHTML = template;
    return element.firstChild;
  }

  return FileList;
});