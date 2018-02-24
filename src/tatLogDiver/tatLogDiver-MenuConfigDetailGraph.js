import * as Util from '../util/util.js';
import Graph from '../tatLogDiver/tatLogDiver-Graph.js';
import * as TimeSeries from '../timeSeries/timeSeries.js';

/**
 * @memberOf tatLogDiver
 * @class MenuConfigDetailGraph
 * @classdesc DetailGraph用メニューHTML定義
 * 
 */
export default function MenuConfigDetailGraph() {} // #27

MenuConfigDetailGraph.config = function () {
    var prefix = "DetailGraph";
    var c = new  Util.Config(prefix);
    // Config設定画面定義
    c 
        .name("D_RANGE").label(null,"Range:")
            .number("D_RANGE_MINUS", " - ", "", "1", 'style="width:40px;"', func_D)
            .number("D_RANGE_PLUS"  , " + ", "", "2", 'style="width:40px;"', func_D)
        .name("D_UNIT").startTag("select")
            .option(c.def("D_UNIT_SEC",         1000), null, "sec",   false, null, func_D) // #48
            .option(c.def("D_UNIT_10SEC",      10000), null, "10sec", true,  null, func_D)
            .option(c.def("D_UNIT_MIN",        60000), null, "min",   false, null, func_D)
            .option(c.def("D_UNIT_HOUR",     3600000), null, "hour",  false, null, func_D)
            .option(c.def("D_UNIT_6HOUR",   21600000), null, "6hour", false, null, func_D)
            .option(c.def("D_UNIT_DAY",     86400000), null, "day",   false, null, func_D)
            .option(c.def("D_UNIT_YEAR", 31536000000), null, "year",  false, null, func_D)
        .endTag()
    ;
}

// Config登録関数定義
function func_D(){
    clearTimeout(HJN.timer);
    HJN.timer = setTimeout(function(){
            Util.Logger.ShowLogTextInit("[-:HJN.init.setDetailRange]start---------------","calc");
            // 表示中Plotsのrangeを更新する #30
            var i = HJN.Plot.List.findIndex(function(e){ return (e.radio === true); });
            var plot = HJN.Plot.List[i];
            plot.rangePlus  = Util.Config.DetailGraph.getConfig("D_RANGE_PLUS"); // #27
            plot.rangeMinus = Util.Config.DetailGraph.getConfig("D_RANGE_MINUS");
            plot.rangeUnit = Util.Config.DetailGraph.getConfig("D_UNIT"); // #48
            plot.rangeUnit = plot.rangeUnit  ? plot.rangeUnit  : TimeSeries.Tat.CYCLE; // #57
            Util.Config.DetailGraph.setValueByKey("D_UNIT", plot.rangeUnit);

            // 下段データを登録する
            var tat = new TimeSeries.Tat(HJN.init.GetSliderRangedEtat()); // #75
            HJN.chartD.setSeriesSet(tat);
            // 下段グラフを描画する
            Graph.prototype.update.call(HJN.chartD, HJN.chartD.seriesSet);
        }, 750);    // 750ms 値の変更がなかった時に、処理を開始する
 };