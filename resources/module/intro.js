(function(root, factory) {
  // Browser globals (root is window)
  root.dwv = factory(
    root.i18next,
    root.JSZip,
    root.Konva,
    root.MagicWand
  );
})(this, function(i18next, JSZip, Konva, MagicWand) {
  // similar to what browserify does but reversed
  // https://www.contentful.com/blog/2017/01/17/the-global-object-in-javascript/
  var window =
    typeof window !== 'undefined'
      ? window
      : typeof self !== 'undefined'
        ? self
        : {};
