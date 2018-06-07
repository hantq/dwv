// namespaces
var dwv = dwv || {};
dwv.gui = dwv.gui || {};
dwv.gui.base = dwv.gui.base || {};

/**
 * Get the size of the image display window.
 */
dwv.gui.base.getWindowSize = function() {
  return { width: window.innerWidth, height: window.innerHeight - 147 };
};

/**
 * Ask some text to the user.
 * @param {String} message Text to display to the user.
 * @param {String} defaultText Default value displayed in the text input field.
 * @return {String} Text entered by the user.
 */
dwv.gui.base.prompt = function(message, defaultText) {
  return prompt(message, defaultText);
};

/**
 * Display a progress value.
 * @param {Number} percent The progress percentage.
 */
dwv.gui.base.displayProgress = function(/*percent*/) {
  // default does nothing...
};

/**
 * Focus the view on the image.
 */
dwv.gui.base.focusImage = function() {
  // default does nothing...
};

/**
 * Post process a HTML table.
 * @param {Object} table The HTML table to process.
 * @return The processed HTML table.
 */
dwv.gui.base.postProcessTable = function(/*table*/) {
  // default does nothing...
};

/**
 * Get a HTML element associated to a container div.
 * @param {Number} containerDivId The id of the container div.
 * @param {String} name The name or id to find.
 * @return {Object} The found element or null.
 */
dwv.gui.base.getElement = function(containerDivId, name) {
  // get by class in the container div
  var parent = document.getElementById(containerDivId);
  if (!parent) {
    return null;
  }
  var elements = parent.getElementsByClassName(name);
  // getting the last element since some libraries (ie jquery-mobile) create
  // span in front of regular tags (such as select)...
  var element = elements[elements.length - 1];
  // if not found get by id with 'containerDivId-className'
  if (typeof element === 'undefined') {
    element = document.getElementById(containerDivId + '-' + name);
  }
  return element;
};

/**
 * Refresh a HTML element. Mainly for jquery-mobile.
 * @param {String} element The HTML element to refresh.
 */
dwv.gui.base.refreshElement = function(/*element*/) {
  // base does nothing...
};

/**
 * Set the selected item of a HTML select.
 * @param {String} element The HTML select element.
 * @param {String} value The value of the option to mark as selected.
 */
dwv.gui.setSelected = function(element, value) {
  if (element) {
    var index = 0;
    for (index in element.options) {
      if (element.options[index].value === value) {
        break;
      }
    }
    element.selectedIndex = index;
    dwv.gui.refreshElement(element);
  }
};

/**
 * Slider base gui.
 * @constructor
 */
dwv.gui.base.Slider = function(app) {
  /**
   * Append the slider HTML.
   */
  this.append = function() {
    // default values
    var min = 0;
    var max = 1;

    // jquery-mobile range slider
    // minimum input
    var inputMin = document.createElement('input');
    inputMin.id = 'threshold-min';
    inputMin.type = 'range';
    inputMin.max = max;
    inputMin.min = min;
    inputMin.value = min;
    // maximum input
    var inputMax = document.createElement('input');
    inputMax.id = 'threshold-max';
    inputMax.type = 'range';
    inputMax.max = max;
    inputMax.min = min;
    inputMax.value = max;
    // slicer div
    var div = document.createElement('div');
    div.id = 'threshold-div';
    div.setAttribute('data-role', 'rangeslider');
    div.appendChild(inputMin);
    div.appendChild(inputMax);
    div.setAttribute('data-mini', 'true');
    // append to document
    app.getElement('thresholdLi').appendChild(div);
    // bind change
    $('#threshold-div').on('change', function(/*event*/) {
      app.onChangeMinMax({
        min: $('#threshold-min').val(),
        max: $('#threshold-max').val(),
      });
    });
    // refresh
    dwv.gui.refreshElement(app.getElement('toolList'));
  };

  /**
   * Initialise the slider HTML.
   */
  this.initialise = function() {
    var min = app.getImage().getDataRange().min;
    var max = app.getImage().getDataRange().max;

    // minimum input
    var inputMin = document.getElementById('threshold-min');
    inputMin.max = max;
    inputMin.min = min;
    inputMin.value = min;
    // maximum input
    var inputMax = document.getElementById('threshold-max');
    inputMax.max = max;
    inputMax.min = min;
    inputMax.value = max;
    // refresh
    dwv.gui.refreshElement(app.getElement('toolList'));
  };
}; // class dwv.gui.base.Slider

/**
 * DICOM tags base gui.
 * @param {Object} app The associated application.
 * @constructor
 */
dwv.gui.base.DicomTags = function(app) {
  /**
   * Update the DICOM tags table with the input info.
   * @param {Object} dataInfo The data information.
   */
  this.update = function(dataInfo) {
    // HTML node
    var node = app.getElement('tags');
    if (node === null) {
      console.warn('Cannot find a node to append the DICOM tags.');
      return;
    }
    // remove possible previous
    while (node.hasChildNodes()) {
      node.removeChild(node.firstChild);
    }

    // exit if no tags
    if (dataInfo.length === 0) {
      console.warn('No DICOM tags to show.');
      return;
    }

    // tags HTML table
    var table = dwv.html.toTable(dataInfo);
    table.className = 'tagsTable';

    // optional gui specific table post process
    dwv.gui.postProcessTable(table);

    // check processed table
    if (table.rows.length === 0) {
      console.warn('The processed table does not contain data.');
      return;
    }

    // translate first row
    dwv.html.translateTableRow(table.rows.item(0));

    // append search form
    node.appendChild(dwv.html.getHtmlSearchForm(table));
    // append tags table
    node.appendChild(table);

    // refresh
    dwv.gui.refreshElement(node);
  };
}; // class dwv.gui.base.DicomTags
