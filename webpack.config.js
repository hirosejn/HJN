/**
 * webpack によるパッケージングの定義
 *
 *  @example
 * tatLogDiver.js のパッケージング構造
 *
 *  src/tatLogDiver
 *      tatLogDiver.js  webpackでパッケージングするエントリーポイントjs
 *                      以下の階層構造でimport
 *                      Init() を初期呼出し
 *          ../../libs/dygraph.css as cssDygraph  css-loader用
 *          ./tatLogDiver.css as cssTatLogDiver   css-loader用
 *
 *          ./tatLogDiver-Init.js as Init
 *              ../timeSeries/timeSeries.js as TimeSeries
 *              ../simulator/simulator.js as Simulator
 *              ./tatLogDiver-HJN.js as HJN
 *                  以下に再掲しているので省略
 *              ./tatLogDiver-MenuConfigDetailGraph.js as MenuConfigDetailGraph
 *                  ../tatLogDiver/tatLogDiver-Graph.js as Graph
 *                  ../timeSeries/timeSeries.js as TimeSeries
 *              ./tatLogDiver-Plot.js as Plot
 *                  ../timeSeries/timeSeries.js as TimeSeries
 *                  ./tatLogDiver-HJN.js as HJN
 *              ./tatLogDiver-Graph.js as Graph
 *                  以下に再掲しているので省略
 *              ./tatLogDiver-Usage.js as Usage
 *                  手書きのjsから、wqebpackのhtml-loader方式に変更予定:ToDo★
 *              ./tatLogDiver-Copyright.js as Copyright
 *
 *          ./tatLogDiver-Graph.js as Graph
 *              ../timeSeries/timeSeries.js as TimeSeries
 *              ../simulator/simulator.js as Simulator
 *              ./tatLogDiver-Init.js as CreateSampleTatLogAndChartShow
 *              ./tatLogDiver-Menu.js as Menu
 *                  ../simulator/simulator.js as Simulator
 *
 *          ./tatLogDiver-HJN.js as HJN
 *              ../timeSeries/timeSeries-Tat.js as Tat
 *
 *      tatLogDiver-Copyright.js
 *
 *  src/simulator/
 *      simulator.js     同一フォルダの simulator-クラス名.js を importしexportする
 *      simulator-*.js   同一フォルダのjsと、../util をimport
 *          *-MenuConfig.js は、例外的に、../tatLogDiver/tatLogDiver-Init.js もimport
 *
 *  src/timeSeries/
 *      timeSeries.js    同一フォルダの timeSeries-クラス名.js を importしexportする
 *      timeSeries-*.js  同一フォルダのjsと、../util をimport
 *          *-MenuConfig.js は、例外的に、../tatLogDiver/tatLogDiver-Graph.js もimport
 *          timeSeries-FileParser.jsは、例外的に、../tatLogDiver/tatLogDiver-HJN.js もimport
 *
 *  src/util/            他から利用される他を利用しない)共通js
 *      util.js          同一フォルダの util-クラス名.js を importしexportする
 *                       (./config/config.js は、{Config}にexport)
 *      config/config.js 同一フォルダの util-Config.js を importし{Config}にexportする
 *
 * */
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
      new webpack.optimize.UglifyJsPlugin({sourceMap: true})
  ],
  devServer: {                      // ローカル開発用環境を立ち上げる
    contentBase: './',              // './src'と'./dist'の両方が見える場所
    port: 8081      // ブラウザで http://localhost:8081/ でアクセスできるようになる
  }
};