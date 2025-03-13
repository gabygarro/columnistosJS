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
    module: true,
    path: path.resolve(__dirname, 'dist'),
    filename: 'scripts/[name].js',
    library: {
      type: 'module'
    }
  },
  experiments: {
    outputModule: true
  }
};
