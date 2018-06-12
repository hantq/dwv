// namespaces
var dwv = dwv || {};
dwv.gui = dwv.gui || {};
dwv.gui.base = dwv.gui.base || {};

/**
 * Toolbox base gui.
 * @constructor
 */
dwv.gui.base.Toolbox = function(app) {
  /**
   * Setup the toolbox HTML.
   */
  this.setup = function(list) {
    // tool select
    var toolSelector = dwv.html.createHtmlSelect('toolSelect', list, 'tool');
    toolSelector.onchange = app.onChangeTool;

    // tool list element
    var toolLi = document.createElement('li');
    toolLi.className = 'toolLi ui-block-a';
    toolLi.style.display = 'none';
    toolLi.appendChild(toolSelector);

    // tool ul
    var toolUl = document.createElement('ul');
    toolUl.appendChild(toolLi);
    toolUl.className = 'ui-grid-b';

    // node
    var node = app.getElement('toolList');
    // append
    node.appendChild(toolUl);
    // refresh
    dwv.gui.refreshElement(node);
  };

  /**
   * Display the toolbox HTML.
   * @param {Boolean} bool True to display, false to hide.
   */
  this.display = function(bool) {
    // tool list element
    var node = app.getElement('toolLi');
    dwv.html.displayElement(node, bool);
  };

  /**
   * Initialise the toolbox HTML.
   */
  this.initialise = function(displays) {
    // tool select: reset selected option
    var toolSelector = app.getElement('toolSelect');

    // update list
    var options = toolSelector.options;
    var selectedIndex = -1;
    for (var i = 0; i < options.length; ++i) {
      if (!displays[i]) {
        options[i].style.display = 'none';
      } else {
        if (selectedIndex === -1) {
          selectedIndex = i;
        }
        options[i].style.display = '';
      }
    }
    toolSelector.selectedIndex = selectedIndex;

    // refresh
    dwv.gui.refreshElement(toolSelector);
  };
}; // dwv.gui.base.Toolbox

/**
 * WindowLevel tool base gui.
 * @constructor
 */
dwv.gui.base.WindowLevel = function(app) {
  /**
   * Setup the tool HTML.
   */
  this.setup = function() {
    // preset select
    var wlSelector = dwv.html.createHtmlSelect('presetSelect', []);
    wlSelector.onchange = app.onChangeWindowLevelPreset;
    // color map select
    var cmSelector = dwv.html.createHtmlSelect(
      'colorMapSelect',
      dwv.tool.colorMaps,
      'colormap'
    );
    cmSelector.onchange = app.onChangeColorMap;

    // preset list element
    var wlLi = document.createElement('li');
    wlLi.className = 'wlLi ui-block-b';
    //wlLi.className = "wlLi";
    wlLi.style.display = 'none';
    wlLi.appendChild(wlSelector);
    // color map list element
    var cmLi = document.createElement('li');
    cmLi.className = 'cmLi ui-block-c';
    //cmLi.className = "cmLi";
    cmLi.style.display = 'none';
    cmLi.appendChild(cmSelector);

    // node
    var node = app.getElement('toolList').getElementsByTagName('ul')[0];
    // append preset
    node.appendChild(wlLi);
    // append color map
    node.appendChild(cmLi);
    // refresh
    dwv.gui.refreshElement(node);
  };

  /**
   * Display the tool HTML.
   * @param {Boolean} bool True to display, false to hide.
   */
  this.display = function(bool) {
    // presets list element
    var node = app.getElement('wlLi');
    dwv.html.displayElement(node, bool);
    // color map list element
    node = app.getElement('cmLi');
    dwv.html.displayElement(node, bool);
  };

  /**
   * Initialise the tool HTML.
   */
  this.initialise = function() {
    // create new preset select
    var wlSelector = dwv.html.createHtmlSelect(
      'presetSelect',
      app.getViewController().getWindowLevelPresetsNames(),
      'wl.presets',
      true
    );
    wlSelector.onchange = app.onChangeWindowLevelPreset;
    wlSelector.title = 'Select w/l preset.';

    // copy html list
    var wlLi = app.getElement('wlLi');
    // clear node
    dwv.html.cleanNode(wlLi);
    // add children
    wlLi.appendChild(wlSelector);
    // refresh
    dwv.gui.refreshElement(wlLi);

    // color map select
    var cmSelector = app.getElement('colorMapSelect');
    cmSelector.selectedIndex = 0;
    // special monochrome1 case
    if (app.getImage().getPhotometricInterpretation() === 'MONOCHROME1') {
      cmSelector.selectedIndex = 1;
    }
    // refresh
    dwv.gui.refreshElement(cmSelector);
  };
}; // class dwv.gui.base.WindowLevel

/**
 * Base gui for a tool with a color setting.
 * @constructor
 */
dwv.gui.base.ColorTool = function(app, prefix) {
  // default colors
  var colors = [
    'Yellow',
    'Red',
    'White',
    'Green',
    'Blue',
    'Lime',
    'Fuchsia',
    'Black',
  ];
  // color selector class
  var colorSelectClassName = prefix + 'ColorSelect';
  // color selector class
  var colorLiClassName = prefix + 'ColorLi';

  /**
   * Get the default color.
   */
  this.getDefaultColor = function() {
    return '#FFFF80';
  };

  /**
   * Setup the tool HTML.
   */
  this.setup = function() {
    // color select
    var colorSelector = null;
    colorSelector = document.createElement('input');
    colorSelector.className = colorSelectClassName;
    colorSelector.type = 'color';
    colorSelector.value = '#FFFF80';
    colorSelector.onchange = app.onChangeLineColor;

    // color list element
    var colorLi = document.createElement('li');
    colorLi.className = colorLiClassName + ' ui-block-b';
    colorLi.style.display = 'none';
    //colorLi.setAttribute("class","ui-block-b");
    colorLi.appendChild(colorSelector);

    // node
    var node = app.getElement('toolList').getElementsByTagName('ul')[0];
    // apend color
    node.appendChild(colorLi);
    // refresh
    dwv.gui.refreshElement(node);
  };

  /**
   * Display the tool HTML.
   * @param {Boolean} bool True to display, false to hide.
   */
  this.display = function(bool) {
    // color list
    var node = app.getElement(colorLiClassName);
    dwv.html.displayElement(node, bool);
  };

  /**
   * Initialise the tool HTML.
   */
  this.initialise = function() {
    var colorSelector = app.getElement(colorSelectClassName);
    dwv.gui.refreshElement(colorSelector);
  };
}; // class dwv.gui.base.ColorTool

/**
 * ZoomAndPan tool base gui.
 * @constructor
 */
dwv.gui.base.ZoomAndPan = function(app) {
  /**
   * Setup the tool HTML.
   */
  this.setup = function() {
    // reset button
    var button = document.createElement('button');
    button.className = 'zoomResetButton';
    button.name = 'zoomResetButton';
    button.onclick = app.onZoomReset;
    button.setAttribute('style', 'width:100%; margin-top:0.5em;');
    button.setAttribute('class', 'ui-btn ui-btn-b');
    var text = document.createTextNode(dwv.i18n('basics.reset'));
    button.appendChild(text);

    // list element
    var liElement = document.createElement('li');
    liElement.className = 'zoomLi ui-block-c';
    liElement.style.display = 'none';
    //liElement.setAttribute("class","ui-block-c");
    liElement.appendChild(button);

    // node
    var node = app.getElement('toolList').getElementsByTagName('ul')[0];
    // append element
    node.appendChild(liElement);
    // refresh
    dwv.gui.refreshElement(node);
  };

  /**
   * Display the tool HTML.
   * @param {Boolean} bool True to display, false to hide.
   */
  this.display = function(bool) {
    // display list element
    var node = app.getElement('zoomLi');
    dwv.html.displayElement(node, bool);
  };
}; // class dwv.gui.base.ZoomAndPan

/**
 * Scroll tool base gui.
 * @constructor
 */
dwv.gui.base.Scroll = function(app) {
  /**
   * Setup the tool HTML.
   */
  this.setup = function() {
    // list element
    var liElement = document.createElement('li');
    liElement.className = 'scrollLi ui-block-c';
    liElement.style.display = 'none';

    // node
    var node = app.getElement('toolList').getElementsByTagName('ul')[0];
    // append element
    node.appendChild(liElement);
    // refresh
    dwv.gui.refreshElement(node);
  };

  /**
   * Display the tool HTML.
   * @param {Boolean} bool True to display, false to hide.
   */
  this.display = function(bool) {
    // display list element
    var node = app.getElement('scrollLi');
    dwv.html.displayElement(node, bool);
  };
}; // class dwv.gui.base.Scroll
