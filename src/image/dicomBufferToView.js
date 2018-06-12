import { DicomParser, cleanString, getSyntaxDecompressionName } from '../dicom/dicomParser';
import { PixelBufferDecoder } from '../image/decoder';
import { ImageFactory } from '../image/image';
import { ViewFactory } from '../image/view';

/**
 * Create a dwv.image.View from a DICOM buffer.
 * @constructor
 */
const DicomBufferToView = function () {
  // closure to self
  const self = this;

  /**
     * The default character set (optional).
     * @private
     * @type String
     */
  let defaultCharacterSet;

  /**
     * Set the default character set.
     * param {String} The character set.
     */
  this.setDefaultCharacterSet = function (characterSet) {
    defaultCharacterSet = characterSet;
  };

  /**
     * Pixel buffer decoder.
     * Define only once to allow optional asynchronous mode.
     * @private
     * @type Object
     */
  let pixelDecoder = null;

  /**
     * Get data from an input buffer using a DICOM parser.
     * @param {Array} buffer The input data buffer.
     * @param {Number} dataIndex The data index.
     */
  this.convert = function (buffer, dataIndex) {
    // DICOM parser
    const dicomParser = new DicomParser();
    dicomParser.setDefaultCharacterSet(defaultCharacterSet);
    // parse the buffer
    dicomParser.parse(buffer);

    const pixelBuffer = dicomParser.getRawDicomElements().x7FE00010.value;
    const syntax = cleanString(dicomParser.getRawDicomElements().x00020010.value[0]);
    const algoName = getSyntaxDecompressionName(syntax);
    const needDecompression = (algoName !== null);

    // worker callback
    const onDecodedFirstFrame = function (/* event */) {
      // create the image
      const imageFactory = new ImageFactory();
      const image = imageFactory.create(dicomParser.getDicomElements(), pixelBuffer);
      // create the view
      const viewFactory = new ViewFactory();
      const view = viewFactory.create(dicomParser.getDicomElements(), image);
      // return
      self.onload({ view, info: dicomParser.getDicomElements().dumpToTable() });
    };

    if (needDecompression) {
      const bitsAllocated = dicomParser.getRawDicomElements().x00280100.value[0];
      const pixelRepresentation = dicomParser.getRawDicomElements().x00280103.value[0];
      const isSigned = (pixelRepresentation === 1);
      const nFrames = pixelBuffer.length;

      if (!pixelDecoder) {
        pixelDecoder = new PixelBufferDecoder(algoName);
      }

      // loadend event
      pixelDecoder.ondecodeend = function () {
        self.onloadend();
      };

      // send an onload event for mono frame
      if (nFrames === 1) {
        pixelDecoder.ondecoded = function () {
          self.onloadend();
        };
      }

      // decoder callback
      let countDecodedFrames = 0;
      const onDecodedFrame = function (frame) {
        return function (event) {
          // send progress
          ++countDecodedFrames;
          const ev = {
            type: 'load-progress',
            lengthComputable: true,
            loaded: (countDecodedFrames * 100 / nFrames),
            total: 100
          };
          if (typeof dataIndex !== 'undefined') {
            ev.index = dataIndex;
          }
          self.onprogress(ev);
          // store data
          pixelBuffer[frame] = event.data[0];
          // create image for first frame
          if (frame === 0) {
            onDecodedFirstFrame();
          }
        };
      };

      // decompress synchronously the first frame to create the image
      pixelDecoder.decode(
        pixelBuffer[0],
        bitsAllocated,
        isSigned,
        onDecodedFrame(0),
        false
      );

      // decompress the possible other frames
      if (nFrames !== 1) {
        // decode (asynchronously if possible)
        for (let f = 1; f < nFrames; ++f) {
          pixelDecoder.decode(
            pixelBuffer[f],
            bitsAllocated,
            isSigned,
            onDecodedFrame(f)
          );
        }
      }
    }
    // no decompression
    else {
      // send progress
      const evnodec = {
        type: 'load-progress',
        lengthComputable: true,
        loaded: 100,
        total: 100
      };
      if (typeof dataIndex !== 'undefined') {
        evnodec.index = dataIndex;
      }
      self.onprogress(evnodec);
      // create image
      onDecodedFirstFrame();
      // send load events
      self.onloadend();
    }
  };

  /**
     * Abort a conversion.
     */
  this.abort = function () {
    if (pixelDecoder) {
      pixelDecoder.abort();
    }
  };
};

/**
 * Handle a load end event.
 * @param {Object} event The load end event.
 * Default does nothing.
 */
DicomBufferToView.prototype.onloadend = function (/* event */) {};
/**
 * Handle a load event.
 * @param {Object} event The load event.
 * Default does nothing.
 */
DicomBufferToView.prototype.onload = function (/* event */) {};
/**
 * Handle a load progress event.
 * @param {Object} event The progress event.
 * Default does nothing.
 */
DicomBufferToView.prototype.onprogress = function (/* event */) {};

export default DicomBufferToView;
