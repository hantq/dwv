import { getIdentityMat33 } from '../math/matrix';
import { Point3D } from '../math/point';
import Vector3D from '../math/vector';

/**
 * 2D/3D Size class.
 * @constructor
 * @param {Number} numberOfColumns The number of columns.
 * @param {Number} numberOfRows The number of rows.
 * @param {Number} numberOfSlices The number of slices.
*/
export const Size = function (numberOfColumns, numberOfRows, numberOfSlices) {
  /**
     * Get the number of columns.
     * @return {Number} The number of columns.
     */
  this.getNumberOfColumns = function () { return numberOfColumns; };
  /**
     * Get the number of rows.
     * @return {Number} The number of rows.
     */
  this.getNumberOfRows = function () { return numberOfRows; };
  /**
     * Get the number of slices.
     * @return {Number} The number of slices.
     */
  this.getNumberOfSlices = function () { return (numberOfSlices || 1.0); };
};

/**
 * Get the size of a slice.
 * @return {Number} The size of a slice.
 */
Size.prototype.getSliceSize = function () {
  return this.getNumberOfColumns() * this.getNumberOfRows();
};

/**
 * Get the total size.
 * @return {Number} The total size.
 */
Size.prototype.getTotalSize = function () {
  return this.getSliceSize() * this.getNumberOfSlices();
};

/**
 * Check for equality.
 * @param {Size} rhs The object to compare to.
 * @return {Boolean} True if both objects are equal.
 */
Size.prototype.equals = function (rhs) {
  return rhs !== null &&
        this.getNumberOfColumns() === rhs.getNumberOfColumns() &&
        this.getNumberOfRows() === rhs.getNumberOfRows() &&
        this.getNumberOfSlices() === rhs.getNumberOfSlices();
};

/**
 * Check that coordinates are within bounds.
 * @param {Number} i The column coordinate.
 * @param {Number} j The row coordinate.
 * @param {Number} k The slice coordinate.
 * @return {Boolean} True if the given coordinates are within bounds.
 */
Size.prototype.isInBounds = function (i, j, k) {
  if (i < 0 || i > this.getNumberOfColumns() - 1 ||
        j < 0 || j > this.getNumberOfRows() - 1 ||
        k < 0 || k > this.getNumberOfSlices() - 1) {
    return false;
  }
  return true;
};

/**
 * Get a string representation of the Vector3D.
 * @return {String} The vector as a string.
 */
Size.prototype.toString = function () {
  return `(${this.getNumberOfColumns()
  }, ${this.getNumberOfRows()
  }, ${this.getNumberOfSlices()})`;
};

/**
 * 2D/3D Spacing class.
 * @constructor
 * @param {Number} columnSpacing The column spacing.
 * @param {Number} rowSpacing The row spacing.
 * @param {Number} sliceSpacing The slice spacing.
 */
export const Spacing = function (columnSpacing, rowSpacing, sliceSpacing) {
  /**
     * Get the column spacing.
     * @return {Number} The column spacing.
     */
  this.getColumnSpacing = function () { return columnSpacing; };
  /**
     * Get the row spacing.
     * @return {Number} The row spacing.
     */
  this.getRowSpacing = function () { return rowSpacing; };
  /**
     * Get the slice spacing.
     * @return {Number} The slice spacing.
     */
  this.getSliceSpacing = function () { return (sliceSpacing || 1.0); };
};

/**
 * Check for equality.
 * @param {Spacing} rhs The object to compare to.
 * @return {Boolean} True if both objects are equal.
 */
Spacing.prototype.equals = function (rhs) {
  return rhs !== null &&
        this.getColumnSpacing() === rhs.getColumnSpacing() &&
        this.getRowSpacing() === rhs.getRowSpacing() &&
        this.getSliceSpacing() === rhs.getSliceSpacing();
};

/**
 * Get a string representation of the Vector3D.
 * @return {String} The vector as a string.
 */
Spacing.prototype.toString = function () {
  return `(${this.getColumnSpacing()
  }, ${this.getRowSpacing()
  }, ${this.getSliceSpacing()})`;
};


/**
 * 2D/3D Geometry class.
 * @constructor
 * @param {Object} origin The object origin (a 3D point).
 * @param {Object} size The object size.
 * @param {Object} spacing The object spacing.
 * @param {Object} orientation The object orientation (3*3 matrix, default to 3*3 identity).
 */
export const Geometry = function (origin, size, spacing, orientation) {
  // check input origin
  if (typeof origin === 'undefined') {
    origin = new Point3D(0, 0, 0);
  }
  const origins = [origin];
  // check input orientation
  if (typeof orientation === 'undefined') {
    orientation = new getIdentityMat33();
  }

  /**
     * Get the object first origin.
     * @return {Object} The object first origin.
     */
  this.getOrigin = function () { return origin; };
  /**
     * Get the object origins.
     * @return {Array} The object origins.
     */
  this.getOrigins = function () { return origins; };
  /**
     * Get the object size.
     * @return {Object} The object size.
     */
  this.getSize = function () { return size; };
  /**
     * Get the object spacing.
     * @return {Object} The object spacing.
     */
  this.getSpacing = function () { return spacing; };
  /**
     * Get the object orientation.
     * @return {Object} The object orientation.
     */
  this.getOrientation = function () { return orientation; };

  /**
     * Get the slice position of a point in the current slice layout.
     * @param {Object} point The point to evaluate.
     */
  this.getSliceIndex = function (point) {
    // cannot use this.worldToIndex(point).getK() since
    // we cannot guaranty consecutive slices...

    // find the closest index
    let closestSliceIndex = 0;
    let minDist = point.getDistance(origins[0]);
    let dist = 0;
    for (let i = 0; i < origins.length; ++i) {
      dist = point.getDistance(origins[i]);
      if (dist < minDist) {
        minDist = dist;
        closestSliceIndex = i;
      }
    }
    // we have the closest point, are we before or after
    const normal = new Vector3D(orientation.get(2, 0), orientation.get(2, 1), orientation.get(2, 2));
    const dotProd = normal.dotProduct(point.minus(origins[closestSliceIndex]));
    const sliceIndex = (dotProd > 0) ? closestSliceIndex + 1 : closestSliceIndex;
    return sliceIndex;
  };

  /**
     * Append an origin to the geometry.
     * @param {Object} origin The origin to append.
     * @param {Number} index The index at which to append.
     */
  this.appendOrigin = function (origin, index) {
    // add in origin array
    origins.splice(index, 0, origin);
    // increment slice number
    size = new Size(
      size.getNumberOfColumns(),
      size.getNumberOfRows(),
      size.getNumberOfSlices() + 1
    );
  };
};

/**
 * Check for equality.
 * @param {Geometry} rhs The object to compare to.
 * @return {Boolean} True if both objects are equal.
 */
Geometry.prototype.equals = function (rhs) {
  return rhs !== null &&
        this.getOrigin() === rhs.getOrigin() &&
        this.getSize() === rhs.getSize() &&
        this.getSpacing() === rhs.getSpacing();
};

/**
 * Convert an index to an offset in memory.
 * @param {Object} index The index to convert.
 */
Geometry.prototype.indexToOffset = function (index) {
  const size = this.getSize();
  return index.getI() +
       index.getJ() * size.getNumberOfColumns() +
       index.getK() * size.getSliceSize();
};

/**
 * Convert an index into world coordinates.
 * @param {Object} index The index to convert.
 */
Geometry.prototype.indexToWorld = function (index) {
  const origin = this.getOrigin();
  const spacing = this.getSpacing();
  return new Point3D(
    origin.getX() + index.getI() * spacing.getColumnSpacing(),
    origin.getY() + index.getJ() * spacing.getRowSpacing(),
    origin.getZ() + index.getK() * spacing.getSliceSpacing()
  );
};

/**
 * Convert world coordinates into an index.
 * @param {Object} THe point to convert.
 */
Geometry.prototype.worldToIndex = function (point) {
  const origin = this.getOrigin();
  const spacing = this.getSpacing();
  return new Point3D(
    point.getX() / spacing.getColumnSpacing() - origin.getX(),
    point.getY() / spacing.getRowSpacing() - origin.getY(),
    point.getZ() / spacing.getSliceSpacing() - origin.getZ()
  );
};
