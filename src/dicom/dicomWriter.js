import { dictionary } from './dictionary';
import {
  cleanString,
  getDataElementPrefixByteSize,
  getFileMetaInformationGroupLengthTag,
  getGroupElementFromName,
  getGroupElementKey,
  getTypedArray,
  is32bitVLVRFunc,
  isBigEndianTransferSyntax,
  isImplicitTransferSyntax,
  isTagWithVR as isTagWithVRFunc,
  Tag,
  TagGroups,
} from './dicomParser';

/**
 * Is this element an implicit length sequence?
 * @param {Object} element The element to check.
 * @returns {Boolean} True if it is.
 */
const isImplicitLengthSequence = function (element) {
  // sequence with no length
  return (element.vr === 'SQ') && (element.vl === 'u/l');
};

/**
 * Is this element an implicit length item?
 * @param {Object} element The element to check.
 * @returns {Boolean} True if it is.
 */
const isImplicitLengthItem = function (element) {
  // item with no length
  return (element.tag.name === 'xFFFEE000') && (element.vl === 'u/l');
};

/**
 * Is this element an implicit length pixel data?
 * @param {Object} element The element to check.
 * @returns {Boolean} True if it is.
 */
const isImplicitLengthPixels = function (element) {
  // pixel data with no length
  return (element.tag.name === 'x7FE00010') && (element.vl === 'u/l');
};

/**
 * Helper method to flatten an array of typed arrays to 2D typed array
 * @param {Array} array of typed arrays
 * @returns {Object} a typed array containing all values
 */
const flattenArrayOfTypedArrays = function (initialArray) {
  const initialArrayLength = initialArray.length;
  const arrayLength = initialArray[0].length;
  const flattenendArrayLength = initialArrayLength * arrayLength;

  const flattenedArray = new initialArray[0].constructor(flattenendArrayLength);

  for (let i = 0; i < initialArrayLength; i++) {
    const indexFlattenedArray = i * arrayLength;
    flattenedArray.set(initialArray[i], indexFlattenedArray);
  }

  return flattenedArray;
};

/**
 * Data writer.
 *
 * Example usage:
 *   const parser = new DicomParser();
 *   parser.parse(this.response);
 *
 *   const writer = new DicomWriter(parser.getRawDicomElements());
 *   const blob = new Blob([writer.getBuffer()], { type: 'application/dicom' });
 *
 *   const element = document.getElementById('download');
 *   element.href = URL.createObjectURL(blob);
 *   element.download = 'anonym.dcm';
 *
 * @constructor
 * @param {Array} buffer The input array buffer.
 * @param {Boolean} isLittleEndian Flag to tell if the data is little or big endian.
 */
const DataWriter = function (buffer, isLittleEndian = true) {
  // private DataView
  const view = new DataView(buffer);

  /**
   * Write Uint8 data.
   * @param {Number} byteOffset The offset to start writing from.
   * @param {Number} value The data to write.
   * @returns {Number} The new offset position.
   */
  this.writeUint8 = function (byteOffset, value) {
    view.setUint8(byteOffset, value);
    return byteOffset + Uint8Array.BYTES_PER_ELEMENT;
  };

  /**
   * Write Int8 data.
   * @param {Number} byteOffset The offset to start writing from.
   * @param {Number} value The data to write.
   * @returns {Number} The new offset position.
   */
  this.writeInt8 = function (byteOffset, value) {
    view.setInt8(byteOffset, value);
    return byteOffset + Int8Array.BYTES_PER_ELEMENT;
  };

  /**
   * Write Uint16 data.
   * @param {Number} byteOffset The offset to start writing from.
   * @param {Number} value The data to write.
   * @returns {Number} The new offset position.
   */
  this.writeUint16 = function (byteOffset, value) {
    view.setUint16(byteOffset, value, isLittleEndian);
    return byteOffset + Uint16Array.BYTES_PER_ELEMENT;
  };

  /**
   * Write Int16 data.
   * @param {Number} byteOffset The offset to start writing from.
   * @param {Number} value The data to write.
   * @returns {Number} The new offset position.
   */
  this.writeInt16 = function (byteOffset, value) {
    view.setInt16(byteOffset, value, isLittleEndian);
    return byteOffset + Int16Array.BYTES_PER_ELEMENT;
  };

  /**
   * Write Uint32 data.
   * @param {Number} byteOffset The offset to start writing from.
   * @param {Number} value The data to write.
   * @returns {Number} The new offset position.
   */
  this.writeUint32 = function (byteOffset, value) {
    view.setUint32(byteOffset, value, isLittleEndian);
    return byteOffset + Uint32Array.BYTES_PER_ELEMENT;
  };

  /**
   * Write Int32 data.
   * @param {Number} byteOffset The offset to start writing from.
   * @param {Number} value The data to write.
   * @returns {Number} The new offset position.
   */
  this.writeInt32 = function (byteOffset, value) {
    view.setInt32(byteOffset, value, isLittleEndian);
    return byteOffset + Int32Array.BYTES_PER_ELEMENT;
  };

  /**
   * Write Float32 data.
   * @param {Number} byteOffset The offset to start writing from.
   * @param {Number} value The data to write.
   * @returns {Number} The new offset position.
   */
  this.writeFloat32 = function (byteOffset, value) {
    view.setFloat32(byteOffset, value, isLittleEndian);
    return byteOffset + Float32Array.BYTES_PER_ELEMENT;
  };

  /**
   * Write Float64 data.
   * @param {Number} byteOffset The offset to start writing from.
   * @param {Number} value The data to write.
   * @returns {Number} The new offset position.
   */
  this.writeFloat64 = function (byteOffset, value) {
    view.setFloat64(byteOffset, value, isLittleEndian);
    return byteOffset + Float64Array.BYTES_PER_ELEMENT;
  };

  /**
   * Write string data as hexadecimal.
   * @param {Number} byteOffset The offset to start writing from.
   * @param {Number} str The padded hexadecimal string to write ('0x####').
   * @returns {Number} The new offset position.
   */
  this.writeHex = function (byteOffset, str) {
    // remove first two chars and parse
    const value = parseInt(str.substr(2), 16);
    view.setUint16(byteOffset, value, isLittleEndian);
    return byteOffset + Uint16Array.BYTES_PER_ELEMENT;
  };

  /**
   * Write string data.
   * @param {Number} byteOffset The offset to start writing from.
   * @param {Number} str The data to write.
   * @returns {Number} The new offset position.
   */
  this.writeString = function (byteOffset, str) {
    for (let i = 0, len = str.length; i < len; i++) {
      view.setUint8(byteOffset, str.charCodeAt(i));
      byteOffset += Uint8Array.BYTES_PER_ELEMENT;
    }
    return byteOffset;
  };
};

/**
 * Write Uint8 array.
 * @param {Number} byteOffset The offset to start writing from.
 * @param {Array} array The array to write.
 * @returns {Number} The new offset position.
 */
DataWriter.prototype.writeUint8Array = function (byteOffset, array) {
  for (let i = 0, len = array.length; i < len; i++) {
    byteOffset = this.writeUint8(byteOffset, array[i]);
  }
  return byteOffset;
};

/**
 * Write Int8 array.
 * @param {Number} byteOffset The offset to start writing from.
 * @param {Array} array The array to write.
 * @returns {Number} The new offset position.
 */
DataWriter.prototype.writeInt8Array = function (byteOffset, array) {
  for (let i = 0, len = array.length; i < len; i++) {
    byteOffset = this.writeInt8(byteOffset, array[i]);
  }
  return byteOffset;
};

/**
 * Write Uint16 array.
 * @param {Number} byteOffset The offset to start writing from.
 * @param {Array} array The array to write.
 * @returns {Number} The new offset position.
 */
DataWriter.prototype.writeUint16Array = function (byteOffset, array) {
  for (let i = 0, len = array.length; i < len; i++) {
    byteOffset = this.writeUint16(byteOffset, array[i]);
  }
  return byteOffset;
};

/**
 * Write Int16 array.
 * @param {Number} byteOffset The offset to start writing from.
 * @param {Array} array The array to write.
 * @returns {Number} The new offset position.
 */
DataWriter.prototype.writeInt16Array = function (byteOffset, array) {
  for (let i = 0, len = array.length; i < len; i++) {
    byteOffset = this.writeInt16(byteOffset, array[i]);
  }
  return byteOffset;
};

/**
 * Write Uint32 array.
 * @param {Number} byteOffset The offset to start writing from.
 * @param {Array} array The array to write.
 * @returns {Number} The new offset position.
 */
DataWriter.prototype.writeUint32Array = function (byteOffset, array) {
  for (let i = 0, len = array.length; i < len; i++) {
    byteOffset = this.writeUint32(byteOffset, array[i]);
  }
  return byteOffset;
};

/**
 * Write Int32 array.
 * @param {Number} byteOffset The offset to start writing from.
 * @param {Array} array The array to write.
 * @returns {Number} The new offset position.
 */
DataWriter.prototype.writeInt32Array = function (byteOffset, array) {
  for (let i = 0, len = array.length; i < len; i++) {
    byteOffset = this.writeInt32(byteOffset, array[i]);
  }
  return byteOffset;
};

/**
 * Write Float32 array.
 * @param {Number} byteOffset The offset to start writing from.
 * @param {Array} array The array to write.
 * @returns {Number} The new offset position.
 */
DataWriter.prototype.writeFloat32Array = function (byteOffset, array) {
  for (let i = 0, len = array.length; i < len; i++) {
    byteOffset = this.writeFloat32(byteOffset, array[i]);
  }
  return byteOffset;
};

/**
 * Write Float64 array.
 * @param {Number} byteOffset The offset to start writing from.
 * @param {Array} array The array to write.
 * @returns {Number} The new offset position.
 */
DataWriter.prototype.writeFloat64Array = function (byteOffset, array) {
  for (let i = 0, len = array.length; i < len; i++) {
    byteOffset = this.writeFloat64(byteOffset, array[i]);
  }
  return byteOffset;
};

/**
 * Write string array.
 * @param {Number} byteOffset The offset to start writing from.
 * @param {Array} array The array to write.
 * @returns {Number} The new offset position.
 */
DataWriter.prototype.writeStringArray = function (byteOffset, array) {
  for (let i = 0, len = array.length; i < len; i++) {
    // separator
    if (i !== 0) {
      byteOffset = this.writeString(byteOffset, '\\');
    }
    // value
    byteOffset = this.writeString(byteOffset, array[i].toString());
  }
  return byteOffset;
};

/**
 * Write a list of items.
 * @param {Number} byteOffset The offset to start writing from.
 * @param {Array} items The list of items to write.
 * @param {Boolean} isImplicit Is the DICOM VR implicit?
 * @returns {Number} The new offset position.
 */
DataWriter.prototype.writeDataElementItems = function (byteOffset, items, isImplicit) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemKeys = Object.keys(item);

    if (itemKeys.length === 0) {
      continue;
    }

    // write item
    const itemElement = item.xFFFEE000;
    itemElement.value = [];

    const implicitLength = (itemElement.vl === 'u/l');

    if (implicitLength) {
      itemElement.vl = 0xffffffff;
    }

    byteOffset = this.writeDataElement(itemElement, byteOffset, isImplicit);

    // write rest
    for (let m = 0; m < itemKeys.length; m++) {
      if (itemKeys[m] !== 'xFFFEE000' && itemKeys[m] !== 'xFFFEE00D') {
        byteOffset = this.writeDataElement(item[itemKeys[m]], byteOffset, isImplicit);
      }
    }

    // item delimitation
    if (implicitLength) {
      const itemDelimElement = {
        tag: {
          group: '0xFFFE',
          element: '0xE00D',
          name: 'ItemDelimitationItem',
        },
        vr: 'NONE',
        vl: 0,
        value: [],
      };

      byteOffset = this.writeDataElement(itemDelimElement, byteOffset, isImplicit);
    }
  }

  // return new offset
  return byteOffset;
};

/**
 * Write data with a specific Value Representation (VR).
 * @param {String} vr The data Value Representation (VR).
 * @param {Number} byteOffset The offset to start writing from.
 * @param {Array} value The array to write.
 * @param {Boolean} isImplicit Is the DICOM VR implicit?
 * @returns {Number} The new offset position.
 */
DataWriter.prototype.writeDataElementValue = function (vr, byteOffset, value, isImplicit) {
  // first check input type to know how to write
  if (value instanceof Uint8Array) {
    byteOffset = this.writeUint8Array(byteOffset, value);
  } else if (value instanceof Int8Array) {
    byteOffset = this.writeInt8Array(byteOffset, value);
  } else if (value instanceof Uint16Array) {
    byteOffset = this.writeUint16Array(byteOffset, value);
  } else if (value instanceof Int16Array) {
    byteOffset = this.writeInt16Array(byteOffset, value);
  } else if (value instanceof Uint32Array) {
    byteOffset = this.writeUint32Array(byteOffset, value);
  } else if (value instanceof Int32Array) {
    byteOffset = this.writeInt32Array(byteOffset, value);
  } else {
    // switch according to VR if input type is undefined
    if (vr === 'UN') {
      byteOffset = this.writeUint8Array(byteOffset, value);
    } else if (vr === 'OB') {
      byteOffset = this.writeInt8Array(byteOffset, value);
    } else if (vr === 'OW') {
      byteOffset = this.writeInt16Array(byteOffset, value);
    } else if (vr === 'OF') {
      byteOffset = this.writeInt32Array(byteOffset, value);
    } else if (vr === 'OD') {
      byteOffset = this.writeInt64Array(byteOffset, value);
    } else if (vr === 'US') {
      byteOffset = this.writeUint16Array(byteOffset, value);
    } else if (vr === 'SS') {
      byteOffset = this.writeInt16Array(byteOffset, value);
    } else if (vr === 'UL') {
      byteOffset = this.writeUint32Array(byteOffset, value);
    } else if (vr === 'SL') {
      byteOffset = this.writeInt32Array(byteOffset, value);
    } else if (vr === 'FL') {
      byteOffset = this.writeFloat32Array(byteOffset, value);
    } else if (vr === 'FD') {
      byteOffset = this.writeFloat64Array(byteOffset, value);
    } else if (vr === 'SQ') {
      byteOffset = this.writeDataElementItems(byteOffset, value, isImplicit);
    } else if (vr === 'AT') {
      for (let i = 0; i < value.length; i++) {
        const hexString = `${value[i]}`;
        const hexString1 = hexString.substring(1, 5);
        const hexString2 = hexString.substring(6, 10);
        const dec1 = parseInt(hexString1, 16);
        const dec2 = parseInt(hexString2, 16);
        const atValue = new Uint16Array([dec1, dec2]);

        byteOffset = this.writeUint16Array(byteOffset, atValue);
      }
    } else {
      byteOffset = this.writeStringArray(byteOffset, value);
    }
  }

  // return new offset
  return byteOffset;
};

/**
 * Write a pixel data element.
 * @param {String} vr The data Value Representation (VR).
 * @param {String} vl The data Value Length (VL).
 * @param {Number} byteOffset The offset to start writing from.
 * @param {Array} value The array to write.
 * @param {Boolean} isImplicit Is the DICOM VR implicit?
 * @returns {Number} The new offset position.
 */
DataWriter.prototype.writePixelDataElementValue = function (vr, vl, byteOffset, value, isImplicit) {
  // explicit length
  if (vl !== 'u/l') {
    const finalValue = value.length > 1 ? flattenArrayOfTypedArrays(value) : value[0];
    byteOffset = this.writeDataElementValue(vr, byteOffset, finalValue, isImplicit);
  } else {
    // pixel data as sequence
    const item = {};

    // first item: basic offset table
    item.xFFFEE000 = {
      tag: {
        group: '0xFFFE',
        element: '0xE000',
        name: 'xFFFEE000',
      },
      vr: 'UN',
      vl: 0,
      value: [],
    };

    // data
    for (let i = 0; i < value.length; i++) {
      item[i] = {
        tag: {
          group: '0xFFFE',
          element: '0xE000',
          name: 'xFFFEE000',
        },
        vr,
        vl: value[i].length,
        value: value[i],
      };
    }

    // write
    byteOffset = this.writeDataElementItems(byteOffset, [item], isImplicit);
  }

  // return new offset
  return byteOffset;
};

/**
 * Write a data element.
 * @param {Object} element The DICOM data element to write.
 * @param {Number} byteOffset The offset to start writing from.
 * @param {Boolean} isImplicit Is the DICOM VR implicit?
 * @returns {Number} The new offset position.
 */
DataWriter.prototype.writeDataElement = function (element, byteOffset, isImplicit) {
  const isTagWithVR = isTagWithVRFunc(element.tag.group, element.tag.element);
  const is32bitVLVR = (isImplicit || !isTagWithVR) ? true : is32bitVLVRFunc(element.vr);
  // group
  byteOffset = this.writeHex(byteOffset, element.tag.group);
  // element
  byteOffset = this.writeHex(byteOffset, element.tag.element);
  // VR
  if (isTagWithVR && !isImplicit) {
    byteOffset = this.writeString(byteOffset, element.vr);
    // reserved 2 bytes for 32bit VL
    if (is32bitVLVR) {
      byteOffset += 2;
    }
  }

  // update vl for sequence or item with implicit length
  let vl = element.vl;
  if (isImplicitLengthSequence(element) || isImplicitLengthItem(element) || isImplicitLengthPixels(element)) {
    vl = 0xffffffff;
  }
  // VL
  if (is32bitVLVR) {
    byteOffset = this.writeUint32(byteOffset, vl);
  } else {
    byteOffset = this.writeUint16(byteOffset, vl);
  }

  // value
  let value = element.value;
  // check value
  if (typeof value === 'undefined') {
    value = [];
  }
  // write
  if (element.tag.name === 'x7FE00010') {
    byteOffset = this.writePixelDataElementValue(element.vr, element.vl, byteOffset, value, isImplicit);
  } else {
    byteOffset = this.writeDataElementValue(element.vr, byteOffset, value, isImplicit);
  }

  // sequence delimitation item for sequence with implicit length
  if (isImplicitLengthSequence(element) || isImplicitLengthPixels(element)) {
    const seqDelimElement = {
      tag: {
        group: '0xFFFE',
        element: '0xE0DD',
        name: 'SequenceDelimitationItem'
      },
      vr: 'NONE',
      vl: 0,
      value: []
    };
    byteOffset = this.writeDataElement(seqDelimElement, byteOffset, isImplicit);
  }

  // return new offset
  return byteOffset;
};

/**
 * DICOM writer.
 * @constructor
 */
export const DicomWriter = function () {
  // possible tag actions
  const actions = {
    copy(item) { return item; },
    remove() { return null; },
    clear(item) {
      item.value[0] = '';
      item.vl = 0;
      item.endOffset = item.startOffset;
      return item;
    },
    replace(item, value) {
      item.value[0] = value;
      item.vl = value.length;
      item.endOffset = item.startOffset + value.length;
      return item;
    }
  };

    // default rules: just copy
  const defaultRules = {
    default: { action: 'copy', value: null }
  };

    /**
     * Public (modifiable) rules.
     * Set of objects as:
     *   name : { action: 'actionName', value: 'optionalValue }
     * The names are either 'default', tagName or groupName.
     * Each DICOM element will be checked to see if a rule is applicable.
     * First checked by tagName and then by groupName,
     * if nothing is found the default rule is applied.
     */
  this.rules = defaultRules;

  /**
     * Example anonymisation rules.
     */
  this.anonymisationRules = {
    default: { action: 'remove', value: null },
    PatientName: { action: 'replace', value: 'Anonymized' }, // tag
    'Meta Element': { action: 'copy', value: null }, // group 'x0002'
    Acquisition: { action: 'copy', value: null }, // group 'x0018'
    'Image Presentation': { action: 'copy', value: null }, // group 'x0028'
    Procedure: { action: 'copy', value: null }, // group 'x0040'
    'Pixel Data': { action: 'copy', value: null } // group 'x7fe0'
  };

  /**
     * Get the element to write according to the class rules.
     * Priority order: tagName, groupName, default.
     * @param {Object} element The element to check
     * @return {Object} The element to write, can be null.
     */
  this.getElementToWrite = function (element) {
    // get group and tag string name
    let tagName = null;
    const { group } = element.tag;
    const groupName = TagGroups[group.substr(1)]; // remove first 0

    if (dictionary[group] && dictionary[group][element.tag.element]) {
      tagName = dictionary[group][element.tag.element][2];
    }

    // apply rules:
    let rule;

    if (typeof this.rules[element.tag.name] !== 'undefined') {
      // 1. tag itself
      rule = this.rules[element.tag.name];
    } else if (tagName !== null && typeof this.rules[tagName] !== 'undefined') {
      // 2. tag name
      rule = this.rules[tagName];
    } else if (typeof this.rules[groupName] !== 'undefined') {
      // 3. group name
      rule = this.rules[groupName];
    } else {
      // 4. default
      rule = this.rules.default;
    }

    // apply action on element and return
    return actions[rule.action](element, rule.value);
  };
};

/**
 * Get a DICOM element from its tag name (value set separatly).
 * @param {String} tagName The string tag name.
 * @return {Object} The DICOM element.
 */
const getDicomElement = function (tagName) {
  const tagGE = getGroupElementFromName(tagName);
  // return element definition
  return {
    tag: { group: tagGE.group, element: tagGE.element },
    vr: dictionary[tagGE.group][tagGE.element][0],
    vl: dictionary[tagGE.group][tagGE.element][1]
  };
};

/**
 * Set a DICOM element value according to its VR (Value Representation).
 * @param {Object} element The DICOM element to set the value.
 * @param {Object} value The value to set.
 * @param {Boolean} isImplicit Does the data use implicit VR?
 * @return {Number} The total element size.
 */
const setElementValue = function (element, value, isImplicit) {
  // byte size of the element
  let size = 0;
  // special sequence case
  if (element.vr === 'SQ') {
    // set the value
    element.value = value;
    element.vl = 0;

    if (value !== null && value !== 0) {
      const sqItems = [];
      let name;

      // explicit or implicit length
      let explicitLength = true;
      if (typeof value.explicitLength !== 'undefined') {
        explicitLength = value.explicitLength;
        delete value.explicitLength;
      }

      // items
      let itemData;
      const itemKeys = Object.keys(value);
      for (let i = 0, leni = itemKeys.length; i < leni; ++i) {
        const itemElements = {};
        let subSize = 0;
        itemData = value[itemKeys[i]];

        // check data
        if (itemData === null || itemData === 0) {
          continue;
        }

        // elements
        var subElement;
        const elemKeys = Object.keys(itemData);
        for (let j = 0, lenj = elemKeys.length; j < lenj; ++j) {
          subElement = getDicomElement(elemKeys[j]);
          subSize += setElementValue(subElement, itemData[elemKeys[j]]);

          // add sequence delimitation size for sub sequences
          if (isImplicitLengthSequence(subElement)) {
            subSize += getDataElementPrefixByteSize('NONE', isImplicit);
          }

          name = getGroupElementKey(subElement.tag.group, subElement.tag.element);
          itemElements[name] = subElement;
          subSize += getDataElementPrefixByteSize(subElement.vr, isImplicit);
        }

        // item (after elements to get the size)
        const itemElement = {
          tag: { group: '0xFFFE', element: '0xE000' },
          vr: 'NONE',
          vl: (explicitLength ? subSize : 'u/l'),
          value: []
        };
        name = getGroupElementKey(itemElement.tag.group, itemElement.tag.element);
        itemElements[name] = itemElement;
        subSize += getDataElementPrefixByteSize('NONE', isImplicit);

        // item delimitation
        if (!explicitLength) {
          const itemDelimElement = {
            tag: { group: '0xFFFE', element: '0xE00D' },
            vr: 'NONE',
            vl: 0,
            value: []
          };
          name = getGroupElementKey(itemDelimElement.tag.group, itemDelimElement.tag.element);
          itemElements[name] = itemDelimElement;
          subSize += getDataElementPrefixByteSize('NONE', isImplicit);
        }

        size += subSize;
        sqItems.push(itemElements);
      }

      element.value = sqItems;
      if (explicitLength) {
        element.vl = size;
      } else {
        element.vl = 'u/l';
      }
    }
  } else {
    // set the value and calculate size
    size = 0;
    if (value instanceof Array) {
      element.value = value;
      for (let k = 0; k < value.length; ++k) {
        // spearator
        if (k !== 0) {
          size += 1;
        }
        // value
        size += value[k].toString().length;
      }
    } else {
      element.value = [value];
      if (typeof value !== 'undefined' && typeof value.length !== 'undefined') {
        size = value.length;
      } else {
        // numbers
        size = 1;
      }
    }

    // convert size to bytes
    if (element.vr === 'US' || element.vr === 'OW') {
      size *= Uint16Array.BYTES_PER_ELEMENT;
    } else if (element.vr === 'SS') {
      size *= Int16Array.BYTES_PER_ELEMENT;
    } else if (element.vr === 'UL') {
      size *= Uint32Array.BYTES_PER_ELEMENT;
    } else if (element.vr === 'SL') {
      size *= Int32Array.BYTES_PER_ELEMENT;
    } else if (element.vr === 'FL') {
      size *= Float32Array.BYTES_PER_ELEMENT;
    } else if (element.vr === 'FD') {
      size *= Float64Array.BYTES_PER_ELEMENT;
    } else {
      size *= Uint8Array.BYTES_PER_ELEMENT;
    }
    element.vl = size;
  }

  // return the size of that data
  return size;
};

const getVersion = function () {
  return '1.0.0';
};

/**
 * Get the ArrayBuffer corresponding to input DICOM elements.
 * @param {Array} dicomElements The wrapped elements to write.
 * @returns {ArrayBuffer} The elements as a buffer.
 */
DicomWriter.prototype.getBuffer = function (dicomElements) {
  // array keys
  const keys = Object.keys(dicomElements);

  // transfer syntax
  const syntax = cleanString(dicomElements.x00020010.value[0]);
  const isImplicit = isImplicitTransferSyntax(syntax);
  const isBigEndian = isBigEndianTransferSyntax(syntax);

  // calculate buffer size and split elements (meta and non meta)
  let totalSize = 128 + 4; // DICM
  let localSize = 0;
  const metaElements = [];
  const rawElements = [];
  let element;
  let groupName;
  let metaLength = 0;
  const fmiglTag = getFileMetaInformationGroupLengthTag();
  const icUIDTag = new Tag('0x0002', '0x0012'); // ImplementationClassUID
  const ivnTag = new Tag('0x0002', '0x0013'); // ImplementationVersionName

  for (let i = 0, leni = keys.length; i < leni; ++i) {
    element = this.getElementToWrite(dicomElements[keys[i]]);

    if (element !== null &&
      !fmiglTag.equals2(element.tag) &&
      !icUIDTag.equals2(element.tag) &&
      !ivnTag.equals2(element.tag)) {
      localSize = 0;
      // tag group name
      groupName = TagGroups[element.tag.group.substr(1)]; // remove first 0

      // prefix
      if (groupName === 'Meta Element') {
        localSize += getDataElementPrefixByteSize(element.vr, false);
      } else {
        localSize += getDataElementPrefixByteSize(element.vr, isImplicit);
      }

      // value
      const realVl = element.endOffset - element.startOffset;
      localSize += parseInt(realVl, 10);

      // add size of sequence delimitation item
      if (isImplicitLengthSequence(element) || isImplicitLengthPixels(element)) {
        localSize += getDataElementPrefixByteSize('NONE', isImplicit);
      }

      // sort elements
      if (groupName === 'Meta Element') {
        metaElements.push(element);
        metaLength += localSize;
      } else {
        rawElements.push(element);
      }

      // add to total size
      totalSize += localSize;
    }
  }

  // ImplementationClassUID
  const icUID = getDicomElement('ImplementationClassUID');
  let icUIDSize = getDataElementPrefixByteSize(icUID.vr, isImplicit);
  icUIDSize += setElementValue(icUID, `1.2.826.0.1.3680043.9.7278.1.${getVersion()}`, false);
  metaElements.push(icUID);
  metaLength += icUIDSize;
  totalSize += icUIDSize;
  // ImplementationVersionName
  const ivn = getDicomElement('ImplementationVersionName');
  let ivnSize = getDataElementPrefixByteSize(ivn.vr, isImplicit);
  let ivnValue = `DWV_${getVersion()}`;
  // odd IDs should be padded
  if (ivnValue.length % 2 === 1) {
    ivnValue += '\0';
  }
  ivnSize += setElementValue(ivn, ivnValue, false);
  metaElements.push(ivn);
  metaLength += ivnSize;
  totalSize += ivnSize;

  // create the FileMetaInformationGroupLength element
  const fmigl = getDicomElement('FileMetaInformationGroupLength');
  let fmiglSize = getDataElementPrefixByteSize(fmigl.vr, isImplicit);
  fmiglSize += setElementValue(fmigl, metaLength, false);

  // add its size to the total one
  totalSize += fmiglSize;

  // create buffer
  const buffer = new ArrayBuffer(totalSize);
  const metaWriter = new DataWriter(buffer);
  const dataWriter = new DataWriter(buffer, !isBigEndian);
  let offset = 128;
  // DICM
  offset = metaWriter.writeString(offset, 'DICM');
  // FileMetaInformationGroupLength
  offset = metaWriter.writeDataElement(fmigl, offset, false);
  // write meta
  for (let j = 0, lenj = metaElements.length; j < lenj; ++j) {
    offset = metaWriter.writeDataElement(metaElements[j], offset, false);
  }
  // write non meta
  for (let k = 0, lenk = rawElements.length; k < lenk; ++k) {
    offset = dataWriter.writeDataElement(rawElements[k], offset, isImplicit);
  }

  // return
  return buffer;
};

/**
 * Get the DICOM element from a DICOM tags object.
 * @param {Object} tags The DICOM tags object.
 * @return {Object} The DICOM elements and the end offset.
 */
// const getElementsFromJSONTags = function (tags) {
//   // transfer syntax
//   const isImplicit = isImplicitTransferSyntax(tags.TransferSyntaxUID);
//   // convert JSON to DICOM element object
//   const keys = Object.keys(tags);
//   const dicomElements = {};
//   let dicomElement;
//   let name;
//   let offset = 128 + 4; // preamble
//   let size;
//   for (let k = 0, len = keys.length; k < len; ++k) {
//     // get the DICOM element definition from its name
//     dicomElement = getDicomElement(keys[k]);
//     // set its value
//     size = setElementValue(dicomElement, tags[keys[k]], isImplicit);
//     // set offsets
//     offset += getDataElementPrefixByteSize(dicomElement.vr, isImplicit);
//     dicomElement.startOffset = offset;
//     offset += size;
//     dicomElement.endOffset = offset;
//     // create the tag group/element key
//     name = getGroupElementKey(dicomElement.tag.group, dicomElement.tag.element);
//     // store
//     dicomElements[name] = dicomElement;
//   }
//   // return
//   return { elements: dicomElements, offset };
// };

/**
 * GradSquarePixGenerator
 * Generates a small gradient square.
 * @param {Number} numberOfColumns The image number of columns.
 * @param {Number} numberOfRows The image number of rows.
 * @constructor
 */
const GradSquarePixGenerator = function (numberOfColumns, numberOfRows) {
  const halfCols = numberOfColumns * 0.5;
  const halfRows = numberOfRows * 0.5;
  const maxNoBounds = (numberOfColumns / 2 + halfCols / 2) * (numberOfRows / 2 + halfRows / 2);
  const max = 100;

  /**
     * Get a grey value.
     * @param {Number} i The column index.
     * @param {Number} j The row index.
     * @return {Array} The grey value.
     */
  this.getGrey = function (i, j) {
    let value = max;
    const jc = Math.abs(j - halfRows);
    const ic = Math.abs(i - halfCols);
    if (jc < halfRows / 2 && ic < halfCols / 2) {
      value += (i * j) * (max / maxNoBounds);
    }
    return [value];
  };

  /**
     * Get RGB values.
     * @param {Number} i The column index.
     * @param {Number} j The row index.
     * @return {Array} The [R,G,B] values.
     */
  this.getRGB = function (i, j) {
    let value = 0;
    const jc = Math.abs(j - halfRows);
    const ic = Math.abs(i - halfCols);
    if (jc < halfRows / 2 && ic < halfCols / 2) {
      value += (i * j) * (max / maxNoBounds);
    }
    if (value > 255) {
      value = 200;
    }
    return [0, value, value];
  };
};

// List of pixel generators.
const pixelGenerators = {
  gradSquare: GradSquarePixGenerator,
};

/**
 * Get the DICOM pixel data from a DICOM tags object.
 * @param {Object} tags The DICOM tags object.
 * @param {Object} startOffset The start offset of the pixel data.
 * @param {String} pixGeneratorName The name of a pixel generator.
 * @return {Object} The DICOM pixel data element.
 */
// const generatePixelDataFromJSONTags = function (tags, startOffset, pixGeneratorName = 'gradSquare') {
//   // check tags
//   if (typeof tags.TransferSyntaxUID === 'undefined') {
//     throw new Error('Missing transfer syntax for pixel generation.');
//   } else if (typeof tags.Rows === 'undefined') {
//     throw new Error('Missing number of rows for pixel generation.');
//   } else if (typeof tags.Columns === 'undefined') {
//     throw new Error('Missing number of columns for pixel generation.');
//   } else if (typeof tags.BitsAllocated === 'undefined') {
//     throw new Error('Missing BitsAllocated for pixel generation.');
//   } else if (typeof tags.PixelRepresentation === 'undefined') {
//     throw new Error('Missing PixelRepresentation for pixel generation.');
//   } else if (typeof tags.SamplesPerPixel === 'undefined') {
//     throw new Error('Missing SamplesPerPixel for pixel generation.');
//   } else if (typeof tags.PhotometricInterpretation === 'undefined') {
//     throw new Error('Missing PhotometricInterpretation for pixel generation.');
//   }

//   // extract info from tags
//   const isImplicit = isImplicitTransferSyntax(tags.TransferSyntaxUID);
//   const numberOfRows = tags.Rows;
//   const numberOfColumns = tags.Columns;
//   const bitsAllocated = tags.BitsAllocated;
//   const pixelRepresentation = tags.PixelRepresentation;
//   const samplesPerPixel = tags.SamplesPerPixel;
//   const photometricInterpretation = tags.PhotometricInterpretation;

//   const sliceLength = numberOfRows * numberOfColumns;
//   const dataLength = sliceLength * samplesPerPixel;

//   // check values
//   if (samplesPerPixel !== 1 && samplesPerPixel !== 3) {
//     throw new Error(`Unsupported SamplesPerPixel for pixel generation: ${samplesPerPixel}`);
//   }
//   if ((samplesPerPixel === 1 && !(photometricInterpretation === 'MONOCHROME1' ||
//         photometricInterpretation === 'MONOCHROME2')) ||
//         (samplesPerPixel === 3 && photometricInterpretation !== 'RGB')) {
//     throw new Error(`Unsupported PhotometricInterpretation for pixel generation: ${
//       photometricInterpretation} with SamplesPerPixel: ${samplesPerPixel}`);
//   }

//   let nSamples = 1;
//   let nColourPlanes = 1;
//   if (samplesPerPixel === 3) {
//     if (typeof tags.PlanarConfiguration === 'undefined') {
//       throw new Error('Missing PlanarConfiguration for pixel generation.');
//     }
//     const planarConfiguration = tags.PlanarConfiguration;
//     if (planarConfiguration !== 0 && planarConfiguration !== 1) {
//       throw new Error(`Unsupported PlanarConfiguration for pixel generation: ${planarConfiguration}`);
//     }
//     if (planarConfiguration === 0) {
//       nSamples = 3;
//     } else {
//       nColourPlanes = 3;
//     }
//   }

//   // create pixel array
//   const pixels = getTypedArray(bitsAllocated, pixelRepresentation, dataLength);

//   // pixels generator
//   if (typeof pixelGenerators[pixGeneratorName] === 'undefined') {
//     throw new Error(`Unknown PixelData generator: ${pixGeneratorName}`);
//   }
//   const generator = new pixelGenerators[pixGeneratorName](numberOfColumns, numberOfRows);
//   let generate = generator.getGrey;
//   if (photometricInterpretation === 'RGB') {
//     generate = generator.getRGB;
//   }

//   // main loop
//   let offset = 0;
//   for (let c = 0; c < nColourPlanes; ++c) {
//     for (let j = 0; j < numberOfRows; ++j) {
//       for (let i = 0; i < numberOfColumns; ++i) {
//         for (let s = 0; s < nSamples; ++s) {
//           if (nColourPlanes !== 1) {
//             pixels[offset] = generate(i, j)[c];
//           } else {
//             pixels[offset] = generate(i, j)[s];
//           }
//           ++offset;
//         }
//       }
//     }
//   }

//   // create and return the DICOM element
//   const vr = bitsAllocated === 8 ? 'OB' : 'OW';
//   const pixVL = getDataElementPrefixByteSize(vr, isImplicit) + (pixels.BYTES_PER_ELEMENT * dataLength);

//   return {
//     tag: { group: '0x7FE0', element: '0x0010' },
//     vr,
//     vl: pixVL,
//     value: pixels,
//     startOffset,
//     endOffset: startOffset + pixVL,
//   };
// };
