const webpack = require('webpack');
module.exports = {
  entry: `./src/main.js`, // メインとなるJavaScriptファイル（エントリーポイント）
  output: {                         // ファイルの出力設定
    path: `${__dirname}/src/dist`,      // 出力ファイルのディレクトリ名
    filename: 'bundle.min.js'           // 出力ファイル名
  },
  module: {
      loaders: [                    // `-loader`は省略可能
          { test: /\.html$/, loader: 'html-loader' }, // htmlを読み込むローダー
          { test: /\.css$/, loaders: ['style-loader','css-loader'] }, // cssを読み込むローダー
          { test: /\.(jpg|png|gif)$/, loaders: 'url-loader' }  // ファイルを読み込むローダー
      ]
  },
  devtool: 'source-map',            // ソースマップを有効にする
  plugins: [
    new webpack.optimize.UglifyJsPlugin({ // バンドルしたJSをminifyする
      sourceMap: true               // minify時でもソースマップを利用する
    })
  ],
  devServer: {                      // ローカル開発用環境を立ち上げる
    contentBase: './',              // './src'と'./dist'の両方が見える場所
    port: 8081      // ブラウザで http://localhost:8081/ でアクセスできるようになる
  }
};