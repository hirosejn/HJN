import * as Util from '../util/util.js';

/**
 * @memberOf timeSeries
 * @class MenuConfig
 * @classdesc FileParser用メニューHTML定義
 * 
 */
export default function() { // #76
    // 内部関数：keyを定義する
    function def(key, val, onFunc) {
        var _keyConf = FileParser.prototype.__keyConfig[key] = {};
        _keyConf.value = (val === undefined) ? key : val; // getValueByKeyの返却値（デフォルト：keyと同じ文字列）
        _keyConf.getValue = function () { return (val === undefined) ? key : val; };
        _keyConf.onFunc = onFunc || null;   // onイベント時に実行する処理（メニューのa属性などで利用）
        return key;
    };
    function v(key, fieldId) { // fieldIdの値を返却値とする(デフォルト： key+".v")
        var _keyConf = FileParser.prototype.__keyConfig[key] = {};
        _keyConf.value = key;           // getValueByKeyの返却値（デフォルト：keyと同じ文字列）
        _keyConf.getValue = function () {
                return Util.Config("m").getValueByKey(fieldId || key + ".v"); // TODO:mの指定
            };
        return key;
    };


    // 名称と挙動の定義
    var env = "File";
        // this["_config_" + env] = Util.Config(env) // #53
    HJN.Config[env] = Util.Config(env)
        // File Format Config設定画面定義 #51
        .name("NEWFILE").label(null,"Registered ") // #23
            .radio("NEWDATA", null, "newly", true)
            .radio("ADDDATA", null, "additionally").n()
        .label(null,"----- File format definition --------").n()
        .n("<br>")
        .name("LF").label(null, "[Line feed code]").n()
        .radio(v("LF_FIX"), null, "Fixed Length")
            .number("LF_FIX.v",  null, "byte","80",'style="width:60px;"').n()
        .radio(def("LF_WIN",  13), null, "Windows:CR(13)+LF(10)", true).n()
        .radio(def("LF_UNIX", 10), null, "Unix/Linux:LF(10)").n()
        .radio(def("LF_ZOS",  15), null, "zOS:NEL(15)").n()
        .radio(def("LF_MAC",  13), null, "Mac:CR(13)").n()
        .radio(v("LF_ELSE"), null, "other charcode")
            .number("LF_ELSE.v", "(", ")", "10", 'style="width:40px;"').n()
        .n("<br>")
        .name("SEP").label(null,"[CSV delimiter]").n()
        .radio(def("SEP_COMMA", ','), null, "comma", true)
        .radio(def("SEP_TAB", '\t'),   null,"tab")
        .radio(v("SEP_ELSE"), null, "other")
            .text("SEP_ELSE.v", '"', '"', ',', 'size="2" placeholder=","').n()
        .n("<br>")
        .name("TIME").label(null, "[Timestamp field]").n()
        .number("TIME_COL", "", "th column of CSV", "1", 'style="width:40px;"').n()
        .name("TIME_POS")
            .number("TIME_POS", "Position(byte): from", null, "1", 'style="width:40px;"')
            .number("TIME_LEN", "length", null, null, 'style="width:40px;"').n()
        .name("TIME_FORM").label(null,"Format:").n()
            .radio("TIME_FORM_YMD", "text", null, true)
                .text("TIME_YMD", null, null, null, 'size="23" placeholder="YYYY/MM/DD hh.mm.ss.ppp"').n()
            .radio("TIME_FORM_TEXT", "(num)", "text")
            .radio("TIME_FORM_LONG", null, "long").n()
            .nDown()
            .name("TIME_UNIT").label(null, "Units of numbers:")
                .radio(def("TIME_UNIT_MS", 1), null, "msec")
                .radio(def("TIME_UNIT_SEC", 1000), null, "sec", true)
            .nUp()
        .n("<br>")
        .name("TAT").label(null,"[Turnaround time(TAT) field]").n()
        .number("TAT_COL", "", "th column of CSV", "2", 'style="width:40px;"').n()
        .name("TAT_POS")
            .number("TAT_POS", "Position(byte): from", null, "1", 'style="width:40px;"')
            .number("TAT_LEN", "length", null, null, 'style="width:40px;"').n()
        .name("TAT_UNIT").label(null, "Units of numbers:")
                .radio(def("TAT_UNIT_MS", 1), null, "msec")
                .radio(def("TAT_UNIT_SEC", 1000), null, "sec", true).n()
        .name("TAT_FORM").label(null,"Format: ")
            .radio("TAT_FORM_TEXT", null, "text", true)
            .radio("TAT_FORM_LONG", null, "long").n()
            .nDown()
            .name("ENDIAN").label(null, "for long Endian: ")
                .radio(def("ENDIAN_LIL", true), null, "little", true)
                .radio(def("ENDIAN_BIG", false), null, "big")
            .nUp()
        .n("<br>")
    ;

    // Filter Config用関数定義(radio用） #51
    var func_F_SYNC_UPPER = function(){ Graph.DrawCallback(HJN.chart.graph); };
    var func_F_SYNC_DETAIL = function(){ Graph.DrawCallback(HJN.chartD.graph); };
    // Filter Config設定画面定義 #51
    env = "Filter";
        // this["_config_" + env] = Util.Config(env) // #53
    HJN.Config[env] = Util.Config(env)
        .name("F_SYNC").label(null,"Sync") // #50
            .radio("F_SYNC_UPPER", null, "Upper", false ,null, func_F_SYNC_UPPER) // #51
            .radio("F_SYNC_DETAIL", null, "Detail", false, null, func_F_SYNC_DETAIL)
            .radio("F_ASYNC", null, "Async", true).n()
        .label(null,"----- Data filter condition--------").n()
            .n("<br>")
            .name("F_TIME").label(null, "[Date filter]").n()
            .label(null,"Include if end time is between").n()
                .text("F_TIME_FROM", null, null, null, 'size="23" placeholder="YYYY/MM/DD hh.mm.ss.ppp"')
                .label(null,"and").n()
                .text("F_TIME_TO", null, null, null, 'size="23" placeholder="YYYY/MM/DD hh.mm.ss.ppp"').n()
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