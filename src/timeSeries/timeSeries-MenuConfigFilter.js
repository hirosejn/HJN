import * as Util from '../util/util.js';
import Graph from '../tatLogDiver/tatLogDiver-Graph.js';

/**
 * @memberOf TimeSeries
 * @class MenuConfigFilter
 * @classdesc FileParser用メニューHTML定義
 * 
 */
export default function MenuConfigFilter() {} // #76

MenuConfigFilter.config = function () {
    var prefix = "Filter";
    var c = new  Util.Config(prefix);
    // Filter Config用関数定義(radio用） #51
    var func_F_SYNC_UPPER = function(){ Graph.DrawCallback(HJN.chart.graph); };
    var func_F_SYNC_DETAIL = function(){ Graph.DrawCallback(HJN.chartD.graph); };
    // Filter Config設定画面定義 #51
    c // #53
        .name("F_SYNC").label(null,"Sync") // #50
            .radio("F_SYNC_UPPER", null, "Upper", false ,null, func_F_SYNC_UPPER) // #51
            .radio("F_SYNC_DETAIL", null, "Detail", false, null, func_F_SYNC_DETAIL)
            .radio("F_ASYNC", null, "Async", true).n()
        .label(null,"----- Data filter condition--------").n()
            .n("<br>")
            .name("F_TIME").label(null, "[Date filter]").n()
            .label(null,"Include if end time is between").n()
                .text("F_TIME_FROM", null, null, null, 'size="23" placeholder="YYYY/MM/DD hh.mm.ss.000"') // #92
                .label(null,"and").n()
                .text("F_TIME_TO", null, null, null, 'size="23" placeholder="YYYY/MM/DD hh.mm.ss.000"').n() // #92
            .n("<br>")
            .name("F_TAT").label(null,"[Turnaround time(TAT) filter]").n()
            .label(null,"Include if TAT is between").n()
                .number("F_TAT_FROM", null, null, "0", 'style="width:80px;"')
                .number("F_TAT_TO", "and", null, null, 'style="width:80px;"').n()
            .n("<br>")
            .name("F_TEXT").label(null,"[Text filter]")
                .radio("F_TEXT_NON", null, "Don't use.", true).n()
                .radio("F_TEXT_INCLUDE", null, "Include ")
                .radio("F_TEXT_EXCLUDE", null, "Exclude ").n()
                .number("F_TEXT_LEN", "if ", " bytes", null, 'style="width:40px;"')
                .number("F_TEXT_POS", "from the ", "th byte", "1", 'style="width:40px;"').n()
                .number("F_TEXT_COL", "from head of the", "th column of CSV", "3", 'style="width:40px;"').n()
                .text("F_TEXT_REG", "match the regular expression", null, null, 'size="7" placeholder=".*"').n()
            .n("<br>")
    ;
}

MenuConfigFilter.reset = function () {
    // メニュー画面フィルタ条件に、初期値を設定する
    var c = new Util.Config("Filter");
    c.setText("F_TIME_FROM", null);
    c.setText("F_TIME_FROM", null);
    c.setText("F_TIME_TO", null);
    c.setText("F_TAT_FROM", 0);
    c.setText("F_TAT_TO", null);
    c.setSelector("F_TEXT_NON");
    c.setText("F_TEXT_LEN", null);
    c.setText("F_TEXT_POS", 1);
    c.setText("F_TEXT_COL", 3);
    c.setText("F_TEXT_REG", null);
}
