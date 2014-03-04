define(["section", "globals", "event", "helpers", "tapHandler", "platform", "db", "dataLayer/data", "components/manipulateCanvas"], function(Section, g, Event, Helpers, TapHandler, Platform, db, Data, ManipulateCanvas) {

  var Draw = Section.extend({
    id: "draw",

    // The parent pane for this page
    _filesPane: null,

    // Instance of draw canvas that is handling all the drawing
    _manipulateCanvas: null,

    // The actual canvas element
    _canvas: null,

    // The file we are currently rendering
    _file: null,

    // Local settings such as offset and zoom
    _settings: null,

    // If we are currently doing something like drawing, it will be here
    _currentAction: null,

    // If we need to redraw but shouldn't re-render anything
    _update: false,

    // Do we need to update on this frame?
    _updateAll: true,

    // Does the current action need to be redrawn?
    _updateCurrentAction: false,

    // Set this to false to stop the render loop
    _shouldRender: false,

    // Timeout for 
    _saveSettingsTimeout: null,

    // The tap handler for the draw pane. Needed to turn on and off gestures
    _canvasTapHandler: null,

    _toolTapHandler: null,

    _fileNameElement: null,

    // The overlay of modals
    _overlay: null,

    init: function(filesPane) {
      this._super();

      this._filesPane = filesPane;

      this._canvas = document.getElementById('canvas');

      this._actionsAdded = this._actionsAdded.bind(this);
      this._actionsRemoved = this._actionsRemoved.bind(this);
      this._resize = this._resize.bind(this);
      this._fileRenamed = this._fileRenamed.bind(this);

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

      this.element.addEventListener(Platform.mouseWheel, this._mouseWheel.bind(this));
      this.element.addEventListener("keydown", this._keyDown.bind(this));

      this._fileNameElement = document.getElementById("fileName");
      this._fileNameElement.addEventListener("keydown", this._fileNameKeyDown.bind(this));
      this._fileNameElement.addEventListener("blur", this._fileNameBlur.bind(this));

    },

    show: function(fileInfo) {
      Data.loadFile(fileInfo.id)
        .then((function(file) {

          this._file = file;

          file.listen(this._actionsAdded, this._actionsRemoved);

          file.fileInfoPromise.then((function(fileInfo) {
            this._fileNameElement.value = fileInfo.name;
          }).bind(this));

          file.localSettings().then((function(settings) {
            this._settings = settings;
            document.getElementById("chosenColorSwatch").style.backgroundColor = this._settings.color;

            this._setActiveTool();
            this._manipulateCanvas = new ManipulateCanvas(this._canvas, this._settings);

            this._redraw();
          }).bind(this));

          this._updateAll = true;
          this._shouldRender = true;

          Event.addListener("fileRenamed", this._fileRenamed);
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

      Event.removeListener("fileRenamed", this._fileRenamed);
      window.removeEventListener("resize", this._resize);

      this._file.stopListening();
    },

    _actionsAdded: function(e) {
      if (e.isLocal) {
        this._update = true;
        this._manipulateCanvas.addAction(e.items[0]);
      } else {
        this._updateAll = true;
      }
    },

    _actionsRemoved: function(e) {
      this._updateAll = true;
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
      //console.log(e);
      // deltaX is chrome, wheelDelta is safari
      var dx = !isNaN(e.deltaX) ? -e.deltaX : (e.wheelDeltaX / 5);
      var dy = !isNaN(e.deltaY) ? -e.deltaY : (e.wheelDeltaY / 5);

      if (this._settings.tools.scroll == "pan") {
        this._pan(dx, dy);
      } else if (this._settings.tools.scroll == "zoom") {
        if (dy != 0) {
          this._zoom(e.clientX, e.clientY, dy / 100.0 * this._settings.scale);
        }
      }
    },

    _start: function(e) {
      var tool = this._settings.tools.gesture || this._settings.tools.point;
      if (e.button == 1) { // middle mouse
        tool = "pan";
      }

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
          points: [
            [world.x, world.y]
          ],
          width: 2,
          lockWidth: true, // should the width stay the same regardless of zoom
          color: this._settings.color
        }
      }

      if (tool == "eraser") {
        this._currentAction.value.width = 30 / this._settings.scale;
        this._currentAction.value.color = "#ffffff";
        this._currentAction.value.lockWidth = false;
      } else if (this._settings.tools.point == "pencil") {

      }
    },

    _move: function(e) {
      var tool = this._settings.tools.gesture || this._settings.tools.point;

      if (e.button == 1) { // middle mouse
        tool = "pan";
      }

      if (tool == "pan") {
        this._pan(e.xFromLast, e.yFromLast);
      } else if (tool == "pencil" || tool == "eraser") {

        if (!this._currentAction) {
          // no current action. This can happen if we were dragging a tool and let up the
          // tool button and kept dragging
          return;
        }

        var world = Helpers.screenToWorld(this._settings, e.distFromLeft, e.distFromTop);

        var currentStroke = this._currentAction.value;

        var points = currentStroke.points;
        var lastPoint = points[points.length - 1];


        var dist = Math.sqrt(
          ((lastPoint[0] - world[0]) * (lastPoint[0] - world[0])) +
          ((lastPoint[1] - world[1]) * (lastPoint[1] - world[1]))
        );

        if (dist < 0.001) {
          return;
        }

        currentStroke.points.push([world.x, world.y]);
        this._updateCurrentAction = true;
      }
    },

    _end: function(e) {
      var tool = this._settings.tools.gesture || this._settings.tools.point;

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

          // or render a point
        }

        var controlPoints = Helpers.getCurveControlPoints(currentStroke.points);
        currentStroke.controlPoints = controlPoints;

        this._updateCurrentAction = true;

        // the actions is done, we should redraw everything.
        this._updateAll = true;

        this._saveAction(currentAction);
      }
    },

    _saveAction: function(action) {
      action.id = Helpers.getGuid();
      this._file.addAction(action)
      .catch (function(e) {
        console.error(e, e.stack, e.message);
      });
    },

    _gesture: function(e) {
      //if (this._settings.tools.point == "pencil") {
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
        var actions = this._file.getActions();

        this._manipulateCanvas.doAll(actions);
      }

      if (this._updateCurrentAction && this._currentAction) {
        this._manipulateCanvas.doTemporaryAction(this._currentAction)

      }

      if (this._updateAll || this._updateCurrentAction || this._update) {
        this._manipulateCanvas.render();

        this._update = false;
        this._updateAll = false;
        this._updateCurrentAction = false;
      }

      requestAnimationFrame(this._redraw.bind(this));
    },

    _menuTapped: function(e) {
      if (e.target.tagName == "LI") {
        var action = e.target.dataset.action;

        if (action == "back") {
          this._file.fileInfoPromise.then((function(fileInfo) {
            this._filesPane.setPane("list", fileInfo);
          }).bind(this));
        } else if (action == "rename") {
          e.target.focus();
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
      if (e && e.target != this._overlay) {
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
      parent = Helpers.parentEleWithClassname(e.target, "swatch");
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

      var tool = e.target.dataset.tool;
      var action = e.target.dataset.action;

      if (e.target.tagName == "LI" && tool) {
        if (tool == "pan" || tool == "eraser" || tool == "pencil") {
          this._settings.tools.gesture = tool;

          this._setActiveTool();

          this._canvasTapHandler.ignoreGestures(true);
          this._toolTapHandler.ignoreGestures(true);
        }
      }

      e.stopPropagation();
      e.preventDefault();
    },

    _toolEnd: function(e) {
      if (e) {
        var tool = e.target.dataset.tool;

        if (e.target.tagName == "LI" && tool) {
          if (tool == "pan" || tool == "eraser" || tool == "pencil") {
            this._settings.tools.gesture = null;

            this._setActiveTool();

            this._canvasTapHandler.ignoreGestures(false);
            this._toolTapHandler.ignoreGestures(false);
          }
        }
      }
    },

    _toolChanged: function(e) {
      var parent = Helpers.parentEleWithClassname(e.target, "toolitem");

      if (parent && parent.tagName == "LI") {
        var action = parent.dataset.action;
        var tool = parent.dataset.tool;

        if (tool) {
          if (tool == "pencil") {
            this._settings.tools.point = "pencil";
          } else if (tool == "eraser") {
            this._settings.tools.point = "eraser";
          } else if (tool == "pan") {
            // TODO: this should probably check if the event was a touch
            // or mouse event
            if (g.isComputer()) {
              this._settings.tools.scroll = "pan";
            } else {
              this._settings.tools.point = "pan";
            }
          } else if (tool == "zoom") {
            this._settings.tools.scroll = "zoom";
          }

          this._setActiveTool();
          this._saveSettings();
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

    _setActiveTool: function() {
      var toolsElement = document.getElementById("tools");

      function addRemove(type) {
        var prevTool = toolsElement.dataset["active" + type];
        if (prevTool) {
          var toolItem = document.getElementById(prevTool);
          toolItem.classList.remove("active-" + type);
        }

        var currentTool = this._settings.tools[type];

        if (currentTool) {

          var currentToolId = currentTool + "-tool";
          var newToolItem = document.getElementById(currentToolId);
          newToolItem.classList.add("active-" + type);

          toolsElement.dataset["active" + type] = currentToolId;
        } else {
          delete toolsElement.dataset["active" + type];
        }

      }

      addRemove = addRemove.bind(this);

      addRemove("point");

      if (g.isComputer()) {
        addRemove("scroll");
      }
    },

    _keyDown: function(e) {
      var key = String.fromCharCode(e.keyCode);

      if (
        ((g.isMac() && e.metaKey && e.shiftKey) && key == "Z") ||
        ((g.isPC() && e.ctrlKey) && key == "Y")) {
        // Redo

        this._redo();
      } else if ((
          (g.isMac() && e.metaKey) ||
          (g.isPC() && e.ctrlKey)
        ) &&
        key == "Z") {
        // Undo

        e.preventDefault();
        this._undo();
      } else if (key == "Z") {
        this._settings.tools.scroll = "zoom";
        this._setActiveTool();
      } else if (key == "P") {
        this._settings.tools.scroll = "pan";
        this._setActiveTool();
      }

    },

    _undo: function() {
      this._file.undo();
    },

    _redo: function() {
      this._file.redo();
    },

    _fileNameKeyDown: function(e) {
      if (e.keyCode == 13) { // Enter
        this._fileNameElement.blur();
      }
    },

    _fileNameBlur: function(e) {
      var name = e.target.value;
      this._file.rename(name);
    },


    _saveSettings: function() {
      // If the timeout is set already
      if (this._saveSettingsTimeout) {

        // Clear it and set a new one
        clearTimeout(this._saveSettingsTimeout);
      }

      this._saveSettingsTimeout = setTimeout((function() {
        this._file.localSettings(this._settings);
      }).bind(this), 100);

    },

    _fileRenamed: function(file) {
      this._file.fileInfoPromise.then((function(fileInfo) {
        if (fileInfo.id == file.id) {
          this._fileNameElement.value = file.name;
        }
      }).bind(this));
    },
  });

  return Draw;

});