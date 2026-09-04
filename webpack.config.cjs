const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  externalsType: 'module',
  externals: {
    mariadb: 'module mariadb',
    axios: 'module axios',
    cheerio: 'module cheerio',
    'wafrn-sdk': 'module wafrn-sdk',
    dotenv: 'module dotenv',
    'dotenv/config': 'module dotenv/config',
  },
  entry: { post: './scripts/post.js', crawl: './scripts/crawl.js', sendDms: './scripts/sendDms.js' },
  output: {
    module: true,
    path: path.resolve(__dirname, 'dist'),
    filename: 'scripts/[name].js',
    library: { type: 'module' },
  },
  experiments: { outputModule: true },
};
