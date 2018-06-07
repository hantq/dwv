(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('i18next'),
      require('jszip')
    );
  } else {
    // Browser globals (root is window)
    root.dwv = factory(
      root.i18next,
      root.JSZip
    );
  }
})(this, function(i18next, JSZip) {
  // similar to what browserify does but reversed
  // https://www.contentful.com/blog/2017/01/17/the-global-object-in-javascript/
  var window =
    typeof window !== 'undefined'
      ? window
      : typeof self !== 'undefined'
        ? self
        : {};
