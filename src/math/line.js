// dwv.math.Line

import { Point2D } from './point';

/**
 * Line shape.
 * @constructor
 * @param {Object} begin A Point2D representing the beginning of the line.
 * @param {Object} end A Point2D representing the end of the line.
 */
const Line = function(begin, end) {
  /**
   * Line delta in the X direction.
   * @private
   * @type Number
   */
  var dx = end.getX() - begin.getX();
  /**
   * Line delta in the Y direction.
   * @private
   * @type Number
   */
  var dy = end.getY() - begin.getY();
  /**
   * Line length.
   * @private
   * @type Number
   */
  var length = Math.sqrt(dx * dx + dy * dy);

  /**
   * Get the begin point of the line.
   * @return {Object} The beginning point of the line.
   */
  this.getBegin = function() {
    return begin;
  };
  /**
   * Get the end point of the line.
   * @return {Object} The ending point of the line.
   */
  this.getEnd = function() {
    return end;
  };
  /**
   * Get the line delta in the X direction.
   * @return {Number} The delta in the X direction.
   */
  this.getDeltaX = function() {
    return dx;
  };
  /**
   * Get the line delta in the Y direction.
   * @return {Number} The delta in the Y direction.
   */
  this.getDeltaY = function() {
    return dy;
  };
  /**
   * Get the length of the line.
   * @return {Number} The length of the line.
   */
  this.getLength = function() {
    return length;
  };
  /**
   * Get the length of the line according to a  spacing.
   * @param {Number} spacingX The X spacing.
   * @param {Number} spacingY The Y spacing.
   * @return {Number} The length of the line with spacing
   *  or null for null spacings.
   */
  this.getWorldLength = function(spacingX, spacingY) {
    var wlen = null;
    if (spacingX !== null && spacingY !== null) {
      var dxs = dx * spacingX;
      var dys = dy * spacingY;
      wlen = Math.sqrt(dxs * dxs + dys * dys);
    }
    return wlen;
  };
  /**
   * Get the mid point of the line.
   * @return {Object} The mid point of the line.
   */
  this.getMidpoint = function() {
    return new Point2D(
      parseInt((begin.getX() + end.getX()) / 2, 10),
      parseInt((begin.getY() + end.getY()) / 2, 10)
    );
  };
  /**
   * Get the slope of the line.
   * @return {Number} The slope of the line.
   */
  this.getSlope = function() {
    return dy / dx;
  };
  /**
   * Get the intercept of the line.
   * @return {Number} The slope of the line.
   */
  this.getIntercept = function() {
    return (end.getX() * begin.getY() - begin.getX() * end.getY()) / dx;
  };
  /**
   * Get the inclination of the line.
   * @return {Number} The inclination of the line.
   */
  this.getInclination = function() {
    // tan(theta) = slope
    var angle = Math.atan2(dy, dx) * 180 / Math.PI;
    // shift?
    return 180 - angle;
  };
}; // Line class

export default Line;
