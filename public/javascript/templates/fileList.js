define([], function() {

  function FileList() {
    var template = '<li class="file-info">'+
                      '<div class="thumbnail-wrapper">'+
                        '<canvas class="thumbnail"></canvas>'+
                        '<div class="overlay">'+
                          '<span class="file-name"></span>'+
                          '<span class="delete icon-close" data-action="delete"></span>'+
                        '</div>'+
                      '</div>'+
                    '</li';
    var element = document.createElement("div");
    element.innerHTML = template;
    return element.firstChild;
  }

  return FileList;
});