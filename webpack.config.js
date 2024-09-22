const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './background.js',
  output: {
    filename: 'bundled-background.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
  target: 'web',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'popup.html', to: 'popup.html' },
        { from: 'popup.js', to: 'popup.js' },
        { from: 'content.js', to: 'content.js' },
        { from: 'styles.css', to: 'styles.css' },
        { from: 'favicon-32x32.png', to: 'favicon-32x32.png' },
        { from: 'node_modules/helia/dist/index.min.js', to: 'helia.min.js' },
        { from: 'node_modules/@helia/unixfs/dist/index.min.js', to: 'helia-unixfs.min.js' },
      ],
    }),
  ],
  resolve: {
    fallback: {
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer/"),
      "crypto": require.resolve("crypto-browserify")
    }
  }
};