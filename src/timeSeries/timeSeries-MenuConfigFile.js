import * as Util from '../util/util.js';
import Graph from '../tatLogDiver/tatLogDiver-Graph.js';

/**
 * @memberOf TimeSeries
 * @class MenuConfigFile
 * @classdesc FileParser用メニューHTML定義
 * 
 */
export default function MenuConfigFile() {}  // #76
  

MenuConfigFile.config = function () {
    // File Format Config設定画面定義 #51
    var prefix = "File";
    var c = new  Util.Config(prefix);
    c // #53
        .name("NEWFILE").label(null,"Registered ") // #23
            .radio("NEWDATA", null, "newly", true)
            .radio("ADDDATA", null, "additionally").n()
        .label(null,"----- File format definition --------").n()
        .n("<br>")
        .name("LF").label(null, "[Line feed code]").n()
        .radio(c.v("LF_FIX"), null, "Fixed Length")
            .number("LF_FIX.v",  null, "byte","80",'style="width:60px;"').n()
        .radio(c.def("LF_WIN",  13), null, "Windows:CR(13)+LF(10)", true).n()
        .radio(c.def("LF_UNIX", 10), null, "Unix/Linux:LF(10)").n()
        .radio(c.def("LF_ZOS",  15), null, "zOS:NEL(15)").n()
        .radio(c.def("LF_MAC",  13), null, "Mac:CR(13)").n()
        .radio(c.v("LF_ELSE"), null, "other charcode")
            .number("LF_ELSE.v", "(", ")", "10", 'style="width:40px;"').n()
        .n("<br>")
        .name("SEP").label(null,"[CSV delimiter]").n()
        .radio(c.def("SEP_COMMA", ','), null, "comma", true)
        .radio(c.def("SEP_TAB", '\t'),   null,"tab")
        .radio(c.v("SEP_ELSE"), null, "other")
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
                .radio(c.def("TIME_UNIT_MS", 1), null, "msec")
                .radio(c.def("TIME_UNIT_SEC", 1000), null, "sec", true)
            .nUp()
        .n("<br>")
        .name("TAT").label(null,"[Turnaround time(TAT) field]").n()
        .number("TAT_COL", "", "th column of CSV", "2", 'style="width:40px;"').n()
        .name("TAT_POS")
            .number("TAT_POS", "Position(byte): from", null, "1", 'style="width:40px;"')
            .number("TAT_LEN", "length", null, null, 'style="width:40px;"').n()
        .name("TAT_UNIT").label(null, "Units of numbers:")
                .radio(c.def("TAT_UNIT_MS", 1), null, "msec")
                .radio(c.def("TAT_UNIT_SEC", 1000), null, "sec", true).n()
        .name("TAT_FORM").label(null,"Format: ")
            .radio("TAT_FORM_TEXT", null, "text", true)
            .radio("TAT_FORM_LONG", null, "long").n()
            .nDown()
            .name("ENDIAN").label(null, "for long Endian: ")
                .radio(c.def("ENDIAN_LIL", true), null, "little", true)
                .radio(c.def("ENDIAN_BIG", false), null, "big")
            .nUp()
        .n("<br>")
    ;
}