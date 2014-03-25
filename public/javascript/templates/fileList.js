define([], function() {

  function FileList() {
    var template = '<li class="file-info">'+
                      '<img class="thumbnail" />'+
                      '<div class="content">'+
                        '<span class="file-name"></span>'+
                        '<div class="subtext">'+
                          '<span class="date">2 weeks ago</span>'+
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