/**
 * Main application class.
 * @constructor
 */
const App = function() {
  // Local object
  var self = this;

  // Image
  var image = null;
  // Original image
  var originalImage = null;
  // Image data array
  var imageData = null;
  // Image data width
  var dataWidth = 0;
  // Image data height
  var dataHeight = 0;
  // Is the data mono-slice?
  var isMonoSliceData = false;

  // Default character set
  var defaultCharacterSet;

  // Container div id
  var containerDivId = null;
  // Display window scale
  var windowScale = 1;
  // Fit display to window flag
  var fitToWindow = false;
  // main scale
  var scale = 1;
  // zoom center
  var scaleCenter = { x: 0, y: 0 };
  // translation
  var translation = { x: 0, y: 0 };

  // View
  var view = null;
  // View controller
  var viewController = null;

  // Image layer
  var imageLayer = null;

  // Generic style
  var style = new dwv.html.Style();

  // Toolbox controller
  var toolboxController = null;

  // Loadbox
  var loadbox = null;
  // Current loader
  var currentLoader = null;

  // listeners
  var listeners = {};

  /**
   * Get the image.
   * @return {Image} The associated image.
   */
  this.getImage = function() {
    return image;
  };
  /**
   * Set the view.
   * @param {Image} img The associated image.
   */
  this.setImage = function(img) {
    image = img;
    view.setImage(img);
  };
  /**
   * Restore the original image.
   */
  this.restoreOriginalImage = function() {
    image = originalImage;
    view.setImage(originalImage);
  };
  /**
   * Get the image data array.
   * @return {Array} The image data array.
   */
  this.getImageData = function() {
    return imageData;
  };
  /**
   * Is the data mono-slice?
   * @return {Boolean} True if the data is mono-slice.
   */
  this.isMonoSliceData = function() {
    return isMonoSliceData;
  };

  /**
   * Get the main scale.
   * @return {Number} The main scale.
   */
  this.getScale = function() {
    return scale / windowScale;
  };

  /**
   * Get the window scale.
   * @return {Number} The window scale.
   */
  this.getWindowScale = function() {
    return windowScale;
  };

  /**
   * Get the scale center.
   * @return {Object} The coordinates of the scale center.
   */
  this.getScaleCenter = function() {
    return scaleCenter;
  };

  /**
   * Get the translation.
   * @return {Object} The translation.
   */
  this.getTranslation = function() {
    return translation;
  };

  /**
   * Get the view controller.
   * @return {Object} The controller.
   */
  this.getViewController = function() {
    return viewController;
  };

  /**
   * Get the image layer.
   * @return {Object} The image layer.
   */
  this.getImageLayer = function() {
    return imageLayer;
  };

  /**
   * Get the app style.
   * @return {Object} The app style.
   */
  this.getStyle = function() {
    return style;
  };

  /**
   * Initialise the HTML for the application.
   */
  this.init = function(config) {
    containerDivId = config.containerDivId;
    // tools
    if (Array.isArray(config.tools) && config.tools.length > 0) {
      // setup the tool list
      var toolList = {};
      for (var t = 0; t < config.tools.length; ++t) {
        var toolName = config.tools[t];
        if (toolName === 'Filter') {
          if (Array.isArray(config.filters) && config.filters.length > 0) {
            // setup the filter list
            var filterList = {};
            for (var f = 0; f < config.filters.length; ++f) {
              var filterName = config.filters[f];
              if (typeof dwv.tool.filter[filterName] !== 'undefined') {
                filterList[filterName] = new dwv.tool.filter[filterName](this);
              } else {
                console.warn('Could not initialise unknown filter: ' + filterName);
              }
            }
            toolList.Filter = new dwv.tool.Filter(filterList, this);
            toolList.Filter.addEventListener('filter-run', fireEvent);
          } else {
            console.warn(
              'Please provide a list of filters in the application configuration to activate the Filter tool.'
            );
          }
        } else {
          // default: find the tool in the dwv.tool namespace
          var toolClass = toolName;
          if (typeof dwv.tool[toolClass] !== 'undefined') {
            toolList[toolClass] = new dwv.tool[toolClass](this);
            if (typeof toolList[toolClass].addEventListener !== 'undefined') {
              toolList[toolClass].addEventListener(fireEvent);
            }
          } else {
            console.warn('Could not initialise unknown tool: ' + toolName);
          }
        }
      }
      toolboxController = new dwv.ToolboxController();
      toolboxController.create(toolList, this);
    }
    // gui
    if (config.gui) {
      // tools
      if (config.gui.indexOf('tool') !== -1 && toolboxController) {
        toolboxController.setup();
      }
      // load
      if (config.gui.indexOf('load') !== -1) {
        var loaderList = {};
        for (var l = 0; l < config.loaders.length; ++l) {
          var loaderName = config.loaders[l];
          var loaderClass = loaderName + 'Load';
          // default: find the loader in the dwv.gui namespace
          if (typeof dwv.gui[loaderClass] !== 'undefined') {
            loaderList[loaderName] = new dwv.gui[loaderClass](this);
          } else {
            console.warn('Could not initialise unknown loader: ' + loaderName);
          }
        }
        loadbox = new dwv.gui.Loadbox(this, loaderList);
        loadbox.setup();
        var loaderKeys = Object.keys(loaderList);
        for (var lk = 0; lk < loaderKeys.length; ++lk) {
          loaderList[loaderKeys[lk]].setup();
        }
        loadbox.displayLoader(loaderKeys[0]);
      }
      // version number
      if (config.gui.indexOf('version') !== -1) {
        dwv.gui.appendVersionHtml(dwv.getVersion());
      }
    }

    // listen to drag&drop
    var box = this.getElement('dropBox');
    if (box) {
      box.addEventListener('dragover', onDragOver);
      box.addEventListener('dragleave', onDragLeave);
      box.addEventListener('drop', onDrop);
      // initial size
      var size = dwv.gui.getWindowSize();
      var dropBoxSize = 2 * size.height / 3;
      box.setAttribute(
        'style',
        'width:' + dropBoxSize + 'px;height:' + dropBoxSize + 'px'
      );
    }

    // align layers when the window is resized
    if (config.fitToWindow) {
      fitToWindow = true;
      window.onresize = this.onResize;
    }

    // default character set
    if (typeof config.defaultCharacterSet !== 'undefined') {
      defaultCharacterSet = config.defaultCharacterSet;
    }
  };

  /**
   * Get a HTML element associated to the application.
   * @param name The name or id to find.
   * @return The found element or null.
   */
  this.getElement = function(name) {
    return dwv.gui.getElement(containerDivId, name);
  };

  /**
   * Reset the application.
   */
  this.reset = function() {
    // clear tools
    if (toolboxController) {
      toolboxController.reset();
    }
    // clear objects
    image = null;
    view = null;
    isMonoSliceData = false;
  };

  /**
   * Reset the layout of the application.
   */
  this.resetLayout = function() {
    var previousScale = scale;
    var previousSC = scaleCenter;
    var previousTrans = translation;
    // reset values
    scale = windowScale;
    scaleCenter = { x: 0, y: 0 };
    translation = { x: 0, y: 0 };
    // apply new values
    if (imageLayer) {
      imageLayer.resetLayout(windowScale);
      imageLayer.draw();
    }
    // fire events
    if (previousScale !== scale) {
      fireEvent({
        type: 'zoom-change',
        scale: scale,
        cx: scaleCenter.x,
        cy: scaleCenter.y,
      });
    }
    if (
      previousSC.x !== scaleCenter.x ||
      previousSC.y !== scaleCenter.y ||
      (previousTrans.x !== translation.x || previousTrans.y !== translation.y)
    ) {
      fireEvent({
        type: 'offset-change',
        scale: scale,
        cx: scaleCenter.x,
        cy: scaleCenter.y,
      });
    }
  };

  /**
   * Add an event listener on the app.
   * @param {String} type The event type.
   * @param {Object} listener The method associated with the provided event type.
   */
  this.addEventListener = function(type, listener) {
    if (typeof listeners[type] === 'undefined') {
      listeners[type] = [];
    }
    listeners[type].push(listener);
  };

  /**
   * Remove an event listener from the app.
   * @param {String} type The event type.
   * @param {Object} listener The method associated with the provided event type.
   */
  this.removeEventListener = function(type, listener) {
    if (typeof listeners[type] === 'undefined') {
      return;
    }
    for (var i = 0; i < listeners[type].length; ++i) {
      if (listeners[type][i] === listener) {
        listeners[type].splice(i, 1);
      }
    }
  };

  /**
   * Load a list of files. Can be image files or a state file.
   * @param {Array} files The list of files to load.
   */
  this.loadFiles = function(files) {
    // has been checked for emptiness.
    var ext = files[0].name
      .split('.')
      .pop()
      .toLowerCase();
    if (ext === 'json') {
      loadStateFile(files[0]);
    } else {
      loadImageFiles(files);
    }
  };

  /**
   * Load a list of image files.
   * @private
   * @param {Array} files The list of image files to load.
   */
  function loadImageFiles(files) {
    // create IO
    var fileIO = new dwv.io.FilesLoader();
    // load data
    loadImageData(files, fileIO);
  }

  /**
   * Load a State file.
   * @private
   * @param {String} file The state file to load.
   */
  function loadStateFile(file) {
    // create IO
    var fileIO = new dwv.io.FilesLoader();
    // load data
    loadStateData([file], fileIO);
  }

  /**
   * Abort the current load.
   */
  this.abortLoad = function() {
    if (currentLoader) {
      currentLoader.abort();
      currentLoader = null;
    }
  };

  /**
   * Load a list of ArrayBuffers.
   * @param {Array} data The list of ArrayBuffers to load
   *   in the form of [{name: "", filename: "", data: data}].
   */
  this.loadImageObject = function(data) {
    // create IO
    var memoryIO = new dwv.io.MemoryLoader();
    // create options
    var options = {};
    // load data
    loadImageData(data, memoryIO, options);
  };

  /**
   * Load a list of image data.
   * @private
   * @param {Array} data Array of data to load.
   * @param {Object} loader The data loader.
   * @param {Object} options Options passed to the final loader.
   */
  function loadImageData(data, loader, options) {
    // store loader
    currentLoader = loader;

    // allow to cancel
    var previousOnKeyDown = window.onkeydown;
    window.onkeydown = function(event) {
      if (event.ctrlKey && event.keyCode === 88) {
        // crtl-x
        console.log('crtl-x pressed!');
        self.abortLoad();
      }
    };

    // clear variables
    self.reset();
    // first data name
    var firstName = '';
    if (typeof data[0].name !== 'undefined') {
      firstName = data[0].name;
    } else {
      firstName = data[0];
    }
    // flag used by scroll to decide wether to activate or not
    // TODO: supposing multi-slice for zip files, could not be...
    isMonoSliceData =
      data.length === 1 &&
      firstName
        .split('.')
        .pop()
        .toLowerCase() !== 'zip';
    // set IO
    loader.setDefaultCharacterSet(defaultCharacterSet);
    loader.onload = function(data) {
      if (image) {
        view.append(data.view);
      }
      postLoadInit(data);
    };
    loader.onerror = function(error) {
      handleError(error);
    };
    loader.onabort = function(error) {
      handleAbort(error);
    };
    loader.onloadend = function(/*event*/) {
      window.onkeydown = previousOnKeyDown;
      fireEvent({
        type: 'load-progress',
        lengthComputable: true,
        loaded: 100,
        total: 100,
      });
      fireEvent({ type: 'load-end' });
      // reset member
      currentLoader = null;
    };
    loader.onprogress = onLoadProgress;
    // main load (asynchronous)
    fireEvent({ type: 'load-start' });
    loader.load(data, options);
  }

  /**
   * Load a State data.
   * @private
   * @param {Array} data Array of data to load.
   * @param {Object} loader The data loader.
   * @param {Object} options Options passed to the final loader.
   */
  function loadStateData(data, loader, options) {
    // set IO
    loader.onload = function(data) {
      // load state
      var state = new dwv.State();
      state.apply(self, state.fromJSON(data));
    };
    loader.onerror = function(error) {
      handleError(error);
    };
    // main load (asynchronous)
    loader.load(data, options);
  }

  /**
   * Fit the display to the given size. To be called once the image is loaded.
   */
  this.fitToSize = function(size) {
    // previous width
    var oldWidth = parseInt(windowScale * dataWidth, 10);
    // find new best fit
    windowScale = Math.min(size.width / dataWidth, size.height / dataHeight);
    // new sizes
    var newWidth = parseInt(windowScale * dataWidth, 10);
    var newHeight = parseInt(windowScale * dataHeight, 10);
    // ratio previous/new to add to zoom
    var mul = newWidth / oldWidth;
    scale *= mul;

    // update style
    style.setScale(windowScale);

    // resize container
    var container = this.getElement('layerContainer');
    container.setAttribute(
      'style',
      'width:' + newWidth + 'px;height:' + newHeight + 'px'
    );
    // resize image layer
    if (imageLayer) {
      imageLayer.setWidth(newWidth);
      imageLayer.setHeight(newHeight);
      imageLayer.zoom(scale, scale, 0, 0);
      imageLayer.draw();
    }
  };

  /**
   * Init the Window/Level display
   */
  this.initWLDisplay = function() {
    // set window/level to first preset
    viewController.setWindowLevelPresetById(0);
    // default position
    viewController.setCurrentPosition2D(0, 0);
    // default frame
    viewController.setCurrentFrame(0);
  };

  /**
   * Add canvas mouse and touch listeners.
   * @param {Object} canvas The canvas to listen to.
   */
  this.addToolCanvasListeners = function(layer) {
    toolboxController.addCanvasListeners(layer);
  };

  /**
   * Remove layer mouse and touch listeners.
   * @param {Object} canvas The canvas to stop listening to.
   */
  this.removeToolCanvasListeners = function(layer) {
    toolboxController.removeCanvasListeners(layer);
  };

  /**
   * Render the current image.
   */
  this.render = function() {
    generateAndDrawImage();
  };

  /**
   * Zoom to the layers.
   * @param {Number} zoom The zoom to apply.
   * @param {Number} cx The zoom center X coordinate.
   * @param {Number} cy The zoom center Y coordinate.
   */
  this.zoom = function(zoom, cx, cy) {
    scale = zoom * windowScale;
    if (scale <= 0.1) {
      scale = 0.1;
    }
    scaleCenter = { x: cx, y: cy };
    zoomLayers();
  };

  /**
   * Add a step to the layers zoom.
   * @param {Number} step The zoom step increment. A good step is of 0.1.
   * @param {Number} cx The zoom center X coordinate.
   * @param {Number} cy The zoom center Y coordinate.
   */
  this.stepZoom = function(step, cx, cy) {
    scale += step;
    if (scale <= 0.1) {
      scale = 0.1;
    }
    scaleCenter = { x: cx, y: cy };
    zoomLayers();
  };

  /**
   * Apply a translation to the layers.
   * @param {Number} tx The translation along X.
   * @param {Number} ty The translation along Y.
   */
  this.translate = function(tx, ty) {
    translation = { x: tx, y: ty };
    translateLayers();
  };

  /**
   * Add a translation to the layers.
   * @param {Number} tx The step translation along X.
   * @param {Number} ty The step translation along Y.
   */
  this.stepTranslate = function(tx, ty) {
    var txx = translation.x + tx / scale;
    var tyy = translation.y + ty / scale;
    translation = { x: txx, y: tyy };
    translateLayers();
  };

  // Handler Methods -----------------------------------------------------------

  /**
   * Handle window/level change.
   * @param {Object} event The event fired when changing the window/level.
   */
  this.onWLChange = function(event) {
    // generate and draw if no skip flag
    if (
      typeof event.skipGenerate === 'undefined' ||
      event.skipGenerate === false
    ) {
      generateAndDrawImage();
    }
  };

  /**
   * Handle color map change.
   * @param {Object} event The event fired when changing the color map.
   */
  this.onColorChange = function(/*event*/) {
    generateAndDrawImage();
  };

  /**
   * Handle frame change.
   * @param {Object} event The event fired when changing the frame.
   */
  this.onFrameChange = function(/*event*/) {
    generateAndDrawImage();
  };

  /**
   * Handle slice change.
   * @param {Object} event The event fired when changing the slice.
   */
  this.onSliceChange = function(/*event*/) {
    generateAndDrawImage();
  };

  /**
   * Handle key down event.
   * - CRTL-ARROW_LEFT: next frame
   * - CRTL-ARROW_UP: next slice
   * - CRTL-ARROW_RIGHT: previous frame
   * - CRTL-ARROW_DOWN: previous slice
   * Default behavior. Usually used in tools.
   * @param {Object} event The key down event.
   */
  this.onKeydown = function(event) {
    if (event.ctrlKey) {
      if (event.keyCode === 37) {
        // crtl-arrow-left
        event.preventDefault();
        self.getViewController().decrementFrameNb();
      } else if (event.keyCode === 38) {
        // crtl-arrow-up
        event.preventDefault();
        self.getViewController().incrementSliceNb();
      } else if (event.keyCode === 39) {
        // crtl-arrow-right
        event.preventDefault();
        self.getViewController().incrementFrameNb();
      } else if (event.keyCode === 40) {
        // crtl-arrow-down
        event.preventDefault();
        self.getViewController().decrementSliceNb();
      }
    }
  };

  /**
   * Handle resize.
   * Fit the display to the window. To be called once the image is loaded.
   * @param {Object} event The change event.
   */
  this.onResize = function(/*event*/) {
    self.fitToSize(dwv.gui.getWindowSize());
  };

  /**
   * Handle zoom reset.
   * @param {Object} event The change event.
   */
  this.onZoomReset = function(/*event*/) {
    self.resetLayout();
  };

  /**
   * Handle loader change. Will activate the loader using
   * the value property of the 'event.currentTarget'.
   * @param {Object} event The change event.
   */
  this.onChangeLoader = function(event) {
    loadbox.displayLoader(event.currentTarget.value);
  };

  /**
   * Reset the load box to its original state.
   */
  this.resetLoadbox = function() {
    loadbox.reset();
  };

  /**
   * Handle change files event.
   * @param {Object} event The event fired when changing the file field.
   */
  this.onChangeFiles = function(event) {
    var files = event.target.files;
    if (files.length !== 0) {
      self.loadFiles(files);
    }
  };

  /**
   * Handle color map change. Will activate the tool using
   * the value property of the 'event.currentTarget'.
   * @param {Object} event The change event.
   */
  this.onChangeColorMap = function(event) {
    viewController.setColorMapFromName(event.currentTarget.value);
  };

  /**
   * Handle window/level preset change. Will activate the preset using
   * the value property of the 'event.currentTarget'.
   * @param {Object} event The change event.
   */
  this.onChangeWindowLevelPreset = function(event) {
    viewController.setWindowLevelPreset(event.currentTarget.value);
  };

  /**
   * Handle tool change. Will activate the tool using
   * the value property of the 'event.currentTarget'.
   * @param {Object} event The change event.
   */
  this.onChangeTool = function(event) {
    toolboxController.setSelectedTool(event.currentTarget.value);
  };

  /**
   * Handle filter change. Will activate the filter using
   * the value property of the 'event.currentTarget'.
   * @param {Object} event The change event.
   */
  this.onChangeFilter = function(event) {
    toolboxController.setSelectedFilter(event.currentTarget.value);
  };

  /**
   * Handle filter run.
   * @param {Object} event The run event.
   */
  this.onRunFilter = function(/*event*/) {
    toolboxController.runSelectedFilter();
  };

  /**
   * Handle line color change. Will activate the color using
   * the value property of the 'event.currentTarget'.
   * @param {Object} event The change event.
   */
  this.onChangeLineColor = function(event) {
    // called from an HTML select, use its value
    toolboxController.setLineColor(event.currentTarget.value);
  };

  /**
   * Handle min/max slider change.
   * @param {Object} range The new range of the data.
   */
  this.onChangeMinMax = function(range) {
    toolboxController.setRange(range);
  };

  /**
   * Handle display reset.
   * @param {Object} event The change event.
   */
  this.onDisplayReset = function(/*event*/) {
    self.resetLayout();
    self.initWLDisplay();
    // update preset select
    var select = self.getElement('presetSelect');
    if (select) {
      select.selectedIndex = 0;
      dwv.gui.refreshElement(select);
    }
  };

  // Private Methods -----------------------------------------------------------

  /**
   * Fire an event: call all associated listeners.
   * @param {Object} event The event to fire.
   */
  function fireEvent(event) {
    if (typeof listeners[event.type] === 'undefined') {
      return;
    }
    for (var i = 0; i < listeners[event.type].length; ++i) {
      listeners[event.type][i](event);
    }
  }

  /**
   * Generate the image data and draw it.
   */
  function generateAndDrawImage() {
    // generate image data from DICOM
    view.generateImageData(imageData);
    // set the image data of the layer
    imageLayer.setImageData(imageData);
    // draw the image
    imageLayer.draw();
  }

  /**
   * Apply the stored zoom to the layers.
   */
  function zoomLayers() {
    // image layer
    if (imageLayer) {
      imageLayer.zoom(scale, scale, scaleCenter.x, scaleCenter.y);
      imageLayer.draw();
    }
    // fire event
    fireEvent({
      type: 'zoom-change',
      scale: scale,
      cx: scaleCenter.x,
      cy: scaleCenter.y,
    });
  }

  /**
   * Apply the stored translation to the layers.
   */
  function translateLayers() {
    // image layer
    if (imageLayer) {
      imageLayer.translate(translation.x, translation.y);
      imageLayer.draw();
      // fire event
      fireEvent({
        type: 'offset-change',
        scale: scale,
        cx: imageLayer.getTrans().x,
        cy: imageLayer.getTrans().y,
      });
    }
  }

  /**
   * Handle a drag over.
   * @private
   * @param {Object} event The event to handle.
   */
  function onDragOver(event) {
    // prevent default handling
    event.stopPropagation();
    event.preventDefault();
    // update box
    var box = self.getElement('dropBox');
    if (box) {
      box.className = 'dropBox hover';
    }
  }

  /**
   * Handle a drag leave.
   * @private
   * @param {Object} event The event to handle.
   */
  function onDragLeave(event) {
    // prevent default handling
    event.stopPropagation();
    event.preventDefault();
    // update box
    var box = self.getElement('dropBox hover');
    if (box) {
      box.className = 'dropBox';
    }
  }

  /**
   * Handle a drop event.
   * @private
   * @param {Object} event The event to handle.
   */
  function onDrop(event) {
    // prevent default handling
    event.stopPropagation();
    event.preventDefault();
    // load files
    self.loadFiles(event.dataTransfer.files);
  }

  /**
   * Handle an error: display it to the user.
   * @private
   * @param {Object} error The error to handle.
   */
  function handleError(error) {
    // alert window
    if (error.name && error.message) {
      alert(error.name + ': ' + error.message);
    } else {
      alert('Error: ' + error + '.');
    }
    // log
    if (error.stack) {
      console.error(error.stack);
    }
    // stop progress
    dwv.gui.displayProgress(100);
  }

  /**
   * Handle an abort: display it to the user.
   * @param {Object} error The error to handle.
   * @private
   */
  function handleAbort(error) {
    // log
    if (error.message) {
      console.warn(error.message);
    } else {
      console.warn('Abort called.');
    }
    // stop progress
    dwv.gui.displayProgress(100);
  }

  /**
   * Handle a load progress.
   * @private
   * @param {Object} event The event to handle.
   */
  function onLoadProgress(event) {
    fireEvent(event);
    if (event.lengthComputable) {
      var percent = Math.ceil(event.loaded / event.total * 100);
      dwv.gui.displayProgress(percent);
    }
  }

  /**
   * Create the application layers.
   * @private
   * @param {Number} dataWidth The width of the input data.
   * @param {Number} dataHeight The height of the input data.
   */
  function createLayers(dataWidth, dataHeight) {
    // image layer
    var canImgLay = self.getElement('imageLayer');
    imageLayer = new dwv.html.Layer(canImgLay);
    imageLayer.initialise(dataWidth, dataHeight);
    imageLayer.fillContext();
    imageLayer.setStyleDisplay(true);
    // resize app
    if (fitToWindow) {
      self.fitToSize(dwv.gui.getWindowSize());
    } else {
      self.fitToSize({
        width: self.getElement('layerContainer').offsetWidth,
        height: self.getElement('layerContainer').offsetHeight,
      });
    }
    self.resetLayout();
  }

  /**
   * Post load application initialisation. To be called once the DICOM has been parsed.
   * @private
   * @param {Object} data The data to display.
   */
  function postLoadInit(data) {
    // only initialise the first time
    if (view) {
      return;
    }

    // get the view from the loaded data
    view = data.view;
    viewController = new dwv.ViewController(view);

    // store image
    originalImage = view.getImage();
    image = originalImage;

    // layout
    var size = image.getGeometry().getSize();
    dataWidth = size.getNumberOfColumns();
    dataHeight = size.getNumberOfRows();
    createLayers(dataWidth, dataHeight);

    // get the image data from the image layer
    imageData = imageLayer.getContext().createImageData(dataWidth, dataHeight);

    // image listeners
    view.addEventListener('wl-width-change', self.onWLChange);
    view.addEventListener('wl-center-change', self.onWLChange);
    view.addEventListener('color-change', self.onColorChange);
    view.addEventListener('slice-change', self.onSliceChange);
    view.addEventListener('frame-change', self.onFrameChange);

    // connect with local listeners
    view.addEventListener('wl-width-change', fireEvent);
    view.addEventListener('wl-center-change', fireEvent);
    view.addEventListener('color-change', fireEvent);
    view.addEventListener('position-change', fireEvent);
    view.addEventListener('slice-change', fireEvent);
    view.addEventListener('frame-change', fireEvent);

    // initialise the toolbox
    if (toolboxController) {
      toolboxController.initAndDisplay(imageLayer);
    }

    // stop box listening to drag (after first drag)
    var box = self.getElement('dropBox');
    if (box) {
      box.removeEventListener('dragover', onDragOver);
      box.removeEventListener('dragleave', onDragLeave);
      box.removeEventListener('drop', onDrop);
      dwv.html.removeNode(box);
      // switch listening to layerContainer
      var div = self.getElement('layerContainer');
      div.addEventListener('dragover', onDragOver);
      div.addEventListener('dragleave', onDragLeave);
      div.addEventListener('drop', onDrop);
    }

    // init W/L display
    self.initWLDisplay();
    // generate first image
    generateAndDrawImage();
  }
};

export default App;
