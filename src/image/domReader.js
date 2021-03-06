import { Point3D } from '../math/point';
import { Geometry, Size, Spacing } from './geometry';
import { Image } from './image';
import { View } from './view';

/**
 * Create a simple array buffer from an ImageData buffer.
 * @param {Object} imageData The ImageData taken from a context.
 * @return {Array} The image buffer.
 */
const imageDataToBuffer = function (imageData) {
  // remove alpha
  // TODO support passing the full image data
  const dataLen = imageData.data.length;
  const buffer = new Uint8Array((dataLen / 4) * 3);
  let j = 0;
  for (let i = 0; i < dataLen; i += 4) {
    buffer[j] = imageData.data[i];
    buffer[j + 1] = imageData.data[i + 1];
    buffer[j + 2] = imageData.data[i + 2];
    j += 3;
  }
  return buffer;
};

/**
 * Get data from an input context imageData.
 * @param {Number} width The width of the coresponding image.
 * @param {Number} height The height of the coresponding image.
 * @param {Number} sliceIndex The slice index of the imageData.
 * @param {Object} imageBuffer The image buffer.
 * @param {Number} numberOfFrames The final number of frames.
 * @return {Object} The corresponding view.
 */
const getDefaultView = function (width, height, sliceIndex, imageBuffer, numberOfFrames, info) {
  // image size
  const imageSize = new Size(width, height);
  // default spacing
  // TODO: misleading...
  const imageSpacing = new Spacing(1, 1);
  // default origin
  const origin = new Point3D(0, 0, sliceIndex);
  // create image
  const geometry = new Geometry(origin, imageSize, imageSpacing);
  const image = new Image(geometry, imageBuffer, numberOfFrames);
  image.setPhotometricInterpretation('RGB');
  // meta information
  const meta = {};
  meta.BitsStored = 8;
  image.setMeta(meta);
  // view
  const view = new View(image);
  // defaut preset
  view.setWindowLevelMinMax();
  // return
  return view;
};

/**
 * Get data from an input image using a canvas.
 * @param {Object} image The DOM Image.
 * @return {Mixed} The corresponding view and info.
 */
export const getViewFromDOMImage = function (image) {
  const { height, width } = image;

  // draw the image in the canvas in order to get its data
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  // get the image data
  const imageData = ctx.getImageData(0, 0, width, height);

  // image properties
  const info = [];
  if (typeof image.origin === 'string') {
    info.push({ name: 'origin', value: image.origin });
  } else {
    info.push({ name: 'fileName', value: image.origin.name });
    info.push({ name: 'fileType', value: image.origin.type });
    info.push({ name: 'fileLastModifiedDate', value: image.origin.lastModifiedDate });
  }
  info.push({ name: 'imageWidth', value: width });
  info.push({ name: 'imageHeight', value: height });

  // create view
  const sliceIndex = image.index ? image.index : 0;
  const imageBuffer = imageDataToBuffer(imageData);
  const view = getDefaultView(width, height, sliceIndex, [imageBuffer], 1, info);

  // return
  return { view, info };
};

/**
 * Get data from an input image using a canvas.
 * @param {Object} video The DOM Video.
 * @param {Object} callback The function to call once the data is loaded.
 * @param {Object} cbprogress The function to call to report progress.
 * @param {Object} cbonloadend The function to call to report load end.
 * @param {Number} dataindex The data index.
 */
export const getViewFromDOMVideo = function (video, callback, cbprogress, cbonloadend, dataIndex) {
  // video size
  const width = video.videoWidth;
  const height = video.videoHeight;

  // default frame rate...
  const frameRate = 30;
  // number of frames
  const numberOfFrames = Math.floor(video.duration * frameRate);

  // video properties
  const info = [];
  if (video.file) {
    info.push({ name: 'fileName', value: video.file.name });
    info.push({ name: 'fileType', value: video.file.type });
    info.push({ name: 'fileLastModifiedDate', value: video.file.lastModifiedDate });
  }
  info.push({ name: 'imageWidth', value: width });
  info.push({ name: 'imageHeight', value: height });
  info.push({ name: 'numberOfFrames', value: numberOfFrames });

  // draw the image in the canvas in order to get its data
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // using seeked to loop through all video frames
  video.addEventListener('seeked', onseeked, false);

  // current frame index
  let frameIndex = 0;
  // video view
  let view = null;

  // draw the context and store it as a frame
  function storeFrame() {
    // send progress
    const evprog = {
      type: 'load-progress',
      lengthComputable: true,
      loaded: frameIndex,
      total: numberOfFrames
    };
    if (typeof dataIndex !== 'undefined') {
      evprog.index = dataIndex;
    }
    cbprogress(evprog);
    // draw image
    ctx.drawImage(video, 0, 0);
    // context to image buffer
    const imgBuffer = imageDataToBuffer(ctx.getImageData(0, 0, width, height));
    if (frameIndex === 0) {
      // create view
      view = getDefaultView(width, height, 1, [imgBuffer], numberOfFrames, info);
      // call callback
      callback({ view, info });
    } else {
      view.appendFrameBuffer(imgBuffer);
    }
  }

  // handle seeked event
  function onseeked(/* event */) {
    // store
    storeFrame();
    // increment index
    ++frameIndex;
    // set the next time
    // (not using currentTime, it seems to get offseted)
    const nextTime = frameIndex / frameRate;
    if (nextTime <= this.duration) {
      this.currentTime = nextTime;
    } else {
      cbonloadend();
      // stop listening
      video.removeEventListener('seeked', onseeked);
    }
  }

  // trigger the first seeked
  video.currentTime = 0;
};
