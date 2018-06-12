import {
  cleanString,
  getTypedArray,
  isJpeg2000TransferSyntax,
  isJpegBaselineTransferSyntax,
  isJpegLosslessTransferSyntax,
} from '../dicom/dicomParser';
import { Matrix33 } from '../math/matrix';
import { Index3D, Point3D } from '../math/point';
import { getStats } from '../math/stats';
import Vector3D from '../math/vector';
import { Geometry, Size, Spacing } from './geometry';

/**
 * Rescale Slope and Intercept
 * @constructor
 * @param slope
 * @param intercept
 */
export const RescaleSlopeAndIntercept = function (slope = 1, intercept = 0) {
  /**
     * Get the slope of the RSI.
     * @return {Number} The slope of the RSI.
     */
  this.getSlope = function () {
    return slope;
  };
  /**
     * Get the intercept of the RSI.
     * @return {Number} The intercept of the RSI.
     */
  this.getIntercept = function () {
    return intercept;
  };
  /**
     * Apply the RSI on an input value.
     * @return {Number} The value to rescale.
     */
  this.apply = function (value) {
    return value * slope + intercept;
  };
};

/**
 * Check for RSI equality.
 * @param {Object} rhs The other RSI to compare to.
 * @return {Boolean} True if both RSI are equal.
 */
RescaleSlopeAndIntercept.prototype.equals = function (rhs) {
  return rhs !== null &&
        this.getSlope() === rhs.getSlope() &&
        this.getIntercept() === rhs.getIntercept();
};

/**
 * Get a string representation of the RSI.
 * @return {String} The RSI as a string.
 */
RescaleSlopeAndIntercept.prototype.toString = function () {
  return `${this.getSlope()}, ${this.getIntercept()}`;
};

/**
 * Is this RSI an ID RSI.
 * @return {Boolean} True if the RSI has a slope of 1 and no intercept.
 */
RescaleSlopeAndIntercept.prototype.isID = function () {
  return this.getSlope() === 1 && this.getIntercept() === 0;
};

/**
 * Image class.
 * Usable once created, optional are:
 * - rescale slope and intercept (default 1:0),
 * - photometric interpretation (default MONOCHROME2),
 * - planar configuration (default RGBRGB...).
 * @constructor
 * @param {Object} geometry The geometry of the image.
 * @param {Array} buffer The image data as an array of frame buffers.
 * @param {Number} numberOfFrames The number of frames (optional, can be used
     to anticipate the final number after appends).
 */
export const Image = function (geometry, buffer, numberOfFrames = buffer.length) {
  /**
     * Get the number of frames.
     * @returns {Number} The number of frames.
     */
  this.getNumberOfFrames = function () {
    return numberOfFrames;
  };

  /**
     * Rescale slope and intercept.
     * @private
     * @type Number
     */
  const rsis = [];
  // initialise RSIs
  for (let s = 0, nslices = geometry.getSize().getNumberOfSlices(); s < nslices; ++s) {
    rsis.push(new RescaleSlopeAndIntercept(1, 0));
  }
  /**
     * Flag to know if the RSIs are all identity (1,0).
     * @private
     * @type Boolean
     */
  let isIdentityRSI = true;
  /**
     * Flag to know if the RSIs are all equals.
     * @private
     * @type Boolean
     */
  let isConstantRSI = true;
  /**
     * Photometric interpretation (MONOCHROME, RGB...).
     * @private
     * @type String
     */
  let photometricInterpretation = 'MONOCHROME2';
  /**
     * Planar configuration for RGB data (0:RGBRGBRGBRGB... or 1:RRR...GGG...BBB...).
     * @private
     * @type Number
     */
  let planarConfiguration = 0;
  /**
     * Number of components.
     * @private
     * @type Number
     */
  const numberOfComponents = buffer[0].length / (
    geometry.getSize().getTotalSize());
    /**
     * Meta information.
     * @private
     * @type Object
     */
  let meta = {};

  /**
     * Data range.
     * @private
     * @type Object
     */
  let dataRange = null;
  /**
     * Rescaled data range.
     * @private
     * @type Object
     */
  let rescaledDataRange = null;
  /**
     * Histogram.
     * @private
     * @type Array
     */
  let histogram = null;

  /**
	 * Overlay.
     * @private
     * @type Array
     */
  const overlays = [];

  /**
     * Set the first overlay.
     * @param {Array} over The first overlay.
     */
  this.setFirstOverlay = function (over) { overlays[0] = over; };

  /**
     * Get the overlays.
     * @return {Array} The overlays array.
     */
  this.getOverlays = function () { return overlays; };

  /**
     * Get the geometry of the image.
     * @return {Object} The size of the image.
     */
  this.getGeometry = function () { return geometry; };

  /**
     * Get the data buffer of the image.
     * @todo dangerous...
     * @return {Array} The data buffer of the image.
     */
  this.getBuffer = function () { return buffer; };
  /**
     * Get the data buffer of the image.
     * @todo dangerous...
     * @return {Array} The data buffer of the frame.
     */
  this.getFrame = function (frame) { return buffer[frame]; };

  /**
     * Get the rescale slope and intercept.
     * @param {Number} k The slice index.
     * @return {Object} The rescale slope and intercept.
     */
  this.getRescaleSlopeAndIntercept = function (k) { return rsis[k]; };
  /**
     * Set the rescale slope and intercept.
     * @param {Array} inRsi The input rescale slope and intercept.
     * @param {Number} k The slice index (optional).
     */
  this.setRescaleSlopeAndIntercept = function (inRsi, k = 0) {
    rsis[k] = inRsi;

    // update RSI flags
    isIdentityRSI = true;
    isConstantRSI = true;
    for (let s = 0, lens = rsis.length; s < lens; ++s) {
      if (!rsis[s].isID()) {
        isIdentityRSI = false;
      }
      if (s > 0 && !rsis[s].equals(rsis[s - 1])) {
        isConstantRSI = false;
      }
    }
  };
  /**
     * Are all the RSIs identity (1,0).
     * @return {Boolean} True if they are.
     */
  this.isIdentityRSI = function () { return isIdentityRSI; };
  /**
     * Are all the RSIs equal.
     * @return {Boolean} True if they are.
     */
  this.isConstantRSI = function () { return isConstantRSI; };
  /**
     * Get the photometricInterpretation of the image.
     * @return {String} The photometricInterpretation of the image.
     */
  this.getPhotometricInterpretation = function () { return photometricInterpretation; };
  /**
     * Set the photometricInterpretation of the image.
     * @pqrqm {String} interp The photometricInterpretation of the image.
     */
  this.setPhotometricInterpretation = function (interp) { photometricInterpretation = interp; };
  /**
     * Get the planarConfiguration of the image.
     * @return {Number} The planarConfiguration of the image.
     */
  this.getPlanarConfiguration = function () { return planarConfiguration; };
  /**
     * Set the planarConfiguration of the image.
     * @param {Number} config The planarConfiguration of the image.
     */
  this.setPlanarConfiguration = function (config) { planarConfiguration = config; };
  /**
     * Get the numberOfComponents of the image.
     * @return {Number} The numberOfComponents of the image.
     */
  this.getNumberOfComponents = function () { return numberOfComponents; };

  /**
     * Get the meta information of the image.
     * @return {Object} The meta information of the image.
     */
  this.getMeta = function () { return meta; };
  /**
     * Set the meta information of the image.
     * @param {Object} rhs The meta information of the image.
     */
  this.setMeta = function (rhs) { meta = rhs; };

  /**
     * Get value at offset. Warning: No size check...
     * @param {Number} offset The desired offset.
     * @param {Number} frame The desired frame.
     * @return {Number} The value at offset.
     */
  this.getValueAtOffset = function (offset, frame) {
    return buffer[frame][offset];
  };

  /**
     * Clone the image.
     * @return {Image} A clone of this image.
     */
  this.clone = function () {
    // clone the image buffer
    const clonedBuffer = [];
    for (let f = 0, lenf = this.getNumberOfFrames(); f < lenf; ++f) {
      clonedBuffer[f] = buffer[f].slice(0);
    }
    // create the image copy
    const copy = new Image(this.getGeometry(), clonedBuffer);
    // copy the RSIs
    const nslices = this.getGeometry().getSize().getNumberOfSlices();
    for (let k = 0; k < nslices; ++k) {
      copy.setRescaleSlopeAndIntercept(this.getRescaleSlopeAndIntercept(k), k);
    }
    // copy extras
    copy.setPhotometricInterpretation(this.getPhotometricInterpretation());
    copy.setPlanarConfiguration(this.getPlanarConfiguration());
    copy.setMeta(this.getMeta());
    // return
    return copy;
  };

  /**
     * Append a slice to the image.
     * @param {Image} The slice to append.
     * @return {Number} The number of the inserted slice.
     */
  this.appendSlice = function (rhs, frame) {
    // check input
    if (rhs === null) {
      throw new Error('Cannot append null slice');
    }
    const rhsSize = rhs.getGeometry().getSize();
    const size = geometry.getSize();
    if (rhsSize.getNumberOfSlices() !== 1) {
      throw new Error('Cannot append more than one slice');
    }
    if (size.getNumberOfColumns() !== rhsSize.getNumberOfColumns()) {
      throw new Error('Cannot append a slice with different number of columns');
    }
    if (size.getNumberOfRows() !== rhsSize.getNumberOfRows()) {
      throw new Error('Cannot append a slice with different number of rows');
    }
    if (photometricInterpretation !== rhs.getPhotometricInterpretation()) {
      throw new Error('Cannot append a slice with different photometric interpretation');
    }
    // all meta should be equal
    for (const key in meta) {
      if (meta[key] !== rhs.getMeta()[key]) {
        throw new Error(`Cannot append a slice with different ${key}`);
      }
    }

    const f = (typeof frame === 'undefined') ? 0 : frame;

    // calculate slice size
    let mul = 1;
    if (photometricInterpretation === 'RGB' || photometricInterpretation === 'YBR_FULL_422') {
      mul = 3;
    }
    const sliceSize = mul * size.getSliceSize();

    // create the new buffer
    const newBuffer = getTypedArray(
      buffer[f].BYTES_PER_ELEMENT * 8,
      meta.IsSigned ? 1 : 0,
      sliceSize * (size.getNumberOfSlices() + 1)
    );

    // append slice at new position
    const newSliceNb = geometry.getSliceIndex(rhs.getGeometry().getOrigin());
    if (newSliceNb === 0) {
      newBuffer.set(rhs.getFrame(f));
      newBuffer.set(buffer[f], sliceSize);
    } else if (newSliceNb === size.getNumberOfSlices()) {
      newBuffer.set(buffer[f]);
      newBuffer.set(rhs.getFrame(f), size.getNumberOfSlices() * sliceSize);
    } else {
      const offset = newSliceNb * sliceSize;
      newBuffer.set(buffer[f].subarray(0, offset - 1));
      newBuffer.set(rhs.getFrame(f), offset);
      newBuffer.set(buffer[f].subarray(offset), offset + sliceSize);
    }

    // update geometry
    geometry.appendOrigin(rhs.getGeometry().getOrigin(), newSliceNb);
    // update rsi
    rsis.splice(newSliceNb, 0, rhs.getRescaleSlopeAndIntercept(0));

    // copy to class variables
    buffer[f] = newBuffer;

    // insert overlay information of the slice to the image
    overlays.splice(newSliceNb, 0, rhs.getOverlays()[0]);

    // return the appended slice number
    return newSliceNb;
  };

  /**
     * Append a frame buffer to the image.
     * @param {Object} frameBuffer The frame buffer to append.
     */
  this.appendFrameBuffer = function (frameBuffer) {
    buffer.push(frameBuffer);
  };

  /**
     * Get the data range.
     * @return {Object} The data range.
     */
  this.getDataRange = function () {
    if (!dataRange) {
      dataRange = this.calculateDataRange();
    }
    return dataRange;
  };

  /**
     * Get the rescaled data range.
     * @return {Object} The rescaled data range.
     */
  this.getRescaledDataRange = function () {
    if (!rescaledDataRange) {
      rescaledDataRange = this.calculateRescaledDataRange();
    }
    return rescaledDataRange;
  };

  /**
     * Get the histogram.
     * @return {Array} The histogram.
     */
  this.getHistogram = function () {
    if (!histogram) {
      const res = this.calculateHistogram();
      dataRange = res.dataRange;
      rescaledDataRange = res.rescaledDataRange;
      histogram = res.histogram;
    }
    return histogram;
  };
};

/**
 * Get the value of the image at a specific coordinate.
 * @param {Number} i The X index.
 * @param {Number} j The Y index.
 * @param {Number} k The Z index.
 * @param {Number} f The frame number.
 * @return {Number} The value at the desired position.
 * Warning: No size check...
 */
Image.prototype.getValue = function (i, j, k, f) {
  const frame = (f || 0);
  const index = new Index3D(i, j, k);
  return this.getValueAtOffset(this.getGeometry().indexToOffset(index), frame);
};

/**
 * Get the rescaled value of the image at a specific coordinate.
 * @param {Number} i The X index.
 * @param {Number} j The Y index.
 * @param {Number} k The Z index.
 * @param {Number} f The frame number.
 * @return {Number} The rescaled value at the desired position.
 * Warning: No size check...
 */
Image.prototype.getRescaledValue = function (i, j, k, f) {
  const frame = f || 0;
  let val = this.getValue(i, j, k, frame);

  if (!this.isIdentityRSI()) {
    val = this.getRescaleSlopeAndIntercept(k).apply(val);
  }

  return val;
};

/**
 * Calculate the data range of the image.
 * WARNING: for speed reasons, only calculated on the first frame...
 * @return {Object} The range {min, max}.
 */
Image.prototype.calculateDataRange = function () {
  const size = this.getGeometry().getSize().getTotalSize();
  const nFrames = 1; // this.getNumberOfFrames();
  let min = this.getValueAtOffset(0, 0);
  let max = min;
  let value = 0;

  for (let f = 0; f < nFrames; ++f) {
    for (let i = 0; i < size; ++i) {
      value = this.getValueAtOffset(i, f);
      if (value > max) { max = value; }
      if (value < min) { min = value; }
    }
  }

  return { min, max };
};

/**
 * Calculate the rescaled data range of the image.
 * WARNING: for speed reasons, only calculated on the first frame...
 * @return {Object} The range {min, max}.
 */
Image.prototype.calculateRescaledDataRange = function () {
  if (this.isIdentityRSI()) {
    return this.getDataRange();
  } else if (this.isConstantRSI()) {
    const range = this.getDataRange();
    const resmin = this.getRescaleSlopeAndIntercept(0).apply(range.min);
    const resmax = this.getRescaleSlopeAndIntercept(0).apply(range.max);
    return {
      min: ((resmin < resmax) ? resmin : resmax),
      max: ((resmin > resmax) ? resmin : resmax),
    };
  }

  const size = this.getGeometry().getSize();
  const nFrames = 1; // this.getNumberOfFrames();
  let rmin = this.getRescaledValue(0, 0, 0);
  let rmax = rmin;
  let rvalue = 0;

  for (let f = 0, nframes = nFrames; f < nframes; ++f) {
    for (let k = 0, nslices = size.getNumberOfSlices(); k < nslices; ++k) {
      for (let j = 0, nrows = size.getNumberOfRows(); j < nrows; ++j) {
        for (let i = 0, ncols = size.getNumberOfColumns(); i < ncols; ++i) {
          rvalue = this.getRescaledValue(i, j, k, f);
          if (rvalue > rmax) { rmax = rvalue; }
          if (rvalue < rmin) { rmin = rvalue; }
        }
      }
    }
  }

  return { min: rmin, max: rmax };
};

/**
 * Calculate the histogram of the image.
 * @return {Object} The histogram, data range and rescaled data range.
 */
Image.prototype.calculateHistogram = function () {
  const size = this.getGeometry().getSize();
  const histo = [];
  let min = this.getValue(0, 0, 0);
  let max = min;
  let value = 0;
  let rmin = this.getRescaledValue(0, 0, 0);
  let rmax = rmin;
  let rvalue = 0;

  for (let f = 0, nframes = this.getNumberOfFrames(); f < nframes; ++f) {
    for (let k = 0, nslices = size.getNumberOfSlices(); k < nslices; ++k) {
      for (let j = 0, nrows = size.getNumberOfRows(); j < nrows; ++j) {
        for (let i = 0, ncols = size.getNumberOfColumns(); i < ncols; ++i) {
          value = this.getValue(i, j, k, f);
          if (value > max) { max = value; }
          if (value < min) { min = value; }
          rvalue = this.getRescaleSlopeAndIntercept(k).apply(value);
          if (rvalue > rmax) { rmax = rvalue; }
          if (rvalue < rmin) { rmin = rvalue; }
          histo[rvalue] = (histo[rvalue] || 0) + 1;
        }
      }
    }
  }

  // set data range
  const dataRange = { min, max };
  const rescaledDataRange = { min: rmin, max: rmax };
  // generate data for plotting
  const histogram = [];
  for (let b = rmin; b <= rmax; ++b) {
    histogram.push([b, (histo[b] || 0)]);
  }

  return {
    dataRange,
    rescaledDataRange,
    histogram,
  };
};

/**
 * Convolute the image with a given 2D kernel.
 * @param {Array} weights The weights of the 2D kernel as a 3x3 matrix.
 * @return {Image} The convoluted image.
 * Note: Uses the raw buffer values.
 */
Image.prototype.convolute2D = function (weights) {
  if (weights.length !== 9) {
    throw new Error(`The convolution matrix does not have a length of 9; it has ${weights.length}`);
  }

  const newImage = this.clone();
  const newBuffer = newImage.getBuffer();

  const imgSize = this.getGeometry().getSize();
  const ncols = imgSize.getNumberOfColumns();
  const nrows = imgSize.getNumberOfRows();
  const nslices = imgSize.getNumberOfSlices();
  const nframes = this.getNumberOfFrames();
  const ncomp = this.getNumberOfComponents();

  // adapt to number of component and planar configuration
  let factor = 1;
  let componentOffset = 1;
  let frameOffset = imgSize.getTotalSize();
  if (ncomp === 3) {
    frameOffset *= 3;
    if (this.getPlanarConfiguration() === 0) {
      factor = 3;
    } else {
      componentOffset = imgSize.getTotalSize();
    }
  }

  // allow special indent for matrices
  /* jshint indent:false */

  // default weight offset matrix
  const wOff = [];
  wOff[0] = (-ncols - 1) * factor; wOff[1] = (-ncols) * factor; wOff[2] = (-ncols + 1) * factor;
  wOff[3] = -factor; wOff[4] = 0; wOff[5] = 1 * factor;
  wOff[6] = (ncols - 1) * factor; wOff[7] = (ncols) * factor; wOff[8] = (ncols + 1) * factor;

  // border weight offset matrices
  // borders are extended (see http://en.wikipedia.org/wiki/Kernel_%28image_processing%29)

  // i=0, j=0
  const wOff00 = [];
  wOff00[0] = wOff[4]; wOff00[1] = wOff[4]; wOff00[2] = wOff[5];
  wOff00[3] = wOff[4]; wOff00[4] = wOff[4]; wOff00[5] = wOff[5];
  wOff00[6] = wOff[7]; wOff00[7] = wOff[7]; wOff00[8] = wOff[8];
  // i=0, j=*
  const wOff0x = [];
  wOff0x[0] = wOff[1]; wOff0x[1] = wOff[1]; wOff0x[2] = wOff[2];
  wOff0x[3] = wOff[4]; wOff0x[4] = wOff[4]; wOff0x[5] = wOff[5];
  wOff0x[6] = wOff[7]; wOff0x[7] = wOff[7]; wOff0x[8] = wOff[8];
  // i=0, j=nrows
  const wOff0n = [];
  wOff0n[0] = wOff[1]; wOff0n[1] = wOff[1]; wOff0n[2] = wOff[2];
  wOff0n[3] = wOff[4]; wOff0n[4] = wOff[4]; wOff0n[5] = wOff[5];
  wOff0n[6] = wOff[4]; wOff0n[7] = wOff[4]; wOff0n[8] = wOff[5];

  // i=*, j=0
  const wOffx0 = [];
  wOffx0[0] = wOff[3]; wOffx0[1] = wOff[4]; wOffx0[2] = wOff[5];
  wOffx0[3] = wOff[3]; wOffx0[4] = wOff[4]; wOffx0[5] = wOff[5];
  wOffx0[6] = wOff[6]; wOffx0[7] = wOff[7]; wOffx0[8] = wOff[8];
  // i=*, j=* -> wOff
  // i=*, j=nrows
  const wOffxn = [];
  wOffxn[0] = wOff[0]; wOffxn[1] = wOff[1]; wOffxn[2] = wOff[2];
  wOffxn[3] = wOff[3]; wOffxn[4] = wOff[4]; wOffxn[5] = wOff[5];
  wOffxn[6] = wOff[3]; wOffxn[7] = wOff[4]; wOffxn[8] = wOff[5];

  // i=ncols, j=0
  const wOffn0 = [];
  wOffn0[0] = wOff[3]; wOffn0[1] = wOff[4]; wOffn0[2] = wOff[4];
  wOffn0[3] = wOff[3]; wOffn0[4] = wOff[4]; wOffn0[5] = wOff[4];
  wOffn0[6] = wOff[6]; wOffn0[7] = wOff[7]; wOffn0[8] = wOff[7];
  // i=ncols, j=*
  const wOffnx = [];
  wOffnx[0] = wOff[0]; wOffnx[1] = wOff[1]; wOffnx[2] = wOff[1];
  wOffnx[3] = wOff[3]; wOffnx[4] = wOff[4]; wOffnx[5] = wOff[4];
  wOffnx[6] = wOff[6]; wOffnx[7] = wOff[7]; wOffnx[8] = wOff[7];
  // i=ncols, j=nrows
  const wOffnn = [];
  wOffnn[0] = wOff[0]; wOffnn[1] = wOff[1]; wOffnn[2] = wOff[1];
  wOffnn[3] = wOff[3]; wOffnn[4] = wOff[4]; wOffnn[5] = wOff[4];
  wOffnn[6] = wOff[3]; wOffnn[7] = wOff[4]; wOffnn[8] = wOff[4];

  // restore indent for rest of method
  /* jshint indent:4 */

  // loop vars
  let pixelOffset = 0;
  let newValue = 0;
  let wOffFinal = [];
  // go through the destination image pixels
  for (let f = 0; f < nframes; f++) {
    pixelOffset = f * frameOffset;
    for (let c = 0; c < ncomp; c++) {
      // special component offset
      pixelOffset += c * componentOffset;
      for (let k = 0; k < nslices; k++) {
        for (let j = 0; j < nrows; j++) {
          for (let i = 0; i < ncols; i++) {
            wOffFinal = wOff;
            // special border cases
            if (i === 0 && j === 0) {
              wOffFinal = wOff00;
            } else if (i === 0 && j === (nrows - 1)) {
              wOffFinal = wOff0n;
            } else if (i === (ncols - 1) && j === 0) {
              wOffFinal = wOffn0;
            } else if (i === (ncols - 1) && j === (nrows - 1)) {
              wOffFinal = wOffnn;
            } else if (i === 0 && j !== (nrows - 1) && j !== 0) {
              wOffFinal = wOff0x;
            } else if (i === (ncols - 1) && j !== (nrows - 1) && j !== 0) {
              wOffFinal = wOffnx;
            } else if (i !== 0 && i !== (ncols - 1) && j === 0) {
              wOffFinal = wOffx0;
            } else if (i !== 0 && i !== (ncols - 1) && j === (nrows - 1)) {
              wOffFinal = wOffxn;
            }

            // calculate the weighed sum of the source image pixels that
            // fall under the convolution matrix
            newValue = 0;
            for (let wi = 0; wi < 9; ++wi) {
              newValue += this.getValueAtOffset(pixelOffset + wOffFinal[wi], f) * weights[wi];
            }
            newBuffer[f][pixelOffset] = newValue;
            // increment pixel offset
            pixelOffset += factor;
          }
        }
      }
    }
  }
  return newImage;
};

/**
 * Transform an image using a specific operator.
 * WARNING: no size check!
 * @param {Function} operator The operator to use when transforming.
 * @return {Image} The transformed image.
 * Note: Uses the raw buffer values.
 */
Image.prototype.transform = function (operator) {
  const newImage = this.clone();
  const newBuffer = newImage.getBuffer();
  for (let f = 0, lenf = this.getNumberOfFrames(); f < lenf; ++f) {
    for (let i = 0, leni = newBuffer[f].length; i < leni; ++i) {
      newBuffer[f][i] = operator(newImage.getValueAtOffset(i, f));
    }
  }
  return newImage;
};

/**
 * Compose this image with another one and using a specific operator.
 * WARNING: no size check!
 * @param {Image} rhs The image to compose with.
 * @param {Function} operator The operator to use when composing.
 * @return {Image} The composed image.
 * Note: Uses the raw buffer values.
 */
Image.prototype.compose = function (rhs, operator) {
  const newImage = this.clone();
  const newBuffer = newImage.getBuffer();

  for (let f = 0, lenf = this.getNumberOfFrames(); f < lenf; ++f) {
    for (let i = 0, leni = newBuffer[f].length; i < leni; ++i) {
      // using the operator on the local buffer, i.e. the latest (not original) data
      newBuffer[f][i] = Math.floor(operator(this.getValueAtOffset(i, f), rhs.getValueAtOffset(i, f)));
    }
  }

  return newImage;
};

/**
 * Quantify a line according to image information.
 * @param {Object} line The line to quantify.
 * @return {Object} A quantification object.
 */
Image.prototype.quantifyLine = function (line) {
  const quant = {};
  // length
  const spacing = this.getGeometry().getSpacing();
  const length = line.getWorldLength(
    spacing.getColumnSpacing(),
    spacing.getRowSpacing()
  );
  if (length !== null) {
    quant.length = { value: length, unit: 'mm' };
  }

  return quant;
};

/**
 * Quantify a rectangle according to image information.
 * @param {Object} rect The rectangle to quantify.
 * @return {Object} A quantification object.
 */
Image.prototype.quantifyRect = function (rect) {
  const quant = {};
  // surface
  const spacing = this.getGeometry().getSpacing();
  const surface = rect.getWorldSurface(
    spacing.getColumnSpacing(),
    spacing.getRowSpacing()
  );
  if (surface !== null) {
    quant.surface = { value: surface / 100, unit: 'cm2' };
  }
  // stats
  const subBuffer = [];
  const minJ = parseInt(rect.getBegin().getY(), 10);
  const maxJ = parseInt(rect.getEnd().getY(), 10);
  const minI = parseInt(rect.getBegin().getX(), 10);
  const maxI = parseInt(rect.getEnd().getX(), 10);
  for (let j = minJ; j < maxJ; ++j) {
    for (let i = minI; i < maxI; ++i) {
      subBuffer.push(this.getValue(i, j, 0));
    }
  }
  const quantif = getStats(subBuffer);
  quant.min = { value: quantif.min, unit: '' };
  quant.max = { value: quantif.max, unit: '' };
  quant.mean = { value: quantif.mean, unit: '' };
  quant.stdDev = { value: quantif.stdDev, unit: '' };
  // return
  return quant;
};

/**
 * Quantify an ellipse according to image information.
 * @param {Object} ellipse The ellipse to quantify.
 * @return {Object} A quantification object.
 */
Image.prototype.quantifyEllipse = function (ellipse) {
  const quant = {};
  // surface
  const spacing = this.getGeometry().getSpacing();
  const surface = ellipse.getWorldSurface(
    spacing.getColumnSpacing(),
    spacing.getRowSpacing()
  );
  if (surface !== null) {
    quant.surface = { value: surface / 100, unit: 'cm2' };
  }
  // return
  return quant;
};

/**
 * {@link Image} factory.
 * @constructor
 */
export const ImageFactory = function () {};

/**
 * Get an {@link Image} object from the read DICOM file.
 * @param {Object} dicomElements The DICOM tags.
 * @param {Array} pixelBuffer The pixel buffer.
 * @return {View} A new Image.
 */
ImageFactory.prototype.create = function (dicomElements, pixelBuffer) {
  // columns
  const columns = dicomElements.getFromKey('x00280011');
  if (!columns) {
    throw new Error('Missing or empty DICOM image number of columns');
  }
  // rows
  const rows = dicomElements.getFromKey('x00280010');
  if (!rows) {
    throw new Error('Missing or empty DICOM image number of rows');
  }
  // image size
  const size = new Size(columns, rows);

  // spacing
  let rowSpacing = null;
  let columnSpacing = null;
  // PixelSpacing
  const pixelSpacing = dicomElements.getFromKey('x00280030');
  // ImagerPixelSpacing
  const imagerPixelSpacing = dicomElements.getFromKey('x00181164');
  if (pixelSpacing && pixelSpacing[0] && pixelSpacing[1]) {
    rowSpacing = parseFloat(pixelSpacing[0]);
    columnSpacing = parseFloat(pixelSpacing[1]);
  } else if (imagerPixelSpacing && imagerPixelSpacing[0] && imagerPixelSpacing[1]) {
    rowSpacing = parseFloat(imagerPixelSpacing[0]);
    columnSpacing = parseFloat(imagerPixelSpacing[1]);
  }
  // image spacing
  const spacing = new Spacing(columnSpacing, rowSpacing);

  // TransferSyntaxUID
  const transferSyntaxUID = dicomElements.getFromKey('x00020010');
  const syntax = cleanString(transferSyntaxUID);
  const jpeg2000 = isJpeg2000TransferSyntax(syntax);
  const jpegBase = isJpegBaselineTransferSyntax(syntax);
  const jpegLoss = isJpegLosslessTransferSyntax(syntax);

  // slice position
  let slicePosition = new Array(0, 0, 0);
  // ImagePositionPatient
  const imagePositionPatient = dicomElements.getFromKey('x00200032');
  if (imagePositionPatient) {
    slicePosition = [parseFloat(imagePositionPatient[0]),
      parseFloat(imagePositionPatient[1]),
      parseFloat(imagePositionPatient[2])];
  }

  // slice orientation
  const imageOrientationPatient = dicomElements.getFromKey('x00200037');
  let orientationMatrix;
  if (imageOrientationPatient) {
    const rowCosines = new Vector3D(
      parseFloat(imageOrientationPatient[0]),
      parseFloat(imageOrientationPatient[1]),
      parseFloat(imageOrientationPatient[2])
    );
    const colCosines = new Vector3D(
      parseFloat(imageOrientationPatient[3]),
      parseFloat(imageOrientationPatient[4]),
      parseFloat(imageOrientationPatient[5])
    );
    const normal = rowCosines.crossProduct(colCosines);
    orientationMatrix = new Matrix33(
      rowCosines.getX(), rowCosines.getY(), rowCosines.getZ(),
      colCosines.getX(), colCosines.getY(), colCosines.getZ(),
      normal.getX(), normal.getY(), normal.getZ()
    );
  }

  // geometry
  const origin = new Point3D(slicePosition[0], slicePosition[1], slicePosition[2]);
  const geometry = new Geometry(origin, size, spacing, orientationMatrix);

  // image
  const image = new Image(geometry, pixelBuffer);
  // PhotometricInterpretation
  const photometricInterpretation = dicomElements.getFromKey('x00280004');
  if (photometricInterpretation) {
    let photo = cleanString(photometricInterpretation).toUpperCase();
    // jpeg decoders output RGB data
    if ((jpeg2000 || jpegBase || jpegLoss) && (photo !== 'MONOCHROME1' && photo !== 'MONOCHROME2')) {
      photo = 'RGB';
    }
    image.setPhotometricInterpretation(photo);
  }
  // PlanarConfiguration
  const planarConfiguration = dicomElements.getFromKey('x00280006');
  if (planarConfiguration) {
    image.setPlanarConfiguration(planarConfiguration);
  }

  // rescale slope and intercept
  let slope = 1;
  // RescaleSlope
  const rescaleSlope = dicomElements.getFromKey('x00281053');
  if (rescaleSlope) {
    slope = parseFloat(rescaleSlope);
  }
  let intercept = 0;
  // RescaleIntercept
  const rescaleIntercept = dicomElements.getFromKey('x00281052');
  if (rescaleIntercept) {
    intercept = parseFloat(rescaleIntercept);
  }
  const rsi = new RescaleSlopeAndIntercept(slope, intercept);
  image.setRescaleSlopeAndIntercept(rsi);

  // meta information
  const meta = {};
  // Modality
  const modality = dicomElements.getFromKey('x00080060');
  if (modality) {
    meta.Modality = modality;
  }
  // StudyInstanceUID
  const studyInstanceUID = dicomElements.getFromKey('x0020000D');
  if (studyInstanceUID) {
    meta.StudyInstanceUID = studyInstanceUID;
  }
  // SeriesInstanceUID
  const seriesInstanceUID = dicomElements.getFromKey('x0020000E');
  if (seriesInstanceUID) {
    meta.SeriesInstanceUID = seriesInstanceUID;
  }
  // BitsStored
  const bitsStored = dicomElements.getFromKey('x00280101');
  if (bitsStored) {
    meta.BitsStored = parseInt(bitsStored, 10);
  }
  // PixelRepresentation -> is signed
  const pixelRepresentation = dicomElements.getFromKey('x00280103');
  meta.IsSigned = false;
  if (pixelRepresentation) {
    meta.IsSigned = (pixelRepresentation === 1);
  }
  image.setMeta(meta);

  return image;
};
