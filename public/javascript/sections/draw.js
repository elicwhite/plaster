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

    _currentTools: null,

    // Timeout for 
    _saveSettingsTimeout: null,

    _redoStack: null,

    // The tap handler for the draw pane. Needed to turn on and off gestures
    _canvasTapHandler: null,

    _toolTapHandler: null,

    _fileNameElement: null,

    // The overlay of modals
    _overlay: null,

    init: function(filesPane) {

      // TODO, not using this
      this._currentTools = {
        point: "pencil",
        gesture: null,
        scroll: "pan"
      }

      this._super();

      this._filesPane = filesPane;

      this._canvas = document.getElementById('canvas');

      this._resize = this._resize.bind(this);

      // Keep the trackpad from trigger chrome's back event
      this.element.addEventListener("touchmove", function(e) {
        e.preventDefault();
      });

      this._canvasTapHandler = new TapHandler(this.element, {
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
        start: function(e) {
          e.stopPropagation();
        },
        tap: this._menuTapped.bind(this),
      });

      new TapHandler(document.getElementById("fileName"), {
        start: function(e) {
          e.stopPropagation();
        }
      });

      new TapHandler(document.getElementById("options"), {
        start: function(e) {
          e.stopPropagation();
        },
        tap: this._menuTapped.bind(this),
      });

      new TapHandler(document.getElementById("colorPicker"), {
        start: function(e) {
          e.stopPropagation();
        },
        tap: this._colorPicked.bind(this)
      });

      this._overlay = document.getElementById("draw-overlay");
      this._overlay.addEventListener("mousedown", this._hideModal.bind(this));
      this._overlay.addEventListener("touchstart", this._hideModal.bind(this));

      this.element.addEventListener("mousewheel", this._mouseWheel.bind(this));
      this.element.addEventListener("keydown", this._keyDown.bind(this));

      this._fileNameElement = document.getElementById("fileName");
      this._fileNameElement.addEventListener("keydown", this._fileNameKeyDown.bind(this));
      this._fileNameElement.addEventListener("blur", this._fileNameBlur.bind(this));
    },

    show: function(file) {
      this._actions = [];
      this._redoStack = [];

      data.getFile(file.id, (function(fileInfo) {
        this._fileInfo = fileInfo;
        this._fileNameElement.value = this._fileInfo.name;
      }).bind(this));

      data.getFileActions(file.id, (function(results) {
        this._actions = results;
        this._updateAll = true;

        this._manipulateCanvas = new ManipulateCanvas(this._canvas, this._settings);

        this._shouldRender = true;
        this._redraw();

        //this._showModal("colorPicker");
      }).bind(this));

      this._settings = data.localFileSettings(file.id);
      document.getElementById("chosenColorSwatch").style.backgroundColor = this._settings.color;

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
        this._saveSettings();
        this._updateAll = true;
      }
    },

    _pan: function(dx, dy) {
      if (this._manipulateCanvas.pan(dx, dy)) {
        this._saveSettings();
        this._updateAll = true;
      }
    },

    _mouseWheel: function(e) {
      // deltaX is chrome, wheelDelta is safari
      var dx = -e.deltaX || (e.wheelDeltaX / 5);
      var dy = -e.deltaY || (e.wheelDeltaY / 5);

      if (this._currentTools.scroll == "pan") {
        this._pan(dx, dy);
      } else if (this._currentTools.scroll == "zoom") {
        if (dy != 0) {
          //console.log(e);
          this._zoom(e.offsetX, e.offsetY, dy / 100 * this._settings.scale);
        }
      }
    },

    _start: function(e) {
      var tool = this._currentTools.gesture || this._currentTools.point;

      if (tool == "pan") {
        return;
      }


      var world = Helpers.screenToWorld(this._settings, e.distFromLeft, e.distFromTop);

      if (this._currentAction) {
        console.error("Current action isn't null!");
      }

      this._currentAction = {
        type: "stroke",
        value: {
          points: [world],
          width: 2,
          lockWidth: true, // should the width stay the same regardless of zoom
          color: this._settings.color
        }
      }

      // Make sure the redo stack is empty as we are starting to draw again
      this._redoStack = [];

      if (tool == "eraser") {
        this._currentAction.value.width = 30 / this._settings.scale;
        this._currentAction.value.color = "#ffffff";
        this._currentAction.value.lockWidth = false;
      } else if (this._currentTools.point == "pencil") {

      }
    },

    _move: function(e) {
      var tool = this._currentTools.gesture || this._currentTools.point;

      //debugger;
      if (tool == "pan") {
        // Make sure there are two touches
        if (e.touches && e.touches.length == 1) {
          //return;
        }

        this._pan(e.xFromLast, e.yFromLast);
      } else if (tool == "pencil" || tool == "eraser") {

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
      var tool = this._currentTools.gesture || this._currentTools.point;

      if (tool == "pencil" || tool == "eraser") {
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
      //if (this._currentTools.point == "pencil") {
        this._pan(e.xFromLast, e.yFromLast);
        this._zoom(e.x, e.y, e.scaleFromLast * this._settings.scale);
      //}
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

    _showModal: function(modalId) {
      var modal = document.getElementById(modalId);
      if (!modal) {
        console.error("No modal with that id");
        return;
      }

      this._overlay.currentModal = modalId;
      this._overlay.style.display = "block";

      setTimeout(function() {
        modal.classList.add("visible");
      }, 0);
    },

    _hideModal: function(e) {
      if (e && e.srcElement != this._overlay) {
        // overlay was explicitly tapped
        return;
      }

      if (this._overlay.currentModal) {
        // A modal is showing
        var modal = document.getElementById(this._overlay.currentModal);
        modal.classList.remove("visible");
        this._overlay.currentModal = "";
      }

      this._overlay.style.display = "";

      if (e) {
        //e.stopPropagation();
      }
    },

    _colorPicked: function(e) {
      parent = Helpers.parentEleWithClassname(e.srcElement, "swatch");
      if (parent) {
        var color = parent.style.backgroundColor;
        this._settings.color = color;
        this._saveSettings();

        document.getElementById("chosenColorSwatch").style.backgroundColor = color;
        this._hideModal();
      }

      e.stopPropagation();
    },

    _toolStart: function(e) {
      
      var tool = e.srcElement.dataset.tool;
      var action = e.srcElement.dataset.action;

      if (e.srcElement.tagName == "LI" && tool) {
        if (tool == "pan" || tool == "eraser" || tool == "pencil") {
          this._currentTools.gesture = tool;

          this._canvasTapHandler.ignoreGestures(true);
          this._toolTapHandler.ignoreGestures(true);
        }
      }

      e.stopPropagation();
      e.preventDefault();
    },

    _toolEnd: function(e) {
      if (e) {
        var tool = e.srcElement.dataset.tool;

        if (e.srcElement.tagName == "LI" && tool) {
          if (tool == "pan" || tool == "eraser" || tool == "pencil") {
            this._currentTools.gesture = null;

            this._canvasTapHandler.ignoreGestures(false);
            this._toolTapHandler.ignoreGestures(false);
          }
        }
      }
    },

    _toolChanged: function(e) {
      var parent = Helpers.parentEleWithClassname(e.srcElement, "toolitem");

      if (parent && parent.tagName == "LI") {
        var action = parent.dataset.action;
        var tool = parent.dataset.tool;

        if (tool) {
          if (tool == "pencil") {
            this._currentTools.point = "pencil";
          } else if (tool == "eraser") {
            this._currentTools.point = "eraser";
          } else if (tool == "pan") {
            // TODO: this should probably check if the event was a touch
            // or mouse event
            if (g.isComputer()) {
              this._currentTools.scroll = "pan";
            }
            else {
              this._currentTools.point = "pan";
            }
          } else if (tool == "zoom") {
            this._currentTools.scroll = "zoom";
          }
        } else if (action) {
          if (action == "undo") {
            this._undo();
          } else if (action == "redo") {
            this._redo();
          }
          if (action == "color") {
            this._showModal("colorPicker");

            e.preventDefault();
            e.stopImmediatePropagation();
          }
        }
      }
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
        this._currentTools.scroll = "zoom";
      } else if (key == "P") {
        this._currentTools.scroll = "pan";
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

    _fileNameKeyDown: function(e) {
      if (e.keyCode == 13) { // Enter
        this._fileNameElement.blur();
      }
    },

    _fileNameBlur: function(e) {
      var name = e.srcElement.value;
      data.renameFile(this._fileInfo.id, name);

      Event.trigger("fileRenamed", {
        fileId: this._fileInfo.id,
        name: name
      });
    },


    _saveSettings: function() {
      // If the timeout is set already
      if (this._saveSettingsTimeout) {

        // Clear it and set a new one
        clearTimeout(this._saveSettingsTimeout);
      }

      this._saveSettingsTimeout = setTimeout((function() {
        data.localFileSettings(this._fileInfo.id, this._settings);
        this._saveSettingsTimeout = null;
      }).bind(this), 100);

    },
  });

  return Draw;

});