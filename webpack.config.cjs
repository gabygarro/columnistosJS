const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: {
    post: './scripts/post.js',
    crawl: './scripts/crawl.js',
    sendDms: './scripts/sendDms.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'scripts/[name].js',
    libraryTarget: 'commonjs2',
  },
};
