/* ******1*********2*********3*********4*********5*********6*********7****** */
import * as Util from '../util/util.js';
import Tat from '../timeSeries/timeSeries-Tat.js';

/**
 * @namespace
 * @prop {function} init - 初期登録処理関連（Init で、イベントハンドラ呼出し関数を登録する先）
 * @prop {Objcet} Tat - timeSeries#Tat
 * @prop {Objcet} chart - 上段グラフ
 * @prop {Objcet} chartD - 下段詳細グラフ
 * @prop {String} chartName - グラフオブジェクトの名称
 * @prop {Array} files - データファイル一覧
 * @prop {Array} filesArrayBuffer - データ読込領域
 * @prop {Date} timer - 前回ログ出力時刻退避領域（処理時間計算用）
 */
export var HJN = {};
window.HJN = HJN; // #67

/**
 * @namespace
 */
HJN.init = {}; // 初期登録処理関連

HJN.Config = HJN.Config || Util.Config; // #76
HJN.Tat = Tat;

HJN.chart = HJN.chartD = null;
HJN.chartName = "chart";

HJN.files = [];
HJN.filesArrayBuffer = [];

HJN.timer = {};
Util.Config("DetailGraph").setValueByKey("D_TIME", +(new Date()));  // 下段表示時刻
                                                                    // #27
