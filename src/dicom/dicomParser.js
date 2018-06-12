import { dictionary } from './dictionary';

/**
 * Clean string: trim and remove ending.
 * @param {String} inputStr The string to clean.
 * @return {String} The cleaned string.
 */
export const cleanString = function (inputStr) {
  let res = inputStr;

  if (inputStr) {
    // trim spaces
    res = inputStr.trim();
    // get rid of ending zero-width space (u200B)
    if (res[res.length - 1] === String.fromCharCode('u200B')) {
      res = res.substring(0, res.length - 1);
    }
  }

  return res;
};

/**
 * Is the Native endianness Little Endian.
 * @type Boolean
 */
const isNativeLittleEndianFunc = function () {
  return new Int8Array(new Int16Array([1]).buffer)[0] > 0;
};

/**
 * Get the utfLabel (used by the TextDecoder) from a character set term
 * References:
 * - DICOM [Value Encoding]{@link http://dicom.nema.org/dicom/2013/output/chtml/part05/chapter_6.html}
 * - DICOM [Specific Character Set]{@link http://dicom.nema.org/dicom/2013/output/chtml/part03/sect_C.12.html#sect_C.12.1.1.2}
 * - [TextDecoder#Parameters]{@link https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/TextDecoder#Parameters}
 */
const getUtfLabel = function (charSetTerm) {
  switch (charSetTerm) {
    case 'ISO_IR 100':
      return 'iso-8859-1';
    case 'ISO_IR 101':
      return 'iso-8859-2';
    case 'ISO_IR 109':
      return 'iso-8859-3';
    case 'ISO_IR 110':
      return 'iso-8859-4';
    case 'ISO_IR 144':
      return 'iso-8859-5';
    case 'ISO_IR 127':
      return 'iso-8859-6';
    case 'ISO_IR 126':
      return 'iso-8859-7';
    case 'ISO_IR 138':
      return 'iso-8859-8';
    case 'ISO_IR 148':
      return 'iso-8859-9';
    case 'ISO_IR 13':
      return 'shift-jis';
    case 'ISO_IR 166':
      return 'iso-8859-11';
    case 'ISO 2022 IR 87':
      return 'iso-2022-jp';
    // case 'ISO 2022 IR 149':
    //   // not supported by TextDecoder when it says it should...
    //   return 'iso-2022-kr';
    // case 'ISO 2022 IR 58':
    //   // not supported by TextDecoder...
    //   return 'iso-2022-cn';
    case 'GB18030':
      return 'gb18030';
    case 'GB2312':
      return 'gb2312';
    case 'GBK':
      return 'chinese';
    default:
      return 'utf-8';
  }
};

/**
 * Data reader.
 * @constructor
 * @param {Array} buffer The input array buffer.
 * @param {Boolean} isLittleEndian Flag to tell if the data is little or big endian.
 */
const DataReader = function (buffer, isLittleEndian = true) {
  // Default text decoder
  const defaultTextDecoder = {};

  defaultTextDecoder.decode = function (buf) {
    let result = '';

    for (let i = 0, leni = buf.length; i < leni; i++) {
      result += String.fromCharCode(buf[i]);
    }

    return result;
  };

  // Text decoder
  let textDecoder = defaultTextDecoder;

  if (window.TextDecoder) {
    textDecoder = new TextDecoder('iso-8859-1');
  }

  /**
   * Set the utfLabel used to construct the TextDecoder.
   * @param {String} label The encoding label.
   */
  this.setUtfLabel = function (label) {
    if (window.TextDecoder) {
      textDecoder = new TextDecoder(label);
    }
  };

  /**
   * Is the Native endianness Little Endian.
   * @private
   * @type Boolean
   */
  const isNativeLittleEndian = isNativeLittleEndianFunc();

  /**
   * Flag to know if the TypedArray data needs flipping.
   * @private
   * @type Boolean
   */
  const needFlip = (isLittleEndian !== isNativeLittleEndian);

  /**
   * The main data view.
   * @private
   * @type DataView
   */
  const view = new DataView(buffer);

  /**
   * Flip an array's endianness.
   * Inspired from [DataStream.js]{@link https://github.com/kig/DataStream.js}.
   * @param {Object} array The array to flip (modified).
   */
  this.flipArrayEndianness = function (array) {
    const blen = array.byteLength;
    const u8 = new Uint8Array(array.buffer, array.byteOffset, blen);
    const bpel = array.BYTES_PER_ELEMENT;

    for (let i = 0; i < blen; i += bpel) {
      for (let j = i + bpel - 1, k = i; j > k; j--, k++) {
        [u8[k], u8[j]] = [u8[j], u8[k]];
      }
    }
  };

  /**
   * Read Uint16 (2 bytes) data.
   * @param {Number} byteOffset The offset to start reading from.
   * @return {Number} The read data.
   */
  this.readUint16 = function (byteOffset) {
    return view.getUint16(byteOffset, isLittleEndian);
  };

  /**
   * Read Uint32 (4 bytes) data.
   * @param {Number} byteOffset The offset to start reading from.
   * @return {Number} The read data.
   */
  this.readUint32 = function (byteOffset) {
    return view.getUint32(byteOffset, isLittleEndian);
  };

  /**
   * Read Int32 (4 bytes) data.
   * @param {Number} byteOffset The offset to start reading from.
   * @return {Number} The read data.
   */
  this.readInt32 = function (byteOffset) {
    return view.getInt32(byteOffset, isLittleEndian);
  };

  /**
   * Read Uint8 array.
   * @param {Number} byteOffset The offset to start reading from.
   * @param {Number} size The size of the array.
   * @return {Array} The read data.
   */
  this.readUint8Array = function (byteOffset, size) {
    return new Uint8Array(buffer, byteOffset, size);
  };

  /**
   * Read Int8 array.
   * @param {Number} byteOffset The offset to start reading from.
   * @param {Number} size The size of the array.
   * @return {Array} The read data.
   */
  this.readInt8Array = function (byteOffset, size) {
    return new Int8Array(buffer, byteOffset, size);
  };

  /**
   * Read Uint16 array.
   * @param {Number} byteOffset The offset to start reading from.
   * @param {Number} size The size of the array.
   * @return {Array} The read data.
   */
  this.readUint16Array = function (byteOffset, size) {
    const arraySize = size / Uint16Array.BYTES_PER_ELEMENT;
    let data = null;

    // byteOffset should be a multiple of Uint16Array.BYTES_PER_ELEMENT (=2)
    if ((byteOffset % Uint16Array.BYTES_PER_ELEMENT) === 0) {
      data = new Uint16Array(buffer, byteOffset, arraySize);
      if (needFlip) {
        this.flipArrayEndianness(data);
      }
    } else {
      data = new Uint16Array(arraySize);
      for (let i = 0; i < arraySize; ++i) {
        data[i] = view.getInt16((byteOffset + Uint16Array.BYTES_PER_ELEMENT * i), isLittleEndian);
      }
    }
    return data;
  };

  /**
   * Read Int16 array.
   * @param {Number} byteOffset The offset to start reading from.
   * @param {Number} size The size of the array.
   * @return {Array} The read data.
   */
  this.readInt16Array = function (byteOffset, size) {
    const arraySize = size / Int16Array.BYTES_PER_ELEMENT;
    let data = null;

    // byteOffset should be a multiple of Int16Array.BYTES_PER_ELEMENT (=2)
    if ((byteOffset % Int16Array.BYTES_PER_ELEMENT) === 0) {
      data = new Int16Array(buffer, byteOffset, arraySize);
      if (needFlip) {
        this.flipArrayEndianness(data);
      }
    } else {
      data = new Int16Array(arraySize);
      for (let i = 0; i < arraySize; ++i) {
        data[i] = view.getInt16((byteOffset + Int16Array.BYTES_PER_ELEMENT * i), isLittleEndian);
      }
    }

    return data;
  };

  /**
   * Read Uint32 array.
   * @param {Number} byteOffset The offset to start reading from.
   * @param {Number} size The size of the array.
   * @return {Array} The read data.
   */
  this.readUint32Array = function (byteOffset, size) {
    const arraySize = size / Uint32Array.BYTES_PER_ELEMENT;
    let data = null;

    // byteOffset should be a multiple of Uint32Array.BYTES_PER_ELEMENT (=4)
    if ((byteOffset % Uint32Array.BYTES_PER_ELEMENT) === 0) {
      data = new Uint32Array(buffer, byteOffset, arraySize);
      if (needFlip) {
        this.flipArrayEndianness(data);
      }
    } else {
      data = new Uint32Array(arraySize);
      for (let i = 0; i < arraySize; ++i) {
        data[i] = view.getUint32((byteOffset + Uint32Array.BYTES_PER_ELEMENT * i), isLittleEndian);
      }
    }

    return data;
  };

  /**
   * Read Int32 array.
   * @param {Number} byteOffset The offset to start reading from.
   * @param {Number} size The size of the array.
   * @return {Array} The read data.
   */
  this.readInt32Array = function (byteOffset, size) {
    const arraySize = size / Int32Array.BYTES_PER_ELEMENT;
    let data = null;

    // byteOffset should be a multiple of Int32Array.BYTES_PER_ELEMENT (=4)
    if ((byteOffset % Int32Array.BYTES_PER_ELEMENT) === 0) {
      data = new Int32Array(buffer, byteOffset, arraySize);
      if (needFlip) {
        this.flipArrayEndianness(data);
      }
    } else {
      data = new Int32Array(arraySize);
      for (let i = 0; i < arraySize; ++i) {
        data[i] = view.getInt32((byteOffset + Int32Array.BYTES_PER_ELEMENT * i), isLittleEndian);
      }
    }

    return data;
  };

  /**
   * Read Float32 array.
   * @param {Number} byteOffset The offset to start reading from.
   * @param {Number} size The size of the array.
   * @return {Array} The read data.
   */
  this.readFloat32Array = function (byteOffset, size) {
    const arraySize = size / Float32Array.BYTES_PER_ELEMENT;
    let data = null;

    // byteOffset should be a multiple of Float32Array.BYTES_PER_ELEMENT (=4)
    if ((byteOffset % Float32Array.BYTES_PER_ELEMENT) === 0) {
      data = new Float32Array(buffer, byteOffset, arraySize);
      if (needFlip) {
        this.flipArrayEndianness(data);
      }
    } else {
      data = new Float32Array(arraySize);
      for (let i = 0; i < arraySize; ++i) {
        data[i] = view.getFloat32((byteOffset + Float32Array.BYTES_PER_ELEMENT * i), isLittleEndian);
      }
    }

    return data;
  };

  /**
   * Read Float64 array.
   * @param {Number} byteOffset The offset to start reading from.
   * @param {Number} size The size of the array.
   * @return {Array} The read data.
   */
  this.readFloat64Array = function (byteOffset, size) {
    const arraySize = size / Float64Array.BYTES_PER_ELEMENT;
    let data = null;

    // byteOffset should be a multiple of Float64Array.BYTES_PER_ELEMENT (=8)
    if ((byteOffset % Float64Array.BYTES_PER_ELEMENT) === 0) {
      data = new Float64Array(buffer, byteOffset, arraySize);
      if (needFlip) {
        this.flipArrayEndianness(data);
      }
    } else {
      data = new Float64Array(arraySize);
      for (let i = 0; i < arraySize; ++i) {
        data[i] = view.getFloat64((byteOffset + Float64Array.BYTES_PER_ELEMENT * i), isLittleEndian);
      }
    }

    return data;
  };

  /**
   * Read data as an hexadecimal string.
   * @param {Number} byteOffset The offset to start reading from.
   * @return {Array} The read data.
   */
  this.readHex = function (byteOffset) {
    // read and convert to hex string
    const str = this.readUint16(byteOffset).toString(16);
    // return padded
    return '0x0000'.substr(0, 6 - str.length) + str.toUpperCase();
  };

  /**
   * Read data as a string.
   * @param {Number} byteOffset The offset to start reading from.
   * @param {Number} nChars The number of characters to read.
   * @return {String} The read data.
   */
  this.readString = function (byteOffset, nChars) {
    const data = this.readUint8Array(byteOffset, nChars);
    return defaultTextDecoder.decode(data);
  };

  /**
   * Read data as a 'special' string, decoding it if the TextDecoder is available.
   * @param {Number} byteOffset The offset to start reading from.
   * @param {Number} nChars The number of characters to read.
   * @return {String} The read data.
   */
  this.readSpecialString = function (byteOffset, nChars) {
    const data = this.readUint8Array(byteOffset, nChars);
    return textDecoder.decode(data);
  };
};

/**
 * Get the group-element pair from a tag string name.
 * @param {String} tagName The tag string name.
 * @return {Object} group-element pair.
 */
const getGroupElementFromName = function (tagName) {
  const keys0 = Object.keys(dictionary);
  let group;
  let element;

  outLabel: for (let k0 = 0, lenK0 = keys0.length; k0 < lenK0; ++k0) {
    // search through dictionary
    group = keys0[k0];
    const keys1 = Object.keys(dictionary[group]);

    for (let k1 = 0, lenK1 = keys1.length; k1 < lenK1; ++k1) {
      element = keys1[k1];
      if (dictionary[group][element][2] === tagName) {
        break outLabel;
      }
    }
  }

  return { group, element };
};

/**
 * Immutable tag.
 * @constructor
 * @param {String} group The tag group.
 * @param {String} element The tag element.
 */
export const Tag = function (group, element) {
  /**
     * Get the tag group.
     * @return {String} The tag group.
     */
  this.getGroup = function () { return group; };
  /**
     * Get the tag element.
     * @return {String} The tag element.
     */
  this.getElement = function () { return element; };
}; // Tag class

/**
 * Check for Tag equality.
 * @param {Object} rhs The other tag to compare to.
 * @return {Boolean} True if both tags are equal.
 */
Tag.prototype.equals = function (rhs) {
  return rhs !== null && this.getGroup() === rhs.getGroup() && this.getElement() === rhs.getElement();
};

/**
 * Check for Tag equality.
 * @param {Object} rhs The other tag to compare to provided as a simple object.
 * @return {Boolean} True if both tags are equal.
 */
Tag.prototype.equals2 = function (rhs) {
  if (rhs === null ||
    typeof rhs.group === 'undefined' ||
    typeof rhs.element === 'undefined') {
    return false;
  }

  return this.equals(new Tag(rhs.group, rhs.element));
};

// Get the FileMetaInformationGroupLength Tag.
export const getFileMetaInformationGroupLengthTag = function () {
  return new Tag('0x0002', '0x0000');
};

// Get the Item Tag.
// const getItemTag = function () {
//   return new Tag('0xFFFE', '0xE000');
// };

// Get the ItemDelimitationItem Tag.
// const getItemDelimitationItemTag = function () {
//   return new Tag('0xFFFE', '0xE00D');
// };

// Get the SequenceDelimitationItem Tag.
// const getSequenceDelimitationItemTag = function () {
//   return new Tag('0xFFFE', '0xE0DD');
// };

// Get the PixelData Tag.
// const getPixelDataTag = function () {
//   return new Tag('0x7FE0', '0x0010');
// };

/**
 * Get the group-element key used to store DICOM elements.
 * @param {Number} group The DICOM group.
 * @param {Number} element The DICOM element.
 * @return {String} The key.
 */
export const getGroupElementKey = function (group, element) {
  return `x${group.substr(2, 6)}${element.substr(2, 6)}`;
};

/**
 * Split a group-element key used to store DICOM elements.
 * @param {String} key The key in form "x00280102.
 * @return {Object} The DICOM group and element.
 */

// const splitGroupElementKey = function (key) {
//   return { group: key.substr(1, 4), element: key.substr(5, 8) };
// };

/**
 * Get patient orientation label in the reverse direction.
 * @param {String} ori Patient Orientation value.
 * @return {String} Reverse Orientation Label.
 */
// const getReverseOrientation = function (ori) {
//   if (!ori) {
//     return null;
//   }

//   // reverse labels
//   const rlabels = {
//     L: 'R',
//     R: 'L',
//     A: 'P',
//     P: 'A',
//     H: 'F',
//     F: 'H'
//   };

//   let rori = '';
//   for (let n = 0; n < ori.length; n++) {
//     const o = ori.substr(n, 1);
//     const r = rlabels[o];
//     if (r) {
//       rori += r;
//     }
//   }

//   // return
//   return rori;
// };

/**
 * Tell if a given syntax is an implicit one (element with no VR).
 * @param {String} syntax The transfer syntax to test.
 * @return {Boolean} True if an implicit syntax.
 */
export const isImplicitTransferSyntax = function (syntax) {
  return syntax === '1.2.840.10008.1.2';
};

/**
 * Tell if a given syntax is a big endian syntax.
 * @param {String} syntax The transfer syntax to test.
 * @return {Boolean} True if a big endian syntax.
 */
export const isBigEndianTransferSyntax = function (syntax) {
  return syntax === '1.2.840.10008.1.2.2';
};

/**
 * Tell if a given syntax is a JPEG baseline one.
 * @param {String} syntax The transfer syntax to test.
 * @return {Boolean} True if a jpeg baseline syntax.
 */
export const isJpegBaselineTransferSyntax = function (syntax) {
  return syntax === '1.2.840.10008.1.2.4.50' || syntax === '1.2.840.10008.1.2.4.51';
};

/**
 * Tell if a given syntax is a JPEG Lossless one.
 * @param {String} syntax The transfer syntax to test.
 * @return {Boolean} True if a jpeg lossless syntax.
 */
export const isJpegLosslessTransferSyntax = function (syntax) {
  return syntax === '1.2.840.10008.1.2.4.57' || syntax === '1.2.840.10008.1.2.4.70';
};

/**
 * Tell if a given syntax is a retired JPEG one.
 * @param {String} syntax The transfer syntax to test.
 * @return {Boolean} True if a retired jpeg syntax.
 */
const isJpegRetiredTransferSyntax = function (syntax) {
  return (syntax.match(/1.2.840.10008.1.2.4.5/) !== null &&
    !isJpegBaselineTransferSyntax() &&
    !isJpegLosslessTransferSyntax()) ||
    syntax.match(/1.2.840.10008.1.2.4.6/) !== null;
};

/**
 * Tell if a given syntax is a JPEG-LS one.
 * @param {String} syntax The transfer syntax to test.
 * @return {Boolean} True if a jpeg-ls syntax.
 */
const isJpeglsTransferSyntax = function (syntax) {
  return syntax.match(/1.2.840.10008.1.2.4.8/) !== null;
};

/**
 * Tell if a given syntax is a JPEG 2000 one.
 * @param {String} syntax The transfer syntax to test.
 * @return {Boolean} True if a jpeg 2000 syntax.
 */
export const isJpeg2000TransferSyntax = function (syntax) {
  return syntax.match(/1.2.840.10008.1.2.4.9/) !== null;
};

/**
 * Tell if a given syntax needs decompression.
 * @param {String} syntax The transfer syntax to test.
 * @return {String} The name of the decompression algorithm.
 */
export const getSyntaxDecompressionName = function (syntax) {
  let algo = null;

  if (isJpeg2000TransferSyntax(syntax)) {
    algo = 'jpeg2000';
  } else if (isJpegBaselineTransferSyntax(syntax)) {
    algo = 'jpeg-baseline';
  } else if (isJpegLosslessTransferSyntax(syntax)) {
    algo = 'jpeg-lossless';
  }

  return algo;
};

/**
 * Tell if a given syntax is supported for reading.
 * @param {String} syntax The transfer syntax to test.
 * @return {Boolean} True if a supported syntax.
 */
const isReadSupportedTransferSyntax = function (syntax) {
  // Unsupported:
  // "1.2.840.10008.1.2.1.99": Deflated Explicit VR - Little Endian
  // "1.2.840.10008.1.2.4.100": MPEG2 Image Compression
  // isJpegRetiredTransferSyntax(syntax): non supported JPEG
  // isJpeglsTransferSyntax(syntax): JPEG-LS
  // "1.2.840.10008.1.2.5": RLE (lossless)

  return (syntax === '1.2.840.10008.1.2' || // Implicit VR - Little Endian
    syntax === '1.2.840.10008.1.2.1' || // Explicit VR - Little Endian
    syntax === '1.2.840.10008.1.2.2' || // Explicit VR - Big Endian
    isJpegBaselineTransferSyntax(syntax) || // JPEG baseline
    isJpegLosslessTransferSyntax(syntax) || // JPEG Lossless
    isJpeg2000TransferSyntax(syntax)); // JPEG 2000
};

/**
 * Get the transfer syntax name.
 * Reference: [UID Values]{@link http://dicom.nema.org/dicom/2013/output/chtml/part06/chapter_A.html}.
 * @param {String} syntax The transfer syntax.
 * @return {String} The name of the transfer syntax.
 */
const getTransferSyntaxName = function (syntax) {
  switch (true) {
    case syntax === '1.2.840.10008.1.2':
      // Implicit VR - Little Endian
      return 'Little Endian Implicit';
    case syntax === '1.2.840.10008.1.2.1':
      // Explicit VR - Little Endian
      return 'Little Endian Explicit';
    case syntax === '1.2.840.10008.1.2.1.99':
      // Deflated Explicit VR - Little Endian
      return 'Little Endian Deflated Explicit';
    case syntax === '1.2.840.10008.1.2.2':
      // Explicit VR - Big Endian
      return 'Big Endian Explicit';
    case isJpegBaselineTransferSyntax(syntax):
      // JPEG baseline
      return syntax === '1.2.840.10008.1.2.4.50' ? 'JPEG Baseline' : 'JPEG Extended, Process 2+4';
    case isJpegLosslessTransferSyntax(syntax):
      // JPEG Lossless
      return syntax === '1.2.840.10008.1.2.4.57' ? 'JPEG Lossless, Nonhierarchical (Processes 14)' : 'JPEG Lossless, Non-hierarchical, 1st Order Prediction';
    case isJpegRetiredTransferSyntax(syntax):
      // Retired JPEG
      return 'Retired JPEG';
    case isJpeglsTransferSyntax(syntax):
      // JPEG-LS
      return 'JPEG-LS';
    case isJpeg2000TransferSyntax(syntax):
      // JPEG 2000
      return syntax === '1.2.840.10008.1.2.4.91' ? 'JPEG 2000 (Lossless or Lossy)' : 'JPEG 2000 (Lossless only)';
    case syntax === '1.2.840.10008.1.2.4.100':
      // MPEG2 Image Compression
      return 'MPEG2';
    case syntax === '1.2.840.10008.1.2.5':
      // RLE (lossless)
      return 'RLE';
    default:
      return 'Unknown';
  }
};

/**
 * Get the appropriate TypedArray in function of arguments.
 * @param {Number} bitsAllocated The number of bites used to store the data: [8, 16, 32].
 * @param {Number} pixelRepresentation The pixel representation, 0:unsigned;1:signed.
 * @param {Size} size The size of the new array.
 * @return The good typed array.
 */
export const getTypedArray = function (bitsAllocated, pixelRepresentation, size) {
  let res = null;

  if (bitsAllocated === 8) {
    if (pixelRepresentation === 0) {
      res = new Uint8Array(size);
    } else {
      res = new Int8Array(size);
    }
  } else if (bitsAllocated === 16) {
    if (pixelRepresentation === 0) {
      res = new Uint16Array(size);
    } else {
      res = new Int16Array(size);
    }
  } else if (bitsAllocated === 32) {
    if (pixelRepresentation === 0) {
      res = new Uint32Array(size);
    } else {
      res = new Int32Array(size);
    }
  }

  return res;
};

/**
 * Does this Value Representation (VR) have a 32bit Value Length (VL).
 * Ref: [Data Element explicit]{@link http://dicom.nema.org/dicom/2013/output/chtml/part05/chapter_7.html#table_7.1-1}.
 * @param {String} vr The data Value Representation (VR).
 * @returns {Boolean} True if this VR has a 32-bit VL.
 */
export const is32bitVLVRFunc = function (vr) {
  // added locally used 'ox'
  return (vr === 'OB' || vr === 'OW' || vr === 'OF' || vr === 'ox' || vr === 'UT' ||
    vr === 'SQ' || vr === 'UN');
};

/**
 * Does this tag have a VR.
 * Basically the Item, ItemDelimitationItem and SequenceDelimitationItem tags.
 * @param {String} group The tag group.
 * @param {String} element The tag element.
 * @returns {Boolean} True if this tar has a VR.
 */
export const isTagWithVR = function (group, element) {
  return !(group === '0xFFFE' && (element === '0xE000' || element === '0xE00D' || element === '0xE0DD'));
};


/**
 * Get the number of bytes occupied by a data element prefix, i.e. without its value.
 * @param {String} vr The Value Representation of the element.
 * @param {Boolean} isImplicit Does the data use implicit VR?
 * WARNING: this is valid for tags with a VR, if not sure use the 'isTagWithVR' function first.
 * Reference:
 * - [Data Element explicit]{@link http://dicom.nema.org/dicom/2013/output/chtml/part05/chapter_7.html#table_7.1-1},
 * - [Data Element implicit]{@link http://dicom.nema.org/dicom/2013/output/chtml/part05/sect_7.5.html#table_7.5-1}.
 *
 * | Tag | VR  | VL | Value |
 * | 4   | 2   | 2  | X     | -> regular explicit: 8 + X
 * | 4   | 2+2 | 4  | X     | -> 32bit VL: 12 + X
 *
 * | Tag | VL | Value |
 * | 4   | 4  | X     | -> implicit (32bit VL): 8 + X
 *
 * | Tag | Len | Value |
 * | 4   | 4   | X     | -> item: 8 + X
 */
export const getDataElementPrefixByteSize = function (vr, isImplicit) {
  return (isImplicit || !is32bitVLVRFunc(vr)) ? 8 : 12;
};

/**
 * DicomElements wrapper.
 * @constructor
 * @param {Array} dicomElements The elements to wrap.
 */
const DicomElementsWrapper = function (dicomElements) {
  /**
    * Get a DICOM Element value from a group/element key.
    * @param {String} groupElementKey The key to retrieve.
    * @return {Object} The DICOM element.
    */
  this.getDEFromKey = function (groupElementKey) {
    return dicomElements[groupElementKey];
  };

  /**
    * Get a DICOM Element value from a group/element key.
    * @param {String} groupElementKey The key to retrieve.
    * @param {Boolean} asArray Get the value as an Array.
    * @return {Object} The DICOM element value.
    */
  this.getFromKey = function (groupElementKey, asArray = false) {
    let value = null;
    const dElement = dicomElements[groupElementKey];

    if (typeof dElement !== 'undefined') {
      // raw value if only one
      if (dElement.value.length === 1 && asArray === false) {
        value = dElement.value[0];
      } else {
        value = dElement.value;
      }
    }

    return value;
  };

  /**
     * Dump the DICOM tags to an array.
     * @return {Array}
     */
  this.dumpToTable = function () {
    const keys = Object.keys(dicomElements);
    const table = [];
    let dicomElement = null;
    let dictElement = null;
    let row = null;

    for (let i = 0, leni = keys.length; i < leni; ++i) {
      dicomElement = dicomElements[keys[i]];
      row = {};
      // dictionnary entry (to get name)
      dictElement = null;
      if (typeof dictionary[dicomElement.tag.group] !== 'undefined' &&
                    typeof dictionary[dicomElement.tag.group][dicomElement.tag.element] !== 'undefined') {
        dictElement = dictionary[dicomElement.tag.group][dicomElement.tag.element];
      }
      // name
      if (dictElement !== null) {
        row.name = dictElement[2];
      } else {
        row.name = 'Unknown Tag & Data';
      }
      // value
      row.value = this.getElementValueAsString(dicomElement);
      // others
      row.group = dicomElement.tag.group;
      row.element = dicomElement.tag.element;
      row.vr = dicomElement.vr;
      row.vl = dicomElement.vl;

      table.push(row);
    }

    return table;
  };

  /**
     * Dump the DICOM tags to a string.
     * @return {String} The dumped file.
     */
  this.dump = function () {
    const keys = Object.keys(dicomElements);
    let result = '\n';
    result += '# Dicom-File-Format\n';
    result += '\n';
    result += '# Dicom-Meta-Information-Header\n';
    result += '# Used TransferSyntax: ';
    if (isNativeLittleEndianFunc()) {
      result += 'Little Endian Explicit\n';
    } else {
      result += 'NOT Little Endian Explicit\n';
    }
    let dicomElement = null;
    let checkHeader = true;
    for (let i = 0, leni = keys.length; i < leni; ++i) {
      dicomElement = dicomElements[keys[i]];
      if (checkHeader && dicomElement.tag.group !== '0x0002') {
        result += '\n';
        result += '# Dicom-Data-Set\n';
        result += '# Used TransferSyntax: ';
        const syntax = cleanString(dicomElements.x00020010.value[0]);
        result += getTransferSyntaxName(syntax);
        result += '\n';
        checkHeader = false;
      }
      result += `${this.getElementAsString(dicomElement)}\n`;
    }
    return result;
  };
};

/**
 * Get a data element value as a string.
 * @param {Object} dicomElement The DICOM element.
 * @param {Boolean} pretty When set to true, returns a 'pretified' content.
 * @return {String} A string representation of the DICOM element.
 */
DicomElementsWrapper.prototype.getElementValueAsString = function (dicomElement, pretty = true) {
  let str = '';
  const strLenLimit = 65;

  // check dicom element input
  if (typeof dicomElement === 'undefined' || dicomElement === null) {
    return str;
  }

  // Polyfill for Number.isInteger.
  const isInteger = Number.isInteger || function (value) {
    return typeof value === 'number' && Number.isFinite(value) && Math.floor(value) === value;
  };

  // TODO Support sequences.
  if (dicomElement.vr !== 'SQ' && dicomElement.value.length === 1 && dicomElement.value[0] === '') {
    str += '(no value available)';
  } else if (dicomElement.tag.group === '0x7FE0' && dicomElement.tag.element === '0x0010' && dicomElement.vl === 'u/l') {
    str = '(PixelSequence)';
  } else if (dicomElement.vr === 'DA' && pretty) {
    const daValue = dicomElement.value[0];
    const daYear = parseInt(daValue.substr(0, 4), 10);
    const daMonth = parseInt(daValue.substr(4, 2), 10) - 1; // 0-11
    const daDay = parseInt(daValue.substr(6, 2), 10);
    const da = new Date(daYear, daMonth, daDay);
    str = da.toLocaleDateString();
  } else if (dicomElement.vr === 'TM' && pretty) {
    const tmValue = dicomElement.value[0];
    const tmHour = tmValue.substr(0, 2);
    const tmMinute = tmValue.length >= 4 ? tmValue.substr(2, 2) : '00';
    const tmSeconds = tmValue.length >= 6 ? tmValue.substr(4, 2) : '00';
    str = `${tmHour}:${tmMinute}:${tmSeconds}`;
  } else {
    const isOtherVR = (dicomElement.vr[0].toUpperCase() === 'O');
    const isFloatNumberVR = (dicomElement.vr === 'FL' || dicomElement.vr === 'FD' || dicomElement.vr === 'DS');
    let valueStr = '';

    for (let k = 0, lenk = dicomElement.value.length; k < lenk; ++k) {
      valueStr = '';
      if (k !== 0) {
        valueStr += '\\';
      }
      if (isFloatNumberVR) {
        let val = dicomElement.value[k];
        if (typeof val === 'string') {
          val = cleanString(val);
        }
        const num = Number(val);
        if (!isInteger(num) && pretty) {
          valueStr += num.toPrecision(4);
        } else {
          valueStr += num.toString();
        }
      } else if (isOtherVR) {
        let tmp = dicomElement.value[k].toString(16);
        if (dicomElement.vr === 'OB') {
          tmp = '00'.substr(0, 2 - tmp.length) + tmp;
        } else {
          tmp = '0000'.substr(0, 4 - tmp.length) + tmp;
        }
        valueStr += tmp;
      } else if (typeof dicomElement.value[k] === 'string') {
        valueStr += cleanString(dicomElement.value[k]);
      } else {
        valueStr += dicomElement.value[k];
      }
      // check length
      if (str.length + valueStr.length <= strLenLimit) {
        str += valueStr;
      } else {
        str += '...';
        break;
      }
    }
  }
  return str;
};

/**
 * Get a data element value as a string.
 * @param {String} groupElementKey The key to retrieve.
 */
DicomElementsWrapper.prototype.getElementValueAsStringFromKey = function (groupElementKey) {
  return this.getElementValueAsString(this.getDEFromKey(groupElementKey));
};

/**
 * Get a data element as a string.
 * @param {Object} dicomElement The DICOM element.
 * @param {String} prefix A string to prepend this one.
 */
DicomElementsWrapper.prototype.getElementAsString = function (dicomElement, prefix = '') {
  let dictElement = null;

  if (typeof dictionary[dicomElement.tag.group] !== 'undefined' && typeof dictionary[dicomElement.tag.group][dicomElement.tag.element] !== 'undefined') {
    dictElement = dictionary[dicomElement.tag.group][dicomElement.tag.element];
  }

  let deSize = dicomElement.value.length;
  const isOtherVR = (dicomElement.vr[0].toUpperCase() === 'O');

  // no size for delimitations
  if (dicomElement.tag.group === '0xFFFE' && (dicomElement.tag.element === '0xE00D' || dicomElement.tag.element === '0xE0DD')) {
    deSize = 0;
  } else if (isOtherVR) {
    deSize = 1;
  }

  const isPixSequence = (dicomElement.tag.group === '0x7FE0' &&
        dicomElement.tag.element === '0x0010' &&
        dicomElement.vl === 'u/l');

  let line = null;

  // (group,element)
  line = '(';
  line += dicomElement.tag.group.substr(2, 5).toLowerCase();
  line += ',';
  line += dicomElement.tag.element.substr(2, 5).toLowerCase();
  line += ') ';
  // value representation
  line += dicomElement.vr;
  // value
  if (dicomElement.vr !== 'SQ' && dicomElement.value.length === 1 && dicomElement.value[0] === '') {
    line += ' (no value available)';
    deSize = 0;
  } else if (dicomElement.vr === 'na') {
    // simple number display
    line += ' ';
    line += dicomElement.value[0];
  } else if (isPixSequence) {
    // pixel sequence
    line += ` (PixelSequence #=${deSize})`;
  } else if (dicomElement.vr === 'SQ') {
    line += ' (Sequence with';
    if (dicomElement.vl === 'u/l') {
      line += ' undefined';
    } else {
      line += ' explicit';
    }
    line += ' length #=';
    line += dicomElement.value.length;
    line += ')';
  } else if (isOtherVR ||
    dicomElement.vr === 'pi' ||
    dicomElement.vr === 'UL' ||
    dicomElement.vr === 'US' ||
    dicomElement.vr === 'SL' ||
    dicomElement.vr === 'SS' ||
    dicomElement.vr === 'FL' ||
    dicomElement.vr === 'FD' ||
    dicomElement.vr === 'AT') {
    // 'O'ther array, limited display length
    line += ' ';
    line += this.getElementValueAsString(dicomElement, false);
  } else {
    // default
    line += ' [';
    line += this.getElementValueAsString(dicomElement, false);
    line += ']';
  }

  // align #
  const nSpaces = 55 - line.length;
  if (nSpaces > 0) {
    for (let s = 0; s < nSpaces; ++s) {
      line += ' ';
    }
  }
  line += ' # ';
  if (dicomElement.vl < 100) {
    line += ' ';
  }
  if (dicomElement.vl < 10) {
    line += ' ';
  }
  line += dicomElement.vl;
  line += ', ';
  line += deSize; // dictElement[1];
  line += ' ';
  if (dictElement !== null) {
    line += dictElement[2];
  } else {
    line += 'Unknown Tag & Data';
  }

  let message = null;

  // continue for sequence
  if (dicomElement.vr === 'SQ') {
    let item = null;
    for (let l = 0, lenl = dicomElement.value.length; l < lenl; ++l) {
      item = dicomElement.value[l];
      const itemKeys = Object.keys(item);
      if (itemKeys.length === 0) {
        continue;
      }

      // get the item element
      const itemElement = item.xFFFEE000;
      message = '(Item with';
      if (itemElement.vl === 'u/l') {
        message += ' undefined';
      } else {
        message += ' explicit';
      }
      message += ` length #=${itemKeys.length - 1})`;
      itemElement.value = [message];
      itemElement.vr = 'na';

      line += '\n';
      line += this.getElementAsString(itemElement, `${prefix}  `);

      for (let m = 0, lenm = itemKeys.length; m < lenm; ++m) {
        if (itemKeys[m] !== 'xFFFEE000') {
          line += '\n';
          line += this.getElementAsString(item[itemKeys[m]], `${prefix}    `);
        }
      }

      message = '(ItemDelimitationItem';
      if (itemElement.vl !== 'u/l') {
        message += ' for re-encoding';
      }
      message += ')';
      const itemDelimElement = {
        tag: { group: '0xFFFE', element: '0xE00D' },
        vr: 'na',
        vl: '0',
        value: [message],
      };
      line += '\n';
      line += this.getElementAsString(itemDelimElement, `${prefix}  `);
    }

    message = '(SequenceDelimitationItem';
    if (dicomElement.vl !== 'u/l') {
      message += ' for re-encod.';
    }
    message += ')';
    const sqDelimElement = {
      tag: { group: '0xFFFE', element: '0xE0DD' },
      vr: 'na',
      vl: '0',
      value: [message],
    };
    line += '\n';
    line += this.getElementAsString(sqDelimElement, prefix);
  } else if (isPixSequence) {
    // pixel sequence
    let pixItem = null;

    for (let n = 0, lenn = dicomElement.value.length; n < lenn; ++n) {
      pixItem = dicomElement.value[n];
      line += '\n';
      pixItem.vr = 'pi';
      line += this.getElementAsString(pixItem, `${prefix}  `);
    }

    const pixDelimElement = {
      tag: { group: '0xFFFE', element: '0xE0DD' },
      vr: 'na',
      vl: '0',
      value: ['(SequenceDelimitationItem)']
    };
    line += '\n';
    line += this.getElementAsString(pixDelimElement, prefix);
  }

  return prefix + line;
};

/**
 * Get a DICOM Element value from a group and an element.
 * @param {Number} group The group.
 * @param {Number} element The element.
 * @return {Object} The DICOM element value.
 */
DicomElementsWrapper.prototype.getFromGroupElement = function (group, element) {
  return this.getFromKey(getGroupElementKey(group, element));
};

/**
 * Get a DICOM Element value from a tag name.
 * Uses the DICOM dictionary.
 * @param {String} name The tag name.
 * @return {Object} The DICOM element value.
 */
DicomElementsWrapper.prototype.getFromName = function (name) {
  const tagGE = getGroupElementFromName(name);
  let value = null;

  // check that we are not at the end of the dictionary
  if (tagGE.group !== null && tagGE.element !== null) {
    value = this.getFromKey(getGroupElementKey(tagGE.group, tagGE.element));
  }

  return value;
};

/**
 * DicomParser class.
 * @constructor
 */
export const DicomParser = function () {
  /**
     * The list of DICOM elements.
     * @type Array
     */
  this.dicomElements = {};

  /**
     * Default character set (optional).
     * @private
     * @type String
    */
  let defaultCharacterSet;
  /**
     * Get the default character set.
     * @return {String} The default character set.
     */
  this.getDefaultCharacterSet = function () {
    return defaultCharacterSet;
  };
  /**
     * Set the default character set.
     * param {String} The character set.
     */
  this.setDefaultCharacterSet = function (characterSet) {
    defaultCharacterSet = characterSet;
  };
};

/**
 * Get the raw DICOM data elements.
 * @return {Object} The raw DICOM elements.
 */
DicomParser.prototype.getRawDicomElements = function () {
  return this.dicomElements;
};

/**
 * Get the DICOM data elements.
 * @return {Object} The DICOM elements.
 */
DicomParser.prototype.getDicomElements = function () {
  return new DicomElementsWrapper(this.dicomElements);
};

/**
 * Read a DICOM tag.
 * @param reader The raw data reader.
 * @param offset The offset where to start to read.
 * @return An object containing the tags 'group', 'element' and 'name'.
 */
DicomParser.prototype.readTag = function (reader, offset) {
  // group
  const group = reader.readHex(offset);
  offset += Uint16Array.BYTES_PER_ELEMENT;
  // element
  const element = reader.readHex(offset);
  offset += Uint16Array.BYTES_PER_ELEMENT;
  // name
  const name = getGroupElementKey(group, element);
  // return
  return {
    group,
    element,
    name,
    endOffset: offset
  };
};

/**
 * Read an item data element.
 * @param {Object} reader The raw data reader.
 * @param {Number} offset The offset where to start to read.
 * @param {Boolean} implicit Is the DICOM VR implicit?
 * @returns {Object} The item data as a list of data elements.
 */
DicomParser.prototype.readItemDataElement = function (reader, offset, implicit) {
  const itemData = {};

  // read the first item
  let item = this.readDataElement(reader, offset, implicit);
  offset = item.endOffset;

  // exit if it is a sequence delimitation item
  const isSeqDelim = (item.tag.name === 'xFFFEE0DD');
  if (isSeqDelim) {
    return {
      data: itemData,
      endOffset: item.endOffset,
      isSeqDelim
    };
  }

  // store it
  itemData[item.tag.name] = item;

  // explicit VR items
  if (item.vl !== 'u/l') {
    // not empty
    if (item.vl !== 0) {
      // read until the end offset
      const endOffset = offset;
      offset -= item.vl;
      while (offset < endOffset) {
        item = this.readDataElement(reader, offset, implicit);
        offset = item.endOffset;
        itemData[item.tag.name] = item;
      }
    }
  }
  // implicit VR items
  else {
    // read until the item delimitation item
    let isItemDelim = false;
    while (!isItemDelim) {
      item = this.readDataElement(reader, offset, implicit);
      offset = item.endOffset;
      isItemDelim = (item.tag.name === 'xFFFEE00D');
      if (!isItemDelim) {
        itemData[item.tag.name] = item;
      }
    }
  }

  return {
    data: itemData,
    endOffset: offset,
    isSeqDelim: false
  };
};

/**
 * Read the pixel item data element.
 * Ref: [Single frame fragments]{@link http://dicom.nema.org/dicom/2013/output/chtml/part05/sect_A.4.html#table_A.4-1}.
 * @param {Object} reader The raw data reader.
 * @param {Number} offset The offset where to start to read.
 * @param {Boolean} implicit Is the DICOM VR implicit?
 * @returns {Array} The item data as an array of data elements.
 */
DicomParser.prototype.readPixelItemDataElement = function (reader, offset, implicit) {
  const itemData = [];

  // first item: basic offset table
  let item = this.readDataElement(reader, offset, implicit);
  const offsetTableVl = item.vl;
  offset = item.endOffset;

  // read until the sequence delimitation item
  let isSeqDelim = false;
  while (!isSeqDelim) {
    item = this.readDataElement(reader, offset, implicit);
    offset = item.endOffset;
    isSeqDelim = (item.tag.name === 'xFFFEE0DD');
    if (!isSeqDelim) {
      itemData.push(item.value);
    }
  }

  return {
    data: itemData,
    endOffset: offset,
    offsetTableVl
  };
};

/**
 * Read a DICOM data element.
 * Reference: [DICOM VRs]{@link http://dicom.nema.org/dicom/2013/output/chtml/part05/sect_6.2.html#table_6.2-1}.
 * @param {Object} reader The raw data reader.
 * @param {Number} offset The offset where to start to read.
 * @param {Boolean} implicit Is the DICOM VR implicit?
 * @return {Object} An object containing the element 'tag', 'vl', 'vr', 'data' and 'endOffset'.
 */
DicomParser.prototype.readDataElement = function (reader, offset, implicit) {
  // Tag: group, element
  const tag = this.readTag(reader, offset);
  offset = tag.endOffset;

  // Value Representation (VR)
  let vr = null;
  let is32bitVLVR = false;
  if (isTagWithVR(tag.group, tag.element)) {
    // implicit VR
    if (implicit) {
      vr = 'UN';
      if (dictionary[tag.group] && dictionary[tag.group][tag.element]) {
        vr = dictionary[tag.group][tag.element][0];
      }
      is32bitVLVR = true;
    } else {
      vr = reader.readString(offset, 2);
      offset += 2 * Uint8Array.BYTES_PER_ELEMENT;
      is32bitVLVR = is32bitVLVRFunc(vr);
      // reserved 2 bytes
      if (is32bitVLVR) {
        offset += 2 * Uint8Array.BYTES_PER_ELEMENT;
      }
    }
  } else {
    vr = 'UN';
    is32bitVLVR = true;
  }

  // Value Length (VL)
  let vl = 0;
  if (is32bitVLVR) {
    vl = reader.readUint32(offset);
    offset += Uint32Array.BYTES_PER_ELEMENT;
  } else {
    vl = reader.readUint16(offset);
    offset += Uint16Array.BYTES_PER_ELEMENT;
  }

  // check the value of VL
  let vlString = vl;
  if (vl === 0xffffffff) {
    vlString = 'u/l';
    vl = 0;
  }

  let startOffset = offset;

  // data
  let data = null;
  const isPixelData = (tag.name === 'x7FE00010');
  // pixel data sequence (implicit)
  if (isPixelData && vlString === 'u/l') {
    const pixItemData = this.readPixelItemDataElement(reader, offset, implicit);
    offset = pixItemData.endOffset;
    startOffset += pixItemData.offsetTableVl;
    data = pixItemData.data;
  } else if (isPixelData && (vr === 'OB' || vr === 'OW' || vr === 'OF' || vr === 'ox')) {
    // BitsAllocated
    let bitsAllocated = 16;
    if (typeof this.dicomElements.x00280100 !== 'undefined') {
      bitsAllocated = this.dicomElements.x00280100.value[0];
    } else {
      console.warn('Reading DICOM pixel data with default bitsAllocated.');
    }
    if (bitsAllocated === 8 && vr === 'OW') {
      console.warn('Reading DICOM pixel data with vr=OW and bitsAllocated=8 (should be 16).');
    }
    if (bitsAllocated === 16 && vr === 'OB') {
      console.warn('Reading DICOM pixel data with vr=OB and bitsAllocated=16 (should be 8).');
    }
    // PixelRepresentation 0->unsigned, 1->signed
    let pixelRepresentation = 0;
    if (typeof this.dicomElements.x00280103 !== 'undefined') {
      pixelRepresentation = this.dicomElements.x00280103.value[0];
    }
    // read
    if (bitsAllocated === 8) {
      if (pixelRepresentation === 0) {
        data = reader.readUint8Array(offset, vl);
      } else {
        data = reader.readInt8Array(offset, vl);
      }
    } else if (bitsAllocated === 16) {
      if (pixelRepresentation === 0) {
        data = reader.readUint16Array(offset, vl);
      } else {
        data = reader.readInt16Array(offset, vl);
      }
    } else if (bitsAllocated === 32) {
      if (pixelRepresentation === 0) {
        data = reader.readUint32Array(offset, vl);
      } else {
        data = reader.readInt32Array(offset, vl);
      }
    } else if (bitsAllocated === 64) {
      if (pixelRepresentation === 0) {
        data = reader.readUint64Array(offset, vl);
      } else {
        data = reader.readInt64Array(offset, vl);
      }
    }
    offset += vl;
  }
  // others
  else if (vr === 'OB') {
    data = reader.readInt8Array(offset, vl);
    offset += vl;
  } else if (vr === 'OW') {
    data = reader.readInt16Array(offset, vl);
    offset += vl;
  } else if (vr === 'OF') {
    data = reader.readInt32Array(offset, vl);
    offset += vl;
  } else if (vr === 'OD') {
    data = reader.readInt64Array(offset, vl);
    offset += vl;
  }
  // numbers
  else if (vr === 'US') {
    data = reader.readUint16Array(offset, vl);
    offset += vl;
  } else if (vr === 'UL') {
    data = reader.readUint32Array(offset, vl);
    offset += vl;
  } else if (vr === 'SS') {
    data = reader.readInt16Array(offset, vl);
    offset += vl;
  } else if (vr === 'SL') {
    data = reader.readInt32Array(offset, vl);
    offset += vl;
  } else if (vr === 'FL') {
    data = reader.readFloat32Array(offset, vl);
    offset += vl;
  } else if (vr === 'FD') {
    data = reader.readFloat64Array(offset, vl);
    offset += vl;
  }
  // attribute
  else if (vr === 'AT') {
    const raw = reader.readUint16Array(offset, vl);
    offset += vl;
    data = [];
    for (let i = 0, leni = raw.length; i < leni; i += 2) {
      const stri = raw[i].toString(16);
      const stri1 = raw[i + 1].toString(16);
      let str = '(';
      str += '0000'.substr(0, 4 - stri.length) + stri.toUpperCase();
      str += ',';
      str += '0000'.substr(0, 4 - stri1.length) + stri1.toUpperCase();
      str += ')';
      data.push(str);
    }
  }
  // not available
  else if (vr === 'UN') {
    data = reader.readUint8Array(offset, vl);
    offset += vl;
  }
  // sequence
  else if (vr === 'SQ') {
    data = [];
    let itemData;
    // explicit VR sequence
    if (vlString !== 'u/l') {
      // not empty
      if (vl !== 0) {
        const sqEndOffset = offset + vl;
        while (offset < sqEndOffset) {
          itemData = this.readItemDataElement(reader, offset, implicit);
          data.push(itemData.data);
          offset = itemData.endOffset;
        }
      }
    }
    // implicit VR sequence
    else {
      // read until the sequence delimitation item
      let isSeqDelim = false;
      while (!isSeqDelim) {
        itemData = this.readItemDataElement(reader, offset, implicit);
        isSeqDelim = itemData.isSeqDelim;
        offset = itemData.endOffset;
        // do not store the delimitation item
        if (!isSeqDelim) {
          data.push(itemData.data);
        }
      }
    }
  }
  // raw
  else {
    if (vr === 'SH' || vr === 'LO' || vr === 'ST' ||
            vr === 'PN' || vr === 'LT' || vr === 'UT') {
      data = reader.readSpecialString(offset, vl);
    } else {
      data = reader.readString(offset, vl);
    }
    offset += vl;
    data = data.split('\\');
  }

  // return
  return {
    tag,
    vr,
    vl: vlString,
    value: data,
    startOffset,
    endOffset: offset,
  };
};

/**
 * Parse the complete DICOM file (given as input to the class).
 * Fills in the member object 'dicomElements'.
 * @param buffer The input array buffer.
 */
DicomParser.prototype.parse = function (buffer) {
  let offset = 0;
  let implicit = false;
  // default readers
  const metaReader = new DataReader(buffer);
  let dataReader = new DataReader(buffer);

  // 128 -> 132: magic word
  offset = 128;
  const magicword = metaReader.readString(offset, 4);
  offset += 4 * Uint8Array.BYTES_PER_ELEMENT;

  if (magicword !== 'DICM') {
    throw new Error('Not a valid DICOM file (no magic DICM word found)');
  }

  // 0x0002, 0x0000: FileMetaInformationGroupLength
  let dataElement = this.readDataElement(metaReader, offset, false);
  offset = dataElement.endOffset;
  // store the data element
  this.dicomElements[dataElement.tag.name] = dataElement;
  // get meta length
  const metaLength = parseInt(dataElement.value[0], 10);

  // meta elements
  const metaEnd = offset + metaLength;
  while (offset < metaEnd) {
    // get the data element
    dataElement = this.readDataElement(metaReader, offset, false);
    offset = dataElement.endOffset;
    // store the data element
    this.dicomElements[dataElement.tag.name] = dataElement;
  }

  // check the TransferSyntaxUID (has to be there!)
  if (typeof this.dicomElements.x00020010 === 'undefined') {
    throw new Error('Not a valid DICOM file (no TransferSyntaxUID found)');
  }
  const syntax = cleanString(this.dicomElements.x00020010.value[0]);

  // check support
  if (!isReadSupportedTransferSyntax(syntax)) {
    throw new Error(`Unsupported DICOM transfer syntax: '${syntax
    }' (${getTransferSyntaxName(syntax)})`);
  }

  // Implicit VR
  if (isImplicitTransferSyntax(syntax)) {
    implicit = true;
  }

  // Big Endian
  if (isBigEndianTransferSyntax(syntax)) {
    dataReader = new DataReader(buffer, false);
  }

  // default character set
  if (typeof this.getDefaultCharacterSet() !== 'undefined') {
    dataReader.setUtfLabel(this.getDefaultCharacterSet());
  }

  // DICOM data elements
  while (offset < buffer.byteLength) {
    // get the data element
    dataElement = this.readDataElement(dataReader, offset, implicit);
    // check character set
    if (dataElement.tag.name === 'x00080005') {
      let charSetTerm;

      if (dataElement.value.length === 1) {
        charSetTerm = cleanString(dataElement.value[0]);
      } else {
        charSetTerm = cleanString(dataElement.value[1]);
        console.warn(`Unsupported character set with code extensions: '${charSetTerm}'.`);
      }

      dataReader.setUtfLabel(getUtfLabel(charSetTerm));
    }
    // increment offset
    offset = dataElement.endOffset;
    // store the data element
    this.dicomElements[dataElement.tag.name] = dataElement;
  }

  // safety check...
  if (buffer.byteLength !== offset) {
    console.warn(`Did not reach the end of the buffer: ${
      offset} != ${buffer.byteLength}`);
  }

  // pixel buffer
  if (typeof this.dicomElements.x7FE00010 !== 'undefined') {
    let numberOfFrames = 1;
    if (typeof this.dicomElements.x00280008 !== 'undefined') {
      numberOfFrames = this.dicomElements.x00280008.value[0];
    }

    if (this.dicomElements.x7FE00010.vl !== 'u/l') {
      // compressed should be encapsulated...
      if (isJpeg2000TransferSyntax(syntax) || isJpegBaselineTransferSyntax(syntax) || isJpegLosslessTransferSyntax(syntax)) {
        console.warn('Compressed but no items...');
      }

      // calculate the slice size
      const pixData = this.dicomElements.x7FE00010.value;
      const columns = this.dicomElements.x00280011.value[0];
      const rows = this.dicomElements.x00280010.value[0];
      const samplesPerPixel = this.dicomElements.x00280002.value[0];
      const sliceSize = columns * rows * samplesPerPixel;
      // slice data in an array of frames
      const newPixData = [];
      let frameOffset = 0;
      for (let g = 0; g < numberOfFrames; ++g) {
        newPixData[g] = pixData.slice(frameOffset, frameOffset + sliceSize);
        frameOffset += sliceSize;
      }
      // store as pixel data
      this.dicomElements.x7FE00010.value = newPixData;
    } else {
      // handle fragmented pixel buffer
      // Reference: http://dicom.nema.org/dicom/2013/output/chtml/part05/sect_8.2.html
      // (third note, "Depending on the transfer syntax...")
      const pixItems = this.dicomElements.x7FE00010.value;
      if (pixItems.length > 1 && pixItems.length > numberOfFrames) {
        // concatenate pixel data items
        // concat does not work on typed arrays
        // this.pixelBuffer = this.pixelBuffer.concat( dataElement.data );
        // manual concat...
        const nItemPerFrame = pixItems.length / numberOfFrames;
        const newPixItems = [];
        let index = 0;
        for (let f = 0; f < numberOfFrames; ++f) {
          index = f * nItemPerFrame;
          // calculate the size of a frame
          let size = 0;
          for (let i = 0; i < nItemPerFrame; ++i) {
            size += pixItems[index + i].length;
          }
          // create new buffer
          const newBuffer = new pixItems[0].constructor(size);
          // fill new buffer
          let fragOffset = 0;
          for (let j = 0; j < nItemPerFrame; ++j) {
            newBuffer.set(pixItems[index + j], fragOffset);
            fragOffset += pixItems[index + j].length;
          }
          newPixItems[f] = newBuffer;
        }
        // store as pixel data
        this.dicomElements.x7FE00010.value = newPixItems;
      }
    }
  }
};
