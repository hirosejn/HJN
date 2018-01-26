"use strict";
import * as Util from './util/utils.js';
import {HjnConfig} from './util/hjn-config.js';
import {CreateSampleTatLogAndChartShow} from './tatLogDiver-init.js';
import {HJN} from './tatLogDiver-graph.js';

/**
 * @memberof tatLogDiver
 * @class FileParser
 * @classdesc ファイルをパースして読み込む
 *            <p>
 *            パース条件指定画面生成つき
 */
export var FileParser = (function() {
    "use strict";
    /** @static */
    FileParser.prototype.__keyConfig = {};  // configで使用する値の定義

    /** constructor */
    function FileParser(){
        if(!(this instanceof FileParser)) return new FileParser();

        this.configId = "_config_" + "File"; // #53

        // コンストラクタ内部関数：keyを定義する
        var def = function(key, val, onFunc) {
                    var _keyConf = FileParser.prototype.__keyConfig[key] = {};
                    _keyConf.value = (val === undefined) ? key : val; // getValueByKeyの返却値（デフォルト：keyと同じ文字列）
                    _keyConf.getValue = function () { return (val === undefined) ? key : val; };
                    _keyConf.onFunc = onFunc || null;   // onイベント時に実行する処理（メニューのa属性などで利用）
                    return key;
                };
        var v = function(key, fieldId) { // fieldIdの値を返却値とする(デフォルト： key+".v")
                    var _keyConf = FileParser.prototype.__keyConfig[key] = {};
                    _keyConf.value = key;           // getValueByKeyの返却値（デフォルト：keyと同じ文字列）
                    _keyConf.getValue = function () {
                            return HjnConfig("m").getValueByKey(fieldId || key + ".v"); // TODO:mの指定
                        };
                    return key;
                };

        // 名称と挙動の定義
        var env = "File";
        this["_config_" + env] = HjnConfig(env) // #53
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
        env = "Filter"
        var func_F_SYNC_UPPER = function(){ HJN.Graph.DrawCallback(HJN.chart.graph); },
            func_F_SYNC_DETAIL = function(){ HJN.Graph.DrawCallback(HJN.chartD.graph); };
        // Filter Config設定画面定義 #51
        this["_config_" + env] = HjnConfig(env) // #53
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

        // Simulator Config用関数定義(radio用） #53
        env = "Simulator"
        var func_S_SIMU_000 = function(){ CreateSampleTatLogAndChartShow(0); };
        var func_S_SIMU_001 = function(){ CreateSampleTatLogAndChartShow(1); };
        // Simulator Config設定画面定義 #53
        this["_config_" + env] = HjnConfig(env) // #53
            .n("<br>")
            .label(null," If you change the scenario below,").n()
            .label(null,"JSON is initialized and re-simulated.").n()
            .n("<br>")
            .name("S_SIMU")
                .radio("S_SIMU_000", null, 
                          "1 hour with table(B) lock.<br>"
                        + "- online[100-500ms 2-5tps]<br>" 
                        + "- batch[2-5sec evry3min]",
                        true ,null, func_S_SIMU_000).n()
                .radio("S_SIMU_001", null, "for test", 
                        false ,null, func_S_SIMU_001).n()
        ;
    }

    // class method
    /**
     * ファイルリーダのプロパティ管理インスタンスを取得する
     * 
     * @memberof tatLogDiver.FileParser
     * @param {Object}
     *            fileReader ファイルリーダ
     * @param {String}
     *            type プロパティ種別名（"File"|"Filter"|"Simulator")
     * @return {Object} プロパティ
     */
    FileParser.Property = (function() {
        "use strict";
        /** @constructor */
        function Property(fileReader, type){ 
            if(!(this instanceof Property)) return new Property(fileReader, type);
            this._type = type || "File";
            this._config     = fileReader["_config_" + this._type];
            this.__keyConfig = fileReader.__keyConfig;
        }

        // public
        /**
         * keyの値に指定されたvalue（なければkey値）を返却する
         * 
         * @memberof tatLogDiver.FileParser.Property
         * @param {String}
         *            key Conginのキー値
         */
        Property.prototype.getValue = function(key) {
            var cKey = this._config.getValueByKey(key);
            if(!this.__keyConfig[cKey] || this.__keyConfig[cKey].value === undefined){
                return cKey;    // valueが定義されていないとき、keyの設定値を返却
            }else{
                return this.__keyConfig[cKey].getValue(); // keyの設定値のvalueが定義されているとき
            }
        };
        /**
         * configに登録されているkey(prefix補填)の設定値を取得する
         * 
         * @memberof tatLogDiver.FileParser.Property
         */
        Property.prototype.getValueByKey = function(key) {
            return this._config.getValueByKey(key);
        };
    
        /* new */
        return Property;
    }());
    
    /** @private */
    //
    // public


    /**
     * ファイルが新たに指定された時、eTatOriginalを再構築するか否（データを追加する）か
     * 
     * @memberof tatLogDiver.FileParser
     * @return {boolean} 再構築モードするときtrue、データを追加するときfalse
     */
    FileParser.prototype.isNewETAT = function() { // #23
        return this.getValue("NEWFILE") === "NEWDATA";
    }
    
    /**
     * 「ファイルから次の1レコードを取得するutil」 を取得する
     * 
     * @memberof tatLogDiver.FileParser
     */
    FileParser.prototype.createGetterOfLine = function(file) {

        /**
         * @memberof tatLogDiver.FileParser
         * @class GetterOfLine
         * @classdesc ファイルから１レコード取得する
         *            <p>
         *            ファクトリのFileParserが保持する改行コードを用いて、ファイルから１レコードを取得する
         * 
         * @example try{ var getterOfLine =
         *          HJN.chart.fileReader.createGetterOfLine(file), fileInfo;<br>
         *          for(var i = 0; i < n; i++) { <br>
         *          line = getterOfLine.next(); fileInfo += line.str + "<BR>"; }<br>
         *          }catch (e) {<br>
         *          console.error("改行コードの無いファイルは扱えません]%o",e); }
         */
        function GetterOfLine(file, maxLength){ /* constructor */
            if(!(this instanceof GetterOfLine)) return new GetterOfLine(file, maxLength);

            this.file = file;
            this.buf = new Uint8Array(file);
            this.maxLength = maxLength || this.buf.length,
            this.confLF = HJN.chart.fileReader.getValue("LF");  // 改行コードor固定レコード長
            this.from = 0;
            this.to = 0;
            this.len = 0;
            this.line = {file: this.file, pos: 0, array: null, str: "", isEoF: false };
        }
        // public
        /**
         * 次の1レコードを取得する
         * 
         * @memberof tatLogDiver.FileParser.GetterOfLine
         * @name getValueByKey
         */
        if (HJN.chart.fileReader.getValueByKey("LF") === "LF_FIX"){ // 固定長のとき
            GetterOfLine.prototype.next = function () { // 次の1レコードを取得する
                if(this.from >= this.maxLength ){   // ファイル末尾のとき
                    this.line = {file: this.file, pos: this.maxLength, array: null, str: "", isEoF: true };
                } else {
                    this.len = Math.min(this.maxLength - this.from, this.confLF);
                    var array = new Uint8Array(this.file, this.from, this.len);
                    this.line = {
                            file: this.file,
                            pos: this.from,
                            array: array,
                            str: String.fromCharCode.apply(null, array),
                            isEoF: false };
                }
                this.from += this.confLF;   // 次の行を指しておく
                return this.line;
            };
        } else { // 可変長のとき
            GetterOfLine.prototype.next = function () { // 次の1レコードを取得する
                if(this.from >= this.maxLength ){   // ファイル末尾のとき
                    this.line = {file: this.file, pos: this.maxLength, array: null, str: "", isEoF: true };
                } else {
                    this.to = this.buf.indexOf(this.confLF, this.from);
                    if(this.to < 0) this.to = this.maxLength;   // 最終レコード（EOFで改行コードなし）のとき
                    this.len = Math.min(this.to - this.from, 1024);
                    var array = new Uint8Array(this.file, this.from, this.len);
                    this.line = {
                            file: this.file,
                            pos: this.from,
                            array: array,
                            str: String.fromCharCode.apply(null, array),
                            isEoF: false };
                }
                this.from = this.to + 2;    // 次の行を指しておく
                return this.line;
            };
        }
        return new GetterOfLine(file);
    };
    
    
    /**
     * eTatのフィルター
     * 
     * @memberof tatLogDiver.FileParser
     */
    FileParser.prototype.createFilter = function() { // #34
       /**
         * @memberof tatLogDiver.FileParser
         * @class Filter
         * @classdesc FileParserのフィルター
         *            <p>
         *            ファクトリのFileParserが保持するフィルタ条件を用いるフィルターを取得する
         * 
         */
        function Filter(){ /* constructor */
            if(!(this instanceof Filter)) return new Filter();
            this._fileReader = HJN.chart.fileReader; // #62
            var c = FileParser.Property(this._fileReader, "Filter");

            this.confF_TIME_FROM = Util.S2D(c.getValue("F_TIME_FROM"));    // 時刻(X)の最小値フィルター
            this.confF_TIME_TO   = Util.S2D(c.getValue("F_TIME_TO"));      // 時刻(X)の最大値フィルター
            this.confF_TIME = (isNaN(this.confF_TIME_FROM) && isNaN(this.confF_TIME_TO))
                            ? false : true; // 時刻(x）フィルター指定の有無
            
            this.confF_TAT_FROM = c.getValue("F_TAT_FROM") || 0; // 時間(Y)の最小値フィルター
            this.confF_TAT_TO   = c.getValue("F_TAT_TO") || Number.MAX_VALUE; // 時間(Y)の最大値フィルター
            this.confF_TAT = (this.confF_TAT_FROM === 0 && this.confF_TAT_TO === Number.MAX_VALUE)
                            ? false : true; // 時間(ｙ）フィルター指定の有無

            this.confF_TEXT = c.getValue("F_TEXT") || null; // テキストフィルタの条件（使用しない、Include,Exclude
            if (this.confF_TEXT === "F_TEXT_INCLUDE") {
                this.confF_TEXT = true;
            } else if (this.confF_TEXT === "F_TEXT_EXCLUDE") {
                this.confF_TEXT = false;
            } else { // "F_TEXT_NON"
                this.confF_TEXT = null;
            }
            
            this.confF_TEXT_LEN = c.getValue("F_TEXT_LEN") || null;    // フィルタテキストのバイト長
            this.confF_TEXT_POS = c.getValue("F_TEXT_POS") || 0;       // フィルタテキストの先頭バイト位置
            this.confF_TEXT_COL = (c.getValue("F_TEXT_COL") || 3) - 1; // フィルタテキストのカラム位置（先頭：０）
            this.confF_TEXT_REG = new RegExp(c.getValue("F_TEXT_REG") || ".*");    // フィルタテキストの正規表現
            
            this.confF_IS = (this.confF_TIME === true 
                            || this.confF_TAT === true || this.confF_TEXT != null)
                          ? true : false; // フィルタ指定の有無
            
            c = FileParser.Property(HJN.chart.fileReader, "File");
            this.confF_SEP = c.getValue("SEP").charCodeAt(0);
        }
        
        // class method
        // private
        /**
         * フィルター条件で判定する
         * 
         * @memberof tatLogDiver.FileParser.Filter
         */
        Filter.prototype._isIn = function (e) {
            // フィルタ指定が無いときフィルタしない（初期表示時に無駄な処理をしない）
            if (this.confF_IS === false) return true;
            // 時刻（ｘ）フィルタの判定 （conf指定なしのとき NaNとの比較となりfalseとなる）
            if (e.x < this.confF_TIME_FROM || this.confF_TIME_TO < e.x ) {
                return false;
            }
            // 時間（ｙ）フィルタの判定
            if (e.y < this.confF_TAT_FROM || this.confF_TAT_TO < e.y){
                return false;
            }
            // テキストフィルタの判定
            if (this.confF_TEXT === null) {
                return true; // フィルタ指定なし
            }
            var text = "";
            if (e.pos === undefined) { // テキスト読み込みでないとき（自動生成データのとき）
                // レコードを取得する #62
                text = this._fileReader.getRecordAsText(e); // #61
                // 指定正規表現に合致するか判定し、Include/Exclude指定に応じてリターンする
                return this.confF_TEXT === this.confF_TEXT_REG.test(text);
            } else { // ファイル読み込みのとき
                // レコードを取得する
                var arr = new Uint8Array(HJN.filesArrayBuffer[e.fileIdx+1], e.pos, e.len);
                // CSVレコードの指定カラムを取得する(arr)
                var colPos = 0;
                for (var i = 0; i < this.confF_TEXT_COL; i++) {
                    colPos = arr.indexOf(this.confF_SEP,colPos + 1);
                }
                if (colPos === -1){
                    // 指定数のカラムが無い場合、Includeは処理対象外、Excludeは処理対象
                    return !this.confF_TEXT;
                }
                var col = arr.slice(colPos, arr.length);
                // 判定用文字列を取得する
                text = col.slice(this.confF_TEXT_POS, this.confF_TEXT_POS + this.confF_TEXT_LEN);
                // 指定正規表現に合致するか判定し、Include/Exclude指定に応じてリターンする
                return this.confF_TEXT === this.confF_TEXT_REG.test(String.fromCharCode.apply(null, text));
            }
            return true;
        };
        
        // public
        /**
         * eTatをフィルターする
         * 
         * @memberof tatLogDiver.FileParser.Filter
         * @param {eTat}
         *            eTat フィルター処理対象のeTat
         * @return {eTat} eTat フィルターされたeTat
         * 
         */
        Filter.prototype.filter = function (eTat) {
            if (!eTat) return [];
            return eTat.filter(this._isIn, this);
        };

        return new Filter();
    };


    /**
     * 「１レコードからx:時刻（数値：ミリ秒）,y:Tat(数値：秒)を取得するutil」を取得する
     * 
     * @memberof tatLogDiver.FileParser.Filter
     */
    FileParser.prototype.createGetterOfXY = function() {

        /**
         * @memberof tatLogDiver.FileParser.Filter
         * @class GetterOfXY
         * @classdesc １レコードをパースし、XとYをレコード取得する
         *            <p>
         *            ファクトリのFileParserが保持するレコードフォーマット情報を用いて、ファイルの指定レコードからＸ(data)とＹ(value)を取得する
         */
        function GetterOfXY(){ /* constructor */
            if(!(this instanceof GetterOfXY)) return new GetterOfXY();

            var c = HJN.chart.fileReader;
            this.configId = "_config_" + "Filter"; // #53
            this.confSEP = c.getValue("SEP");   // セパレータ
            
            this.confTIME_COL = c.getValue("TIME_COL") - 1 || 0;    // 時刻(X)のカラム位置
            this.confTIME_POS = (c.getValue("TIME_POS") || 1) - 1;  // 時刻(X)の先頭バイト位置
            this.confTIME_LEN = (c.getValue("TIME_LEN") || 0);      // 時刻(X)のバイト長
            this.confTIME_FORM = c.getValue("TIME_FORM");           // 時刻(X)の文字フォーマット指定
            this.confTIME_YMD = (c.getValue("TIME_YMD") || "YYYY/MM/DD hh.mm.ss.ppp"); // #42
                                                                    // 時刻(X)のYMDフォーマット
            this.paseDateConf = {  // YYYY/MM/DD hh:mm:dd.ss.ppp #41
                YYYY: this.confTIME_YMD.indexOf("YYYY"),
                MM: this.confTIME_YMD.indexOf("MM"),
                DD: this.confTIME_YMD.indexOf("DD"),
                hh: this.confTIME_YMD.indexOf("hh"),
                mm: this.confTIME_YMD.indexOf("mm"),
                ss: this.confTIME_YMD.indexOf("ss"),
                ppp: this.confTIME_YMD.indexOf("p"),
            };
            this.isYMD = (this.confTIME_FORM === "TIME_FORM_YMD");
            // 時刻(X)の数値単位(1or1000,YMDのとき1)
            this.confTIME_UNIT = this.isYMD? 1 : (c.getValue("TIME_UNIT") || 1);
            
            
            this.confTAT_COL = c.getValue("TAT_COL") - 1 || 1;      // 時間(Y)のカラム位置
            this.confTAT_POS = (c.getValue("TAT_POS") || 1) - 1;    // 時間(Y)の先頭バイト位置
            this.confTAT_LEN = (c.getValue("TAT_LEN") || 0);        // 時間(Y)のバイト長
            this.confTAT_FORM = c.getValue("TAT_FORM");             // 時間(Y)のフォーマット指定
            this.confTAT_UNIT = c.getValue("TAT_UNIT") || 1;        // 時間(Y)の数値単位(1/1000)
            this.confENDIAN =  c.getValue("ENDIAN");    // リトルエンディアンはtrue、ビッグエンディアンはfalse
            this.isLittle = (function(){
                // long用に4バイト取得する
                var buf = new ArrayBuffer(4);               
                // true:bufに、リトルエンディアン指定で1を書き込む
                new DataView(buf).setUint32(0, 1, true);
                // プラットフォームのエンディアンを使用するUint32Arrayと比較する
                return (new Uint32Array(buf)[0] === 1);     
            }());
            
            this.dateAndValue = {date: 0, value: 0, isError: false };
        }
        
        // class method
        /**
         * 数字をパースして数値（ミリ秒）を取得する<br>
         * 例："-1:1:1.2 -> -3661200 ms = -1*(3600+60+1+0.2)*1000
         * 
         * @memberof tatLogDiver.FileParser.GetterOfXY
         */
        GetterOfXY.parseNumber = function (){ // str, unit,
            var str = arguments[0],
                unit = arguments[1];
            if(!str) {console.log("data Y parse error"); return 0; }
            var ds = (str.indexOf(":") < 0) ? [str] : str.split(":"),   // #40
                pm = (0 <= ds[0]) ? 1 : -1,
                sec = 0.0;
            for(var i = 0; i < ds.length; i++){
                sec += pm * Math.abs(ds[i]) * Math.pow(60, ds.length - i - 1);
            }
            return sec * (unit || 1);
        };

        /**
         * Long(4バイトバイナリ）数字をパースして数値（ミリ秒）を取得する
         * 
         * @private
         */
        GetterOfXY.prototype._parseLong = function (arr){
            if (4 <= arr.length ) { // Long(4byte)以上のときunsigned longとして処理する
                // bufの先頭4byteを、指定バイトオーダ(endian)で、符号無32bit intとして参照
                return (new DataView(arr.buffer, 0 , 4)).getUint32(0, this.confENDIAN);
            } else {
                // Long(4バイト）より短いとき、Byte単位に処理する
                if (this.confENDIAN) { // little endianのとき
                    return arr.reduceRight(function(a, b){ return a*256 + b; });
                } else {               // big endianのとき
                    return arr.reduce(function(a, b){ return a*256 + b; });
                }
            }
        };

        // public
        /**
         * レコードからXとYを取得する
         * 
         * @memberof tatLogDiver.FileParser.GetterOfXY
         */
        GetterOfXY.prototype.parse = function (line) {
            // セパレータでカラム分割する
            var posMax = Math.max(this.confTIME_COL, this.confTAT_COL),
                sep = this.confSEP.charCodeAt(0),   // 区切り文字のUint値
                pos = 0,
                nextPos = line.array.indexOf(sep),  // 行末（次の区切り文字位置）
                x = 0,
                y = -1;
            for (var i = 0; i <= posMax; i++) {
                if (i === this.confTIME_COL){
                    // パース対象フィールドを切り出す
                    var posX =  pos + this.confTIME_POS;
                    var arrX = (0 < this.confTIME_LEN) 
                             ? line.array.slice(posX, posX + this.confTIME_LEN)
                             : line.array.slice(posX, nextPos);
                    var strX = "";
                    // フィールドをパースする
                    if (this.isYMD){    // 年月日時分秒の文字列のとき
                        strX = String.fromCharCode.apply(null,arrX);
                        x = Util.S2D(strX, this.paseDateConf);
                    } else if (this.confTIME_FORM === "TIME_FORM_TEXT"){    // テキスト数字のUNIX経過時間のとき
                        strX = String.fromCharCode.apply(null,arrX);
                        x = GetterOfXY.parseNumber(strX);
                    } else{ // this.confTIME_FORM === "TIME_FORM_LONG"
                            // longのUNIX経過時間のとき
                        x = this._parseLong(arrX);
                    }
                    // 単位を補正する
                    x *= this.confTIME_UNIT;
                }
                if (i === this.confTAT_COL){
                    // パース対象フィールドを切り出す
                    var posY =  pos + this.confTAT_POS;
                    var arrY = (0 < this.confTAT_LEN) 
                             ? line.array.slice(posY, posY + this.confTAT_LEN)
                             : line.array.slice(posY, nextPos);
                    // フィールドをパースする
                    if (this.confTAT_FORM === "TAT_FORM_TEXT"){
                        // テキスト数字によるUNIX経過時間のとき
                        var strY = String.fromCharCode.apply(null,arrY);
                        y = GetterOfXY.parseNumber(strY);
                    } else{
                        // TAT_FORM_TEXT === "TAT_FORM_LONG" 数値によるUNIX経過時間のとき
                        y = this._parseLong(arrY);
                    }
                    // 単位を補正する
                    y *= this.confTAT_UNIT;
                }
                pos = nextPos + 1;
                nextPos = line.array.indexOf(sep, pos);
                if (nextPos < 0) nextPos = line.array.length;
            }
            
            if(0 < x && 0 <= y){ // 正常時
                return {x: x, y: y, isError: false };
            } else {            // エラー時
                return {x: x, y: y, isError: true };
            }
        };
        
        return new GetterOfXY();
    };
    
    /**
     * configに登録されているid(=prefix+key)の設定値を取得する
     * 
     * @memberof tatLogDiver.FileParser.GetterOfXY
     */
    FileParser.prototype.getObjctById = function(id) {
        return this[this.configId].getObjctById(id);
    };
    /**
     * configに登録されているkey(prefix補填)の設定値を取得する
     * 
     * @memberof tatLogDiver.FileParser.GetterOfXY
     */
    FileParser.prototype.getValueByKey = function(key) {
        return this[this.configId].getValueByKey(key);
    };
    /**
     * 設定値を保有するオブジェクトを返却する
     * 
     * @memberof tatLogDiver.FileParser.GetterOfXY
     */
    FileParser.prototype.getConfig = function() {
        return this[this.configId]._config;
    };
    /**
     * HTML（config設定用）テキストを返却する
     * 
     * @memberof tatLogDiver.FileParser.GetterOfXY
     */
    FileParser.prototype.getConfigHtml = function(type) {
        type = type || "File";
        return this["_config_" + type].getHtml(); // #53
    };
    /**
     * keyの値に指定された関数（なければ何もしない関数）を返却する
     * 
     * @memberof tatLogDiver.FileParser.GetterOfXY
     */
    FileParser.prototype.getFunction = function(key) {
        var cKey = this[this.configId].getValueByKey(key);
        if(!this.__keyConfig[cKey] || !this.__keyConfig[cKey].func){
            return function(){};    // funcが定義されていないとき、何もしない関数を返却する
        }else{
            return this.__keyConfig[cKey].func; // keyの設定値のfuncが定義されているとき
        }
    };
    /**
     * eTatの指定行の編集元レコードを、テキストフォーマットに変換して取得する
     * 
     * @memberof tatLogDiver.FileParser.GetterOfXY
     * @param {Object}
     *            e eTat[n]：eTatの指定行
     * @return {String} eTatの指定行の表示用テキスト
     */
    FileParser.prototype.getRecordAsText = function (e) { // #62 ADD
        if (!e) return "";
        var text = "";
        if (typeof e.pos === "undefined") { // 生成データのとき
            // 生成データをCSVのログデータとして編集する #61
            text = Util.D2S(e.x, "yyyy/MM/dd hh:mm:ss.ppp", true)
                    + ", " + e.y + ", " + e.message; // #53
            // 状態遷移履歴を追加する #62
            if (e.history){
                e.history.forEach(function(h){
                    var timeStr = "";
                    if (typeof(h.time) === "number") {
                        timeStr = Util.D2S(h.time, "mm:ss.ppp", true) + " seq:"
                    }
                    text += " [" + h.sequenceIdx + ":" + h.status + "]" // #61
                        + timeStr + Util.D2S(h.sequenceTime, "mm:ss.ppp", true);
                }, this);
            }
        } else { // ファイル読込のとき
            // ファイルの該当行を Uint8Arrayに登録する
            var buff = new Uint8Array(e.len + 2);
            var file = HJN.filesArrayBuffer[e.fileIdx]; // #23
            buff.set(new Uint8Array(file, e.pos,
                    Math.min(e.len + 2, file.byteLength - e.pos)));
            // ログデータを編集する
            text = String.fromCharCode.apply(null, buff);
        }
        return text;
        
    };
    /**
     * keyの値に指定されたvalue（なければkey値）を返却する
     * 
     * @memberof tatLogDiver.FileParser.GetterOfXY
     * @param {String}
     *            key Conginのキー値
     */
    FileParser.prototype.getValue = function(key) {
        var cKey = this[this.configId].getValueByKey(key);
        if(!this.__keyConfig[cKey] || this.__keyConfig[cKey].value === undefined){
            return cKey;    // valueが定義されていないとき、keyの設定値を返却
        }else{
            return this.__keyConfig[cKey].getValue(); // keyの設定値のvalueが定義されているとき
        }
    };
    
    // new
    return FileParser;
}());