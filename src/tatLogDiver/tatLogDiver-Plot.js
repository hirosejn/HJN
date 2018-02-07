import * as Util from '../util/util.js';
import {HJN} from './tatLogDiver-HJN.js';
import * as TimeSeries from '../timeSeries/timeSeries.js';

/**
 * グラフの点をクリックした際に決まる下段グラフの表示条件
 * 
 * @namespace Plot
 */
export default function Plot(){};
HJN.Plot = Plot;

/**
 * Plotの一覧
 * 
 * @type array.<String, Boolean, Boolean, index, xMs, Number, Number, Number>
 * @prop {String} label Plot一覧に表示する文字列
 * @prop {Boolean} ckBox チェックボックスの選択状態<br>
 *       （選択後すぐに削除されるのでtrueとなることはない）
 * @prop {Boolean} radio ラジオボタンの選択状態
 * @prop {index} n グラフ番号
 * @prop {xMs} x xの値
 * @prop {Number} y yの値
 * @prop {Number} rangeMinus 表示幅時間マイナス（秒）
 * @prop {Number} rangePlus 表示幅時間プラス（秒）
 * @prop {Number} rangeUnit 表示幅時間 単位（sec:1/min:60/hour:3600/day:86400)
 * 
 */
HJN.Plot.List = [];

/**
 * point/baloonクリック時呼出し用関数<br>
 * 詳細グラフを描画し、Plotを更新する
 * 
 * @param {Objcet}
 *            point dygraph の point
 */
Plot.PointClickCallback = function(point) {
    "use strict";
    Util.Logger.ShowLogText("[0:PointClickCallback]start---------------","calc");
    var n = HJN.seriesConfig.findIndex(function(e){ return e.key === point.name; }),// シリーズ番号
        x = point.xval, // ミリ秒
        y = point.yval; // 秒

    // ETPS,EMPS,EAPSのとき、TATが幅に含まれるよう、幅(range)を拡大する #57
    var rangeTagUnit = document.getElementById("DetailRangeUnit");
    var rangeUnit  = rangeTagUnit  ? +rangeTagUnit.value : TimeSeries.Tat.CYCLE;
    if ((n === HJN.ETPS.N || n === HJN.EMPS.N || n === HJN.EAPS.N) 
            && rangeUnit < TimeSeries.Tat.CYCLE) {
        rangeUnit = TimeSeries.Tat.CYCLE;
        HJN.detailRangeUnit = rangeUnit;
        // selectリストの選択を、rangeUnitに合わせる #57
        for (var i = 0; i < rangeTagUnit.length; i++) {
            if(HJN.detailRangeUnit <= rangeTagUnit[i].value){
                rangeTagUnit[i].selected = true;
                break;
            }
        }
    }

    // グラフの日時で、詳細グラフを再作成する
    HJN.init.SetDetailDateTime(x);
    var tat = new TimeSeries.Tat(HJN.init.GetSliderRangedEtat()); // #57
    HJN.chartD.setSeriesSet(tat); // #75
    
    // 下段の残処理終了後、下段データを登録描画する
    HJN.chartD.graph.ready(function(){ HJN.chartD.update(HJN.chartD.seriesSet, n); }); // #57
    // Hover表示しているplotを、Plot.Listに登録し、plotsアイコンを再描画する
    HJN.Plot.Add(n, x, y);
    // Balloonを再描画する
    HJN.Plot.ShowBalloon();
    // タッチデバイスでないとき、lineViewerに表示をクリップボードにコピーする
    if (!Util.TouchPanel.isTouchableDevice()) { // #22
        Util.CopyToClipboard("lineViewer"); // #61
    }
};

/**
 * point/baloonダブルクリック時呼出し用関数<br>
 * Plotを削除する
 * 
 * @param {object}
 *            plot dygraphのpoint
 */
Plot.PointDblClickCallback = function(point) {
    "use strict";
    // 指定plotを削除する
    var n = HJN.seriesConfig.findIndex(function(e){ return e.key === point.name; }),
        x = point.xval, // ミリ秒
        i = HJN.Plot.List.findIndex(function(p){
                return(p.n === n && p.x === x) ||   // 完全一致
                        ("tpsPlot" in p &&          // 詳細一致
                        p.tpsPlot.n === n && p.tpsPlot.x === x); });
    if(0 <= i) HJN.Plot.List.splice(i, 1);
    
    Plot.Render();
    // グラフ内の吹き出しを再表示する
    Plot.ShowBalloon();
};

/**
 * クリック時のHoverからPlot.Listを設定する
 * 
 * @param {index}
 *            n グラフのシリーズ番号
 * @param {xMs}
 *            x マウスクリック時のxの値（ミリ秒）
 * @param {Number}
 *            y マウスクリック時のyの値
 * @return {index} i plots内のplotの位置
 */
Plot.Add=function(n, x, y) {
    "use strict";
    // 各plotを非選択状態とする
    HJN.Plot.List.forEach(function(e){e.radio = false;});
    // ラベルフォーマットの設定
    var format = (n === HJN.ETPS.N || n === HJN.CTPS.N) ? "hh:mm:ss" : "hh:mm:ss.ppp",
        label = Util.D2S(x, format, true) + " " + // #61
                HJN.seriesConfig[n].label.replace("%N",Util.N2S(y));
    // 幅(range)を取り込む（秒）
    var rangePlusTag  =  document.getElementById("DetailRangePlus"),
        rangeMinusTag =  document.getElementById("DetailRangeMinus"),
        rangeUnitTag  =  document.getElementById("DetailRangeUnit"), // #48
        rangeUnit  = rangeUnitTag  ? +rangeUnitTag.value : TimeSeries.Tat.CYCLE, // #57
        rangePlus  = rangePlusTag  ? +rangePlusTag.value  : 1,  // 幅
        rangeMinus = rangeMinusTag ? +rangeMinusTag.value : 1;

    // 既存Poltを検索する
    var i = HJN.Plot.List.findIndex(function(p){
                return(p.n === n && p.x === x) ||   // 完全一致
                        ("tpsPlot" in p &&          // 詳細一致
                        p.tpsPlot.n === n && p.tpsPlot.x === x); });
    // Plotを設定する
    var plot;
    if(0 <= i){ // 既存Plotsにある時、選択状態とし、rangeを再設定する
        plot = HJN.Plot.List[i];
        plot.radio = true;
        plot.rangePlus  = rangePlus; // 秒
        plot.rangeMinus = rangeMinus;
        plot.rangeUnit  = rangeUnit; // #48
    }else{      // 既存に無いときPlotを追加する
        // ETAT,STATのとき、TATが幅に含まれるよう、幅(range)を拡大する #30 #48 #57
        if (n === HJN.ETAT.N){
            rangeMinus = Math.max(rangeMinus, 
                    Math.floor(x / rangeUnit) - Math.floor((x - y) / rangeUnit)); // #48
            document.getElementById("DetailRangeMinus").value = rangeMinus; 
        }else if (n === HJN.STAT.N){
            rangePlus = Math.max(rangePlus,
                    Math.floor((x + y) / rangeUnit)) - Math.floor(x / rangeUnit) ; // #48
            document.getElementById("DetailRangePlus").value = rangePlus;
        }
        // Plotを追加する
        plot = {label: label, ckBox:false,
                 radio:true, n: n, x: x, y: y, 
                 rangePlus: rangePlus, rangeMinus: rangeMinus, rangeUnit: rangeUnit };
        if (n === HJN.CTPS.N){          // CTPSのとき秒内最大CONCとして登録する
            adjustPlotToY(HJN.chartD.conc, x, x + HJN.chart.cTpsUnit.unit, y, 
                    HJN.CONC.N, plot, rangePlus, rangeMinus, rangeUnit);
        }else if (n === HJN.EMPS.N){    // EMPSのとき秒内最大ETATとして登録する
            adjustPlotToY(HJN.chartD.eTat, x, x + TimeSeries.Tat.CYCLE, y, 
                    HJN.ETAT.N, plot, rangePlus, rangeMinus, rangeUnit);
        }else { // CTPS,EMPS以外の時、選択Plotを追加する
            HJN.Plot.List.push(plot);
        }
        // Plotsを時刻順にソートする
        HJN.Plot.List.sort(
                function(a, b) { return a.x - b.x; });
        i = HJN.Plot.List.findIndex(
                function(p){ return(p.n === n && p.x === x); });
    }
    Plot.Render();
    return i;   // plots内のplotの位置

    
    // 内部関数：プロット位置を、指定秒から詳細グラフの最大時刻に変更する #19
    function adjustPlotToY(conc, x, toX, y, n, plot, rangePlus, rangeMinus, rangeUnit){
        if (!conc) return;
        var maxTime = 0,
            concMax = 0,
            i = Util.binarySearch(x, conc, function(e){ return e.x; });
        for (; i < conc.length && conc[i].x < toX; i++){    // #26
            if (concMax <= conc[i].y){
                    maxTime = conc[i].x;
                    concMax = conc[i].y;
            }
        }
        if (concMax === y) { // 補正すべき時刻が求まったときCONC,ETATを追加する #23
            x = maxTime;
            format = "hh:mm:ss.ppp";
            label = Util.D2S(x, format, true) + " " + // #61
                    HJN.seriesConfig[n].label.replace("%N",Util.N2S(y));
            HJN.Plot.List.push( {label: label, ckBox:false,
                 radio:true, n: n, x: x, y: y, 
                 rangePlus: rangePlus , rangeMinus: rangeMinus, rangeUnit: rangeUnit,
                 tpsPlot: plot} );  // 詳細plotには、tpsのplot情報も保持する
        } else { // 補正すべき時刻がない場合、元のPlotを追加する
            HJN.Plot.List.push(plot);
        }

    }
};

/**
 * Plot.Listを再表示する
 */
Plot.Render = function() {
    "use strict";
    var divCheckedPlots =  document.getElementById(HJN.chartName + "Plots");
    // 既存のアイコンを削除する
    while (divCheckedPlots.firstChild){
        divCheckedPlots.removeChild(divCheckedPlots.firstChild);
    }
    // 登録されているplots分のアイコンを追加する
    HJN.Plot.List.forEach( function(e, i){
        var div = document.createElement('div'),        // 要素の作成
            radio = e.radio ? 'checked="checked"' : '', // radio選択指定
            ckBox = e.ckBox ? 'checked="checked"' : ''; // check boxのチェック指定
        div.className = "hjnPlot";
        div.innerHTML =
            '<input type="checkbox" value="' + e.x + '" id="checkBox_' + i + '" ' + ckBox +
                    ' title="delete" onclick="HJN.Plot.CheckBox(' + i + ')">' +
            '<label for="checkBox_' + i + '"></label>' +
            '<input type="radio" name="CheckedPlot" id="SaveTime_' + i + '" ' + radio +
                    ' onclick="HJN.Plot.CheckRadio(' + i + ')">' +
            '<label for="SaveTime_' + i + '">' + e.label + '</label>';
        divCheckedPlots.appendChild(div);
    } );
};
/**
 * PlotのChekBox変更時呼出用関数<br>
 * 指定Plotを削除し、PlotsとBaloonを再描画する
 * 
 * @param {index}
 *            i 削除対象plotの、plots内位置
 */
Plot.CheckBox = function(i) {
    "use strict";
    HJN.Plot.List.splice(i,1);      // checkされたplotを削除する
    Plot.Render();          // Plotsを再描画する
    Plot.ShowBalloon();     // グラフのBalloonを再描画する
};
/**
 * PlotのRadioボタン変更時呼出用関数<br>
 * radio選択時に下段グラフを更新する
 * 
 * @param {index}
 *            i 選択されたplotの、plots内位置
 */
Plot.CheckRadio = function(i) {
    "use strict";
    // Plot.Listにradioの状態を反映する
    HJN.Plot.List.forEach(function(e){ e.radio = false; });
    var plot = HJN.Plot.List[i];
    plot.radio = true;
    // グラフの日時で、詳細グラフを再作成する
    HJN.init.SetDetailDateTime(plot.x); // 中心時刻に設定する
    document.getElementById("DetailRangePlus").value = plot.rangePlus;  // 幅を設定する
    document.getElementById("DetailRangeMinus").value = plot.rangeMinus;
    document.getElementById("DetailRangeUnit").value = plot.rangeUnit; // #48
    var n = plot.tpsPlot ? plot.tpsPlot.n : plot.n; // #61
    var tat = new TimeSeries.Tat(HJN.init.GetSliderRangedEtat()); // #75
    HJN.chartD.setSeriesSet(tat); // #57
    // 下段データを登録描画する
    HJN.chartD.update(HJN.chartD.seriesSet, n); // #57
    // Balloonを再描画する
    Plot.ShowBalloon();
};
/**
 * Balloonを再描画する
 */
Plot.ShowBalloon =function(){
    "use strict";
    HJN.chart.showBalloon();
    HJN.chartD.showBalloon();
};