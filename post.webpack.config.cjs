const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: './scripts/post.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'scripts/post.js',
    libraryTarget: 'commonjs2',
  },
};
