define([], function() {

  function FileList() {
    var template = '<div class="fileThumbnail">'+
                    '</div>';
    var element = document.createElement("div");
    element.innerHTML = template;
    return element.firstChild;
  }

  return FileList;
});