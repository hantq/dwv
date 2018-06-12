// namespaces
var dwv = dwv || {};
/** @namespace */
dwv.html = dwv.html || {};

/**
 * Append a cell to a given row.
 * @param {Object} row The row to append the cell to.
 * @param {Object} content The content of the cell.
 */
dwv.html.appendCell = function(row, content) {
  var cell = row.insertCell(-1);
  var str = content;
  // special care for arrays
  if (
    content instanceof Array ||
    content instanceof Uint8Array ||
    content instanceof Int8Array ||
    content instanceof Uint16Array ||
    content instanceof Int16Array ||
    content instanceof Uint32Array
  ) {
    if (content.length > 10) {
      content = Array.prototype.slice.call(content, 0, 10);
      content[10] = '...';
    }
    str = Array.prototype.join.call(content, ', ');
  }
  // append
  cell.appendChild(document.createTextNode(str));
};

/**
 * Append a header cell to a given row.
 * @param {Object} row The row to append the header cell to.
 * @param {String} text The text of the header cell.
 */
dwv.html.appendHCell = function(row, text) {
  var cell = document.createElement('th');
  cell.appendChild(document.createTextNode(text));
  row.appendChild(cell);
};

/**
 * Remove all children of a HTML node.
 * @param {Object} node The node to remove kids.
 */
dwv.html.cleanNode = function(node) {
  // remove its children if node exists
  if (!node) {
    return;
  }
  while (node.hasChildNodes()) {
    node.removeChild(node.firstChild);
  }
};

/**
 * Remove a HTML node and all its children.
 * @param {String} nodeId The string id of the node to delete.
 */
dwv.html.removeNode = function(node) {
  // check node
  if (!node) {
    return;
  }
  // remove its children
  dwv.html.cleanNode(node);
  // remove it from its parent
  var top = node.parentNode;
  top.removeChild(node);
};

/**
 * Remove a list of HTML nodes and all their children.
 * @param {Array} nodes The list of nodes to delete.
 */
dwv.html.removeNodes = function(nodes) {
  for (var i = 0; i < nodes.length; ++i) {
    dwv.html.removeNode(nodes[i]);
  }
};

/**
 * Create a HTML select from an input array of options.
 * The values of the options are the name of the option made lower case.
 * It is left to the user to set the 'onchange' method of the select.
 * @param {String} name The name of the HTML select.
 * @param {Mixed} list The list of options of the HTML select.
 * @param {String} i18nPrefix An optional namespace prefix to find the translation values.
 * @param {Bool} i18nSafe An optional flag to check translation existence.
 * @return {Object} The created HTML select.
 */
dwv.html.createHtmlSelect = function(name, list, i18nPrefix, i18nSafe) {
  // select
  var select = document.createElement('select');
  //select.name = name;
  select.className = name;
  var prefix = typeof i18nPrefix === 'undefined' ? '' : i18nPrefix + '.';
  var safe = typeof i18nSafe === 'undefined' ? false : true;
  var getText = function(value) {
    var key = prefix + value + '.name';
    var text = '';
    if (safe) {
      if (dwv.i18nExists(key)) {
        text = dwv.i18n(key);
      } else {
        text = value;
      }
    } else {
      text = dwv.i18n(key);
    }
    return text;
  };
  // options
  var option;
  if (list instanceof Array) {
    for (var i in list) {
      if (list.hasOwnProperty(i)) {
        option = document.createElement('option');
        option.value = list[i];
        option.appendChild(document.createTextNode(getText(list[i])));
        select.appendChild(option);
      }
    }
  } else if (typeof list === 'object') {
    for (var item in list) {
      option = document.createElement('option');
      option.value = item;
      option.appendChild(document.createTextNode(getText(item)));
      select.appendChild(option);
    }
  } else {
    throw new Error('Unsupported input list type.');
  }
  return select;
};

/**
 * Display or not an element.
 * @param {Object} element The HTML element to display.
 * @param {Boolean} flag True to display the element.
 */
dwv.html.displayElement = function(element, flag) {
  element.style.display = flag ? '' : 'none';
};

/**
 * Toggle the display of an element.
 * @param {Object} element The HTML element to display.
 */
dwv.html.toggleDisplay = function(element) {
  if (element.style.display === 'none') {
    element.style.display = '';
  } else {
    element.style.display = 'none';
  }
};

/**
 * Append an element.
 * @param {Object} parent The HTML element to append to.
 * @param {Object} element The HTML element to append.
 */
dwv.html.appendElement = function(parent, element) {
  // append
  parent.appendChild(element);
  // refresh
  dwv.gui.refreshElement(parent);
};

/**
 * Create an element.
 * @param {String} type The type of the elemnt.
 * @param {String} className The className of the element.
 */
dwv.html.createHiddenElement = function(type, className) {
  var element = document.createElement(type);
  element.className = className;
  // hide by default
  element.style.display = 'none';
  // return
  return element;
};
