const path = require('path');
const buble = require('rollup-plugin-buble');

const resolve = p => path.resolve(__dirname, '../', p);
const builds = {
  cjs: {
    dest: resolve('dist/dwv.common.js'),
    format: 'cjs',
  },
  esm: {
    dest: resolve('dist/dwv.esm.js'),
    format: 'es',
  },
  dev: {
    dest: resolve('dist/dwv.js'),
    format: 'umd',
    env: 'development',
  },
  prod: {
    dest: resolve('dist/dwv.min.js'),
    format: 'umd',
    env: 'production',
  },
};

function genConfig (name) {
  const opts = builds[name];
  const config = {
    input: resolve('src/app/application.js'),
    plugins: [
      buble({
        transforms: {
          dangerousForOf: true,
        },
        objectAssign: 'Object.assign',
      }),
    ],
    output: {
      file: opts.dest,
      format: opts.format,
      name: 'dwv',
      exports: 'named',
      sourcemap: opts.env !== 'production',
    },
  };

  Object.defineProperty(config, '_name', {
    enumerable: false,
    value: name,
  });

  return config;
}

if (process.env.TARGET) {
  module.exports = genConfig(process.env.TARGET);
} else {
  exports.getBuild = genConfig;
  exports.getAllBuilds = () => Object.keys(builds).map(genConfig);
}
