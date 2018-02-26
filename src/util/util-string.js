/**
 * 日時(Date)から、ローカル時刻に基づく、指定フォーマットの文字列を取得する
 * 
 * @memberOf Util
 * @param {Date}
 *            dt Date型（内部実装はミリ秒単位）
 * @param {String}
 *            str フォーマット yyyy-MM-dd hh:mm:ss.ppp （戻り値で上書きされる）
 * @return {String} str 編集後文字列
 */
export var DateToString = function() {
    var dt = arguments[0],  // arg0
        str = arguments[1]; // arg1
    // if (typeof(dt) === "number") dt = new Date(dt);
    str = str.replace(/yyyy/, dt.getFullYear() );
    str = str.replace(/MM/, ('0' + (dt.getMonth() + 1) ).slice(-2) );
    str = str.replace(/dd/, ('0' + dt.getDate()).slice(-2) );
    str = str.replace(/hh/, ('0' + dt.getHours()).slice(-2) );
    str = str.replace(/mm/, ('0' + dt.getMinutes()).slice(-2) );
    str = str.replace(/ss/, ('0' + dt.getSeconds()).slice(-2) );
    str = str.replace(/ppp/,('00' + dt.getMilliseconds()).slice(-3) ); // #60
    // str = str.replace(/ppp/,('00' + Math.floor(dt % 1000)).slice(-3) );

    return str;
};

/**
 * 日時文字列を指定フォーマットでパースして数値(ミリ秒単位）を取得する
 * @memberOf Util
 * @param {String}
 *            str
 * @param {Object|String}
 *            [conf={YYYY: 0, MM: 5, DD: 8, hh: 11, mm: 14, ss: 17, ppp: 20}]
 *            Object指定のとき：年月日時分秒ミリ秒の先頭位置を示す構造体オブジェクト<br>
 *            String指定とき：フォーマットを示す文字列<br>
 *            デフォルト値は、"YYYY/MM/DD hh:mm:ss.ppp"相当
 * @return {Number} timeNum 日時（１ミリ秒を１とする数値、エラーのときNumber.NaN）
 */
export var S2D = function(str, conf){ // #34
    if(!str) return Number.NaN;

    if(typeof(conf) === "Object"){
        // confが"Object"のとき、指定された構造体オブジェクトの条件でパースする（最も高速な処理）
        return parse(str, conf);
    } else if (typeof(conf) === "string") {
        // confが"String"のとき、指定された文字列フォーマットから構造体オブジェクトを作成し、パースする（準高速処理）
        var config = {  // YYYY/MM/DD hh:mm:dd.ss.ppp #41
                YYYY: conf.indexOf("YYYY"),
                MM: conf.indexOf("MM"),
                DD: conf.indexOf("DD"),
                hh: conf.indexOf("hh"),
                mm: conf.indexOf("mm"),
                ss: conf.indexOf("ss"),
                ppp: conf.indexOf("p")};
        return parse(str, config);
    } else {
        // confが指定されていないとき、デフォルト条件でパースする（汎用処理）
        // デフォルトフォーマット："YYYY/MM/DD hh:mm:dd.ss.ppp" #42
        var config = {YYYY: 0, MM: 5, DD: 8, hh: 11, mm: 14, ss: 17, ppp: 20};
        return parse(str, config);
    }

    // 内部関数：構造体オブジェクトで指定された条件でパースする
    function parse(str, conf){
        var y   = (0 <= conf.YYYY) ? parseInt( str.substr( conf.YYYY, 4), 10) : 1970,
                m   = (0 <= conf.MM)   ? parseInt( str.substr( conf.MM, 2), 10) - 1 : 0, // デフォルト1月
                // 1970/1/1だと時差でマイナスになることがあるので日付のデフォルトは2日
                d   = (0 <= conf.DD)   ? parseInt( str.substr( conf.DD, 2), 10) : 2,
                h   = (0 <= conf.hh)   ? parseInt( str.substr( conf.hh, 2), 10) : 0,
                min = (0 <= conf.mm)   ? parseInt( str.substr( conf.mm, 2), 10) : 0,
                sec = (0 <= conf.ss)   ? parseInt( str.substr( conf.ss, 2), 10) : 0,
                // ミリ秒以下を指定すると丸め誤差が生じるため、秒以下のミリ秒は個別に加算
                p   = (0 <= conf.ppp)  
                    ? ("0." + str.substr( conf.ppp).match(/[0-9]*/)[0]) * 1000.0 
                    : 0;
        return +(new Date( y, m, d, h, min, sec )) + p;  // #14
    }
};

/**
 * 日時(ミリ秒：Ｘ軸用）から、時差補正のない、指定フォーマットの文字列を取得する
 * 
 * @memberOf Util
 * @param {Number|Date}
 *            ds 時刻をUNIX経過時間（ミリ秒）で表した数値、もしくはDate(日付）
 * @param {String}
 *            [str=自動] フォーマット yyyy-MM-dd hh:mm:ss.ppp （戻り値で上書きされる）<br>
 *            自動のとき 日数+ hh:mm:ss.ppp 表示単位に至らない単位は表示しない、ミリ秒は分単位以下の時表示<br>
 *            例： 日数表示："1 02:03:04",時表示"02:03:04" 分表示"0:03:04.567" 秒表示"04.567"
 * @param {Boolean}
 *            [isLocal=false] trueのとき時差補正をしない
 * @return {String} str 編集後文字列
 */
export var D2S = function(ds, str, isLocal){ // #60
    var minus = "";
    var ret = "";
    if (ds < 0) {
        minus = "-";
        ds = -1 * ds;
    }
    var datetime = new Date(ds);
    if (!isLocal) { // #60
        datetime = new Date(+datetime + 60000 * datetime.getTimezoneOffset()); // 環境タイムゾーンの補正
    }
    if(str){ // フォーマット指定があるとき
        ret = DateToString(datetime, str);
    } else if (ds < 1000) { // 自動で1秒(1000)未満のとき
        ret = "0." + Math.round(ds);
    } else if (ds < 60000) { // 自動で1分(1*60*1000)未満のとき
        ret = DateToString(datetime, "ss.ppp");
    } else if (ds < 3600000) { // 自動で1分以上、1時間(1*60*60*1000)未満のとき
        ret = "0:" + DateToString(datetime, "mm:ss.ppp");
    } else if (ds < 86400000) { // 自動で1時間以上、1日(1*24*60*60*1000)未満のとき
        ret = DateToString(datetime, "hh:mm:ss");
    } else { // 自動で1日以上のとき
        ret = Math.floor(ds / 86400000) + " ";
        ret += DateToString(datetime, "hh:mm:ss");
    }
    return minus + ret;
};

/**
 * 数値(Ｙ軸用）から、誤差のない表示用文字列を取得する<br>
 * （hover、legendなどでY軸の値を使うときに使用する）
 * 
 * @memberOf Util
 * @param {Number|Date}
 *            y 時刻をUNIX経過時間（ミリ秒）で表した数値、もしくはDate(日付）
 * @return {String} str 編集後文字列
 *         {@linkhttps://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/NumberFormat}
 */
export var N2S = function(y){
    "use strict";
    return Intl.NumberFormat('en-IN').format(y);
};

/**
 * 文字列を数値に変換する
 * 
 * @memberOf Util
 * @param {String|Number}
 *            [str = sub] 計算式（日時分秒ミリ秒(d,h,mim,sec,ms)の文字は、ミリ秒に変換する）
 * @param {String|Number}
 *            [sub] 第一引数が指定されていない(undefined)ときの代用
 * @return {Number} n eval(str||sub)で取得した数値
 * 
 */
export var S2N = function(str, sub){ // #53
    var s = (typeof(str) !== "undefined") ? str : sub;
    var h = 3600000; // 1時間（ミリ秒）
    var min = 60000; // 1分（ミリ秒）
    var sec =  1000; // 1秒（ミリ秒）
    var ms =      1; // 1ミリ秒

    return eval(s);
};