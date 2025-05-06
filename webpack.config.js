const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  devtool: false,
  entry: {
    'background': './src/background.js',
    'contentScript': './src/contentScript.js',
    'popup/popup': './src/popup/popup.js',
    'profile/profile': './src/profile/profile.js',
    'templates/templates': './src/templates/templates.js',
    'settings/settings': './src/settings/settings.js',
    'onboarding/onboarding': './src/onboarding/onboarding.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  optimization: {
    minimize: false
  },
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
        { from: "public", to: "." },
        { from: "src/popup/popup.html", to: "popup/popup.html" },
        { from: "src/popup/popup.css", to: "popup/popup.css" },
        { from: "src/profile/profile.html", to: "profile/profile.html" },
        { from: "src/profile/profile.css", to: "profile/profile.css" },
        { from: "src/templates/templates.html", to: "templates/templates.html" },
        { from: "src/templates/templates.css", to: "templates/templates.css" },
        { from: "src/settings/settings.html", to: "settings/settings.html" },
        { from: "src/settings/settings.css", to: "settings/settings.css" },
        // Add new onboarding files
        { from: "src/onboarding/onboarding.html", to: "onboarding/onboarding.html" },
        { from: "src/onboarding/onboarding.css", to: "onboarding/onboarding.css" },
        // Add image directory
        { from: "src/images", to: "images" },
        { from: "manifest.json", to: "manifest.json" }
      ],
    }),
  ],
  resolve: {
    extensions: ['.js']
  }
};