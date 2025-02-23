const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: './post.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'post.js',
    libraryTarget: 'commonjs2',
  },
};
