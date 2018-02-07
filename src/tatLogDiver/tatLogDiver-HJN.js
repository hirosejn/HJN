/* ******1*********2*********3*********4*********5*********6*********7****** */
import * as Util from '../util/util.js';

/** @namespace */
export var HJN = {};
window.HJN = HJN; // #67

HJN.init = {}; // 初期登録処理関連

HJN.chart = HJN.chartD = null;
HJN.chartName = "chart";

HJN.CONC = {
    key : 'conc',
    name : '多重度（詳細）',
    label : 'conc:%N',
    N : 0,
    scale : 0,
    color : 'rgba(  0,  0,127, 0.3)',
    tpsN : 1
}; // #7
HJN.CTPS = {
    key : 'cTps',
    name : '多重度（区間最大）',
    label : 'conc(max):%N',
    N : 1,
    scale : 0,
    color : 'rgba(  0,  0,127, 0.1)',
    detailN : 0
};
HJN.ETPS = {
    key : 'eTps',
    name : 'average tps / min (end) [line]', // #57
    label : 'end:%Ntps',
    N : 2,
    scale : 0,
    color : 'rgba(  0, 127, 127, 0.3)'
};
HJN.STAT = {
    key : 'sTat',
    name : 'response by start time [Y2軸:plot]',
    label : 'start:%Nms',
    N : 3,
    scale : 1,
    color : 'rgba(127, 127, 0, 0.3)'
};
HJN.ETAT = {
    key : 'eTat',
    name : 'response by end time   [Y2軸:plot]',
    label : 'end:%Nms',
    N : 4,
    scale : 1,
    color : 'rgba(127,  0,  0, 0.3)'
};
HJN.EMPS = {
    key : 'eMps',
    name : 'max response / min (end) [Y2軸:line]', // #57
    label : 'max:%Nms',
    N : 5,
    scale : 1,
    color : 'rgba(127,   0,  64, 0.3)'
};
HJN.EAPS = {
    key : 'eAps',
    name : 'average response / min (end) [Y2軸:line]', // #57
    label : 'ave:%Nms',
    N : 6,
    scale : 1,
    color : 'rgba(127,   0,  64, 0.1)'
};
// グラフ定数
HJN.seriesConfig = [ HJN.CONC, HJN.CTPS, HJN.ETPS, HJN.STAT, HJN.ETAT,
        HJN.EMPS, HJN.EAPS ];

HJN.detailDateTime = new Date(); // 下段表示時刻
HJN.detailRangePlus = 1.0; // 下段表示範囲（＋秒）
HJN.detailRangeMinus = 1.0; // 下段表示範囲（－秒）

HJN.files = [];
HJN.filesArrayBuffer = [];

HJN.timer = {};
