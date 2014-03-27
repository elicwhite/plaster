define([], function() {

  function FileList() {
    var template = '<li class="file-info">'+
                      '<div>'+
                        '<img class="thumbnail" />'+
                        '<div class="content">'+
                          '<span class="file-name"></span>'+
                          '<span class="delete icon-plus"></span>'+
                          '<span class="delete icon-close"></span>'+
                        '</div>'+
                      '</div>'+
                    '</li>';
    var element = document.createElement("div");
    element.innerHTML = template;
    return element.firstChild;
  }

  return FileList;
});