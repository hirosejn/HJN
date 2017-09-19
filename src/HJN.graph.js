/* ******1*********2*********3*********4*********5*********6*********7****** */
/* HJN クラス変数 */
/** @namespace */
HJN = {};
HJN.ver = "v0.5.07";
/** @namespace */
HJN.util = {}; // utils登録変数
/** @namespace */
HJN.Plot = {}; // plot関連
/** @namespace */
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
    name : 'trans / sec (end) [line]',
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
    name : 'max response / sec (end) [Y2軸:line]',
    label : 'max:%Nms',
    N : 5,
    scale : 1,
    color : 'rgba(127,   0,  64, 0.3)'
};
HJN.EAPS = {
    key : 'eAps',
    name : 'average response / sec (end) [Y2軸:line]',
    label : 'ave:%Nms',
    N : 6,
    scale : 1,
    color : 'rgba(127,   0,  64, 0.1)'
};
/** グラフ定数 */
HJN.seriesConfig = [ HJN.CONC, HJN.CTPS, HJN.ETPS, HJN.STAT, HJN.ETAT,
        HJN.EMPS, HJN.EAPS ];

HJN.detailDateTime = new Date(); // 下段表示時刻
HJN.detailRangePlus = 1.0; // 下段表示範囲（＋秒）
HJN.detailRangeMinus = 1.0; // 下段表示範囲（－秒）

HJN.files;
HJN.filesIdx = 0;
HJN.filesArrayBuffer = [];

HJN.timer = {};

/**
 * seriesSet: dygraph用時系列データ配列
 * 
 * @typedef {array.<CONC, CTPS, ETPS, STAT, ETAT, EMPS, EAPS>} seriesSet
 */
/**
 * CONC:多重度の時系列データ<br>
 * [{x:変化時刻(ms) ,y:多重度数, sTatIdx:sTatの配列位置, eTatIdx: eTatの配列位置 }]
 * 
 * @typedef {array.<xMs, yInt, index, index>} CONC
 */
/**
 * CTPS: 秒間最大多重度の時系列データ<br>
 * [{x:秒毎時刻(ms), y:秒内最大多重度数, concFromIdx:該当concの先頭配列位置（末尾は次のcTpsから取得） ]
 * 
 * @typedef {array.<xMs, index>} CTPS
 */
/**
 * ETPS: 秒間終了件数の時系列データ<br>
 * [{x:秒毎時刻(ms), y:秒内終了件数 }]
 * 
 * @typedef {array.<xMs, yInt>} ETPS
 */
/**
 * STAT: 開始時刻のTAT（応答時間）時系列データ<br>
 * [{x:開始時刻(ms) ,y:レスポンス(sec), eTatIdx: eTatの配列位置 }]
 * 
 * @typedef {array.<xMs, ySec, index>} STAT
 */
/**
 * ETAT: 終了時刻のTAT（応答時間）時系列データ<br>
 * [{x:変化時刻(ms) ,y:レスポンス(sec), fileIdx:ファイル配列位置, pos:レコード位置, len:レコード長, sTatIdx:
 * sTatの配列位置 }]
 * 
 * @typedef {array.<xMs, ySec, index, index, number, index>} ETAT
 */
/**
 * EMPS: 秒間最大TAT（応答時間）時系列データ（終了時刻ベース）<br>
 * [{x:秒毎時刻(ms), y:秒内最大レスポンス(sec) }]
 * 
 * @typedef {array.<xMs, ySec>} EMPS
 */
/**
 * EAPS: 秒間平均TAT（応答時間）時系列データ（終了時刻ベース）<br>
 * [{x:秒毎時刻(ms), y:秒内平均レスポンス(sec) }]
 * 
 * @typedef {array.<xMs, ySec>} EAPS
 */
/**
 * xMs: x軸に用いる時刻(ms)
 * 
 * @typedef {number} xMs
 */
/**
 * ySec: y軸に用いる秒単位の時間（応答時間など）
 * 
 * @typedef {number} ySec
 */
/**
 * yInt: y軸に用いる整数（個数など）
 * 
 * @typedef {number} yInt
 */
/**
 * index: 配列の位置（インデックス）に用いる整数
 * 
 * @typedef {number} index
 */

/**
 * インスタンス内の定数を設定する。併せて性能対策として頻繁に使うDOM要素を取り込む
 * 
 * @namespace
 * @class
 * @constructor
 * @classdesc TAT(Turnaround time)ログ分析用グラフ
 * @param {string}
 *            chartIdName グラフを作成するHTML要素のID
 * @param {string}
 *            [globalName="HJN.chartD"] グラフのID
 * @param {Object}
 *            [config] グラフの設定
 * @example HJN.chart = new HJN(chartName, "HJN.chart"); HJN.chart.init();
 *          HJN.chartD = new HJN(chartName + "Detail", "HJN.chartD");
 *          HJN.chartD.init();
 */
HJN.Graph = function (chartIdName, globalName, config) {
    "use strict";
    /* メンバ変数 */
    this.seriesSet = [];
    this.chartIdName = chartIdName; // arg0 "chart","chartDetail"
    this.globalName = globalName || "HJN.chartD"; // arg1
    if (!config) { // arg2
        var isMain = (globalName === "HJN.chart") ? true : false;
        config = {
            SERIESES : [ {
                n : HJN.CONC.N,
                process : !isMain,
                visiblity : !isMain,
                renderer : 'area'
            }, {
                n : HJN.CTPS.N,
                process : true,
                visiblity : true,
                renderer : isMain ? 'scatterplot' : 'bar'
            }, {
                n : HJN.ETPS.N,
                process : true,
                visiblity : isMain,
                renderer : 'line'
            }, {
                n : HJN.STAT.N,
                process : !isMain,
                visiblity : !isMain,
                renderer : 'scatterplot'
            }, {
                n : HJN.ETAT.N,
                process : !isMain,
                visiblity : !isMain,
                renderer : 'scatterplot'
            }, {
                n : HJN.EMPS.N,
                process : true,
                visiblity : true,
                renderer : 'line'
            }, {
                n : HJN.EAPS.N,
                process : true,
                visiblity : isMain,
                renderer : 'line'
            } ],
            height : 0.40,
            isVisiblity : true
        };
    }

    // FileReaderを設定する
    this.fileReader = HJN.util.FileReader(); // #24

    // グラフ定義領域の宣言
    this.windowId = document.getElementById("hjn_chart");
    this.menuId = document.getElementById("hjnBoxBuger");
    this.menuPlaceOnId = document.getElementById("hjnBoxPlaceOn");
    this.chartId = document.getElementById(this.chartIdName);
    this.dyData = [];
    this.dySeries = {};

    this.scale = [ null, null ];
    this.graph = null;
    this.cycle = 1000; // ミリ秒
    this.cTpsUnit = HJN.Graph.prototype.UNIT_CTPS[0];

    this.cash = null; // キャッシュオブジェクト

    // グラフの設定(処理対象データの設定のみ this.SERIESES[] に取り込む）
    this.SERIESES = [];
    this.labels = [ 'Date' ];
    for (var i = 0, j = 0; i < config.SERIESES.length; i++) {
        if (config.SERIESES[i].process === true) {
            this.SERIESES[j] = {
                key : '',
                name : '',
                visiblity : false,
                renderer : '',
                order : 0,
                scale : 0,
                color : ''
            };
            // 定数(HJN.seriesConfig)指定項目を設定する
            for ( var attr in HJN.seriesConfig[i]) {
                this.SERIESES[j][attr] = HJN.seriesConfig[i][attr];
            }
            // 引数(config)指定項目を設定する
            this.SERIESES[j].visiblity = config.SERIESES[i].visiblity;
            this.SERIESES[j].renderer = config.SERIESES[i].renderer;

            var renderer = config.SERIESES[i].renderer;
            if (renderer === 'scatterplot') {
                this.dySeries[this.SERIESES[j].key] = {
                    strokeWidth : 0.0,
                    drawPoints : true
                };
            } else if (renderer === 'line') {
                this.dySeries[this.SERIESES[j].key] = {
                    strokeWidth : 2.0,
                    connectSeparatedPoints : true,
                    stepPlot : true
                };
            } else if (renderer === 'area') {
                this.dySeries[this.SERIESES[j].key] = {
                    strokeWidth : 0.0,
                    stepPlot : true,
                    fillGraph : true
                };
            } else { // if (renderer === 'bar' ) {
                this.dySeries[this.SERIESES[j].key] = {
                    strokeWidth : 0.0,
                    connectSeparatedPoints : true,
                    stepPlot : true,
                    fillGraph : true
                };
            }
            this.dySeries[this.SERIESES[j].key].color = this.SERIESES[j].color;

            if (this.SERIESES[j].scale === 1) {
                this.dySeries[this.SERIESES[j].key].axis = 'y2';
            }

            this.labels.push(this.SERIESES[j].key);
            j++;
        }
    }

    this.height = config.height;
    this.isVisiblity = config.isVisiblity;
};

/**
 * クラス定数
 */
HJN.Graph.prototype = {
    UNIT_RANGE : [ // #48
    {
        label : "sec",
        val : "1000"
    }, {
        label : "10sec",
        val : "10000"
    }, {
        label : "min",
        val : "60000"
    }, {
        label : "10min",
        val : "600000"
    }, {
        label : "hour",
        val : "3600000"
    }, {
        label : "6hours",
        val : "21600000"
    }, {
        label : "day",
        val : "86400000"
    }, {
        label : "year",
        val : "31536000000"
    } ],

    UNIT_CTPS : [ {
        label : "/sec",
        unit : 1000
    }, {
        label : "/min",
        unit : 60000
    }, {
        label : "/hour",
        unit : 3600000
    }, {
        label : "/day",
        unit : 86400000
    } ]
};

/**
 * クラスメソッド：menuのFilterのｘｙ幅指定エリアにグラフのｘｙ幅を設定する<br>
 * dygraphのdrawCallbackに設定する関数<br>
 * menuのRadio(F_SYNC)選択時に呼び出す関数（このためにクラスメソッド）
 */
HJN.Graph.DrawCallback = function (g, is_initial) { // #50 #51
    // 初期表示時は、メニューを設定しない
    if (is_initial)
        return;
    // Filterメニューで指定されている F_SYNC の状態を取得する
    var syncMode = HJN.chartD.fileReader.getValueByKey("F_SYNC");
    // "F_SYNC_UPPER"かつ上段グラフ もしくは、"F_SYNC_DETAIL"かつ下段グラフのとき処理する
    if ((syncMode === "F_SYNC_UPPER" && g.HJN === HJN.chart)
            || (syncMode === "F_SYNC_DETAIL" && g.HJN === HJN.chartD)) {
        // ｘ軸の幅をFilterメニューフェールドに反映する
        setText("m.F_TIME_FROM", HJN.util.D2S(g.xAxisRange()[0],
                "yyyy/MM/dd hh:mm:ss.ppp"));
        setText("m.F_TIME_TO", HJN.util.D2S(g.xAxisRange()[1],
                "yyyy/MM/dd hh:mm:ss.ppp"));
        // ｙ軸(右)の幅をFilterメニューフェールドに反映する
        setText("m.F_TAT_FROM", +(g.yAxisRange(1)[0].toPrecision(4)));
        setText("m.F_TAT_TO", +(g.yAxisRange(1)[1].toPrecision(4)));
    }

    function setText(id, val) {
        document.getElementById(id).value = val;
        document.getElementById(id).onchange();
    }
};

/**
 * グラフを初期化する
 */
HJN.Graph.prototype.init = function () {
    "use strict";
    // メニューを作成する
    this.addMenu();
    // 凡例を作成する
    if (this.isVisiblity)
        addLegend(this);
    // 既にグラフがあるときは削除する
    if (this.graph) {
        this.graph.HJN = null; // （注：循環参照対策
        this.graph.destroy();
    }
    // ウィンドウ枠に合わせて描画領域をリサイズするイベントを登録し、リサイズする
    window.addEventListener("resize", this.resize.bind(this));
    window.addEventListener("orientationchange", this.resize.bind(this)); // tablet
    // 回転
    // #22
    var resizes = document.getElementsByClassName("hjnResize");
    for (var i = 0; i < resizes.length; i++) {
        resizes[i].addEventListener("change", this.resize.bind(this)); // メニュ－の開閉
        // #31
    }

    // legendを追加する（内部関数）
    function addLegend(that) { // arg0 : this
        var chartIdName = that.chartIdName, serieses = that.SERIESES, divLegend = document
                .getElementById(chartIdName + "_legend"), formName = chartIdName
                + "_LegendForm", htmlText = '<form name="' + formName + '">';
        for (var i = 0; i < serieses.length; i++) {
            var ckBox = serieses[i].visiblity ? 'checked="checked"' : '';
            htmlText += '<label class="legend" style="background:'
                    + serieses[i].color + ';">' + '<input type="checkbox" '
                    + 'name="' + serieses[i].key + '"' + 'onclick="'
                    + that.globalName + '.onClickSetVisibility(' + i + ');" '
                    + ckBox + '>' + serieses[i].name + '</label><BR>';
        }
        htmlText += '</form>';
        divLegend.innerHTML = htmlText;
    }
};

/**
 * legendの表示指定をグラフに反映する(onclick呼出用）
 * 
 * @param {index}
 *            i seriesSet配列の設定変更するグラフのインデックス
 */
HJN.Graph.prototype.onClickSetVisibility = function (i) { //
    "use strict";
    var formName = this.chartIdName + "_LegendForm", ck = document[formName].elements[i].checked;
    this.graph.setVisibility(i, ck);
};

/**
 * ウィンドウ枠に合わせて描画領域をリサイズする（dygraphは幅は自動、高さは指定）
 */
HJN.Graph.prototype.resize = function () {
    "use strict";
    // 幅（メニューの状態に合わせて計算） #31
    var dWidth = 0;
    if (this.menuId.checked && !this.menuPlaceOnId.checked) {
        dWidth = this.menuId.parentNode.clientWidth;
    }
    var width = window.innerWidth - dWidth;
    this.windowId.style.width = width + "px";
    // 高さ（ウィンドウサイズの比率(this.height)をかけて算出）
    var height = Math.floor(window.innerHeight * this.height);
    this.chartId.style.height = height + "px";

    if (this.graph)
        this.graph.resize(width, height);
    return height;
};

/**
 * seriesSetを取り込む
 * 
 * @param {seriesSet}
 *            seriesSet dygraph用時系列データ配列
 */
HJN.Graph.prototype.setSeriesSet = function (seriesSet) { // #30
    "use strict";
    this.seriesSet = seriesSet;
    HJN.seriesConfig.forEach(function (e) {
        this[e.key] = seriesSet[e.N];
    }, this);
};

/**
 * 終了時刻のTAT時系列データ(eTat)から、描画用時系列データ配列を作成する
 * 
 * @param {ETAT}
 *            eTat [[終了時刻(ms), 処理時間(sec), （任意）ログレコード等], ...]
 * @return {seriesSet} dygraph用時系列データ配列
 */
HJN.Graph.prototype.createSeries = function (eTat) {
    "use strict";
    // 時系列データを初期化する
    var conc = [], cTps = [], eTps = [], sTat = [], eMps = [], eAps = [];
    // 注）this.SERIESESと同じ順番にすること
    var seriesSet = [ conc, cTps, eTps, sTat, eTat, eMps, eAps ];
    // 集計対象データがないとき
    if (eTat.length === 0)
        return seriesSet;

    /** eTatをソートする * */
    // 開始時刻でソートする #35
    eTat.sort(function (a, b) {
        return a.x - b.x;
    });
    HJN.util.Logger.ShowLogText("[1:eTat sorten ] " + eTat.length + " plots",
            "calc");

    /** eTps(時間あたり処理件数),eMps,eAps(時間あたり最大/平均応答時間)時系列データを作成する * */
    var dFrom = Math.floor(eTat[0].x / this.cycle) * this.cycle, dTo = dFrom
            + this.cycle, num = 0, // #39
    maxTat = 0.0, // #19
    aveTmp = 0.0;
    eTat.forEach(function (e) {
        if (e.x < dTo) {
            num += 1;
            if (maxTat < e.y)
                maxTat = e.y; // #19
            aveTmp += e.y;
        } else {
            eTps.push({
                x : dFrom,
                y : num
            });
            eMps.push({
                x : dFrom,
                y : maxTat
            }); // #19
            eAps.push({
                x : dFrom,
                y : aveTmp / num
            });
            dFrom = Math.floor(e.x / this.cycle) * this.cycle;
            dTo = dFrom + this.cycle;
            num = 1;
            maxTat = e.y; // #19 #39
            aveTmp = e.y; // #39
        }
    }, this);
    eTps.push({
        x : dFrom,
        y : num
    });
    eMps.push({
        x : dFrom,
        y : maxTat
    }); // #19
    eAps.push({
        x : dFrom,
        y : aveTmp / num
    });
    HJN.util.Logger.ShowLogText("[3:eTps,eMps,eAps created] " + eTps.length
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
    HJN.util.Logger.ShowLogText("[2:sTat created] " + sTat.length + " plots",
            "calc");

    /** CONC(多重度)時系列データを作成する * */
    // eTatから、多重度が変化した時刻の一覧を作成する
    eTat.map(function (e, i) {
        // 開始時刻にカウントアップ情報を追加する
        conc.push({
            x : e.x - e.y,
            y : 1,
            sTatIdx : e.sTatIdx,
            eTatIdx : i
        });
        // 終了時刻をカウントダウン情報を追加する
        conc.push({
            x : e.x,
            y : -1,
            sTatIdx : e.sTatIdx,
            eTatIdx : i
        });
    });
    // concを変化した時刻（開始or終了）でソートする
    conc.sort(function (a, b) {
        return a.x - b.x;
    });
    // HJN.util.Logger.ShowLogText("[4-1:conc/created&sorten ] "+ conc.length +
    // "
    // plots","calc");
    // concに同時取引数を設定する
    var concNum = 0;
    conc.forEach(function (c) {
        concNum += c.y; // 同時取引数を集計する(c.y に、開始なら1、終了なら(-1)が設定されている)
        c.y = concNum;
    });
    HJN.util.Logger.ShowLogText("[4:conc created] " + conc.length + " plots",
            "calc");

    /** cTPS秒間同時処理件数（concurrent transactions/sec）時系列データを作成する #18 * */
    var XSec = floorTime(conc[0].x, this.cycle), // ミリ秒
    YMax = conc[0].y, YNext = conc[0].y;
    // concの先頭と末尾の時刻(x)の差よりPlot数を求め、Plot数が規定数(8000個)を超えたら、桁上げする #38
    var cTpsMaxPlots = 8000, // 桁上げするPlot数
    cTpsUnits = HJN.Graph.prototype.UNIT_CTPS, // #48
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
    document.getElementsByName("cTps")[pos].parentNode.lastChild.data = HJN.CTPS.name
            + this.cTpsUnit.label;

    // 規定時間単位の最大同時処理数cTPSを作成する
    conc.forEach(function (c) {
        if (floorTime(c.x, this.cTpsUnit.unit) === XSec) { // c.xは ミリ秒
            YMax = Math.max(YMax, c.y);
        } else {
            cTps.push({
                x : XSec,
                y : Math.max(YMax, YNext)
            });
            for (var t = XSec + this.cTpsUnit.unit; t < floorTime(c.x,
                    this.cTpsUnit.unit); t += this.cTpsUnit.unit) { // c.xはミリ秒
                cTps.push({
                    x : t,
                    y : YNext
                });
                if (YNext === 0)
                    break;
            }
            XSec = floorTime(c.x, this.cTpsUnit.unit);
            YMax = Math.max(YNext, c.y);
        }
        YNext = c.y;
    }, this);
    cTps.push({
        x : XSec,
        y : YMax
    });
    cTps.push({
        x : XSec + this.cTpsUnit.unit,
        y : YNext
    });

    // HJN.util.Logger.ShowLogText("[5-1:cTps created] " + cTps.length + "
    // plots","calc");

    // cTpsのxからindexを引くMapを作成する #18
    eTat.tatMap = new HJN.util.MappedETat(eTat);
    eTat.cash = HJN.util.Cash();
    HJN.util.Logger.ShowLogText("[5:cTps created] " + cTps.length + " plots("
            + +Math.floor(concTerm / 1000) + "sec" + cTpsUnits[cTpsIdx].label
            + ")", "calc");

    // 集計結果を設定する
    this.setSeriesSet(seriesSet);
    return this.seriesSet;

    // 時刻を指定ミリ秒間隔で切り捨てる（内部関数）
    function floorTime(t, cycle) {
        return Math.floor(Math.floor(t / cycle) * cycle);
    }
};

/**
 * データを変更し描画する
 * 
 * @param {seriesSet}
 *            seriesSet dygraph用時系列データ配列
 */
HJN.Graph.prototype.update = function (seriesSet) {
    "use strict";
    // 指定データがあるとき取り込む
    if (seriesSet)
        this.setSeriesSet(seriesSet);
    // dygraph用表示データを作成する
    var xy = [], // グラフデータ({x:,y:}ペアの配列）の一覧（グラフ１本が配列要素）
    idx = [], // グラフデータの処理中配列位置を保有する配列
    x = [], // グラフデータの処理中配列のｘ(時刻)の値を保有する配列
    row = [], // dygraph１レコードワーク配列：（[x,y0,y1...]の配列）の一レコード分を保持する配列
    minX = 0, i = 0; // グラフ番号用ワーク
    // xy[] に処理対象seriesを指定する
    for (i = 0; i < this.SERIESES.length; i++) {
        xy[i] = this.seriesSet[this.SERIESES[i].N];
        idx[i] = 0;
    }
    // dygraph表示時間帯を設定する（上段グラフは全期間が処理対象）
    var xRangeMin = Number.MIN_VALUE, xRangeMax = Number.MAX_VALUE;
    if (HJN.chartD === this) { // 詳細（下段グラフ）のとき画面で指定された期間を設定する // ミリ秒
        xRangeMin = +HJN.detailDateTime - HJN.detailRangeMinus
                * HJN.detailRangeUnit; // #48
        xRangeMax = +HJN.detailDateTime + HJN.detailRangePlus
                * HJN.detailRangeUnit; // #48
    }

    // dygraph用arrayを空にする
    this.dyData = [];

    // 指定範囲の先頭が秒単位の端数のとき、dygraph用arrayに、先頭ワークデータを登録する #3
    var xVal = Math.floor(xRangeMin / 1000) * 1000;
    if (Number.MIN_VALUE < xRangeMin && xRangeMin !== xVal) { // 範囲指定（＝下段）
        var firstRow = [ xRangeMin ]; // 先頭はx（時刻）
        xy.forEach(function (xyData, i) {
            // 秒間最大値系のyは最大値or０を、他はnullを設定する
            var yVal = null;
            if (this.SERIESES[i].key === HJN.CTPS.key) {
                // 始端時刻を含む秒の値（最大値）を、始端時刻にセットする
                var j = HJN.util.binarySearch(xVal, xyData, function (e) {
                    return e.x;
                });
                yVal = (0 <= j) ? xyData[j].y : 0;
            }
            firstRow.push(yVal);
        }, this);
        this.dyData.push(firstRow);
    }

    // dygraph用arrayに表示データを登録する
    while (xy.some(function (e, i) {
        return (idx[i] < e.length);
    })) {
        // dygraph１レコードワーク配列 を空にする
        row = [];
        // dygraph１レコードワーク配列 の先頭に、次に追加するｘ（時刻＝各ｘｙ処理位置が持つｘの最小値）を設定する
        xy.forEach(function (e, i) {
            x[i] = (idx[i] < e.length) ? e[idx[i]].x : Number.MAX_VALUE;
        });
        minX = x[0]; // minX = Math.min.apply(null, x);
        for (i = 1; i < x.length; i++) {
            if (x[i] < minX)
                minX = x[i];
        }
        row.push(minX); // ミリ秒
        // dygraph１レコードワーク配列 の２番目以降に、各ｘｙのｘを設定する
        xy.forEach(function (e, i) {
            if (e.length <= idx[i]) {
                row.push(null); // 末尾を過ぎたｘｙのyはnull
            } else if (e[idx[i]].x === minX) {
                // ｘｙのｘ(e[idx[i]].x)が、出力するｘ(minX)と同じとき、ｙを設定し、ｘｙの処理位置(idx[i])を次に進める
                row.push(e[idx[i]].y);
                idx[i]++;
            } else {
                row.push(null); // xと ｘｙのｘが異なる場合 null
            }
        });
        // dygraph用arrayに、編集したdygraph１レコードワーク配列 を登録する
        if (xRangeMin <= minX && minX <= xRangeMax) {
            this.dyData.push(row);
        }
    }
    // 指定範囲の先頭が秒単位の端数のとき、dygraph用arrayに、末尾ワークデータを登録する #3
    if (xRangeMax < Number.MAX_VALUE && // 範囲指定（＝下段）
    xRangeMax !== Math.floor(xRangeMax / 1000) * 1000) {
        var lastRow = [ xRangeMax ]; // 先頭はx（時刻）
        xy.forEach(function (e, i) { // 秒間最大値系のyは始端：最大値、終端：０を、他はnullを設定
            lastRow.push((this.SERIESES[i].key === HJN.CTPS.key) ? 0 : null);
        }, this);
        this.dyData.push(lastRow);
    }

    HJN.util.Logger.ShowLogText("[7:dygraph data created] "
            + this.dyData.length + " rows", "calc");

    // グラフの設定
    var visibility = [];
    if (this.isVisiblity) {
        // visiblity指定できるとき画面の表示指定を取り込む
        var inputs = document[this.chartIdName + "_LegendForm"];
        for (i = 0; i < this.SERIESES.length; i++) {
            visibility.push(inputs[this.SERIESES[i].key].checked);
        }
    } else {
        // visiblity指定できないとき、デフォルト設定を取り込む
        for (i = 0; i < this.SERIESES.length; i++) {
            visibility.push(this.SERIESES[i].visiblity);
        }
    }

    // グラフの作成
    if (this.graph) {
        // 既にグラフがあるときはデータのみ変更する（注：ここでdestroy()すると下段のpointClickCallback時にエラー）
        this.graph.updateOptions({
            file : this.dyData
        });
        this.graph.resetZoom(); // #51
    } else {
        // グラフが無いときは新規作成する
        this.graph = new Dygraph(this.chartId, this.dyData, {
            height : this.resize(),
            labels : this.labels,
            legend : 'always', // 'follow', //
            showLabelsOnHighlight : false, // 効果不明
            labelsDiv : document.getElementById(HJN.chartName + 'Labels'),
            labelsSeparateLines : false,
            // legendFormatter: this.legendFormatter, // コメントアウトでlegendが非表示
            axes : {
                x : {
                    axisLabelFormatter : axisLabelFormatter,
                    axisLabelWidth : 100
                },
                y : {
                    axisLabelWidth : 30,
                    logscale : false
                },
                y2 : {
                    drawGrid : true,
                    logscale : false,
                    independentTicks : true,
                    gridLinePattern : [ 1, 2 ]
                }
            },
            includeZero : true,
            // axisLabelFontSize: 10,
            axisLineColor : 'rgba(0, 0, 0, 0.2)',
            gridLineColor : 'rgba(0, 0, 0, 0.2)',
            strokeWidth : 2,
            pointSize : 3,
            // ylabel: 'Primary y-axis',
            y2label : this === HJN.chart ? '' : 'ms',
            // rollPeriod: 7,
            // errorBars: true,
            // showRangeSelector: true
            // drawPointCallback: drawPointCallback,
            drawHighlightPointCallback : drawHighlightPointCallback,
            highlightCircleSize : 3,
            highlightCallback : highlightCallback,
            pointClickCallback : pointClickCallback,
            annotationClickHandler : annotationClickHandler,
            annotationDblClickHandler : annotationDblClickHandler,
            // clickCallback: clickCallback,
            drawCallback : HJN.Graph.DrawCallback, // #50 #51
            highlightSeriesOpts : {
            // strokeWidth: 3,
            // strokeBorderWidth: 1,
            // highlightCircleSize: 5
            },
            series : this.dySeries,
            labelsKMB : true,
            visibility : visibility,
            connectSeparatedPoints : true
        });
        this.graph.HJN = this; // dygraphイベント処理でHJJを取れるように（注：循環参照）
    }

    // 初期表示の不活性グラフを設定
    function axisLabelFormatter(d, gran, opts) {
        return Dygraph.dateAxisLabelFormatter(new Date(d), gran, opts);
    }
    HJN.util.Logger.ShowLogText("[8:dygraph showen] ", "calc");

    // 再描画する
    this.showBalloon();
    HJN.util.Logger.ShowLogText("[9:balloon showen] ", "calc");

    // updateメソッド内部関数宣言
    // 点がハイライトになったときの描画処理（内部関数宣言） g:{dygraph} HJN.chartD.graph
    function drawHighlightPointCallback(g, name, ctx, cx, cy, color, r, idx) {
        // file dropのとき、新グラフデータに更新後に、旧グラフのidx値が引き渡されたとき 処理しない #12
        if (!g.rawData_ || g.rawData_.length - 1 < idx)
            return;
        var x = g.rawData_[idx][0], // クリックした 点(CONC)のx の値
        eTat = HJN.chart.eTat, sTat = HJN.chart.sTat, n = 0;

        // ETAT,STATのときlogレコードを表示する #28
        if ((name === HJN.STAT.key || name === HJN.ETAT.key)
                && typeof x != 'undefined') { // #41
            // eTatの配列位置をを求める
            if (name === HJN.ETAT.key) {
                // ETATのとき、終了時刻(x)からeTatの配列位置(n)を検索する
                n = HJN.util.binarySearch(x, eTat, function (e) {
                    return e.x;
                });
            } else {
                // STATのとき、開始時刻(x)からsTatの配列位置(sTatN)を検索し、sTatからeTatの配列位置を取得する
                var sTatN = HJN.util.binarySearch(x, sTat, function (e) {
                    return e.x;
                });
                n = sTat[sTatN].eTatIdx;
            }
            // ログデータを表示し、線を引く
            if (0 <= n) {
                var e = eTat[n], logHtml = "";
                if (typeof e.pos === "undefined") { // 生成データのとき
                    // 生成データをCSVのログデータとして編集する
                    logHtml = HJN.util.D2S(e.x, "yyyy/MM/dd hh:mm:ss.ppp")
                            + ", " + e.y;
                } else { // ファイル読込のとき
                    // ファイルの該当行を Uint8Arrayに登録する
                    var buff = new Uint8Array(e.len + 2), file = HJN.filesArrayBuffer[HJN.filesIdx];
                    buff.set(new Uint8Array(file, e.pos, Math.min(e.len + 2,
                            file.byteLength - e.pos)));
                    // ログデータを編集する
                    logHtml = String.fromCharCode.apply(null, buff);
                }
                // ログデータを表示する
                document.getElementById("lineViewer").innerHTML = logHtml;
                // 線を引く #30
                drawTatLine(ctx, e.x, e.y, 2, color);
                ctx.stroke();
            }
        }

        // CONCのとき同時処理の線を引く
        if (name === HJN.CONC.key && typeof eTat.tatMap != 'undefined') { // #17
            // #41
            // 指定時刻に動いているeTatの一覧(trans)を取得する
            var trans = eTat.tatMap.search(x, x, 1000); // #18
            // 以前に選択した線を消す
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            // 同時処理の線を引く
            if (0 <= i && 0 < trans.length) {
                // TRANS分の線を引く
                trans.forEach(function (e) {
                    drawTatLine(ctx, e.x, e.y, 1, HJN.CONC.color);
                });
            }
            ctx.stroke();
        }

        // 選択点の点と数値を表示する
        var val = (0 <= idx && name) ? g.rawData_[idx][g.setIndexByName_[name]]
                : '';
        drawPoint(ctx, cx, cy, r, color, val);
        // 縦線を引く
        drawLine(ctx, [ {
            x : cx,
            y : 0
        }, {
            x : cx,
            y : ctx.canvas.height
        } ], 1, "rgba(127,127,127,0.5)", [ 1, 2 ]);

        // drawHighlightPointCallback 内部関数宣言
        // TAT線を表示する（内部関数）
        function drawTatLine(ctx, x, y, heigth, color) {
            // isXend指定の始点(false)／終点（true)に合わせて、線の座標を求める
            var tXs = g.toDomXCoord(x - y), // ミリ秒
            tXe = g.toDomXCoord(x), // ミリ秒
            tY = g.toDomYCoord(y, 1); // 第二軸:1
            drawLine(ctx, [ {
                x : tXs,
                y : tY
            }, {
                x : tXe,
                y : tY
            } ], heigth, color);
            drawPoint(ctx, tXs, tY, r, HJN.STAT.color);
            drawPoint(ctx, tXe, tY, r, HJN.ETAT.color);
        }

        // 線を表示する（内部関数）
        function drawLine(ctx, plots, r, color, lineDashSegments) {
            ctx.beginPath();
            ctx.lineWidth = r;
            ctx.lineCap = "round";
            ctx.strokeStyle = color;
            if (lineDashSegments)
                ctx.setLineDash(lineDashSegments); // lineDashは[num]
            ctx.moveTo(plots[0].x, plots[0].y);
            plots.forEach(function (p) {
                ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
        }

        // 点を表示する（内部関数）
        function drawPoint(ctx, cx, cy, r, color, text) {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.arc(cx, cy, r, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.stroke();
            if (text) {
                text = Math.round(text * 10) / 10;
                ctx.beginPath();
                ctx.fillStyle = "rgba(0,0,0,1)";
                ctx.textAlign = "center";
                ctx.fillText(text, cx, cy - 12);
                ctx.stroke();
            }
        }
    }

    // 点がハイライトになったときの処理（内部関数宣言）
    function highlightCallback(e, x, pts, row, seriesName) {
        // マウスクリック用に座標をHJN.hoverXYに退避する
        HJN.hoverXY = {
            x : x,
            pts : pts,
            row : row,
            seriesName : seriesName
        };
    }

    // 点をクリックしたときの処理(内部関数宣言）
    function pointClickCallback(event, p) {
        if (!p.annotation)
            HJN.Plot.PointClickCallback(p);
    }

    // アノテーション（グラフ中の吹出し）をクリックしたときの処理(内部関数宣言）
    function annotationClickHandler() { // annotation, p, dygraph, event
        HJN.Plot.PointClickCallback(arguments[1]);
    }

    // アノテーション（グラフ中の吹出し）をダブルクリックしたときの処理(内部関数宣言）
    function annotationDblClickHandler() { // annotation, p, dygraph, event
        // 指定ポイントを削除する
        HJN.Plot.PointDblClickCallback(arguments[1]);
    }

    // グラフをクリックしたときの処理(内部関数宣言）
    // function clickCallback(e, x, pts) {}
};

/**
 * dygraphのBalloonを再描画する
 */
HJN.Graph.prototype.showBalloon = function () {
    "use strict";
    if (this.cTps.length === 0)
        return; // ctpsが空の時何もしない

    var ann = {
        series : "",
        xval : 0,
        shortText : "",
        text : ""
    }, anns = [];
    // 表示時間帯を求める
    var ctps = this.cTps, minX = ctps[0].x, maxX = ctps[ctps.length - 1].x;
    // アノテーションをdygparhに追加する
    HJN.Plot.List.forEach(function (e) {
        if (minX <= e.x && e.x <= maxX) {
            ann = {
                series : HJN.seriesConfig[e.n].key,
                xval : e.x, // ミリ秒
                shortText : e.y,
                text : e.label
            };
            anns.push(ann);
            // 詳細Plot＆詳細グラフデータが無いとき、詳細Plot内のTPS Plotを追加する #7
            if ("tpsPlot" in e) { // 詳細plotのとき
                if (this.SERIESES.findIndex(function (s) {
                    return s.N === e.n;
                }) < 0) { // 詳細グラフデータが無いとき
                    ann = {
                        series : HJN.seriesConfig[e.tpsPlot.n].key,
                        xval : e.tpsPlot.x, // ミリ秒
                        shortText : e.tpsPlot.y,
                        text : e.tpsPlot.label
                    };
                    anns.push(ann);
                }
            }
        }
    }, this);
    // dygraphの残描画処理が完了してからアノテーションをセットする
    this.graph.ready(function () {
        this.setAnnotations(anns);
    });
};

/**
 * dygraphのlegendを編集する(dygraph オプション登録用関数）
 * {@link http://dygraphs.com/options.html#legendFormatter}
 * 
 * @param {ETAT}
 *            data [[終了時刻(ms), 処理時間(sec), （任意）ログレコード等], ...]
 * @return {string} dygraphのlegendに表示する文字（HTML)
 */
HJN.Graph.prototype.legendFormatter = function (data) {
    "use strict";
    // legend: 'always'指定のとき、マウスがグラフ外にあると dataに値が設定されていなことを考慮
    var html = (typeof data.x === "undefined") ? '' : HJN.util.DateToString(
            new Date(data.xHTML), "yyyy/MM/dd hh:mm:ss.ppp");
    html = '<label class="datetime">' + html + '</label>';
    data.series
            .forEach(function (series) {
                if (!series.isVisible)
                    return;
                var val = (typeof series.yHTML === "undefined") ? ""
                        : series.yHTML, text = '<label '
                        + getStyle(series.label)
                        + '">'
                        + "&nbsp;"
                        + series.labelHTML
                        + ':'
                        + ('####' + val.replace(/\.[0-9]*/, "")).slice(-4)
                                .replace(/#/g, "&nbsp;") + '</label>';
                html += series.isHighlighted ? '<b>' + text + '</b>' : text;
                html += '&nbsp;';
            });
    return html;
    // keyに設定された色指定するstyle文字列を取得する（legendFormatter内部関数宣言）
    function getStyle(key) {
        var i = HJN.seriesConfig.findIndex(function (e) {
            return (e.key === key);
        });
        return 'style="background:' + HJN.seriesConfig[i].color + ';';
    }
};

/*
 * メニュー関連機能 ************************************
 */
/**
 * メニューを追加する
 * 
 * @param {ETAT}
 *            eTat [[終了時刻(ms), 処理時間(sec), （任意）ログレコード等], ...]
 * @return {seriesSet} dygraph用時系列データ配列
 */
HJN.Graph.prototype.addMenu = function () {
    "use strict";
    // メニュー用のエレメントを取得する
    var divMenuId = this.chartIdName + "_menu";
    var divMenu = document.getElementById(divMenuId);
    // menu用divがないとき、chartの直前に追加する #13
    if (!divMenu) {
        var div = document.createElement('div');
        div.id = divMenuId;
        div.className = "menuBar";
        divMenu = this.chartId.parentNode.insertBefore(div, this.chartId);
    }
    // メニューボタン定義を登録する
    var g = this.globalName, menuOpenCsv = { // getInputTag
        menuLabel : "Open csv data file",
        funcName : g + ".menuOpenCsv",
        menuId : divMenuId + "_OpenCsv "
    }, menuSaveConfig = { // getATag
        menuLabel : "save format (.json)",
        funcName : g + ".menuSaveConfig",
        menuId : divMenuId + "_SaveCongig",
        fileName : "hjnconfig.json"
    }, menuLoadConfig = { // getATag
        menuLabel : "load format (.json)",
        funcName : g + ".menuLoadConfig",
        menuId : divMenuId + "_LoadCongig",
        fileName : "hjnconfig.json"
    }, menuFilterApply = { // getFuncTag #34
        menuLabel : "Apply filter & reload",
        funcName : g + ".menuFilterApply",
        menuId : divMenuId + "_FilterApply"
    }, menuFilterClear = { // getFuncTag #34
        menuLabel : "Clear filter condition",
        funcName : g + ".menuFilterClear",
        menuId : divMenuId + "_FilterClear"
    }, menuDownloadImg = { // getATag
        menuLabel : "graph image(.png)",
        funcName : g + ".menuDownloadImg",
        menuId : divMenuId + "_DownloadImg",
        fileName : "graph.png"
    }, menuDownloadCsv = { // getATag
        menuLabel : "graph data(.csv)",
        funcName : g + ".menuDownloadCsv",
        menuId : divMenuId + "_DownloadCsv",
        fileName : "graph.csv"
    }, menuDownloadLog = { // getATag
        menuLabel : "graph log records(.csv)",
        funcName : g + ".menuDownloadLog",
        menuId : divMenuId + "_DownloadLog",
        fileName : "tatlog.csv"
    }, menuDownloadConc = { // getATag
        menuLabel : "conc log records(.csv)",
        funcName : g + ".menuDownloadConc",
        menuId : divMenuId + "_DownloadConc",
        fileName : "conclog.csv"
    }, menuHelpAbout = { // getAlertTag
        menuLabel : "about TAT log diver",
        menuId : divMenuId + "_HelpAbout",
        strFuncName : "HJN.init.Copyright()"
    }, menuHowToUse = { // getAlertTag
        menuLabel : "How to use TAT log diver",
        menuId : divMenuId + "_HelpHowToUse",
        strFuncName : "HJN.init.HowToUse()"
    };

    // メニューを追加する
    var accordion = document.createElement('div'); // 要素の作成
    if (HJN.chart.chartId === this.chartId) { // 上段グラフ用機能のメニュー追加
        // File Menu
        accordion.innerHTML = '<li class="hjnMenuLv1">'
                + getAccordionTag(this, 0, "File") + '<ul class="hjnMenuLv2">'
                + getInputTag(menuOpenCsv)
                + this.fileReader.getConfigHtml("File") // #24
                + getATag(menuSaveConfig) + getATag(menuLoadConfig) + '</ul>'
                + '</li>';
        // Filter Menu #34
        accordion.innerHTML += '<li class="hjnMenuLv1" id="menu_Filter">'
                + getAccordionTag(this, 1, "Filter")
                + '<ul class="hjnMenuLv2">'
                + this.fileReader.getConfigHtml("Filter") // #24
                + getFuncTag(menuFilterApply) + getFuncTag(menuFilterClear)
                + '</ul>' + '</li>';
        // View Menu
        accordion.innerHTML += '<li class="hjnMenuLv1" id="menu_View">'
                + getAccordionTag(this, 3, "View", true)
                + '<ul class="hjnMenuLv2">' // 
                + '<li><div id="' + this.chartIdName + '_legend"></div></li>'
                + '</ul>' + '</li>';
        // Download Menu
        accordion.innerHTML += '<li class="hjnMenuLv1" id="menu_Download">'
                + getAccordionTag(this, 2, "Download")
                + '<ul class="hjnMenuLv2">' //
                + getATag(menuDownloadImg, "Upper ")
                + getATag(menuDownloadCsv, "Upper ")
                + getATag(menuDownloadLog, "Upper ")
                + getATag(menuDownloadConc, "Upper ") + '</ul>' + '</li>';
        divMenu.appendChild(accordion);

        // File Open用 イベントリスナー登録
        document.getElementById(menuOpenCsv.menuId).addEventListener('change',
                this.menuOpenCsv.bind(this), false);
    } else { // 下段用グラフ機能のメニュー追加
        // Download Menu
        var chartDownloadUl = document.createElement('ul');
        chartDownloadUl.className = "hjnMenuLv2";
        chartDownloadUl.innerHTML = '' //
                + getATag(menuDownloadImg, "Detail ")
                + getATag(menuDownloadCsv, "Detail ")
                + getATag(menuDownloadLog, "Detail ")
                + getATag(menuDownloadConc, "Detail ");
        var chartDownload = document.getElementById("menu_Download");
        chartDownload.appendChild(chartDownloadUl);

        // View Menu
        var chartViewUl = document.createElement('ul');
        chartViewUl.className = "hjnMenuLv2";
        chartViewUl.innerHTML = '<li><div id="' + this.chartIdName
                + '_legend"></div></li>';
        var chartView = document.getElementById("menu_View");
        chartView.appendChild(chartViewUl);

        // "Bottom detail graph" Menu
        accordion.innerHTML = '<li class="hjnMenuLv1">'
                + getAccordionTag(this, 4, "Bottom detail graph", true)
                + '<ul class="hjnMenuLv2">' //
                + '<ol><div id="detailTimeRange">' + getDetailTimeRangeTag()
                + '</div></ol>' // #51
                + '<li><div id="chartPlots"></div></li>' //
                + '</ul>' + '</li>';
        // Help Menu
        accordion.innerHTML += '<li class="hjnMenuLv1">'
                + getAccordionTag(this, 5, "Help")
                + '<ul class="hjnMenuLv2" style="width: 100%;">' //
                + getAlertTag(menuHelpAbout) + getAlertTag(menuHowToUse)
                + '</ul>' + '</li>';
        divMenu.appendChild(accordion);
    }
    // アコーディオンラベル用<input><label>タグ編集（内部関数宣言） #31
    // idは、ユニークな英数字なら何でもよい（ラベル押下時のアコーディオン開閉ラジオボタン連動用の接尾語）
    function getAccordionTag(that, id, labelText, isChecked) {
        var isAccordion = true, // true:アコーディオン型 false:折りたたみ型 #21
        typeStr = isAccordion ? ' type="checkbox" name="accordion" '
                : ' type="radio" name="accordion" ', //
        checkedStr = ' checked="checked" ';
        return '' + '<input id="ac-' + that.chartIdName + id + '"' + typeStr
                + (isChecked ? checkedStr : '') + '">' + '<label for="ac-'
                + that.chartIdName + id + '">' + labelText + '</label>';
    }

    // File Open用<input>タグ編集（内部関数宣言）
    // '<ol><a><label>Child Menu<input type="file" id="xxx"
    // multiple/></label></a></ol>
    function getInputTag(arg) {
        return '' + '<ol><a><label class="hjnButton4Input">' + arg.menuLabel // #51
                + '<input type="file" id="' + arg.menuId + '"  multiple />'
                + '</label></a></ol>';
    }

    // ダウンロード用<A>タグ編集（内部関数宣言）
    // '<li><a id="xxx" href="#">Child Menu</a><li/>'
    function getATag(arg, preLabel) {
        preLabel = preLabel || "";
        return '' + '<li><a id="' + arg.menuId + ' "'
                + 'class="hjnButton4Input" href="#" ' // #51
                + 'download="' + arg.fileName + '" ' //
                + 'onclick="' + arg.funcName + '(' + "'" + arg.menuId + "', '"
                + arg.fileName + "'" + ')" ' + '>' + preLabel + arg.menuLabel
                + '</a></li>';
    }

    // グローバルメソッド呼出用<A>タグ編集（内部関数宣言） #34
    // '<li><a id="xxx" href="#">Child Menu</a></li>'
    function getFuncTag(arg, preLabel) {
        preLabel = preLabel || "";
        return '' + '<li><a id="' + arg.menuId + ' "'
                + 'class="hjnButton4Input" href="#" ' // #51
                + 'onclick="' + arg.funcName + '()">' //
                + preLabel + arg.menuLabel + '</a></li>';
    }

    // Alert用<A>タグ編集（内部関数宣言）
    // '<a id="xxx" onclick=Alert("xxx")>Child Menu</a>'
    function getAlertTag(arg) {
        return '' + '<ol><a id="' + arg.menuId + '"'
                + 'class="hjnButton4Input" ' // #51
                + ' onclick="alert(' + arg.strFuncName + ")" + '"' + '>' //
                + '<label>' + arg.menuLabel + '</label></a></ol>';
    }

    // 下段表示幅指定用<div>タグ編集
    function getDetailTimeRangeTag() {
        var initPlus = 1, initMinus = 2; // #3
        return 'Range: '
                + '- <input type="number" id="DetailRangeMinus" min="0" step="1"'
                + 'value="'
                + initPlus
                + '" style="width:40px; "  onchange="HJN.init.setDetailRange()"> '
                + '+ <input type="number" id="DetailRangePlus" min="0" step="1"'
                + 'value="'
                + initMinus
                + '" style="width:40px; "  onchange="HJN.init.setDetailRange()"> '
                + '<select id="DetailRangeUnit" class="hjnLabel4Input" onchange="HJN.init.setDetailRange()">' // #48
                + HJN.Graph.prototype.UNIT_RANGE.reduce(
                        function (prev, e, i, a) {
                            return prev + '<option value="' + e.val + '">'
                                    + e.label + '</option>';
                        }, '') + '</select>';
    }
};

/**
 * メニュー機能：CSVデータファイルを開く
 * 
 * @param {evt}
 *            evt ファイルオープンイペント
 */
HJN.Graph.prototype.menuOpenCsv = function (evt) {
    "use strict";
    var file_list = evt.target.files;
    // 指定されたファイルを処理する
    HJN.init.FileReader(file_list);
};

/**
 * メニュー機能：画面設定をJSON形式のセーブファイルとしてダウンロードする
 * 
 * @param {String}
 *            menuId Chrome, FireFoxのときに使用：ダウンロードファイルの一時作成に使うHTMLタグ
 * @param {String}
 *            fileName ie11以降のときに使用：ダウンロードファイル名
 */
HJN.Graph.prototype.menuSaveConfig = function (menuId, fileName) {
    "use strict";
    // plotsをjsonに変換する
    var json = JSON.stringify(HJN.Plot.List);
    // ダウンロードする
    this.menuDownloadBlob(this.menuBuffToBlob(json), menuId, fileName);
};
/**
 * メニュー機能：JSON形式の画面設定ファイルをロードし画面表示に反映する TODO
 * 
 * @param {String}
 *            menuId Chrome, FireFoxのときに使用：ダウンロードファイルの一時作成に使うHTMLタグ？
 * @param {String}
 *            fileName ie11以降のときに使用：ダウンロードファイル名 ？
 */
HJN.Graph.prototype.menuLoadConfig = function () { // menuId, fileName
    "use strict";
    /** 未実装ここから * */
    var msg = "この機能は未実装です\r\画面の一部のHTMLがダウンロードされます";
    alert(msg);
    // ファイルからjsonを読み込む
    var json = JSON.stringify(HJN.Plot.List); // document.getElementById(textareaId).value
    /** 未実装ここまで * */
    // jsonテキストからHJN.Plot.Listを作成する
    var plots = [], obj = JSON.parse(json);
    if (isSameType([], obj)) {
        obj.forEach(function (e) {
            if (isSameType(0, e.x))
                plots.push(e);
        });
    }
    if (0 < plots.length)
        HJN.Plot.List = plots;
    HJN.Plot.Render();
    // グラフ内の吹き出しを再表示する
    HJN.Plot.ShowBalloon();
    // 型判定
    function isSameType(sample, obj) {
        var clas0 = Object.prototype.toString.call(sample), clas1 = Object.prototype.toString
                .call(obj);
        return clas0 === clas1;
    }
};
/**
 * メニュー機能：メニューで指定されたフィルタの条件で再描画する
 * 
 */
HJN.Graph.prototype.menuFilterApply = function () { // #34
    "use strict";
    if (HJN.files === undefined) {
        // 自動生成データのグラフを表示しているとき
        HJN.init.ChartShow(HJN.chart.eTatOriginal)
    } else {
        // ファイル指定のグラフを表示しているとき
        HJN.init.FileReader(HJN.files);
    }
};
/**
 * メニュー機能：フィルタ条件を初期値にし、再描画する
 * 
 */
HJN.Graph.prototype.menuFilterClear = function () { // #34
    "use strict";
    // メニュー画面おフィルタ条件に、初期値を設定する
    setText("m.F_TIME_FROM", null);
    setText("m.F_TIME_FROM", null);
    setText("m.F_TIME_TO", null);
    setText("m.F_TAT_FROM", 0);
    setText("m.F_TAT_TO", null);
    setSelector("m.F_TEXT_NON");
    setText("m.F_TEXT_LEN", null);
    setText("m.F_TEXT_POS", 1);
    setText("m.F_TEXT_COL", 3);
    setText("m.F_TEXT_REG", null);

    function setText(id, val) {
        document.getElementById(id).value = val;
        document.getElementById(id).onchange();
    }
    function setSelector(id) {
        document.getElementById(id).checked = true;
        document.getElementById(id).onchange();
    }

};
/**
 * メニュー機能：canvas画像をファイルとしてダウンロードする
 * 
 * @param {String}
 *            menuId Chrome, FireFoxのときに使用：ダウンロードファイルの一時作成に使うHTMLタグ
 * @param {String}
 *            fileName ie11以降のときに使用：ダウンロードファイル名
 */
HJN.Graph.prototype.menuDownloadImg = function (menuId, fileName) {
    "use strict";
    var type = 'image/png';
    // canvas から DataURL で画像を出力
    var canvas = this.chartId.getElementsByTagName('canvas')[0], dataurl = canvas
            .toDataURL(type);
    // DataURL のデータ部分を抜き出し、Base64からバイナリに変換
    var bin = atob(dataurl.split(',')[1]);
    // Uint8Array ビューに 1 バイトずつ値を埋める
    var buffer = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) {
        buffer[i] = bin.charCodeAt(i);
    }
    // Uint8Array ビューのバッファーを抜き出し、それを元に Blob を作る
    var blob = new Blob([ buffer.buffer ], {
        type : type
    });
    // var url = window.URL.createObjectURL(blob);

    // ダウンロードする
    this.menuDownloadBlob(blob, menuId, fileName);
};

/**
 * メニュー機能：グラフ全データをCSVファイルとしてダウンロードする
 * 
 * @param {String}
 *            menuId Chrome, FireFoxのときに使用：ダウンロードファイルの一時作成に使うHTMLタグ
 * @param {String}
 *            fileName ie11以降のときに使用：ダウンロードファイル名
 */
HJN.Graph.prototype.menuDownloadCsv = function (menuId, fileName) {
    "use strict";
    var bom = new Uint8Array([ 0xEF, 0xBB, 0xBF ]), // Excel対応UTF8のBOMコード指定
    csv = this.labels.join(','); // csvヘッダ行の作成
    this.dyData.forEach(function (e) {
        csv += "\r\n" + e.join(',');
    }); // csvデータ展開
    var blob = new Blob([ bom, csv ], {
        "type" : "text/csv"
    }); // blob変換
    // ダウンロードする
    this.menuDownloadBlob(blob, menuId, fileName);
};

/**
 * メニュー機能：グラフ全データの編集元に該当するTATログの該当行をCSVファイルとしてダウンロードする
 * 
 * @param {String}
 *            menuId Chrome, FireFoxのときに使用：ダウンロードファイルの一時作成に使うHTMLタグ
 * @param {String}
 *            fileName ie11以降のときに使用：ダウンロードファイル名
 */
HJN.Graph.prototype.menuDownloadLog = function (menuId, fileName) {
    "use strict";
    var eTat = this.eTat;
    if (0 < eTat.length) { // 出力対象データがあるとき
        if (typeof eTat[0].pos === "undefined") { // 生成データのとき
            // 生成データをCSVに編集する
            var eTatCsv = "";
            eTat.forEach(function (e) {
                eTatCsv += HJN.util.D2S(e.x, "yyyy/MM/dd hh:mm:ss.ppp") + ","
                        + e.y + "\r\n";
            });
            // ダウンロードする
            this.menuDownloadBlob(this.menuBuffToBlob(eTatCsv), menuId,
                    fileName);
        } else { // ファイル読込のとき
            // 出力データを元ファイルのpos順にソートする（改行コードのないファイル末尾レコートがある場合も最後に来るように） #45
            eTat.sort(function (a, b) {
                return a.pos - b.pos;
            });
            // 最大作業領域として元ファイルサイズ分のメモリを確保する
            var buff = new Uint8Array(
                    HJN.filesArrayBuffer[HJN.filesIdx].byteLength), offset = 0;
            // ファイルの該当行を Uint8Arrayに登録する
            eTat.forEach(function (e) {
                buff.set(new Uint8Array(HJN.filesArrayBuffer[HJN.filesIdx],
                        e.pos, Math.min(e.len + 2,
                                HJN.filesArrayBuffer[HJN.filesIdx].byteLength
                                        - e.pos)), offset);
                offset += (e.len + 2);
            });
            // 未使用作業領域を削除する
            var buff2 = new Uint8Array(buff.slice(0, offset));
            // ダウンロードする
            this.menuDownloadBlob(this.menuBuffToBlob(buff2), menuId, fileName);
        }
    } else { // 出力対象データがないとき
        var str = "No log in the time.";
        // ダウンロードする
        this.menuDownloadBlob(this.menuBuffToBlob(str), menuId, fileName);
    }
};

/**
 * メニュー機能：plotsでconcが選択されているとき、同時処理に該当するTATログの該当行をCSVファイルとしてダウンロードする
 * 
 * @param {String}
 *            menuId Chrome, FireFoxのときに使用：ダウンロードファイルの一時作成に使うHTMLタグ
 * @param {String}
 *            fileName ie11以降のときに使用：ダウンロードファイル名
 */
HJN.Graph.prototype.menuDownloadConc = function (menuId, fileName) {
    "use strict";
    var plot = HJN.Plot.List.find(function (e) {
        return e.radio;
    });
    if (plot.n === HJN.CONC.N || plot.n === HJN.STAT.N || plot.n === HJN.ETAT.N) {
        // CONC|STAT|ETATが選択されているとき
        var trans = this.eTat.tatMap.search(plot.x); // #18
        if (0 < trans.length) { // 出力テキストを編集する
            if (typeof trans[0].pos === "undefined") {
                // 初期表示データのとき、CSVを編集する
                // 生成データをCSVに編集する
                var csv = "";
                trans.forEach(function (e) {
                    csv += HJN.util.D2S(e.x, "yyyy/MM/dd hh:mm:ss.ppp") + ","
                            + e.y + "\r\n";
                });
                // ダウンロードする
                this.menuDownloadBlob(this.menuBuffToBlob(csv), menuId,
                        fileName);
            } else {
                // ファイル読み込みの時、対象レコードを表示する
                // 出力データを元ファイルのpos順にソートする（改行コードのないファイル末尾レコートがある場合も最後に来るように） #45
                trans.sort(function (a, b) {
                    return a.pos - b.pos;
                });
                // 最大作業領域として元ファイルサイズ分のメモリを確保する
                var buff = new Uint8Array(
                        HJN.filesArrayBuffer[HJN.filesIdx].byteLength), offset = 0;
                // ファイルの該当行を Uint8Arrayに登録する
                trans
                        .forEach(function (e) {
                            buff
                                    .set(
                                            new Uint8Array(
                                                    HJN.filesArrayBuffer[HJN.filesIdx],
                                                    e.pos,
                                                    Math
                                                            .min(
                                                                    e.len + 2,
                                                                    HJN.filesArrayBuffer[HJN.filesIdx].byteLength
                                                                            - e.pos)),
                                            offset);
                            offset += (e.len + 2);
                        });
                // 未使用作業領域を削除する
                var buff2 = new Uint8Array(buff.slice(0, offset));
                // ダウンロードする
                this.menuDownloadBlob(this.menuBuffToBlob(buff2), menuId,
                        fileName);
            }
        }

    } else { // CONCが選択されていないとき
        var msg = "抽出対象データがありません。空データがダウンロードされます\r\n"
                + "conc：多重度（詳細）の点を選択した状態で行ってください";
        alert(msg);
        this.menuDownloadBlob(this.menuBuffToBlob(msg), menuId, fileName);
    }
};

/**
 * メニュー共通機能：BinaryString, UintXXArray, ArrayBuffer をBlobに変換する
 * 
 * @param {Object}
 *            arrayBuffer 変換元
 * @param {Blob} -
 *            変換後
 */
HJN.Graph.prototype.menuBuffToBlob = function (arrayBuffer) {
    "use strict";
    return new Blob([ arrayBuffer ], {
        type : "application/octet-stream"
    });
};

/**
 * メニュー共通機能：指定blobをファイルとしてダウンロードする
 * 
 * @param {Objcet}
 *            blob ダウンロードさせるblogデータ
 * @param {String}
 *            menuId Chrome, FireFoxのときに使用：ダウンロードファイルの一時作成に使うHTMLタグ
 * @param {String}
 *            fileName ie11以降のときに使用：ダウンロードファイル名
 */
HJN.Graph.prototype.menuDownloadBlob = function (blob, menuId, fileName) {
    "use strict";
    if (window.navigator.msSaveBlob) { // ie11以降のとき
        window.navigator.msSaveBlob(blob, fileName);
        // msSaveOrOpenBlobの場合はファイルを保存せずに開ける
        window.navigator.msSaveOrOpenBlob(blob, fileName);
    } else { // Chrome, FireFoxのとき
        document.getElementById(menuId).href = window.URL.createObjectURL(blob);
    }
};