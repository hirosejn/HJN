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
        .name("NEWFILE").label(null,"Open file as ") // #23
            .radio("NEWDATA", null, "newly", true)
            .radio("ADDDATA", null, "append").n()
//        .startTag("select")
//            .option("NEWDATA", null, "newly", true)
//            .option("ADDDATA", null, "append")
//        .endTag().n()
        .label(null,"<B>----- File format definition --------</B>").n()
        .name("CHAR").label(null, "<B>[Charset]</B>") // #82
//          .n()        
//            .radio(c.def("CHAR_SJIS", "SJIS"), null, "Shift-JIS", true)
//            .radio(c.def("CHAR_EUCJP", "EUCJP"), null, "EUC-JP")
//            .radio(c.def("CHAR_UTF8", "UTF8"), null, "UTF-8")
//            .radio(c.def("CHAR_UNICODE", "Unicode"), null, "Unicode")
//        .n("<br>")
        .startTag("select")
            .option(c.def("CHAR_SJIS", "SJIS"), null, "Shift-JIS", true)
            .option(c.def("CHAR_EUCJP", "EUCJP"), null, "EUC-JP")
            .option(c.def("CHAR_UTF8", "UTF8"), null, "UTF-8")
            .option(c.def("CHAR_UNICODE", "Unicode"), null, "Unicode")
        .endTag().n()
        .name("LF").label(null, "<B>[Line feed code]</B>").n()
            .radio(c.v("LF_FIX"), null, "Fixed Length")
                .number("LF_FIX.v",  null, "byte","80",'style="width:60px;"').n()
            .radio(c.def("LF_WIN",  13), null, "Windows:CR(13)+LF(10)", true).n()
            .radio(c.def("LF_UNIX", 10), null, "Unix/Linux:LF(10)").n()
            .radio(c.def("LF_ZOS",  15), null, "zOS:NEL(15)").n()
            .radio(c.def("LF_MAC",  13), null, "Mac:CR(13)").n()
            .radio(c.v("LF_ELSE"), null, "other charcode")
                .number("LF_ELSE.v", "(", ")", "10", 'style="width:40px;"').n()
        .n("<br>")
        .name("SEP").label(null,"<B>[CSV delimiter]</B>")
        .startTag("select")
            .option(c.def("SEP_COMMA", ','), null, "comma")
            .option(c.def("SEP_TAB", '\t'),   null,"tab", true)
            .option(c.v("SEP_ELSE"), null, "other :")
        .endTag()
//            .radio(c.def("SEP_COMMA", ','), null, "comma")
//            .radio(c.def("SEP_TAB", '\t'),   null,"tab", true)
//            .radio(c.v("SEP_ELSE"), null, "other")
                .text("SEP_ELSE.v", '"', '"', ',', 'size="2" placeholder=","').n()
        .n("<br>")
        .label(null,"<B>----- Data format definition --------</B>").n()
        .name("DATATYPE").label(null,"") // #89
            .radio("DATATYPE_TATSTART", null, "TAT & START time")
            .radio("DATATYPE_TATEND", null, "TAT & END time", true)
            .radio("DATATYPE_START_END", null, "START & END time").n()
        .n("<br>")
        .name("TIME").label(null, "<B>[TIMESTAMP field]</B>").n()
        .number("TIME_COL", "", "th column of CSV", "1", 'style="width:40px;"').n()
        // .name("TIME_POS")
        .number("TIME_POS", "& Position(byte): from", null, "1", 'style="width:40px;"')
        .number("TIME_LEN", "length", null, null, 'style="width:40px;"').n()
        .name("TIME_FORM").label(null,"Format:").n()
            .radio("TIME_FORM_YMD", "text", null, true)
                .text("TIME_YMD", null, null, '"YYYY/MM/DD hh:mm:ss.000"',
                        'size="23" placeholder=' + "'" +'"YYYY/MM/DD hh:mm:ss.000"'+ "'" ).n() // #92
            .radio("TIME_FORM_TEXT", "(num)", "text")
            .radio("TIME_FORM_LONG", null, "long").n()
            .nDown()
                .name("TIME_UNIT").label(null, "Units of numbers:")
                    .radio(c.def("TIME_UNIT_MS", 1), null, "msec")
                    .radio(c.def("TIME_UNIT_SEC", 1000), null, "sec", true)
            .nUp()
        .n("<br>")
        .n("<br>") // #89
        .name("CSV_TAT_LABEL").label(null,"<B>[TAT or START/END judgment field]</B>").n() // #89
        .number("TAT_COL", "", "th column of CSV", "2", 'style="width:40px;"').n()
        // .name("TAT_POS")
        .number("TAT_POS", "& Position(byte): from", null, "1", 'style="width:40px;"')
        .number("TAT_LEN", "length", null, null, 'style="width:40px;"').n()
        .n("<br>") // #89
        .name("TAT_CONF").label(null,"<B>for TAT(turnaround time) condition</B>").n() // #89
        .name("TAT_UNIT").label(null, "Units of numbers:")
            .radio(c.def("TAT_UNIT_MS", 1), null, "msec", true)
            .radio(c.def("TAT_UNIT_SEC", 1000), null, "sec").n()
        .name("TAT_FORM").label(null,"Format: ")
            .radio("TAT_FORM_TEXT", null, "text", true)
            .radio("TAT_FORM_LONG", null, "long").n()
            .nDown()
                .name("ENDIAN").label(null, "for long Endian: ")
                    .radio(c.def("ENDIAN_LIL", true), null, "little", true)
                    .radio(c.def("ENDIAN_BIG", false), null, "big")
            .nUp()
        .n("<br>")
        // 開始 ／終了時刻指定 #89
        .n("<br>")
        .name("CSV_SE_LABEL1").label(null,"<B>for START/END judgment condition</B>").n() 
        .text("CSV_SE_S_REG", 'START record: Matches /', '/', 'START', 
                'size="8" placeholder="START"').n()
        .text("CSV_SE_E_REG", 'END record: Matches /', '/', 'END',
                'size="8" placeholder="END"').n()
        .n("<br>")
        // 開始-終了ペアリングキー定 #89
        .n("<br>")
        .name("CSV_SE_LABEL2").label(null, "<B>[START-END pairing KEY field]</B>").n()
        .number("CSV_SE_COL", "", "th column of CSV", "3", 'style="width:40px;"').n()
        // .name("CSV_SE_POS")
            .number("CSV_SE_POS", "& Position(byte): from", null, "1", 'style="width:40px;"')
            .number("CSV_SE_LEN", "length", null, null, 'style="width:40px;"').n()
        .name("CSV_SE_LABEL3").label(null, "& Position(Matches reg. exp.):").n()
        .nDown()
            .text("CSV_SE_FROM_REG", 'between /', '/', '',   'size="8" placeholder=""')
            .text("CSV_SE_TO_REG", 'and /', '/', '',   'size="8" placeholder=""').n()
        .nUp()
        .text("CSV_SE_MATCH_REG", '& Adopt as KEY: Matches /', '/', '[0-9A-Z]+',
                'size="8" placeholder="[0-9A-Z]+"').n()
        .n("<br>")
    ;
}