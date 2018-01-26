"use strict";

/** ie11 互換用 * */
if(!Number.MAX_SAFE_INTEGER) Number.MAX_SAFE_INTEGER = 9007199254740991; // #59
if(!Number.MIN_SAFE_INTEGER) Number.MIN_SAFE_INTEGER = -9007199254740991;

if(!Uint8Array.prototype.indexOf){
    Uint8Array.prototype.indexOf = function(target,index){
        "use strict";
        index = (index === undefined) ? 0 : index;  // #29
        for(var i = index, last = index + 4096; i < last; i++){ // 暫定：1レコード4KBまでチェック
            if(this[i] === target) return i; 
        }
        return -1;
    };
}
if (!Uint8Array.prototype.slice) {  // #29
    Uint8Array.prototype.slice = function(begin, end) {
        "use strict";
        return this.subarray(begin, end);
    };
}
// https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function(predicate) {
          "use strict";
      if (this === null) throw new TypeError('Array.prototype.findIndex called on null or undefined');
      if (typeof predicate !== 'function') throw new TypeError('predicate must be a function');
      var list = Object(this), length = list.length >>> 0, thisArg = arguments[1], value;
      for (var i = 0; i < length; i++) {
        value = list[i];
        if (predicate.call(thisArg, value, i, list)) return i;
      }
      return -1;
    };
  }
// https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/find
if (!Array.prototype.find) {
    Array.prototype.find = function(predicate) {
        "use strict";
      if (this === null) throw new TypeError('Array.prototype.find called on null or undefined');
      if (typeof predicate !== 'function')  throw new TypeError('predicate must be a function');
      var list = Object(this), length = list.length >>> 0, thisArg = arguments[1], value;
      for (var i = 0; i < length; i++) {
        value = list[i];
        if (predicate.call(thisArg, value, i, list))  return value;
      }
      return undefined;
    };
  }

/** @namespace */
var Util = {}; // utils登録変数

/**
 * @memberOf Util
 * @class TouchPanel
 * @classdesc タッチパネル用ツール
 *            <p>
 *            参考 {@https://code.i-harness.com/ja/q/4f2389}
 * 
 * @param {Number}
 *            [average=0.5] 平均値
 * @example var r = HJN_util.TouchPanel(10), val = r.exponential();
 */
export var TouchPanel = (function() { // #56
    "use strict";
    /** @constructor */
    function TouchPanel(average){
        if(!(this instanceof TouchPanel)) return new TouchPanel(average);
        this._average = average || 0.5;
    }
    /** @private */
    
    // public
    /**
     * タッチデバイスか判定する
     * <p>
     * クラスロード後、touchstart と mouosemove の初回のイベントがどちらが先に発生したかにより判定する 参考
     * {@link https://lab.syncer.jp/Web/JavaScript/Snippet/44/}
     * 
     * @memberof TouchPanel
     * @return {String} 先に検出したイベントがマウス移動のとき false、以外のときtrue
     * 
     */
    TouchPanel.isTouchableDevice = function() {
        Logger.ShowText([TouchPanel._deviceType]);
        return true; // (TouchPanel._deviceType === "MOUSE") ? false : true;
    }
    // タッチデバイスか判定する（クラス定数）
    TouchPanel._deviceType = "SHIMULATED_TOUCH";
    function detectDeviceType(event) {
        TouchPanel._deviceType = event.changedTouches ? "TOUCH" : "MOUSE" ;
        document.removeEventListener("touchstart", detectDeviceType) ;
        document.removeEventListener("mousemove", detectDeviceType) ;
    }
    document.addEventListener("touchstart", detectDeviceType) ;
    document.addEventListener("mousemove", detectDeviceType) ;

    /**
     * タッチパネル操作をマウス操作に転送する
     * <p>
     * 参考 {@link https://code.i-harness.com/ja/q/4f2389}
     * 
     * @memberof Util.TouchPanel
     * @param {Object}
     *            element 対象dom要素
     * @param {Boolean}
     *            [isStopTouch=false] 元のタッチのデフォルトイベントを消すか（個別に登録されているリスナーには無関係）
     * 
     * @example HJN_util.DispatchEventTouchToMouse();
     */
    TouchPanel.DispatchEventTouchToMouse = function(element, isStopTouch) { // #22
        "use strict";
        element.addEventListener("touchstart", touchHandler, true);
        element.addEventListener("touchmove", touchHandler, true);
        element.addEventListener("touchend", touchHandler, true);
        element.addEventListener("touchcancel", touchHandler, true);
        return;

        function touchHandler(ev) {
            var bIgnoreChilds = false;
            if( !window.__TOUCH_TYPES ) {
                window.__TOUCH_TYPES  = { touchstart:'mousedown', touchmove:'mousemove', touchend:'mouseup' };
                window.__TOUCH_INPUTS = { INPUT: 1, TEXTAREA: 1, SELECT: 1, OPTION: 1,
                                         'input':1,'textarea':1,'select':1,'option':1 };
            }
            var bSame = (ev.target == this);
            if (bIgnoreChilds && !bSame) { return; }
            // Get if object is already tested or input type
            var b = (!bSame && ev.target.__ajqmeclk);
            // allow multi-touch gestures to work
            if (b === true || !ev.touches || ev.touches.length > 1 || !window.__TOUCH_TYPES[ev.type]) { return; }

            var oEv = (!bSame && typeof b != 'boolean') ? ev.target.getAttribute('events') : false;
            var b = (!bSame)
                  ? (ev.target.__ajqmeclk = oEv
                      ? (oEv['click'] || oEv['mousedown'] || oEv['mouseup'] || oEv['mousemove']) 
                      : false )
                  :false;
            // allow default clicks to work (and on inputs)
            if (b || window.__TOUCH_INPUTS[ev.target.tagName]) { return; } 

            var touch = ev.changedTouches[0];
            var tmpClientX = touch.clientX;
            var tmpClientY = touch.clientY;
            // クリックに変換するタップ誤差範囲
            var CLICK_MARGIN = 20; // px
            var CLICK_DELAY = 1000; // ms

            // 前回touchstart時の座標と時刻が一定範囲内の時、dygraphがクリックと判定するよう補正する
            if ((ev.type === "touchstart" || ev.type === "touchend") &&
                    this.startTouch &&
                    Math.abs(this.startTouch.x - touch.clientX) < CLICK_MARGIN && // タッチ補正幅(px)
                    Math.abs(this.startTouch.y - touch.clientY) < CLICK_MARGIN &&
                    +new Date() - this.startTouch.t < CLICK_DELAY) { // タッチ時間(ms)
                // 位置補正
                tmpClientX = this.startTouch.x;
                tmpClientY = this.startTouch.y;
            } else if (ev.type === "touchstart"){
                // touchstart時の座標と時刻を退避する
                this.startTouch = {x: touch.clientX, y: touch.clientY, t: +new Date()};
            } else if (ev.type === "touchend") {  
                // touchstart時の座標と時刻を初期化する
                this.startTouch = {};
            }
            // マウスイベントを発生させる
            var newEvent = document.createEvent("MouseEvent");
            newEvent.initMouseEvent(
                window.__TOUCH_TYPES[ev.type],    // type
                true,             // bubbles
                true,             // cancelable
                window,           // view
                1,                // detail
                touch.screenX,    // screenX スクリーンサイズ
                touch.screenY,    // screenY
                tmpClientX,       // clientX タッチ座標
                tmpClientY,       // clientY
                false,            // ctrlKey
                false,            // altKey
                false,            // shiftKey
                false,            // metaKey
                0,                // button
                null              // relatedTarget
              );
            touch.target.dispatchEvent(newEvent);
            
            // タッチイベントを止める #22
            if(isStopTouch) {
                ev.stopImmediatePropagation();
                ev.stopPropagation();
                ev.preventDefault();
                return false;
            }
        }
    };

    /* new */
    return TouchPanel;
}());


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
    "use strict";
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
    "use strict";
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
    "use strict";
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
    "use strict";
    var s = (typeof(str) !== "undefined") ? str : sub;
    var h = 3600000; // 1時間（ミリ秒）
    var min = 60000; // 1分（ミリ秒）
    var sec =  1000; // 1秒（ミリ秒）
    var ms =      1; // 1ミリ秒

    return eval(s);
};



/**
 * @memberOf Util
 * @class Random
 * @classdesc Random 乱数取得
 *            <p>
 *            ある事象の単位時間あたりの発生回数がポアソン分布, その発生間隔が指数分布に従う<br>
 *            M/M/1モデルは、到着がポアソン過程となり、(したがって到着間隔は指数分布に従う)、サービス時間が指数分布に従う
 *            <p>
 *            参考 {@link http://www.ishikawa-lab.com/montecarlo/4shou.html}
 * 
 * @param {Number}
 *            [average=0.5] 平均値
 * @example var r = HJN_util.Random(10), val = r.exponential();
 */
export var Random = (function() { // #56
    "use strict";
    /** @constructor */
    function Random(average){
        if(!(this instanceof Random)) return new Random(average);
        this._average = average || 0.5;
    }

    /** @private */
    
    // public
    /**
     * 一様分布となる乱数を返却する
     * 
     * @memberof Util.Random
     * @param {Number}
     *            [average=this._average] 平均値<br>
     * @return {Number} 乱数
     */
    Random.prototype.uniform = function(average) {
        average = average || this._average;
        return  2.0 * average * Math.random();
    };

    /**
     * 指数分布となる乱数を返却する(lambda = 1/average)
     * 
     * @memberof Util.Random
     * @param {Number}
     *            [average=this._average] 平均値=1/λ、分散=1/(λ^2)<br>
     * @return {Number} 乱数
     */
    Random.prototype.exponential = function(average) {
        average = average || this._average;
        return (-1.0 * average) * Math.log(1.0 - Math.random());
    };
    
    /**
     * ポアソン分布となる乱数を返却する(lambda = average)
     * 
     * @memberof Util.Random
     * @param {Number}
     *            [average=this._average] 平均値=分散=λ<br>
     * @return {Number} 乱数
     */
    Random.prototype.poisson = function(average) {
        var lambda = average || this._average;
        var xp = Math.random();
        var k = 0;
        while (xp >= Math.exp(-lambda)) {
            xp = xp * Math.random();
            k = k + 1;
        }
        return (k);
    };
    
    /* new */
    return Random;
}());



/**
 * @memberOf Util
 * @class Cash
 * @classdesc キャッシュ
 *            <p>
 *            キャッシュを保持させるオブジェクト
 * @param {Number}
 *            [size=10] キャッシュ最大件数（未対応機能、設定は無視される）
 */
export var Cash = (function() {
    "use strict";
    /** constructor */
    function Cash(size){
        size = size || 10;  // TODO 未使用
        if(!(this instanceof Cash)) return new Cash(size);
        // インスタンス変数
        this._cash = {};    // キャッシュ {data:, count:, lastTime:}
        this._ranges = [];  // RangedCash用 {key: ,from: , to:, }
        this._size = size;  // キャッシュ最大件数
    }
    
    /* method */
    /**
     * 第一引数のargumentsを配列に変換する<br>
     * （注：引数が１つ以上あることを前提）
     * 
     * @memberof Util.Cash
     * @param {Number}
     *            args 引数一覧（arguments）
     * @return {Array} 引数の配列
     */
    Cash._arg2arr = function(args) {
            return args.length === 1 ? [args[0]] : Array.apply(null, args);
        };
    /**
     * cash判定Keyを取得する<br>
     * （注：引数を'.'でつないだ文字列をkeyとするので、関数名長の上限を超える大きな配列は不可）
     * 
     * @memberof Util.Cash
     * @param {Number}
     *            args 引数一覧（argumentsオブジェクト）
     * @return {String} キャッシュキー用の文字列
     */
    Cash._getKey = function(args) {
            var argsArr = this._arg2arr(args);
            return argsArr.reduce(function(a,b){return a+'.'+b; });
        };
        
    /* private */

    /* public */
    /**
     * cashオブジェクトを、cashが無いときはundefinedを返却する<br>
     * cashヒットした場合、cashの使用回数をカウントアップする
     * 
     * @memberof Util.Cash
     * @param {Object}
     *            arguments 引数からキー文字列を定める
     * @return {Number|undefined} キャッシュデータ（デーがが無い場合は undefined)
     */
    Cash.prototype.getCash = function () {
            if (arguments.length < 1) return undefined;
            var args = Cash._arg2arr(arguments),
                key = Cash._getKey(args);
            if (key in this._cash){
                var cash = this._cash[key];
                cash.lastTime = new Date();
                cash.count++;
                return cash.data;
            }else{
                return undefined;
            }
        };
    /**
     * オブジェクトをcashする
     * 
     * @memberof Util.Cash
     * @param {Object}
     *            cashVal キャッシュするオブジェクト
     * @param {Object}
     *            arguments 第二引数以降の、引数からキー文字列を定める
     * @return {Object} キャッシュデータ（デーがが無い場合は undefined)
     */
    Cash.prototype.setCash = function () {
            if (arguments.length < 2) return undefined;
            var cashVal = arguments[0],
                args = Cash._arg2arr(arguments).slice(1, arguments.length),
                key = Cash._getKey(args);
            this._cash[key] = {data: cashVal, count: 0, lastTime:new Date()};
            return cashVal;
        };

    /**
     * レンジキー(form,to)範囲内でキーマッチするcashを、cashが無いときはundefinedを返却する<br>
     * キーは大小比較できる数値であることが前提
     * 
     * @memberof Util.Cash
     * @param {Number}
     *            from 抽出するキャッシュキー最小値
     * @param {Number}
     *            to 抽出するキャッシュキーの最大値
     * @return {Object} キャッシュデータ（デーがが無い場合は undefined)
     */
    Cash.prototype.getRangedCash = function (from, to) {
            var range = this._ranges.find(function(e){
                    return (e.from <= from && to <= e.to);
                });
            return (range !== undefined) ? this.getCash(range.from,range.to) : undefined;
        };
    /**
     * レンジキー(from,to)指定でキャッシュする<br>
     * キーは大小比較できること（通常、数値）、from-to期間内の既存のキャッシュは削除される
     * 
     * @memberof Util.Cash
     * @param {Object}
     *            cashVal キャッシュするオブジェクト
     * @param {Number}
     *            from 抽出するキャッシュキー最小値
     * @param {Number}
     *            to 抽出するキャッシュキーの最大値
     * @return {Object} キャッシュデータ（デーがが無い場合は undefined)
     */
    Cash.prototype.setRangedCash = function (cashVal, from, to) {
            if (arguments.length < 3) return undefined;
            // 登録キー範囲に包含される既存キャッシュを削除する
            var count = 0;
            this._ranges = this._ranges.filter(function(e){
                    if (from <= e.from && e.to <= to){
                        // 登録キャッシュ範囲内のキャッシュを削除する
                        count += this._cash[e.key].count;   // 削除分のカウンタ合算
                        delete this._cash[e.key];
                        return false;
                    }else{  // 登録キャッシュの範囲外の一覧を返却する
                        return true;
                    }
                }, this);
            // 引数をキャッシュに登録する
            var key = Cash._getKey([from, to]);
            this._ranges.push( {from: from, to: to, key: key} );
            this.setCash(cashVal, from, to);
            this._cash[key].count= count + 1;   // 再作成時はカウンタ合算値
            return cashVal;
        };

    // newの戻り値
    return Cash;
}());


/**
 * @memberOf Util
 * 非同期化
 * 
 * @param {function}
 *            global 非同期化して実行する関数
 *            <p>
 *            参考 {@link https://jsfiddle.net/kou/j73tLum4/8/}
 *            {@link https://gist.github.com/mathiasbynens/579895}
 *            {@link http://dbaron.org/log/20100309-faster-timeouts}
 */
export var setZeroTimeout = (function(global) {
    "use strict";
    var timeouts = [], 
        messageName = "zero-timeout-message";
    function handleMessage(event) {
        if (event.source === global && event.data === messageName) {
            if (event.stopPropagation)  event.stopPropagation();
            if (timeouts.length) timeouts.shift()();
        }
    }
    if (global.postMessage) {
        if (global.addEventListener) {
            global.addEventListener("message", handleMessage, true); 
        }else if (global.attachEvent) {
            global.attachEvent("onmessage", handleMessage); 
        }
        return function (fn) { timeouts.push(fn); global.postMessage(messageName, "*"); };
    } 
    else {
        return function (fn) { setTimeout(fn, 0); }; 
    }
}(window));



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
export var Logger = (function() { // #27
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

/**
 * 指定されたtextareaを使って、クリップボードにコピーする
 * 
 * @memberof Util
 * @param {Object}
 *            elementID textareaのID名
 */
export var CopyToClipboard = function(elementId) { // #61
    "usestrict";
    // textareaをクリップボードにコピーする
    var area = document.getElementById(elementId);
    area.select();
    document.execCommand("copy");
}

/**
 * @memberOf Util
 * @class binarySearch
 * @classdesc 配列二分木検索
 * 
 * @param {Number}
 *            val 検索する値
 * @param {Array}
 *            arr 検索対象の配列
 * @param {Function}
 *            [func=function(val){return val.valueOf();}] 配列要素に対して、値を取得する関数
 * @param {Index}
 *            [low=0] 配列の検査範囲の下限
 * @param {Index}
 *            [high=arr.length-1] 配列の下限検査範囲の上限
 * @param {Boolean}
 *            [isEqual=false] 完全一致しないときのリターン値：trueのとき-1、falseのとき値との差が最も少ない位置
 * @example i=HJN_util.binarySearch(x,arrXY,function(e){return e.x;});
 */
export var binarySearch = function (val, arr, func, low, high, isEqual) {
    "use strict";
    func = func || function(val){ return val.valueOf(); };
    low = low || 0;
    high = high || arr.length - 1;
    isEqual = isEqual || false;
    var middle,
        valMiddle;
    while( low <= high ){
        middle = Math.floor(low + high) / 2 | 0;
        valMiddle = func(arr[middle]);
        if(valMiddle === val) return middle;
        else if(val < valMiddle) high = middle - 1;
        else low = middle + 1;
    }
    // 値が完全一致する要素がなかった場合の戻り値を編集する
    if (isEqual){
        return -1;  // 完全一致指定のとき(-1)をリターンする
    } else {        // 完全一致指定でないとき、値との差が最も少ない位置をリターンする #46
        // low,middle,high を補正する
        low = Math.min(Math.max(0, low), arr.length - 1);
        high = Math.max(0, Math.min(high, arr.length - 1));
        middle = Math.max(low, Math.min(middle, high));
        if(high < low){
            var tmp = high;
            high= low;
            low = tmp;
        }
        // low,middle,high のうち、値との差が最も少ない位置をリターンする
        if(func(arr[middle]) < val){
            if (val - func(arr[middle]) < func(arr[high]) - val) {
                return middle;
            } else {
                return high;
            }
        }else{
            if (func(arr[high]) <= val && val < func(arr[middle])){
                return high;
            } else if (val - func(arr[low]) < func(arr[middle]) - val){
                return low;
            } else {
                return middle;
            }
        }
        return -1;  // 指定範囲外
    }
};



/**
 * @memberOf Util
 * @class MappedETat
 * @classdesc 期間指定eTat取得用Map
 *            <p>
 *            指定期間に動いているeTatの一覧を、高速に取得するマップ
 * @param {ETAT}
 *            eTat インデックスを追加するETAT
 * @example eTat.tatMap = new HJN_util.MappedETat(eTat); var trans =
 *          eTat.tatMap.search(x, x, 1000);
 */
export var MappedETat = (function() { // #18
    "use strict";
    /** @static */
    MappedETat.prototype = {
            _abscissa: [],
            _conf :[{ms:      10, step:5, label:"0_10ms_"},
                    {ms:      50, step:2, label:"1_50ms_"},
                    {ms:     100, step:5, label:"2_100ms_"},
                    {ms:     500, step:2, label:"3_500ms_"},
                    {ms:    1000, step:5, label:"4_1sec_"},
                    {ms:    5000, step:4, label:"5_5sec_"},
                    {ms:   20000, step:3, label:"6_20sec_"},
                    {ms:   60000, step:5, label:"7_1min_"},
                    {ms:  300000, step:4, label:"8_5min_"},
                    {ms: 1200000, step:3, label:"9_20min_"},
                    {ms: 3600000, step:6, label:"10_1h_"},
                    {ms:21600000, step:4, label:"11_6h_"},
                    {ms:Number.MAX_VALUE, step:1, label:"12_overDay_"}] // 最後はstep:１
        };
    /** @constructor */
    function MappedETat(eTat){
        if(!(this instanceof MappedETat)) return new MappedETat(eTat);
        // MappedArrayを作成する
        this._tatMap = new MappedArray(eTat, this._getKey, true);
    }

    /** @private */
    MappedETat.prototype._row = function(label, step) {return label + step;};

    /** @private */
    // MapKey取得関数
    MappedETat.prototype._getKey = function(e, i) {        // MapedMap用Key配列関数
        var start = e.x - e.y,      // x,yはミリ秒
            end = e.x,
            _conf = MappedETat.prototype._conf,
            _row = MappedETat.prototype._row,
            term = _conf[0].ms,
            rowLv = 0;
        if(Math.ceil(end / term) - 1 === Math.floor(start / term)){ // 最小BOX
            return [_row(_conf[0].label, 0),
                    (Math.ceil(e.x / _conf[0].ms) - 1) * _conf[0].ms];
        }
        for (i = 1; i < _conf.length; i++) {                // 最下位から上に評価
            term = _conf[i].ms;
            if(Math.floor(end / term) === Math.floor(start / term) 
                    || end - start < term){                      // 上位BOXを起点
                term = _conf[i-1].ms;   // ひとつ下位のBOX期間（下から評価したので二段下となることは無い
                rowLv = Math.floor(end / term) - Math.floor(start / term);
                return [_row(_conf[i-1].label, rowLv),
                        (Math.ceil(e.x / _conf[i-1].ms) - 1) * _conf[i-1].ms];
            }
        }
        return "error";
    };

    // static メンバーの設定
    // _confから_abscissa(横軸）を生成する
    var c = MappedETat.prototype._conf,
        e2 = c[c.length - 2],
        
        e  = c[c.length - 1];
    MappedETat.prototype._abscissa.push(
            {label: MappedETat.prototype._row(e.label, e.step), ms: e.ms ,i: 1,
                step: e.step, from: e2.ms * e2.step, to: e.ms} );   // 末尾を先頭に追加
    for (var j = c.length - 1; 0 <= j; j--){    // 降順に追加
        e = c[j];
        for (var i = e.step; 0 < i; i--){ // #39
            MappedETat.prototype._abscissa.push(
                    {label: MappedETat.prototype._row(e.label, i), ms: e.ms, i: i, 
                                step: e.step, from: e.ms * i, to: e.ms * (i + 1)} );
        }
    }
    MappedETat.prototype._abscissa.push( 
            {label: MappedETat.prototype._row(c[0].label, 0), ms: c[0].ms, i: 0,
                step: 0, from: 0, to: c[0].ms} );   // 先頭を末尾に追加

    
    // public
    /**
     * 指定期間に動いているeTatを検索する
     * 
     * @memberOf Util.MappedETat
     * @parm {Number} from 指定期間(from)
     * @parm {Number} [to=from] 指定期間(to)
     * @parm {Number} [cap] cap件数となったら抽出を終了する（指定なしの時：全件）
     * @return {ETAT} eTatArr 指定期間内のeTat配列
     */
    MappedETat.prototype.search = function (from, to, cap) {
        to = to || from;    // to省略時は時刻指定(from=to)
        cap = cap || Number.MAX_VALUE; // 指定なしの時：全件
        var map = this._tatMap._map,
            eTat = this._tatMap._arr,
            abscissa = this._abscissa,
            eTatArr = [],
            start = 0,
            end = 0;
        // 検索対象のBOX一覧を生成する
        abscissa.forEach(function(e){   // 存在しうる横軸のうち（tatが長時間の方から）
            if (map[e.label]){          // 横軸が存在するものについて
                var boxNum = e.i + Math.ceil(to / e.ms) - Math.floor(from / e.ms), // #45
                    key = Math.floor(from / e.ms) * e.ms;
                // 存在しうるKey値を終了時間が早い方から集計する
                for(var j = 0; j <= boxNum; j++){
                    // Key値が存在するものみが集計対象
                    if (map[e.label][key]){ 
                        // かつ、Keyが持っている要素(eTatへの参照:k)が集計対象
                        map[e.label][key].forEach(function(k){
                            // かつ、from-toの期間に動いている要素(eTatのindex)が集計対象
                            start = eTat[k].x - eTat[k].y;
                            end   = eTat[k].x;
                            if((start <= to) && (from <= end)){
                                // かつ、戻り値の配列要素数がcap未満の場合が集計対象
                                if(eTatArr.length < cap){
                                    // 集計対象条件に合致する要素を、戻り値の配列に追加する
                                    eTatArr = eTatArr.concat(eTat[k]);
                                }
                            }
                        });
                    }
                    key += e.ms;    // 次のKey値
                }
            }
        }, this);
        return eTatArr;
    };
    
    // newの戻り値
    return MappedETat;
}());


/**
 * @memberOf Util
 * @class MappedArray
 * @classdesc 配列位置逆引きマップ
 *            <p>
 *            配列に格納されているオブジェクトのx値で、配列位置を高速検索するマップ<br>
 *            指定関数の戻り値(x)をキーとするマップを作成する
 *            <p>
 *            参考 {@link http://qiita.com/alucky0707/items/10052866719ba5c5f5d7}
 * 
 * @param {Array}
 *            arr インデクスをつける対象の配列
 * @param {String|function}
 *            [getKey=""] MappedArrayのKey値の取得方法
 *            <p>
 *            String指定のとき（デフォルト""を含む）、配列要素の値(valueOf)
 *            <p>
 *            注： 0,00,"0"は同値、1,01,"1"は同値 Stringのとき、 配列要素が持つ指定要素の値
 *            <p>
 *            functionのとき、配列要素に指定関数を適用した戻り値
 *            <p>
 *            関数の引数：(配列要素オブジェクト、配列のインデックス、作成中のMappedArrayへの参照）
 * @param {Boolean}
 *            [isMappedMap] getKeyが2段Map用の配列を返却する
 * @return {object} Index arrに対するインデックス（連想配列名で検索）
 * @example _tatMap = new HJN_util.MappedArray(eTat, this._getKey, true);
 */
export var MappedArray = (function() {    // #18
    /** @constructor */
    function MappedArray(arr, getKey, isMappedMap){
        if(!(this instanceof MappedArray)) return new MappedArray();
        this._arr = arr;
        // getKeyによりIndex作成関数を設定する
        if(!getKey || getKey === ""){
            // getKey指定がないとき、配列の値
            this._getKey = function(e){ return e.valueOf(); };
        }else if ((typeof(getKey) === "string") && (getKey !== "")){    // #29
            // getKeyが文字列のとき、配列内オブジェクトのgetKey要素の値
            this._getKey = function(e){ return e[getKey]; };
        }else if (typeof(getKey) === "function" ){  // #29
            // getKeyが関数のとき、配列内オブジェクトに関数を適用した戻り値
            this._getKey = getKey;
        }else{  // 以外のときエラーログを出力し、getKey指定なしと同様、配列の値
            console.error("MappedArrayの第二引数エラー：[ %o ]を無視します ",getKey);
            this._getKey = function(e){ return e.valueOf(); };
        }
        // MappedArrayを作成する
        if(!isMappedMap){
            this._createMappedArray();          
        }else{
            this._createMappedMappedArray();
        }
    }

    /** @private */
    MappedArray.prototype._createMappedArray = function() {
        var key = ""; 
        this._map = this._arr.reduce(function(m, a, i) {
            key = this._getKey.call(a, a, i, m);
            m[key] = (m[key] || []).concat(i);
            return m;
        }, {});
    };
    /** @private */
    MappedArray.prototype._createMappedMappedArray = function() {
        var keys = [],
            key = "",
            mKey = "",
            _getKey = this._getKey;
        this._map = this._arr.reduce(function(m, a, i) {
            keys = _getKey.call(a, a, i, m);
            key = keys[1] || "error";
            mKey = keys[0] || "error";
            if(m[mKey] === undefined) m[mKey] = {};
            m[mKey][key] = (m[mKey][key] || []).concat(i);
            return m;
        }, {});
    };

    // public
    /**
     * 値の存在チェック
     * 
     * @memberOf Util.MappedArray
     */
    MappedArray.prototype.has = function (keyValue) {
        return keyValue in this._map;
    };
    /**
     * 該当位置を配列で返す
     * 
     * @memberOf Util.MappedArray
     */
    MappedArray.prototype.indexes = function (keyValue) {
        return this._map[keyValue] || [];
    };
    /**
     * 該当する要素を配列で返す
     * 
     * @memberOf Util.MappedArray
     */
    MappedArray.prototype.search = function (keyValue) {    
        var arr = this._arr;
        return this.indexes(keyValue).reduce(function(m, i) {
            m.push(arr[i]);
            return m;
        }, []);
    };
    /**
     * Array.prototype.indexOf() 同等
     * 
     * @memberOf Util.MappedArray
     */
    MappedArray.prototype.indexOf = function (keyValue) {
        var idxArr = this._map[keyValue],
            i = idxArr ? idxArr.length : -1;
        return (0 < i) ? idxArr[0] : -1;
    };
    /**
     * Array.prototype.lastIndexOf() 同等
     * 
     * @memberOf Util.MappedArray
     */
    MappedArray.prototype.lastIndexOf = function (keyValue) {
        var idxArr = this._map[keyValue],
            i = idxArr ? idxArr.length : -1;
        return (0 < i) ? idxArr[i-1] : -1;
    };
    
    return MappedArray;
}());


/**
 * @memberOf Util
 * @class Heap
 * @classdesc Heap ヒープ(二分ヒープ)
 *            <p>
 *            最小値(最大値)を効率よく取り出すことができるデータ構造
 *            <p>
 *            参考 {@link http://d.hatena.ne.jp/otaks/20121220/1355993039}
 * 
 * @param {Function}
 *            [func=function(obj){ return +obj; }]
 *            pushで登録するオブジェクトからヒープの大小比較判定値を取り出す関数
 * @param {Function}
 *            [delFunc=function(obj){ return obj; }] 削除対象ノードを特定する関数<br>
 *            「delの引数オブジェクト === delFunc(heapのノードのオブジェクト)」 で判定する
 * 
 * @example h = HJN_util.Heap( function(obj){ return +obj; } );<br>
 *          h.push("12.34") // データを登録する ;<br>
 *          h.push(0.12) // ;<br>
 *          h.pop() // => 0.12 最小値のオブジェクトを取り出す ;<br>
 *          h.pop() // => "12.34" ;<br>
 *          h.top() // =>undefined 最小値のオブジェクト ;<br>
 *          h.size() // =>0 登録オブジェクト数
 */
export var Heap = (function() { // #55
    "use strict";
    /** @constructor */
    function Heap(func, delFunc){ 
        if(!(this instanceof Heap)) return new Heap(func, delFunc);
        
        this._func = (typeof(func) === "function")
                ? func
                : function(node){
                    if (typeof(node.val) === "undefined") { return node }
                    else { return node.val}; 
                  };
        this._delFunc = (typeof(delFunc) === "function")
                ? delFunc
                : function(node){
                    if(typeof(node.obj) === "undefined"){ return node }
                    else { return node.obj};
                  };
        this._heap = []; // Heap構造体（大小比較数値用）
    }

    //
    /**
     * upheap：root方向へheapを再構築する
     * 
     * @private
     * @param {Number}
     *            k 起点の_heap配列位置
     */
    Heap.prototype._upHeap = function(k) {
        // 指定位置のオブジェクトとその値の控えを取る
        var obj = this._heap[k];
        var val = this._func(obj);
        while( 0 < k ) {
            // 親ノードの配列位置を求める
            var p = Math.floor( (k - 1) / 2 );
            // 逆転していなければ処理終了
            if( this._func(this._heap[p]) <= val ) break;
            // 親ノードと処理対象を入れ替える
            this._heap[k] = this._heap[p];
            this._heap[p] = obj;
            k = p;
        }
    };
    /**
     * downheap：reaf方向へheapを再構築する
     * 
     * @private
     * @param {Number}
     *            k 起点の_heap配列位置
     */
    Heap.prototype._downHeap = function(k) {
        // 指定位置のオブジェクトとその値を控えを取る
        var obj = this._heap[k];
        var val = this._func(obj);
        var size = this._heap.length;
        // 子ノードが無くなるまで繰り返す
        while( k * 2 + 1 < size) {
            var a = k * 2 + 1;  // 子ノード（左）
            var b = a + 1;      // 子ノード（右）
            // aが大小比較対象先となる小さい子ノードを指すようにする
            if( b < size && this._func(this._heap[a]) > this._func(this._heap[b]) ) a = b;
            // 逆転していなければ処理終了
            if( val < this._func(this._heap[a]) ) break;
            // 子ノード（比較対象）と処理対象を入れ替える
            this._heap[k] = this._heap[a];
            this._heap[a] = obj;
            k = a;
        }
    };
    /**
     * _heapのk番目を削除し、_heapを再構築する
     * 
     * @private
     * @param {Number}
     *            k 起点の_heap配列位置
     * @return {object|undefined} 削除したオブジェクト（削除対象が無いとき undefined）
     */
    Heap.prototype._del = function(k) {
        if (this._heap.length <= k) return undefined; // ヒープ外を指定したとき

        var ret = this._heap[k]; // 削除したオブジェクト
        var obj = this._heap.pop(); // 末尾ノードを取り出す
        var size = this._heap.length;
        if (k === size) return ret; // 末尾ノードを削除したとき再構築不要

        this._heap[k] = obj; // 末尾ノードを指定位置に移動する
        if (size === 1) return ret; // ヒープが１個のとき、再構築不要

        // upHeapの判定
        var val = this._func(obj); // 末尾ノードにあったオブジェクトの値
        var p = Math.floor( (k - 1) / 2 );
        if (0 < k && val < this._func(this._heap[p])) {
            // 親ノードより小さいときupheapする
            this._upHeap(k);
        } else {
            var a = k * 2 + 1;  // 子ノード（左）
            var b = a + 1;      // 子ノード（右）
            if (a < size) { // 子ノードがあるとき（末端の枝葉でないとき）のみdownHeapする
                // aに、子ノードの小さい方のノードを設定する
                if( b < size && (this._func(this._heap[a]) > this._func(this._heap[b])) ) a = b;
                // 自分より小さい子ノードがあるとき、downheapする
                if( this._func(this._heap[a]) < val ) this._downHeap(k);
            }
        }
        return ret;
    };
    // public
    /**
     * データを追加する
     * 
     * @memberOf Util.Heap
     * @param {Object}
     *            obj 登録オブジェクト
     */
    Heap.prototype.push = function(obj) {
        // 末尾に追加し、upHeapする
        this._heap.push(obj);
        this._upHeap(this._heap.length - 1);
        if (this._deletable) {
            this._deleteMap = {};
        }
    };
    /**
     * 最小値のデータを取り出す
     * 
     * @memberOf Util.Heap
     * @return {Object|undefined} 最小値
     */
    Heap.prototype.pop = function() {
        // 先頭ノードを戻り値用に退避する
        var ret = this._heap[0];
        // 末尾ノードを退避し削除する
        var obj = this._heap.pop();
        if(0 < this._heap.length){
            // ヒープが空でないとき、末尾ノードを先頭に移動し、downHeapする
            this._heap[0] = obj;
            this._downHeap(0);
        }
        return ret;
    };
    /**
     * 指定データを削除する
     * 
     * @memberOf Util.Heap
     * @param {Object}
     *            obj 削除対象と同一オブジェクト(=== で判定)
     * @return {Object|undefined} 削除したオブジェクト（undefined：合致するオブジェクトが無いとき）
     */
    Heap.prototype.del = function(obj) { // #59
        // 削除対象オブジェクトのHeap配列位置を取得する
        var k = -1;
        if (this._heap.some(find, this)){
            // 合致するオブジェクトのノードを削除し、合致ノードをリターンする
            return this._del(k);
        }
        // 合致するオブジェクトが無いとき
        return undefined;
        
        function find(e, i) {
            if(this._delFunc(e) === obj){
                k = i;
                return true;
            }
            return false;
        }
    };
    /**
     * 最小値を返却する（登録データは変更しない）
     * 
     * @memberOf Util.Heap
     * @return {Object|undefined} 最小値
     */
    Heap.prototype.top = function() {
        return this._heap[0];
    };
    /**
     * ヒープのサイズを返却する
     * 
     * @memberOf Util.Heap
     * @return {Number} ヒープサイズ（0以上）
     */
    Heap.prototype.size = function() {
        return this._heap.length;
    };
    
    /* new */
    return Heap;
}());
