define(["section", "globals", "event", "helpers", "tapHandler", "db", "data", "components/manipulateCanvas"], function(Section, g, Event, Helpers, TapHandler, db, Data, ManipulateCanvas) {

  var Draw = Section.extend({
    id: "draw",

    // The parent pane for this page
    _filesPane: null,

    // Instance of draw canvas that is handling all the drawing
    _manipulateCanvas: null,

    // The actual canvas element
    _canvas: null,

    // The file we are currently rendering
    _fileInfo: null,

    // Local settings such as offset and zoom
    _settings: null,

    // The actions we are taking
    _actions: null,

    // If we are currently doing something like drawing, it will be here
    _currentAction: null,

    // Do we need to update on this frame?
    _updateAll: true,

    // Does the current action need to be redrawn?
    _updateCurrentAction: false,

    // Set this to false to stop the render loop
    _shouldRender: false,

    // The current tool, zoom or pan
    _currentTool: "pan",

    // When you move the mouse, what is the tool to use?
    _currentPointTool: "pencil",

    // Timeout for 
    _saveTransformTimeout: null,

    _redoStack: null,

    // The tap handler for the draw pane. Needed to turn on and off gestures
    _canvasTapHandler: null,

    _toolTapHandler: null,

    _fileNameElement: null,

    init: function(filesPane) {
      this._super();

      this._filesPane = filesPane;

      this._canvas = document.getElementById('canvas');

      this._resize = this._resize.bind(this);

      // Keep the trackpad from trigger chrome's back event
      this.element.addEventListener("touchmove", function(e) {
        e.preventDefault();
      });

      this._canvasTapHandler = new TapHandler(canvas, {
        start: this._start.bind(this),
        move: this._move.bind(this),
        end: this._end.bind(this),
        gesture: this._gesture.bind(this)
      });


      this._toolTapHandler = new TapHandler(document.getElementById("tools"), {
        tap: this._toolChanged.bind(this),
        start: this._toolStart.bind(this),
        end: this._toolEnd.bind(this)
      });

      new TapHandler(document.getElementById("menu"), {
        tap: this._menuTapped.bind(this),
      });

      this.element.addEventListener("mousewheel", this._mouseWheel.bind(this));
      this.element.addEventListener("keydown", this._keyDown.bind(this));

      this._fileNameElement = document.getElementById("fileName");
      this._fileNameElement.addEventListener("keydown", this._fileNameKeyDown.bind(this));
      this._fileNameElement.addEventListener("blur", this._fileNameBlur.bind(this));

      document.getElementById("sizepicker").addEventListener("mousewheel", this._sizeWheel.bind(this));
    },

    show: function(file) {
      this._fileInfo = file;

      this._actions = [];
      this._redoStack = [];

      console.log("draw shown for file", file);

      this._fileNameElement.innerText = this._fileInfo.name;

      data.getFileActions(file.id, (function(results) {
        this._actions = results;
        this._updateAll = true;

        this._settings = data.localFileSettings(file.id);

        this._manipulateCanvas = new ManipulateCanvas(this._canvas, this._settings);

        this._shouldRender = true;
        this._redraw();
      }).bind(this));

      // We don't need data to resize
      this._resize();



      // Focus on the canvas after we navigate to it
      setTimeout(function() {
        canvas.focus();
      }.bind(this), 400);

      window.addEventListener("resize", this._resize);
    },

    hide: function() {
      this._shouldRender = false;

      window.removeEventListener("resize", this._resize);
    },

    _resize: function() {
      this._canvas.width = window.innerWidth;
      this._canvas.height = window.innerHeight;

      this._updateAll = true;
    },

    _zoom: function(x, y, dScale) {
      if (this._manipulateCanvas.zoom(x, y, dScale)) {
        this._saveTransform();
        this._updateAll = true;
      }
    },

    _pan: function(dx, dy) {
      if (this._manipulateCanvas.pan(dx, dy)) {
        this._saveTransform();
        this._updateAll = true;
      }
    },

    _mouseWheel: function(e) {

      if (this._currentTool == "pan") {
        this._pan(-e.deltaX, -e.deltaY);
      } else if (this._currentTool == "zoom") {
        if (e.deltaY != 0) {
          //console.log(e);
          this._zoom(e.offsetX, e.offsetY, e.deltaY / 100 * this._settings.scale);
        }
      }
    },

    _start: function(e) {
      if (this._currentPointTool == "pan") {

      } else if (this._currentPointTool == "pencil") {
        var world = Helpers.screenToWorld(this._settings, e.distFromLeft, e.distFromTop);

        if (this._currentAction) {
          console.error("Current action isn't null!");
        }

        this._currentAction = {
          type: "stroke",
          value: {
            points: [world],
            width: this._currentPenLevel
          }
        }



        // Make sure the redo stack is empty as we are starting to draw again
        this._redoStack = [];
      }
    },

    _move: function(e) {
      if (this._currentPointTool == "pan") {
        // Make sure there are two touches
        if (e.touches.length == 1) {
          return;
        }

        this._pan(e.xFromLast, e.yFromLast);
      } else if (this._currentPointTool == "pencil") {

        if (!this._currentAction) {
          // no current action. This can happen if we were dragging a tool and let up the
          // tool button and kept dragging
          return;
        }

        var world = Helpers.screenToWorld(this._settings, e.distFromLeft, e.distFromTop);

        //console.log("world", e, world);
        var currentStroke = this._currentAction.value;

        var points = currentStroke.points;
        var lastPoint = points[points.length - 1];


        var dist = Math.sqrt(((lastPoint.x - world.x) * (lastPoint.x - world.x)) + ((lastPoint.y - world.y) * (lastPoint.y - world.y)));
        //console.log("dist", dist);

        //if (dist < 0.0003) {
        if (dist < 0.001) {
          return;
        }

        currentStroke.points.push(world);
        this._updateCurrentAction = true;
      }
    },

    _end: function(e) {
      if (this._currentPointTool == "pencil") {
        if (!this._currentAction) {
          // no current action. This can happen if we were dragging a tool and let up the
          // tool button and kept dragging
          return;
        }

        var currentAction = this._currentAction;
        this._currentAction = null;

        var currentStroke = currentAction.value;

        if (currentStroke.points.length < 2) {
          // two options, don't count the stroke
          return;

          // Or create a second point, same as the first.
          // Canvas doesn't seem to render a line with two identical points.
          currentStroke.points.push(currentStroke.points[0]);
        }

        var controlPoints = Helpers.getCurveControlPoints(currentStroke.points);
        currentStroke.controlPoints = controlPoints;

        this._updateCurrentAction = true;

        this._saveAction(currentAction);
      }
    },

    _saveAction: function(action) {
      // The id for the action is the next one in the array
      // But 1 based indexing
      action.id = this._actions.length + 1;

      this._actions.push(action);

      this._manipulateCanvas.addAction(action);

      // And persist it
      data.addAction(this._fileInfo.id, action);

      Event.trigger("fileModified", {
        fileId: this._fileInfo.id,
        timestamp: Date.now()
      });

      this._updateAll = true;
    },

    _gesture: function(e) {
      if (this._currentPointTool == "pencil") {
        this._pan(e.xFromLast, e.yFromLast);
        this._zoom(e.x, e.y, e.scaleFromLast * this._settings.scale);
      }
    },

    _redraw: function() {
      // If we shouldn't render, exit the loop
      if (!this._shouldRender) {
        return;
      }

      if (this._updateAll) {
        this._manipulateCanvas.doAll(this._actions);

      }

      if (this._updateCurrentAction && this._currentAction) {
        this._manipulateCanvas.doTemporaryAction(this._currentAction)

      }

      if (this._updateAll || this._updateCurrentAction) {
        this._manipulateCanvas.render();

        this._updateAll = false;
        this._updateCurrentAction = false;
      }

      requestAnimationFrame(this._redraw.bind(this));
    },

    _menuTapped: function(e) {
      if (e.srcElement.tagName == "LI") {
        var action = e.srcElement.dataset.action;

        if (action == "back") {
          this._filesPane.setPane("list", this._fileInfo);
        } else if (action == "rename") {
          e.srcElement.focus();
        } else if (action == "export") {
          var dataURL = this._canvas.toDataURL();
          window.open(dataURL);
        }
      }
    },

    _toolChanged: function(e) {
      console.log("tool tapped");

      if (e.srcElement.tagName == "LI") {
        var action = e.srcElement.dataset.action;
        var tool = e.srcElement.dataset.tool;

        if (tool) {
          this._currentTool = e.srcElement.dataset.tool;
        } else if (action) {
          if (action == "undo") {
            this._undo();
          } else if (action == "redo") {
            this._redo();
          }
          if (action == "color") {

          }
        }
      }
    },

    _toolStart: function(e) {
      var tool = e.srcElement.dataset.tool;
      var action = e.srcElement.dataset.action;

      if (e.srcElement.tagName == "LI" && tool) {
        this._currentPointTool = tool;

        if (tool == "pan") {

        }

        //e.stopImmediatePropagation();
        //e.preventDefault();

        this._canvasTapHandler.ignoreGestures(true);
        this._toolTapHandler.ignoreGestures(true);
      }
    },

    _toolEnd: function(e) {
      if (e) {
        var tool = e.srcElement.dataset.tool;

        if (e.srcElement.tagName == "LI" && tool) {
          if (tool == "pan") {

          }

          this._currentPointTool = "pencil";
          this._canvasTapHandler.ignoreGestures(false);
          this._toolTapHandler.ignoreGestures(false);
        }
      }
    },

    _currentPenLevel: 60,

    _sizeWheel: function(e) {
      var newPenLevel = this._currentPenLevel + e.deltaY / 10;

      newPenLevel = Math.max(1, Math.min(60, newPenLevel));

      var ring = document.getElementById("actualRing");

      // The size our scale is based on
      var origSize = 60;

      if (newPenLevel < 15) {
        origSize = 15;
        ring.className = "quarter";
      }
      else if (newPenLevel < 30) {
        origSize = 30;
        ring.className = "half";
      } 
      else 
      {
        ring.className = "";
      }

      ring.style.webkitTransform = "scale("+(newPenLevel / origSize)+")";

      this._currentPenLevel = newPenLevel;


      console.log("new size", newPenLevel);
      e.stopPropagation();
      e.preventDefault();
    },

    _keyDown: function(e) {
      var key = String.fromCharCode(e.keyCode);
      //console.log(e);
      // console.log("key", key);
      // console.log(e);

      if (
        ((g.isMac() && e.metaKey && e.shiftKey) && key == "Z") ||
        ((g.isPC() && e.ctrlKey) && key == "Y")) {
        // Redo

        if (this._redoStack.length > 0) {
          this._redo();
        }
      } else if ((
          (g.isMac() && e.metaKey) ||
          (g.isPC() && e.ctrlKey)
        ) &&
        key == "Z") {
        // Undo

        e.preventDefault();
        this._undo();
      } else if (key == "Z") {
        this._currentTool = "zoom";
      } else if (key == "P") {
        this._currentTool = "pan";
      }

    },

    _undo: function() {
      if (this._actions.length > 0) {
        console.log("undo");
        var action = this._actions.pop();

        // It is impossible to delete the id off of the action, so we have to create a new object
        var newObj = {};

        for (var prop in action) {
          if (prop != "id") {
            newObj[prop] = action[prop];
          }
        }


        this._redoStack.push(newObj);

        data.removeAction(this._fileInfo.id, action.id);
        this._manipulateCanvas.doAll(this._actions);

        this._updateAll = true;
      }
    },

    _redo: function() {
      if (this._redoStack.length > 0) {
        console.log("redo");
        var nowAction = this._redoStack.pop();
        this._saveAction(nowAction);
      }
    },


    /*
    // Create an image with all of the lines on it.
    _save: function() {
      // FIgure out the bounds of the lines
      var top = lines[0].startY;
      var left = lines[0].startX;
      var bottom = lines[0].startY;
      var right = lines[0].startX;

      for (var i = 0; i < lines.length; i++) {
        var top = Math.min(lines[i].startY, Math.min(lines[i].endY, top));
        var left = Math.min(lines[i].startX, Math.min(lines[i].endX, top));
        var bottom = Math.max(lines[i].startY, Math.max(lines[i].endY, top));
        var right = Math.max(lines[i].startX, Math.max(lines[i].endX, top));
      }

      // Create a canvas large enough that it can contain the bounds
      var width = right - left;
      var height = bottom - top;

      // Expand for some padding
      var paddingX = width * .05;
      var paddingY = height * .05;
      width *= 1.1;
      height *= 1.1;

      var transformations = {
        offsetX: paddingX,
        offsetY: paddingY,
        scale: 1
      }

      var canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      var ctx = canvas.getContext("2d");
    }
*/
    _fileNameKeyDown: function(e) {
      if (e.keyCode == 13) { // Enter
        this._fileNameElement.blur();
      }
    },

    _fileNameBlur: function(e) {
      var name = e.srcElement.innerText;
      data.renameFile(this._fileInfo.id, name);

      Event.trigger("fileRenamed", {
        fileId: this._fileInfo.id,
        name: name
      });
    },


    _saveTransform: function() {
      // If the timeout is set already
      if (this._saveTransformTimeout) {

        // Clear it and set a new one
        clearTimeout(this._saveTransformTimeout);
      }

      this._saveTransformTimeout = setTimeout((function() {
        data.localFileSettings(this._fileInfo.id, this._settings);
        this._saveTransformTimeout = null;
      }).bind(this), 100);

    },
  });

  return Draw;

});