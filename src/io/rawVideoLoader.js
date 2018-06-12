// namespaces
var dwv = dwv || {};
dwv.io = dwv.io || {};

/**
 * Raw video loader.
 * url example (cors enabled):
 *   https://raw.githubusercontent.com/clappr/clappr/master/test/fixtures/SampleVideo_360x240_1mb.mp4
 */
dwv.io.RawVideoLoader = function() {
  // closure to self
  var self = this;

  /**
   * Set the loader options.
   * @param {Object} opt The input options.
   */
  this.setOptions = function() {
    // does nothing
  };

  /**
   * Is the load ongoing? TODO...
   * @return {Boolean} True if loading.
   */
  this.isLoading = function() {
    return true;
  };

  /**
   * Internal Data URI load.
   * @param {Object} dataUri The data URI.
   * @param {String} origin The data origin.
   * @param {Number} index The data index.
   */
  this.load = function(dataUri, origin, index) {
    // create a DOM video
    var video = document.createElement('video');
    video.src = dataUri;
    // storing values to pass them on
    video.file = origin;
    video.index = index;
    // onload handler
    video.onloadedmetadata = function(/*event*/) {
      try {
        dwv.image.getViewFromDOMVideo(
          this,
          self.onload,
          self.onprogress,
          self.onloadend,
          index
        );
      } catch (error) {
        self.onerror(error);
      }
    };
  };

  /**
   * Abort load. TODO...
   */
  this.abort = function() {
    self.onabort();
  };

  /**
   * Get a file load handler.
   * @param {Object} file The file to load.
   * @param {Number} index The index 'id' of the file.
   * @return {Function} A file load handler.
   */
  this.getFileLoadHandler = function(file, index) {
    return function(event) {
      self.load(event.target.result, file, index);
    };
  };
}; // class RawVideoLoader

/**
 * Check if the loader can load the provided file.
 * @param {Object} file The file to check.
 * @return True if the file can be loaded.
 */
dwv.io.RawVideoLoader.prototype.canLoadFile = function(file) {
  return file.type.match('video.*');
};

/**
 * Check if the loader can load the provided url.
 * @param {String} url The url to check.
 * @return True if the url can be loaded.
 */
dwv.io.RawVideoLoader.prototype.canLoadUrl = function(url) {
  var ext = url
    .split('.')
    .pop()
    .toLowerCase();
  return ext === 'mp4' || ext === 'ogg' || ext === 'webm';
};

/**
 * Get the file content type needed by the loader.
 * @return One of the 'dwv.io.fileContentTypes'.
 */
dwv.io.RawVideoLoader.prototype.loadFileAs = function() {
  return dwv.io.fileContentTypes.DataURL;
};

/**
 * Get the url content type needed by the loader.
 * @return One of the 'dwv.io.urlContentTypes'.
 */
dwv.io.RawVideoLoader.prototype.loadUrlAs = function() {
  return dwv.io.urlContentTypes.ArrayBuffer;
};

/**
 * Handle a load event.
 * @param {Object} event The load event, 'event.target'
 *  should be the loaded data.
 * Default does nothing.
 */
dwv.io.RawVideoLoader.prototype.onload = function(/*event*/) {};
/**
 * Handle an load end event.
 * Default does nothing.
 */
dwv.io.RawVideoLoader.prototype.onloadend = function() {};
/**
 * Handle a progress event.
 * @param {Object} event The progress event.
 * Default does nothing.
 */
dwv.io.RawVideoLoader.prototype.onprogress = function(/*event*/) {};
/**
 * Handle an error event.
 * @param {Object} event The error event with an
 *  optional 'event.message'.
 * Default does nothing.
 */
dwv.io.RawVideoLoader.prototype.onerror = function(/*event*/) {};
/**
 * Handle an abort event.
 * @param {Object} event The abort event with an
 *  optional 'event.message'.
 * Default does nothing.
 */
dwv.io.RawVideoLoader.prototype.onabort = function(/*event*/) {};

/**
 * Add to Loader list.
 */
dwv.io.loaderList = dwv.io.loaderList || [];
dwv.io.loaderList.push('RawVideoLoader');
