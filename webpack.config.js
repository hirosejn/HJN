const webpack = require('webpack');

module.exports = {
  watch: true, // ファイル変更時に自動ビルド
  entry: { // メインとなるJavaScriptファイル（エントリーポイント）
      tatLogDiver: `./src/tatLogDiver/tatLogDiver.js`,
  }, 
  output: {                         // ファイルの出力設定
    path: `${__dirname}/dist`,      // 出力ファイルのディレクトリ名
    filename: '[name].min.js'  // 出力ファイル名
  },
  module: {
      loaders: [                    // `-loader`は省略可能
          { test: /\.html$/, loader: 'html-loader' }, // htmlを読み込むローダー
          { test: /\.css$/, loaders: ['style-loader','css-loader'] }, // cssを読み込むローダー
          { test: /\.(jpg|png|gif)$/, loaders: 'url-loader' }  // ファイルを読み込むローダー
      ]
  },
  devtool: 'source-map',            // ソースマップを有効にする
  target: 'web',    // 生成ソースの実行環境（チャンクの挙動と利用モジュールに影響）
  externals: { // bundleしないモジュール（別途、ｈｔｍｌで読込）
      Dygraph: './libs/dygraph.min.js'
  },
  plugins: [
      new webpack.optimize.UglifyJsPlugin({sourceMap: true}),  
  ],
  devServer: {                      // ローカル開発用環境を立ち上げる
    contentBase: './',              // './src'と'./dist'の両方が見える場所
    port: 8081      // ブラウザで http://localhost:8081/ でアクセスできるようになる
  }
};