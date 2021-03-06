import * as Util from '../util/util.js';
import {HJN} from '../tatLogDiver/tatLogDiver-HJN.js';

/**
 * @memberof TimeSeries
 * @class FileParser
 * @classdesc ファイルをパースして読み込む
 *            <p>
 *            パース条件指定画面生成つき
 */
export default (function() {
    /** @static */

    /** constructor */
    function FileParser(){
        if(!(this instanceof FileParser)) return new FileParser();
    }
    
    /** @private */

    // public
    /**
     * ファイルが新たに指定された時、eTatOriginalを再構築するか否（データを追加する）か
     * 
     * @memberof TimeSeries.FileParser
     * @return {boolean} 再構築モードするときtrue、データを追加するときfalse
     */
    FileParser.prototype.isNewETAT = function() { // #23
        return Util.Config.File.getConfig("NEWFILE") === "NEWDATA"; // #76
    }
    
    /**
     * 「ファイルから次の1レコードを取得するutil」 を取得する
     * 
     * @memberof TimeSeries.FileParser
     */
    FileParser.prototype.createGetterOfLine = function(file) {

        /**
         * @memberof TimeSeries.FileParser
         * @class GetterOfLine
         * @classdesc ファイルから１レコード取得する
         *            <p>
         *            ファクトリのFileParserが保持する改行コードを用いて、ファイルから１レコードを取得する
         * 
         * @example try{ var getterOfLine = FileParser.createGetterOfLine(file),
         *          fileInfo;<br>
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
            this.confLF = Util.Config.File.getConfig("LF");  // 改行コードor固定レコード長
                                                                // #76
            this.from = 0;
            this.to = 0;
            this.len = 0;
            this.line = {file: this.file, pos: 0, array: null, str: "", isEoF: false };
        }
        // public
        /**
         * 次の1レコードを取得する
         * 
         * @memberof TimeSeries.FileParser.GetterOfLine
         * @name next
         */
        if (Util.Config.File.getValueByKey("LF") === "LF_FIX"){ // 固定長のとき #76
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
     * @memberof TimeSeries
     */
    FileParser.prototype.createFilter = function() { // #34
       /**
         * @memberof TimeSeries.FileParser
         * @class Filter
         * @classdesc FileParserのフィルター
         *            <p>
         *            ファクトリのFileParserが保持するフィルタ条件を用いるフィルターを取得する
         */
        function Filter(){ /* constructor */
            if(!(this instanceof Filter)) return new Filter();
            var c = Util.Config.Filter; // #76
            
            this.confF_TIME_FROM = Util.S2D(c.getConfig("F_TIME_FROM"));    // 時刻(X)の最小値フィルター
            this.confF_TIME_TO   = Util.S2D(c.getConfig("F_TIME_TO"));      // 時刻(X)の最大値フィルター
            this.confF_TIME = (isNaN(this.confF_TIME_FROM) && isNaN(this.confF_TIME_TO))
                            ? false : true; // 時刻(x）フィルター指定の有無
            
            this.confF_TAT_FROM = c.getConfig("F_TAT_FROM") || 0; // 時間(Y)の最小値フィルター
            this.confF_TAT_TO   = c.getConfig("F_TAT_TO") || Number.MAX_VALUE; // 時間(Y)の最大値フィルター
            this.confF_TAT = (this.confF_TAT_FROM === 0 && this.confF_TAT_TO === Number.MAX_VALUE)
                            ? false : true; // 時間(ｙ）フィルター指定の有無

            this.confF_TEXT = c.getConfig("F_TEXT") || null; // テキストフィルタの条件（使用しない、Include,Exclude
            if (this.confF_TEXT === "F_TEXT_INCLUDE") {
                this.confF_TEXT = true;
            } else if (this.confF_TEXT === "F_TEXT_EXCLUDE") {
                this.confF_TEXT = false;
            } else { // "F_TEXT_NON"
                this.confF_TEXT = null;
            }
            
            this.confF_TEXT_LEN = c.getConfig("F_TEXT_LEN") || null;    // フィルタテキストのバイト長
            this.confF_TEXT_POS = c.getConfig("F_TEXT_POS") || 0;       // フィルタテキストの先頭バイト位置
            this.confF_TEXT_COL = (c.getConfig("F_TEXT_COL") || 3) - 1; // フィルタテキストのカラム位置（先頭：０）
            this.confF_TEXT_REG = new RegExp(c.getConfig("F_TEXT_REG") || ".*");    // フィルタテキストの正規表現
            
            this.confF_IS = (this.confF_TIME === true 
                            || this.confF_TAT === true || this.confF_TEXT != null)
                          ? true : false; // フィルタ指定の有無
            
            c = new Util.Config("File"); // #76
            this.confF_SEP = c.getConfig("SEP").charCodeAt(0);
        }
        
        // class method
        // private
        /**
         * フィルター条件で判定する
         * 
         * @memberof TimeSeries.Filter
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
                text = HJN.chart.fileParser.getRecordAsText(e); // #61
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
         * @memberof TimeSeries.Filter
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
     * @memberof TimeSeries.Filter
     */
    FileParser.prototype.createGetterOfXY = function() {

        /**
         * @memberof TimeSeries.FileParser
         * @class GetterOfXY
         * @classdesc １レコードをパースし、XとYをレコード取得する
         *            <p>
         *            ファクトリのFileParserが保持するレコードフォーマット情報を用いて、ファイルの指定レコードからＸ(data)とＹ(value)を取得する
         */
        function GetterOfXY(){ /* constructor */
            if(!(this instanceof GetterOfXY)) return new GetterOfXY();

            var c = new Util.Config("File"); // #76
            this.confSEP = c.getConfig("SEP");   // セパレータ
            
            this.confTIME_COL = c.getConfig("TIME_COL") - 1 || 0;    // 時刻(X)のカラム位置
            this.confTIME_POS = (c.getConfig("TIME_POS") || 1) - 1;  // 時刻(X)の先頭バイト位置
            this.confTIME_LEN = (c.getConfig("TIME_LEN") || 0);      // 時刻(X)のバイト長
            this.confTIME_FORM = c.getConfig("TIME_FORM");           // 時刻(X)の文字フォーマット指定
            this.confTIME_YMD = (c.getConfig("TIME_YMD") || '"YYYY/MM/DD hh.mm.ss.000"'); // #42
                                                                    // 時刻(X)のYMDフォーマット
                                                                    // #92
            this.paseDateConf = {  // YYYY/MM/DD hh:mm:dd.ss.000 #41
                YYYY: this.confTIME_YMD.indexOf("YYYY"),
                MM: this.confTIME_YMD.indexOf("MM"),
                DD: this.confTIME_YMD.indexOf("DD"),
                hh: this.confTIME_YMD.indexOf("hh"),
                mm: this.confTIME_YMD.indexOf("mm"),
                ss: this.confTIME_YMD.indexOf("ss"),
                p000: this.confTIME_YMD.indexOf("0"), // #92
            };
            this.isYMD = (this.confTIME_FORM === "TIME_FORM_YMD");
            // 時刻(X)の数値単位(1or1000,YMDのとき1)
            this.confTIME_UNIT = this.isYMD? 1 : (c.getConfig("TIME_UNIT") || 1);
            
            
            this.confTAT_COL = c.getConfig("TAT_COL") - 1 || 1;      // 時間(Y)のカラム位置
            this.confTAT_POS = (c.getConfig("TAT_POS") || 1) - 1;    // 時間(Y)の先頭バイト位置
            this.confTAT_LEN = (c.getConfig("TAT_LEN") || 0);        // 時間(Y)のバイト長
            this.confTAT_FORM = c.getConfig("TAT_FORM");             // 時間(Y)のフォーマット指定
            this.confTAT_UNIT = c.getConfig("TAT_UNIT") || 1;        // 時間(Y)の数値単位(1/1000)
            this.confENDIAN =  c.getConfig("ENDIAN");    // リトルエンディアンはtrue、ビッグエンディアンはfalse
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
         * 数値(秒)、時間（時分秒)をパースして数値（秒*unit）を取得する<br>
         * 数値でない場合 NaN を返却する<br>
         * /[0-9,:\. ]+/ に合致する文字列のみを処理する 例： argY: "-1:1:1.2" unit:1000 ->
         * -3661200 ms = -(1*60*60 + 1*60 + 1.2)*1000
         * 
         * @memberof TimeSeries.FileParser.GetterOfXY
         */
        GetterOfXY.parseNumber = function (){ // argY, unit,
            var argY = arguments[0],
                unit = arguments[1];
            if(!argY) {console.log("data Y parse error"); return 0; }
            // 数値を含まないとき NaN を返却する
            var nums =  argY.match(/[0-9,:\. ]+/); // #92
            if (!nums) return NaN; // #93
            // 時分秒(hh:mm:ss.000)を秒にする
            var str = nums[0];
            var ds = (str.indexOf(":") < 0) ? [str] : str.split(":"),   // #40
                pm = (0 <= ds[0]) ? 1 : -1,
                sec = 0.0;
            for(var i = 0; i < ds.length; i++){
                sec += pm * Math.abs(ds[i]) * Math.pow(60, ds.length - i - 1);
            }
            // 単位補正する（ミリ秒指定の場合 unit = 1000）
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
         * @memberof TimeSeries.FileParser.GetterOfXY
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
            } else {            // エラー時、（ NaN の場合を含む）
                return {x: x, y: y, isError: true };
            }
        };
        
        return new GetterOfXY();
    };
    
    /**
     * eTatの指定行の編集元レコードを、テキストフォーマットに変換して取得する
     * 
     * @memberof TimeSeries.FileParser
     * @param {Object}
     *            e eTat[n]：eTatの指定行
     * @return {String} eTatの指定行の表示用テキスト
     */
    FileParser.prototype.getRecordAsText = function (e) { // #62 ADD
        if (!e) return "";
        var text = "";
        if (typeof e.pos === "undefined") { // 生成データのとき
            // 生成データをCSVのログデータとして編集する #61
            text = Util.D2S(e.x, "yyyy/MM/dd hh:mm:ss.000", true) // #92
                    + ", " + e.y + ", " + e.message; // #53
            // 状態遷移履歴を追加する #62
            if (e.history){
                e.history.forEach(function(h){
                    var timeStr = "";
                    if (typeof(h.time) === "number") {
                        timeStr = Util.D2S(h.time, "mm:ss.000", true) + " seq:" // #92
                    }
                    text += " [" + h.sequenceIdx + ":" + h.status + "]" // #61
                        + timeStr + Util.D2S(h.sequenceTime, "mm:ss.000", true); // #92
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
 
    // new
    return FileParser;
}());