define([], function() {

  function FileList() {
    var template = '<li class="file-info">'+
                      '<div>'+
                        '<div class="overlay">'+
                          '<div class="bar">'+
                            '<span class="share icon-group"></span>'+
                            '<span class="delete icon-close"></span>'+
                          '</div>'+
                        '</div>'+
                        '<img class="thumbnail" />'+
                        '<div class="content">'+
                          '<span class="file-name"></span>'+
                        '</div>'+
                      '</div>'+
                    '</li>';
    var element = document.createElement("div");
    element.innerHTML = template;
    return element.firstChild;
  }

  return FileList;
});