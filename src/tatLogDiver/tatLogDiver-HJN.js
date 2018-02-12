/* ******1*********2*********3*********4*********5*********6*********7****** */
import * as Util from '../util/util.js';
import * as TimeSeries from '../timeSeries/timeSeries.js';

/** @namespace */
export var HJN = {};
window.HJN = HJN; // #67

HJN.init = {}; // 初期登録処理関連
HJN.Config = HJN.Config || Util.Config; // #76
HJN.Tat = TimeSeries.Tat;

HJN.chart = HJN.chartD = null;
HJN.chartName = "chart";

Util.Config("DetailGraph").setValueByKey("D_TIME", +(new Date()));  // 下段表示時刻 #27


HJN.files = [];
HJN.filesArrayBuffer = [];

HJN.timer = {};
