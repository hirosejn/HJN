import * as Util from '../util/util.js';
import MappedETat from './timeSeries-MappedETat.js';
import ETat from './timeSeries-ETat.js';
import Cash from './timeSeries-Cash.js';


/**
 * @memberOf TimeSeries
 * @class Tat
 * @classdesc Tat 応答時間(Turnaround time)の時系列データ管理クラス
 * @param {ETAT}
 *            [eTat] [[終了時刻(ms), 処理時間(sec), （任意）ログレコード等], ...]<br>
 *            eTatが指定されているとき、this.seriesSet を設定する
 */
export default function Tat(eTat) {
    
    this.cTpsUnit = Tat.UNIT_CTPS[0];
    this.seriesSet = [];

    if (eTat){
        this.createSeries(eTat);
    }
}

/**
 * クラス定数
 */
Tat.UNIT_CTPS = [
        { label: "/sec",   unit: 1000 },
        { label: "/min",   unit: 60000 },
        { label: "/hour",  unit: 3600000 },
        { label: "/day",   unit: 86400000 }];
Tat.CYCLE = 60000;  // ミリ秒 #57

// グラフ定数
Tat.CONC = {
        key : 'conc',
        name : '多重度（詳細）',
        label : 'conc:%N',
        N : 0,
        scale : 0,
        color : 'rgba(  0,  0,127, 0.3)',
        tpsN : 1
    }; // #7
Tat.CTPS = {
        key : 'cTps',
        name : '多重度（区間最大）',
        label : 'conc(max):%N',
        N : 1,
        scale : 0,
        color : 'rgba(  0,  0,127, 0.1)',
        detailN : 0
    };
Tat.ETPS = {
        key : 'eTps',
        name : 'average tps / min (end) [line]', // #57
        label : 'end:%Ntps',
        N : 2,
        scale : 0,
        color : 'rgba(  0, 127, 127, 0.3)'
    };
Tat.STAT = {
        key : 'sTat',
        name : 'response by start time [Y2軸:plot]',
        label : 'start:%Nms',
        N : 3,
        scale : 1,
        color : 'rgba(127, 127, 0, 0.3)'
    };
Tat.ETAT = {
        key : 'eTat',
        name : 'response by end time   [Y2軸:plot]',
        label : 'end:%Nms',
        N : 4,
        scale : 1,
        color : 'rgba(127,  0,  0, 0.3)'
    };
Tat.EMPS = {
        key : 'eMps',
        name : 'max response / min (end) [Y2軸:line]', // #57
        label : 'max:%Nms',
        N : 5,
        scale : 1,
        color : 'rgba(127,   0,  64, 0.3)'
    };
Tat.EAPS = {
        key : 'eAps',
        name : 'average response / min (end) [Y2軸:line]', // #57
        label : 'ave:%Nms',
        N : 6,
        scale : 1,
        color : 'rgba(127,   0,  64, 0.1)'
    };
Tat.toSeriesArray = function(conc, cTps, eTps, sTat, eTat, eMps, eAps) {
    return [ conc, cTps, eTps, sTat, eTat, eMps, eAps ];
}
Tat.seriesConfig = Tat.toSeriesArray(
        Tat.CONC, Tat.CTPS, Tat.ETPS, Tat.STAT, Tat.ETAT,
        Tat.EMPS, Tat.EAPS);

/**
 * 終了時刻のTAT時系列データ(eTat)から、描画用時系列データ配列を作成する
 * 
 * @memberOf TimeSeries
 * @param {ETAT}
 *            eTat [[終了時刻(ms), 処理時間(sec), （任意）ログレコード等], ...]
 * @return {seriesSet} dygraph用時系列データ配列
 */
Tat.prototype.createSeries = function (eTat) {
    // 時系列データを初期化する
    var conc = [], cTps = [], eTps = [], sTat = [], eMps = [], eAps = [];

    // 集計対象データがないとき
    if (eTat.length === 0)
        return Tat.toSeriesArray(conc, cTps, eTps, sTat, eTat, eMps, eAps);

    /** eTatをソートする * */
    // 開始時刻でソートする #35
    eTat.sort(function (a, b) {
        return a.x - b.x;
    });
    Util.Logger.ShowLogText("[1:eTat sorten ] " + eTat.length + " plots",
            "calc");

    /** eTps(時間あたり処理件数),eMps,eAps(時間あたり最大/平均応答時間)時系列データを作成する * */
    var dFrom = Math.floor(eTat[0].x / Tat.CYCLE) * Tat.CYCLE,
        dTo = dFrom + Tat.CYCLE,
        num = 0, // #39
        maxTat = 0.0, // #19
        aveTmp = 0.0;
    eTat.forEach(function (e) {
        if (e.x < dTo) {
            num += 1;
            if (maxTat < e.y) maxTat = e.y; // #19
            aveTmp += e.y;
        } else {
            eTps.push({x : dFrom, y : num * 1000 / Tat.CYCLE}); // #57
            eMps.push({x : dFrom, y : maxTat}); // #19
            eAps.push({x : dFrom, y : aveTmp / num});
            dFrom = Math.floor(e.x / Tat.CYCLE) * Tat.CYCLE;
            dTo = dFrom + Tat.CYCLE;
            num = 1;
            maxTat = e.y; // #19 #39
            aveTmp = e.y; // #39
        }
    }, this);
    eTps.push({x : dFrom,             y : num * 1000 / Tat.CYCLE}); // #57
    eTps.push({x : dFrom + Tat.CYCLE, y : num * 1000 / Tat.CYCLE}); // #57
    eMps.push({x : dFrom,             y : maxTat}); // #19
    eMps.push({x : dFrom + Tat.CYCLE, y : maxTat}); // #57
    eAps.push({x : dFrom,             y : aveTmp / num});
    eAps.push({x : dFrom + Tat.CYCLE, y : aveTmp / num}); // #57
    
    Util.Logger.ShowLogText("[3:eTps,eMps,eAps created] " + eTps.length
            + " plots", "calc");

    /** sTat（開始時間）時系列データを作成する,同時に入力eTatを補正する * */
    // eTatからsTatを登録する
    eTat.forEach(function (e, i) {
        // 処理時間=0 のとき、1マイクロ秒とみなす(有効桁0.2マイクロ秒に切上される）
        if (e.y === 0) {
            e.y = 0.001;
            e.x += e.y;
        } // ミリ秒
        // sTatにeTatデータを登録する
        sTat.push({
            x : e.x - e.y,
            y : e.y,
            eTatIdx : i
        });
    });
    // 開始時刻でソートする
    sTat.sort(function (a, b) {
        return a.x - b.x;
    });
    // eTatにsTatの位置を設定する
    sTat.forEach(function (s, i) {
        eTat[s.eTatIdx].sTatIdx = i;
    });
    Util.Logger.ShowLogText("[2:sTat created] " + sTat.length + " plots",
            "calc");

    /** CONC(多重度)時系列データを作成する * */
    var concTmp = [];
    // eTatから、多重度が変化した時刻の一覧を作成する
    eTat.map(function (e, i) {
        // 開始時刻にカウントアップ情報を追加する
        concTmp.push({x : e.x - e.y, y : 1});
        // 終了時刻をカウントダウン情報を追加する
        concTmp.push({x : e.x, y : -1});
    });
    // concを変化した時刻（開始or終了）でソートする
    concTmp.sort(function (a, b) {
        return a.x - b.x;
    });
    // concに同時取引数を設定する
    var concNum = 0;
    concTmp.forEach(function (c, i, a) {
        // 重複削除用フラグを立てる #23
        if (i > 0 && c.x === a[i - 1].x) {
            a[i - 1].del = true;
        }
        // 同時取引数を集計する(前提：c.y に、開始なら1、終了なら(-1)が設定されている)
        concNum += c.y;
        c.y = concNum;
    });
    // concの同じ時刻の点を削除する #23
    conc = concTmp.filter(function (c) {
        return !c.del;
    });
    Util.Logger.ShowLogText("[4:conc created] " + conc.length + " plots",
            "calc");

    /** cTPS秒間同時処理件数（concurrent transactions/sec）時系列データを作成する #18 * */
    var XSec = floorTime(conc[0].x, Tat.CYCLE), // ミリ秒
    YMax = conc[0].y, YNext = conc[0].y;
    // concの先頭と末尾の時刻(x)の差よりPlot数を求め、Plot数が規定数(8000個)を超えたら、桁上げする #38
    var cTpsMaxPlots = 8000, // 桁上げするPlot数
    cTpsUnits = Tat.UNIT_CTPS, // #48
    concTerm = conc[conc.length - 1].x - conc[0].x, // ミリ秒
    cTpsIdx = 0;
    while (cTpsIdx < cTpsUnits.length
            && concTerm / cTpsUnits[cTpsIdx].unit > cTpsMaxPlots) {
        cTpsIdx++;
    }
    cTpsIdx = (cTpsUnits.length > cTpsIdx) ? cTpsIdx : cTpsUnits.length - 1;
    this.cTpsUnit = cTpsUnits[cTpsIdx];
    // メニューのViewのcTPSのラベルに単位を追加する
    var pos = (this === HJN.chart) ? 0 : 1;
    document.getElementsByName("cTps")[pos]
                .parentNode.lastChild.data = HJN.Tat.CTPS.name + this.cTpsUnit.label;

    // 規定時間単位の最大同時処理数cTPSを作成する
    conc.forEach(function (c) {
        if (floorTime(c.x, this.cTpsUnit.unit) === XSec) { // c.xは ミリ秒
            YMax = Math.max(YMax, c.y);
        } else {
            cTps.push({x : XSec, y : Math.max(YMax, YNext)});
            for (var t = XSec + this.cTpsUnit.unit;
                    t < floorTime(c.x, this.cTpsUnit.unit);
                    t += this.cTpsUnit.unit) { // c.xはミリ秒
                        cTps.push({x : t, y : YNext});
                if (YNext === 0) break;
            }
            XSec = floorTime(c.x, this.cTpsUnit.unit);
            YMax = Math.max(YNext, c.y);
        }
        YNext = c.y;
    }, this);
    cTps.push({x : XSec, y : YMax});
    cTps.push({x : XSec + this.cTpsUnit.unit, y : YNext});

    // Util.Logger.ShowLogText("[5-1:cTps created] " + cTps.length + "
    // plots","calc");

    // cTpsのxからindexを引くMapを作成する #18
    eTat = new ETat(eTat); // #75
    Util.Logger.ShowLogText("[5:cTps created] " + cTps.length + " plots("
            + +Math.floor(concTerm / 1000) + "sec" + cTpsUnits[cTpsIdx].label
            + ")", "calc");

    // 集計結果をHJN.Graphに設定する 注）this.SERIESESと同じ順番にすること
    this.seriesSet = Tat.toSeriesArray(conc, cTps, eTps, sTat, eTat, eMps, eAps);

    return this;

    
    // 時刻を指定ミリ秒間隔で切り捨てる（内部関数）
    function floorTime(t, cycle) {
        return Math.floor(Math.floor(t / cycle) * cycle);
    }
};

/**
 * cTpsの集計単位を取得する
 * 
 * @memberOf TimeSeries
 * @return {object} 単位構造体 { label: "/sec", unit: 1000 }
 */
Tat.prototype.getCTpsUnit = function () {
    return this.cTpsUnit;
}

/**
 * seriesSetを取得する
 * 
 * @memberOf TimeSeries
 * @return {array} seriesSet
 */
Tat.prototype.getSeriesSet = function () {
    return this.seriesSet;
}
