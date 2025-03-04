const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: './scripts/crawl.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'scripts/crawl.js',
    libraryTarget: 'commonjs2',
  },
};
