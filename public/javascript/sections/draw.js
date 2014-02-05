define(["section", "globals", "helpers", "tapHandler", "db", "data", "components/manipulateCanvas"], function(Section, g, Helpers, TapHandler, db, Data, ManipulateCanvas) {

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

    // The file server we are using
    _fileServer: null,

    // Local settings such as offset and zoom
    _settings: null,

    // The actions we are taking
    _actions: null,

    // If we are currently doing something like drawing, it will be here
    _currentAction: null,

    // Do we need to update on this frame?
    _needsUpdate: true,

    // Set this to false to stop the render loop
    _shouldRender: false,

    // The current tool, zoom or pan
    _currentTool: "pan",

    // When you move the mouse, what is the tool to use?
    _currentPointTool: "pencil",

    // Timeout for 
    _saveTransformTimeout: null,

    _redoStack: null,

    init: function(filesPane) {
      this._super();

      this._filesPane = filesPane;

      this._canvas = document.getElementById('canvas');

      this._resize = this._resize.bind(this);

      new TapHandler(canvas, {
        start: this._start.bind(this),
        move: this._move.bind(this),
        end: this._end.bind(this),
        gesture: this._gesture.bind(this)
      });

      new TapHandler(document.getElementById("tools"), {
        tap: this._toolChanged.bind(this),
        start: this._toolStart.bind(this),
        end: this._toolEnd.bind(this)
      });

      new TapHandler(document.getElementById("menu"), {
        tap: this._menuTapped.bind(this),
      });

      this.element.addEventListener("mousewheel", this._mouseWheel.bind(this));

      this.element.addEventListener("keydown", this._keyDown.bind(this));
    },

    show: function(file) {
      this._fileInfo = file;

      this._actions = [];
      this._redoStack = [];

      console.log("draw shown for file", file);

      data.getFile(file.id, (function(server) {

        this._fileServer = server;
        this._fileServer.actions.query()
          .all()
          .execute()
          .done((function(results) {

            this._actions = results;
            this._needsUpdate = true;

            this._settings = data.localFileSettings(file.id);

            this._manipulateCanvas = new ManipulateCanvas(this._canvas, this._settings);

            this._shouldRender = true;
            this._redraw();


          }).bind(this));
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

      this._needsUpdate = true;
    },

    _zoom: function(x, y, dScale) {
      if (this._manipulateCanvas.zoom(x, y, dScale)) {
        this._saveTransform();
        this._needsUpdate = true;
      }
    },

    _pan: function(dx, dy) {
      if (this._manipulateCanvas.pan(dx, dy)) {
        this._saveTransform();
        this._needsUpdate = true;
      }
    },

    _mouseWheel: function(e) {

      if (this._currentTool == "pan") {
        //console.log("pan", e);
        this._pan(-e.deltaX, -e.deltaY);
      } else if (this._currentTool == "zoom") {
        if (e.deltaY != 0) {
          //console.log(e);
          this._zoom(e.offsetX, e.offsetY, e.deltaY / 100 * this._settings.scale);
        }
      }
    },

    _start: function(e) {
      var world = Helpers.screenToWorld(this._settings, e.distFromLeft, e.distFromTop);

      console.log("started at", world);
      if (this._currentAction) {
        console.error("Current action isn't null!");
      }

      this._currentAction = {
        type: "stroke",
        stroke: {
          points: [world]
        }
      }

      // Make sure the redo stack is empty as we are starting to draw again
      this._redoStack = [];
    },

    _move: function(e) {

      var world = Helpers.screenToWorld(this._settings, e.distFromLeft, e.distFromTop);

      //console.log("world", e, world);
      var currentStroke = this._currentAction.stroke;


      var points = currentStroke.points;
      var lastPoint = points[points.length - 1];


      var dist = Math.sqrt(((lastPoint.x - world.x) * (lastPoint.x - world.x)) + ((lastPoint.y - world.y) * (lastPoint.y - world.y)));
      //console.log("dist", dist);

      //if (dist < 0.0003) {
      if (dist < 0.001) {
        return;
      }

      currentStroke.points.push(world);
      this._needsUpdate = true;
    },

    _end: function(e) {
      var currentAction = this._currentAction;
      this._currentAction = null;

      var currentStroke = currentAction.stroke;

      if (currentStroke.points.length < 2) {
        // two options, don't count the stroke
        return;

        // Or create a second point, same as the first.
        // Canvas doesn't seem to render a line with two identical points.
        currentStroke.points.push(currentStroke.points[0]);
      }

      var controlPoints = Helpers.getCurveControlPoints(currentStroke.points);
      currentStroke.controlPoints = controlPoints;

      this._saveAction(currentAction);
    },

    _saveAction: function(action) {
      // Store the current action
      this._actions.push(action);
      //this._currentAction = null;

      // And persist it

      this._fileServer.actions.add(action)
        .done(function(item) {
          // item stored
        })
        .fail(function(e) {
          console.error("fail to write", e);
        });

      this._needsUpdate = true;
    },

    _gesture: function(e) {
      this._pan(e.xFromLast, e.yFromLast);
      this._zoom(e.x, e.y, e.scaleFromLast * this._settings.scale);
    },

    _redraw: function() {
      // If we shouldn't render, exit the loop
      if (!this._shouldRender) {
        return;
      }

      if (this._needsUpdate) {
        this._manipulateCanvas.drawAll(this._actions);

        if (this._currentAction) {
          this._manipulateCanvas.doAction(this._currentAction)
        }
        this._needsUpdate = false;
      }

      requestAnimationFrame(this._redraw.bind(this));
    },

    _menuTapped: function(e) {
      if (e.srcElement.tagName == "LI") {
        var action = e.srcElement.dataset.action;

        if (action == "back") {
          this._filesPane.setPane("list");
        }
      }
    },

    _toolChanged: function(e) {
      if (e.srcElement.tagName == "LI") {
        this._currentTool = e.srcElement.dataset.tool;
      }
    },

    _toolStart: function(e) {
      if (e.srcElement.tagName == "LI") {
        //this._currentPointTool = e.srcElement.dataset.tool;
      }
    },

    _toolEnd: function(e) {
      //this._currentPointTool = "pencil";
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
          var nowAction = this._redoStack.pop();
          this._saveAction(nowAction);
        }
      } else if ((
          (g.isMac() && e.metaKey) ||
          (g.isPC() && e.ctrlKey)
        ) &&
        key == "Z") {
        // Undo

        e.preventDefault();

        if (this._actions.length > 0) {
          var action = this._actions.pop();

          // It is impossible to delete the id off of the action, so we have to create a new object
          var newObj = {};

          for (var prop in action) {
            if (prop != "id") {
              newObj[prop] = action[prop];
            }
          }



          this._redoStack.push(newObj);

          this._fileServer.actions.remove(action.id).done(function(key) {
            console.log('remove', key, action);
            // item removed
          });
        }
        this._needsUpdate = true;
      } else if (key == "Z") {
        this._currentTool = "zoom";
      } else if (key == "P") {
        this._currentTool = "pan";
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