import {D2S} from './util.js';

/**
 * @memberOf Util
 * @class Logger
 * @classdesc ロガー
 *            <p>
 *            モードに応じたログを出力する。画面ログ表示領域、コンソールログへの出力に対応
 * 
 * @param {String}
 *            [mode=0] ログ出力モード
 */
export default (function() { // #27
    "use strict";
    /** @static */
    Logger.prototype = {
            _logText: [],
            _timestamp : new Date(),
            _logtime : new Date()
        };
    /** @constructor */
    function Logger(mode){
        if(!(this instanceof Logger)) return new Logger(mode);
        this._mode = mode || 0;
        // getKeyによりIndex作成関数を設定する
    }
    /**
     * 一定時間（１分）経過後、最初に本メソッドが呼ばれたときのみログ出力する（ループ用）
     * 
     * @memberof Util.Logger
     * @param {Number}
     *            i 参考番号<br>
     *            経過時間内のループ回数などの表示に使用することを想定
     * @param {String}
     *            text ログ出力文字列
     */
    Logger.ByInterval = function(i, text) {
        var ts = new Date(),
            freq = 60000;   // 1分毎
        if (freq < ts - Logger._logtime){
            var t = D2S(ts, "hh:mm:ss.ppp"); // #60
            console.log(t + "[" + i + "]~~~~" + text);
            Logger._logtime = ts;
        }
    };
    /**
     * ログ出力： ログテキストを初期化する
     * 
     * @memberof Util.Logger
     * @param {String}
     *            text ログ出力文字列
     * @param {String}
     *            [type] ログ区分（"calc"：計算用ログ、"msg"：メッセージのみ（タイムスタンプなし））
     */
    Logger.ShowLogTextInit=function(text, type) {
        Logger._timestamp = new Date();
        Logger._logText = [];
        if(text) Logger.ShowLogText(text, type);
    };
    /**
     * ログ出力： ログテキストをテキストアレイに追記し、表示する
     * 
     * @memberof Util.Logger
     * @param {String}
     *            text ログ出力文字列
     * @param {String}
     *            [type] ログ区分（"calc"：計算用ログ、"msg"：メッセージのみ（タイムスタンプなし））
     */
    Logger.ShowLogText=function(text, type) {
        if (type === "calc") return; // 集計時評価用ログ出力抑止
        // "msg"指定のときは経過時間を取らずに、ログのみ出力する
        if (type !== "msg"){
            // 処理時間情報を追加する
            var lastTimestamp = Logger._timestamp;
            Logger._timestamp = new Date();
            text = (Math.round( Logger._timestamp - lastTimestamp ) / 1000.0)
                    + "s " + text;
            // 数値のカンマ編集（小数部もカンマが入る）
            text = text.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
            text = D2S(Logger._timestamp, "hh:mm:ss.ppp     ")
                    + text; // #60
        }
        Logger._logText.push(text);
        Logger.ShowText(Logger._logText);
        if(true) console.log(text);
    };
    /**
     * 第一引数のテキストアレイの内容を#fileInfoのiframeに表示する
     * 
     * @memberof Util.Logger
     * @param {String}
     *            textArray 出力するログ（配列１行がログ１件）
     */
    Logger.ShowText=function(textArray) {
        var iHtmlBody = "";
        for (var i = textArray.length - 1; 0 <= i; i--){
            iHtmlBody += textArray[i] + "<BR>"; 
        }
        Logger.ShowIHtmlBody('fileInfo',iHtmlBody);
    };
    /**
     * 第一引数のID名のiframeに、第二引数のログ（HTML化）を表示する
     * 
     * @memberof Util.Logger
     * @param {String}
     *            elementId iframeのID名
     * @param {String}
     *            iHtmlBody ログ（HTML化）
     */
    Logger.ShowIHtmlBody=function(elementId, iHtmlBody){
        var body = document.createElement('body');
        body.innerHTML = ""
            + "<style>body{font-size: 10px; margin: 1px; }</style>"
            + "<body id='iHtmlBody'>" + iHtmlBody + "</body>";
        var iframe = document.getElementById(elementId);
        iframe.contentDocument.body = body;
    };
    
    // newの戻り値
    return Logger;
}());