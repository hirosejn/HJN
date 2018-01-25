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


/**
 * @class
 * @classdesc タッチパネル用ツール
 *            <p>
 *            参考 {@https://code.i-harness.com/ja/q/4f2389}
 * 
 * @param {Number}
 *            [average=0.5] 平均値
 * @example var r = HJN.util.TouchPanel(10), val = r.exponential();
 */
HJN.util.TouchPanel = (function() { // #56
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
     * @memberof HJN.util.TouchPanel
     * @return {String} 先に検出したイベントがマウス移動のとき false、以外のときtrue
     * 
     */
    TouchPanel.isTouchableDevice = function() {
        HJN.util.Logger.ShowText([TouchPanel._deviceType]);
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
     * @memberof HJN.util.TouchPanel
     * @param {Object}
     *            element 対象dom要素
     * @param {Boolean}
     *            [isStopTouch=false] 元のタッチのデフォルトイベントを消すか（個別に登録されているリスナーには無関係）
     * 
     * @example HJN.util.DispatchEventTouchToMouse();
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
 * 
 * @param {String}
 *            str
 * @param {Object|String}
 *            [conf={YYYY: 0, MM: 5, DD: 8, hh: 11, mm: 14, ss: 17, ppp: 20}]
 *            Object指定のとき：年月日時分秒ミリ秒の先頭位置を示す構造体オブジェクト<br>
 *            String指定とき：フォーマットを示す文字列<br>
 *            デフォルト値は、"YYYY/MM/DD hh:mm:ss.ppp"相当
 * @return {Number} timeNum 日時（１ミリ秒を１とする数値、エラーのときNumber.NaN）
 */
HJN.util.S2D = function(str, conf){ // #34
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
 * @param {Date}
 *            dt Date型（内部実装はミリ秒単位）
 * @param {String}
 *            str フォーマット yyyy-MM-dd hh:mm:ss.ppp （戻り値で上書きされる）
 * @return {String} str 編集後文字列
 */
HJN.util.DateToString=function() {
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
HJN.util.D2S = function(ds, str, isLocal){ // #60
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
        ret = HJN.util.DateToString(datetime, str);
    } else if (ds < 1000) { // 自動で1秒(1000)未満のとき
        ret = "0." + Math.round(ds);
    } else if (ds < 60000) { // 自動で1分(1*60*1000)未満のとき
        ret = HJN.util.DateToString(datetime, "ss.ppp");
    } else if (ds < 3600000) { // 自動で1分以上、1時間(1*60*60*1000)未満のとき
        ret = "0:" + HJN.util.DateToString(datetime, "mm:ss.ppp");
    } else if (ds < 86400000) { // 自動で1時間以上、1日(1*24*60*60*1000)未満のとき
        ret = HJN.util.DateToString(datetime, "hh:mm:ss");
    } else { // 自動で1日以上のとき
        ret = Math.floor(ds / 86400000) + " ";
        ret += HJN.util.DateToString(datetime, "hh:mm:ss");
    }
    return minus + ret;
};

/**
 * 数値(Ｙ軸用）から、誤差のない表示用文字列を取得する<br>
 * （hover、legendなどでY軸の値を使うときに使用する）
 * 
 * @param {Number|Date}
 *            y 時刻をUNIX経過時間（ミリ秒）で表した数値、もしくはDate(日付）
 * @return {String} str 編集後文字列
 *         {@linkhttps://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/NumberFormat}
 */
HJN.util.N2S = function(y){
    "use strict";
    return Intl.NumberFormat('en-IN').format(y);
};

/**
 * 文字列を数値に変換する
 * 
 * @param {String|Number}
 *            [str = sub] 計算式（日時分秒ミリ秒(d,h,mim,sec,ms)の文字は、ミリ秒に変換する）
 * @param {String|Number}
 *            [sub] 第一引数が指定されていない(undefined)ときの代用
 * @return {Number} n eval(str||sub)で取得した数値
 * 
 */
HJN.util.S2N = function(str, sub){ // #53
    "use strict";
    var s = (typeof(str) !== "undefined") ? str : sub;
    var h = 3600000; // 1時間（ミリ秒）
    var min = 60000; // 1分（ミリ秒）
    var sec =  1000; // 1秒（ミリ秒）
    var ms =      1; // 1ミリ秒

    return eval(s);
};


/**
 * @class
 * @classdesc キャッシュ
 *            <p>
 *            キャッシュを保持させるオブジェクト
 * @param {Number}
 *            [size=10] キャッシュ最大件数（未対応機能、設定は無視される）
 */
HJN.util.Cash = (function() {
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
     * @memberof HJN.util.Cash
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
     * @memberof HJN.util.Cash
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
     * @memberof HJN.util.Cash
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
     * @memberof HJN.util.Cash
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
     * @memberof HJN.util.Cash
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
     * @memberof HJN.util.Cash
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
 * @class
 * @classdesc 非同期化
 * 
 * @param {function}
 *            global 非同期化して実行する関数
 *            <p>
 *            参考 {@link https://jsfiddle.net/kou/j73tLum4/8/}
 *            {@link https://gist.github.com/mathiasbynens/579895}
 *            {@link http://dbaron.org/log/20100309-faster-timeouts}
 */
HJN.util.setZeroTimeout = (function(global) {
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
 * @class
 * @classdesc ロガー
 *            <p>
 *            モードに応じたログを出力する。画面ログ表示領域、コンソールログへの出力に対応
 * 
 * @param {String}
 *            [mode=0] ログ出力モード
 */
HJN.util.Logger = (function() { // #27
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
     * @memberof HJN.util.Logger
     * @param {Number}
     *            i 参考番号<br>
     *            経過時間内のループ回数などの表示に使用することを想定
     * @param {String}
     *            text ログ出力文字列
     */
    Logger.ByInterval = function(i, text) {
        var ts = new Date(),
            freq = 60000;   // 1分毎
        if (freq < ts - HJN.util.Logger._logtime){
            var t = HJN.util.D2S(ts, "hh:mm:ss.ppp"); // #60
            console.log(t + "[" + i + "]~~~~" + text);
            HJN.util.Logger._logtime = ts;
        }
    };
    /**
     * ログ出力： ログテキストを初期化する
     * 
     * @memberof HJN.util.Logger
     * @param {String}
     *            text ログ出力文字列
     * @param {String}
     *            [type] ログ区分（"calc"：計算用ログ、"msg"：メッセージのみ（タイムスタンプなし））
     */
    Logger.ShowLogTextInit=function(text, type) {
        HJN.util.Logger._timestamp = new Date();
        HJN.util.Logger._logText = [];
        if(text) HJN.util.Logger.ShowLogText(text, type);
    };
    /**
     * ログ出力： ログテキストをテキストアレイに追記し、表示する
     * 
     * @memberof HJN.util.Logger
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
            var lastTimestamp = HJN.util.Logger._timestamp;
            HJN.util.Logger._timestamp = new Date();
            text = (Math.round( HJN.util.Logger._timestamp - lastTimestamp ) / 1000.0)
                    + "s " + text;
            // 数値のカンマ編集（小数部もカンマが入る）
            text = text.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
            text = HJN.util.D2S(HJN.util.Logger._timestamp, "hh:mm:ss.ppp     ")
                    + text; // #60
        }
        HJN.util.Logger._logText.push(text);
        HJN.util.Logger.ShowText(HJN.util.Logger._logText);
        if(true) console.log(text);
    };
    /**
     * 第一引数のテキストアレイの内容を#fileInfoのiframeに表示する
     * 
     * @memberof HJN.util.Logger
     * @param {String}
     *            textArray 出力するログ（配列１行がログ１件）
     */
    Logger.ShowText=function(textArray) {
        var iHtmlBody = "";
        for (var i = textArray.length - 1; 0 <= i; i--){
            iHtmlBody += textArray[i] + "<BR>"; 
        }
        HJN.util.Logger.ShowIHtmlBody('fileInfo',iHtmlBody);
    };
    /**
     * 第一引数のID名のiframeに、第二引数のログ（HTML化）を表示する
     * 
     * @memberof HJN.util.Logger
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
 * @param {Object}
 *            elementID textareaのID名
 */
HJN.util.CopyToClipboard = function(elementId) { // #61
    "usestrict";
    // textareaをクリップボードにコピーする
    var area = document.getElementById(elementId);
    area.select();
    document.execCommand("copy");
}

/**
 * @class
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
 * @example i=HJN.util.binarySearch(x,arrXY,function(e){return e.x;});
 */
HJN.util.binarySearch = function (val, arr, func, low, high, isEqual) {
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
 * @class
 * @classdesc 期間指定eTat取得用Map
 *            <p>
 *            指定期間に動いているeTatの一覧を、高速に取得するマップ
 * 
 * @param {ETAT}
 *            eTat インデックスを追加するETAT
 * @example eTat.tatMap = new HJN.util.MappedETat(eTat); var trans =
 *          eTat.tatMap.search(x, x, 1000);
 */
HJN.util.MappedETat = (function() { // #18
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
        this._tatMap = new HJN.util.MappedArray(eTat, this._getKey, true);
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
     * @memberof HJN.util.MappedETat
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
 * @class
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
 * @example _tatMap = new HJN.util.MappedArray(eTat, this._getKey, true);
 */
HJN.util.MappedArray = (function() {    // #18
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
     * @memberof HJN.util.MappedArray
     */
    MappedArray.prototype.has = function (keyValue) {
        return keyValue in this._map;
    };
    /**
     * 該当位置を配列で返す
     * 
     * @memberof HJN.util.MappedArray
     */
    MappedArray.prototype.indexes = function (keyValue) {
        return this._map[keyValue] || [];
    };
    /**
     * 該当する要素を配列で返す
     * 
     * @memberof HJN.util.MappedArray
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
     * @memberof HJN.util.MappedArray
     */
    MappedArray.prototype.indexOf = function (keyValue) {
        var idxArr = this._map[keyValue],
            i = idxArr ? idxArr.length : -1;
        return (0 < i) ? idxArr[0] : -1;
    };
    /**
     * Array.prototype.lastIndexOf() 同等
     * 
     * @memberof HJN.util.MappedArray
     */
    MappedArray.prototype.lastIndexOf = function (keyValue) {
        var idxArr = this._map[keyValue],
            i = idxArr ? idxArr.length : -1;
        return (0 < i) ? idxArr[i-1] : -1;
    };
    
    return MappedArray;
}());


/**
 * @class
 * @classdesc 定数設定機能（設定HTML作成機能付き）
 *            <p>
 *            日時、TATフォーマット指定機能追加用に作成
 * 
 * @param {String}
 *            [prefix=''] 定数の名前空間を一位に指定する文字列、指定しない場合グローバル
 * @param {String}
 *            [ol='ol'] インデント(.nDown() .nUp())に使うHTMLタグ
 * @example this._config = HJN.util.Config("m") // config設定画面定義
 *          .label(null,"------").n() // ラベルを表示し、改行
 *          .name("ENDIAN").label(null,"[endian(long field)]") //key:ENDIAN
 *          .radio(def("ENDIAN_LIL", true), null, "little", true) //表示ラベルと選択時設定値
 *          .radio(def("ENDIAN_BIG", false), null, "big");
 */
HJN.util.Config = (function() { // #24
    "use strict";
    /** @static */
    Config.prototype.__config = {};   // config設定コンテナ
    Config.prototype.__config._onFunctions = {}; // 関数登録用

    /** @constructor */
    function Config(prefix, ol){ 
        if(!(this instanceof Config)) return new Config(prefix, ol);
        this._pre = (prefix || '') + "."; // 各フィールド、要素の名称のプレフィックス(区切り文字".")
        this._ols = ol ? '<' + ol + '>' : '<ol>';   // リストに使用する要素（初期値 ol )
        this._ole = ol ? '</' + ol + '>' : '</ol>';
        this._html = this._ols; // config設定画面のHtml
        this._nameHtml = '';    // HTMLタグの name属性指定
        this._name = '';        // radioのConfig.get用
// this._onFunctions = {}; // onイベント時に呼び出す関数の設定用 #51
    }

    /**
     * HTML要素の値が変更した時に、configに当該要素を登録する
     * 
     * @memberof HJN.util.Config
     */
    Config.on = function(t) {
        if (t.type === "radio") { // radioのとき、nameに対して、選択されたキー値（idからprefixを削除した値）を登録
            this.prototype.__config[t.name] = t.id.substr(t.id.indexOf(".") + 1);
            // on呼出し関数が登録されているとき、登録関数を呼び出す #51
            var func = HJN.util.Config.GetConfig().getFunctionById(t.id); // #59
            if(typeof(func) === "function") func();
        }else if (t.type === "number") {    // numberのとき、idに対する、value(入力値)を数値として登録
            this.prototype.__config[t.id] = +t.value;
        } else {                            // textのとき、idに対する、value(入力値)を登録
            this.prototype.__config[t.id] = t.value;
        }
    };

    /**
     * Configリポジトリ管理インスタンスを取得する
     * 
     * @memberof HJN.util.Config
     */
    Config.GetConfig = function(prefix) { // #59
        return new Config(prefix);
    }
    
    /** @private */
    //

    // public
    /**
     * configに登録されているid(=prefix+key)の設定値を取得する
     * 
     * @memberof HJN.util.Config
     */
    Config.prototype.getObjctById = function(id) {
        return this.__config[id];
    };
    /**
     * configに登録されているkey(prefix補填)の関数を取得する
     * 
     * @memberof HJN.util.Config
     */
    Config.prototype.getFunctionByKey = function(key) { // #59
        return Config.prototype.__config
                ._onFunctions[this._pre + this.getValueByKey(key)];
    };
    /**
     * configの指定Idに登録されている関数を取得する
     * 
     * @memberof HJN.util.Config
     */
    Config.prototype.getFunctionById = function(id) { // #53
        return Config.prototype.__config._onFunctions[id];
    };
    /**
     * configに登録されているkey(prefix補填)の設定値を取得する
     * 
     * @memberof HJN.util.Config
     */
    Config.prototype.getValueByKey = function(key) { 
        return this.getObjctById(this._pre + key);
    };
    /**
     * config設定用HTMLテキストを取得する
     * 
     * @memberof HJN.util.Config
     */
    Config.prototype.getHtml = function() { 
        return this._html + this._ole;
    };
    /**
     * keyに値を設定する
     * 
     * @memberof HJN.util.Config
     */
    Config.prototype.set = function(key, val) { 
        this.value[this._pre + key] = val;
    };
    
    // config作成用 メソッド
    /**
     * 定義＆設定画面作成用機能： 改行
     * 
     * @memberof HJN.util.Config
     */
    Config.prototype.n = function (str) {
        str = str || "";
        this._html += this._ole + str + this._ols;
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： ネスト一つ下げ
     * 
     * @memberof HJN.util.Config
     */
    Config.prototype.nDown = function () {
        this._html += this._ols;
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： ネスト一つ上げ
     * 
     * @memberof HJN.util.Config
     */
    Config.prototype.nUp = function () {
        this._html += this._ole;
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： nameを変更する（radio等の先頭で指定）
     * 
     * @memberof HJN.util.Config
     */
    Config.prototype.name = function (str) {
        this._nameHtml = str ? 'name="' + this._pre + str + '" ' : '';
        this._name = str;
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： ラベル要素(prefix+keyで関連付けるformのid属性となる)
     * 
     * @memberof HJN.util.Config
     */
    Config.prototype.label = function (key, str, attribute) {
        this._html += '<label ' +
                        (key ? 'for="' + this._pre + key + '" ': '') +
                        (attribute || '') + '>' +
                        (str || '') +
                        '</label>\n'; // #51
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： ラベル付された各種入力フォーム
     * 
     * @memberof HJN.util.Config
     */
    Config.prototype.labeledForm = function (key, type, typedAttribute,
                                pLabel, sLabel, val, attribute, check, cssClass) {
        var classStr = (cssClass) ? ' class="' + cssClass + '"' : ''; // #51
        this._html += '<label' + classStr + '>' + // #51
                    (pLabel ? pLabel : '') +
                    '<input type="' +type + '" ' +
                        (typedAttribute || '') + 
                        this._nameHtml +
                        'id="' + this._pre + key + '" '+        // idがユニークになるようkeyにprefixを付与
                        'onchange="HJN.util.Config.on(this);" ' +
                        (val ? 'value="' + val + '" ' : '') +   // val は、キー値のまま
                        (attribute || '') + 
                        (check ? ' checked="checked;"' : '') +
                    '>' +
                    (sLabel ? sLabel : '') +
                    '</label>\n'; // #51
        // デフォルト指定があるとき configにデフォルト値を設定する
        if (type === "radio" && check) {    // radioのとき、nameに対して、選択状態のkeyを登録
            Config.prototype.__config[this._pre + this._name] = key;
        } else if (type === "number") { // numberradioのとき、keyに対する、val(入力値)を数値として登録
            Config.prototype.__config[this._pre + key] = +val;
        } else {    // text,numberのとき、keyに対する、val(入力値)を登録
            Config.prototype.__config[this._pre + key] = val;
        }
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： テキストボックス要素で、文字列を設定
     * 
     * @memberof HJN.util.Config
     */
    Config.prototype.number = function (key, pLabel, sLabel, val, attribute) {
        Config.prototype.labeledForm.call(this, key, "number", "", 
                                pLabel, sLabel, val, attribute);
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： テキストボックス要素で、数値を設定
     * 
     * @memberof HJN.util.Config
     */
    Config.prototype.text = function (key, pLabel, sLabel, val, attribute) {
        Config.prototype.labeledForm.call(this, key, "text", "", 
                                pLabel, sLabel, val, attribute);
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： ラジオボタン要素で、選択肢の一つを設定
     * 
     * @memberof HJN.util.Config
     */
    Config.prototype.radio = function (key, pLabel, sLabel, check, attribute, func) {
        Config.prototype.labeledForm.call(this, key, "radio", (check ? 'checked="checked;"' : ''),
                                pLabel, sLabel, "", attribute, check, "hjnLabel4Input");
        // 関数登録指定時、attributeを関数名として、指定関数を登録する #51
        if (func){
            Config.prototype.__config._onFunctions[this._pre + key] = func;
        }
        return this;
    };

    /* new */
    return Config;
}());


/**
 * @class
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
 * @example h = HJN.util.Heap( function(obj){ return +obj; } );<br>
 *          h.push("12.34") // データを登録する ;<br>
 *          h.push(0.12) // ;<br>
 *          h.pop() // => 0.12 最小値のオブジェクトを取り出す ;<br>
 *          h.pop() // => "12.34" ;<br>
 *          h.top() // =>undefined 最小値のオブジェクト ;<br>
 *          h.size() // =>0 登録オブジェクト数
 */
HJN.util.Heap = (function() { // #55
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
     * @memberof HJN.util.Heap
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
     * @memberof HJN.util.Heap
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
     * @memberof HJN.util.Heap
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
     * @memberof HJN.util.Heap
     * @return {Object|undefined} 最小値
     */
    Heap.prototype.top = function() {
        return this._heap[0];
    };
    /**
     * ヒープのサイズを返却する
     * 
     * @memberof HJN.util.Heap
     * @return {Number} ヒープサイズ（0以上）
     */
    Heap.prototype.size = function() {
        return this._heap.length;
    };
    
    /* new */
    return Heap;
}());


/**
 * @class
 * @classdesc Random 乱数取得
 *            <p>
 *            ある事象の単位時間あたりの発生回数がポアソン分布, その発生間隔が指数分布に従う<br>
 *            M/M/1モデルは、到着がポアソン過程となり、(したがって到着間隔は指数分布に従う)、サービス時間が指数分布に従う
 *            <p>
 *            参考 {@link http://www.ishikawa-lab.com/montecarlo/4shou.html}
 * 
 * @param {Number}
 *            [average=0.5] 平均値
 * @example var r = HJN.util.Random(10), val = r.exponential();
 */
HJN.util.Random = (function() { // #56
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
     * @memberof HJN.util.Random
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
     * @memberof HJN.util.Random
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
     * @memberof HJN.util.Random
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
 * @class
 * @classdesc 仮想システム(VirtualSystem)
 *            <p>
 *            Web3層(Web-AP-DB)をシミュレートしたWebのTATログ生成する
 *            <p>
 *            Webサーバ<br>
 *            最大スレッド数： Apache 2.4 [MaxClients = 1024]<br>
 *            JBossトランザクションタイムアウト [default-timeout = 300 秒]<br>
 *            キュー長 ： Apache 2.4 ListenBackLog (511) + Linux
 *            tcp_max_syn_backlog(769=1024*0.75+1)、タイムアウトなし<br>
 *            APサーバ<br>
 *            最大スレッド数(maxThreads)<br>
 *            JBossトランザクションタイムアウト [default-timeout=300 秒]<br>
 *            DBサーバ 最大コネクション数(max_connections)
 * 
 * @param {Number}
 *            [start = 1970/01/02 00:00:00)] シミュレート開始時刻（UNIX日付（ミリ秒））
 * @param {Number}
 *            [end = startの24時間後] シミュレート終了時刻（UNIX日付（ミリ秒））
 * @param {String}
 *            [resourcesJson] リソース指定JSONテキスト
 * @param {Boolean}
 *            [log=false] 詳細ログ出力有無
 * @example sim = HJN.util.VirtualSystem()
 */
HJN.util.VirtualSystem = (function() { // #53
    "use strict";
    /** @constructor */
    function VirtualSystem(start, end, resourcesJson, log){
        if(!(this instanceof VirtualSystem)){
            return new VirtualSystem(start, end, resourcesJson, log);
        }
        if (!resourcesJson) {
            var jsonText =  '['
                +   '{"type" :"WEB","thread":1024,"timeout":300000, "q":1280, "qWait":0},'
                +   '{"type" :"AP", "thread":20,  "timeout":300000, "q":1280, "qWait":0},'
                +   '{"type" :"DB", "thread":2,   "timeout": 10000, "q":1000, "qWait":10000}'
                + ']';
            resourcesJson = JSON.parse(jsonText);
        }
        this.eTat = []; // シミュレートにより生成するTATログ出力先
        var _resources = resourcesJson;
        this._log = log ? log : false; // #53
        this._start = +start || new Date(1970, 1, 2);   // シミュレート開始時刻
        this._end = end || this._start + 24*60*60*1000; // シミュレート終了時刻（デフォルト：24時間後)
        this._simulator = HJN.util.Heap(                // イベント予約スケジュール（ヒープ）
                function(obj){ return obj.getTime(); }, // プライオリティの判定
                function(obj){ return obj; });  // 削除対象の判定 #61
        this._now = 0; // シミュレーション時の現在時刻
        // リソースを設定する
        this._resources = {}
        for (var i = 0; i < _resources.length; i++) {
            var e = _resources[i];
            e.log = e.log ? e.log : this._log; // #53
            this._resources[e.type] = HJN.util.VirtualResource(this, // #61
                    e.type, e.thread, e.timeout, e.q, e.qWait, e.log);
        };
        HJN.util.VirtualSystem.debug = this; // ★
    }

    /** @private */
    //

    // public
    /**
     * 仮想クライアントをスケジューラに登録する
     * 
     * @memberof HJN.util.VirtualSystem
     * @param {String}
     *            [userName = "Default_"] ログに出力するユーザ名
     * @param {String}
     *            [message = ""] ログの末尾に出力するデータ
     * @param {Number}
     *            [num = 3] 期間内に生成する仮想クライアントの数
     * @param {Number}
     *            [start = HJN.util.S2D("1970/01/02 00:00:00")]
     *            仮想クライアント生成開始時刻（UNIX時刻の数値、ミリ秒）
     * @param {Number}
     *            [end = startの0.1秒後] 仮想アプリケーション強制終了時刻（UNIX時刻の数値、ミリ秒）
     * @param {Object}
     *            model 仮想クライアントが実行する取引モデル
     */
    VirtualSystem.prototype.setClients = function(userName, message, num, start, end, model) {
        userName = userName || "Default_";
        message = message || "";
        num = (typeof(num) === "number") ? num : 1; // #61
        start = +start || HJN.util.S2D("1970/01/02 00:00:00");
        end = +end || start + 100;
        // baseModelが指定されているとき、modelに展開する
        if (model.baseModel){
            model = HJN.util.VirtualSystem.getModel(
                model.baseModel.holds, model.baseModel.tatMin, model.baseModel.tat,
                model.sequence, model.times, model.thinkTimeMin, model.thinkTime);
        }
        // modelにmessageを設定する
        if (typeof(model.message) === "string") {
            model.message += message;
        } else {
            model.message = message;
        }
        // 仮想APを登録する
        var checkStart = start;
        var r = HJN.util.Random((end - start) / num);
        var t = start;
        for (var i = 0; i < num; i++) {
            // 仮想APを作成する
            var vApp = HJN.util.VirtualApp(userName + i, model);
            // 仮想APに開始時刻（指数分布）を設定し、登録する
            t += Math.round(r.exponential());
            this.setEvent(vApp.start(t));
        }
    };
    
    /**
     * イベントをスケジューラに登録する
     * 
     * @memberof HJN.util.VirtualSystem
     * @param {Object}
     *            event 仮想クライアントもしくは仮想リソースのイベント
     */
    VirtualSystem.prototype.setEvent = function(event) {
        this._simulator.push(event);
    }

    /**
     * スケジューラからイベントを削除する
     * 
     * @memberof HJN.util.VirtualSystem
     * @param {Object}
     *            event 仮想クライアントもしくは仮想リソースのイベント
     */
    VirtualSystem.prototype.removeEvent = function(event) {
        this._simulator.del(event);
    }

    /**
     * シミュレーションを実行する
     * 
     * @memberof HJN.util.VirtualSystem
     * @return {eTat} シミュレート実行結果のログ（this.eTat）
     */
    VirtualSystem.prototype.execute = function() {
        var event, events;
        // 処理対象がなくなるか、シミュレート終了時刻になるまでシミュレートする
        while(0 < this._simulator.size() &&
                this._simulator.top().getTime() <= this._end ) {
            // 次にイベントを迎える仮想APを取り出し、「次の処理」をシミュレートする
            event = this._simulator.pop();
            this._now = event.getTime(); // #59
            events = event.next(this);
            // 「次の処理」のシミュレートに伴い発生したイベントを、スケジュールする
            while (events.length) {
                this._simulator.push(events.pop());
            }
        }
        // シミュレーション終了後処理（処理中のvAppを強制終了する） #59
        while(0 < this._simulator.size()){
            event = this._simulator.pop();
            if (event._finish) {
                event._finish(this, "N_EoS", "", this._end);
            }
        }
        // シミュレーション終了後処理（リソース開放待ちのvAppを強制終了する） #59
        for (var key in this._resources){
            this._resources[key]._finish(this, "N_EoS", "", this._end);
        }
        
        return this.eTat;
    };

    /**
     * リソースを取得する
     * 
     * @memberof HJN.util.VirtualSystem
     * @param {String}
     *            [name = "unlimited"] 仮想リソース名
     * @return {Object} 仮想リソース（登録されていないときは、新たにholdCapacity=1の仮想リソースを登録）
     */
    VirtualSystem.prototype.getResouce = function(name) {
        if (typeof(this._resources[name]) === "undefined") {
            this._resources[name] = HJN.util.VirtualResource(this, name);
        }
        return this._resources[name];
    };

    /**
     * シミュレーション現在時刻（処理中のイベントの時刻）を返却する
     * 
     * @memberof HJN.util.VirtualSystem
     * @return {Number} イベント時刻（UNIX時刻：ミリ秒）
     */
    VirtualSystem.prototype.getTime = function() {
        return this._now;
    };


    // Static Method
    /**
     * 取引モデルを取得する（ユーティリティ）
     * 
     * @memberof HJN.util.VirtualSystem
     * @param {Array}
     *            [baseModel = []] 使用リソースの一覧["WEB","AP","DB"]
     * @param {Number}
     *            [tat = 5] 使用リソースの平均取得時間＆平均開放時間
     * @param {Number}
     *            [tatMin = 2] 使用リソースの最小取得時間＆最小開放時間
     * @param {Array}
     *            [sequence = []] イベントシーケンス
     * @param {Number}
     *            [times = undefined] イベントシーケンスの繰り返し回数（未指定時:1)
     * @param {Number}
     *            [thinkTime= undefined] イベントシーケンス終了時に再実行する場合の平均再開時間（未指定時:500)
     * @param {Number}
     *            [thinkTimeMin = undefined]
     *            イベントシーケンス終了時に再実行する場合の最小再開時間（未指定時:thinkTimeと同じ）
     * @param {String}
     *            [message = ""] 自動生成ログの末尾に追加する文字列
     * @return {Object} 取引モデル
     */
    VirtualSystem.getModel = function(baseModel, tatMin, tat, sequence, times, thinkTimeMin, thinkTime, message) {
        baseModel = baseModel || [];
        tatMin = tatMin || 2;
        tat = tat || 5;
        message = message || "";
        sequence = sequence || [
                {tatMin:6,   tat:15,  note:"Req",     hold:"DB",    free:[]},
                {tatMin:70,  tat:100, note:"selectA", hold:"TBL_A", free:["TBL_A"]},
                {tatMin:150, tat:200, note:"updateB", hold:"TBL_B", free:[]},
                {tatMin:30,   tat:50,  note:"Res",     hold:"",      free:["TBL_B","DB"]}
            ];
        var model = {sequence :[], message : message}; // 戻り値
        if (typeof(times) === "number") model.times = times;
        if (typeof(thinkTimeMin) === "number") model.thinkTimeMin = thinkTimeMin;
        if (typeof(thinkTime) === "number") model.thinkTime = thinkTime;
        
        // baseModelを返却用シーケンスに展開する
        baseModel.forEach( function(e) {
            model.sequence.push({hold:e, tatMin:tatMin, tat:tat, free:[]});
        });
        // 指定シーケンスを返却用シーケンスに追加する
        model.sequence = model.sequence.concat(sequence);

        // 返却用シーケンスに、holdingを追加するとともにシーケンス終了時未開放リソースを取得する
        var resources = []; // #61
        var holding = []; // #59
        model.sequence.forEach( function(tran) { // #61
            // tatMinがtatより大きいとき、tatをtatMin一定とする #59
            if (tran.tat < tran.tatMin) tran.tat = tran.tatMin;
            // 処理開始時にholdしているリソース一覧をholdingに登録する #59
            tran.holding = [];
            resources.forEach(function(r) {tran.holding.push(r)});
            // 未開放リソース一覧を更新する
            if (typeof(tran.hold) !== "undefined" && tran.hold !== "") {
                resources.push(tran.hold);                
            }
            if (tran.free) {
                tran.free.forEach( function(free){
                    resources.some( function(r, i){
                        if (r == free) {
                            resources.splice(i,1);
                            return true;
                        }
                    })    
                })
            }
        }, this);
        // シーケンス終了時未開放リソースが残っているとき、返却用シーケンスにリソース開放処理を追加する
        if (0 < resources.length){
            model.sequence = model.sequence.concat(
                    [{hold: "", tatMin: tatMin * baseModel.length, tat: tat * baseModel.length,
                        free: resources.reverse()}]);
        }
        return model;
    };
    
    /* new */
    return VirtualSystem;
}());


/**
 * @class
 * @classdesc 仮想アプリケーション(VirtualApp)
 * 
 * @param {String}
 *            [userName = "dafault"] ログに出力するユーザ名
 * @param {Array}
 *            [sequence = SQL３個のオン処理] 取引の処理シーケンスを格納した配列
 * @param {Number}
 *            [times = 2 回] 繰返し回数
 * @param {Number}
 *            [thinkTime = 300 ms] 繰返し時の次回処理開始までの平均時間(ミリ秒）
 */
HJN.util.VirtualApp = (function() { // #53
    "use strict";
    /** @constructor */
    function VirtualApp(userName, model){
        if(!(this instanceof VirtualApp)){
            return new VirtualApp(userName, model);
        }
        this._userName = userName || "default"; // ログ出力テキスト
        // 定数の設定
        // イベントシーケンスを取得する
        if (typeof(model) === "undefined") model = {}
        model.baseModel = model.baseModel || {"holds": []};
        this._sequence = model.sequence;
        // イベントシーケンスの繰り返し回数
        this._times = (typeof(model.times) !== "undefined") ? model.times : 1;
        // イベントシーケンス終了時に再実行する場合の平均再開時間
        this._thinkTime = Math.max(0,
                (typeof(model.thinkTime) !== "undefined") ? model.thinkTime : 500);
        // イベントシーケンス終了時に再実行する場合の最小再開時間
        this._thinkTimeMin = Math.max(0,
                (typeof(model.thinkTimeMin) !== "undefined") ? model.thinkTimeMin : 500);
        // メッセージ（ログ末尾に付与する文字列）
        this._baseMessage = model.message + "\n";
        this._message = "";
        this._history = []; // #62

        // 変数の設定
        this._startTime = Number.MIN_SAFE_INTEGER; // イベントシーケンス開始時刻（UNIX時刻：ミリ秒）
        this._sequenceTime = Number.MIN_SAFE_INTEGER; // シミュレータに登録したイベントの時刻（現在時刻）
        this._sequenceIdx = 0;    // シミュレータに登録したイベントシーケンスの位置
    }

    /** @private */
    //

    // public

    
    /**
     * シミュレータのログを出力する
     * 
     * @memberof HJN.util.VirtualApp
     * @param {Number}
     *            logLv ログレベル（isLog <= logLvのときログ出力する）<br>
     *            (0:なし, 1:エラー時のみ, 2:+ETAT, 3:+push/pop, 4:+HOLD/FREE)
     * @param {boolean}
     *            isLog ログ出力レベル
     * @param {Number}
     *            time 日時を表す数値（ミリ秒）
     * @param {Object}
     *            vApp 仮想アプリ
     * @param {Object}
     *            resource リソース
     * @param {String}
     *            text ログテキスト
     * @param {String}
     *            highText 強調表示テキスト
     */
    VirtualApp.prototype.logger = function(logLv, isLog, time, vApp, resource, text, highText) {
        // 0:なしの時
        if (!isLog) return;
        var errCode = 0;
        if (resource && (resource._holdHeap.size() !== resource._holdingQty)) {
            // エラー時★
            errCode = 1;
            highText = highText ? highText + "　unkown error!!" : "　unkown error!!";
        } else if (logLv > +isLog) {
            return; 
        }
        
        // エラーログ編集
        var user = vApp ? " " + vApp._userName : " ";
        var resourceText = resource ? (" [" + resource._name + " wait:"
                + resource._waitHeap.size() + "hold:"
                + resource._holdHeap.size() + "="
                + resource._holdingQty + " qty] ") : " ";
        text = text || "";
        var logText = HJN.util.D2S(this.getTime(),"hh:mm:ss.ppp",true) 
                    + user +"(" + this._times + "-" + this._sequenceIdx + ")"
                    + resourceText 
                    + text;
        highText = highText || "";

        // エラー時の強制補正★
        var modify = "";
        if (errCode === 1) { // リソースヒープもしくはリソース量を強制補正する
            var deleted = undefined;
            if (resource._holdHeap.size() < resource._holdingQty) {
                deleted = resource._holdHeap.del(this);
            }
            if (deleted){
                modify = "FORCE★: holdHeap.del(" + deleted.userName + ")";
            } else {
                modify = "FORCE★: holdingQty modified"
                    resource._holdingQty = resource._holdHeap.size();
            }
        }
                
        // エラーログ出力
        if (highText || modify){
            console.log(logText + " %o", highText + " " + modify);
        } else {
            console.log(logText);
        }
    }

    /**
     * 取引を開始する
     * 
     * @memberof HJN.util.VirtualApp
     * @param {Number}
     *            startTime 開始時刻（UNIX時刻：ミリ秒）
     * @return {Object}仮想アプリケーション(this)
     */
    VirtualApp.prototype.start = function(startTime) {
        this._times--; // イベントシーケンスの繰り返し回数を1減らす
        this._sequenceIdx = 0;    // シミュレータに登録したイベントシーケンスの位置
        this._startTime = startTime;      // イベントシーケンス開始時刻（UNIX時刻：ミリ秒）
        this._sequenceTime = startTime;   // シミュレータに登録したイベントの時刻
        this._message = this._baseMessage; // ログ末尾に出力する文字列の初期化
        this._history = []; // ログ末尾に出力する状態遷移履歴情報の初期化 #62
        this.addHistory("start");
        return this;
    };

    /**
     * イベント時刻を返却する
     * 
     * @memberof HJN.util.VirtualApp
     * @return {Number} イベント時刻（UNIX時刻：ミリ秒）
     */
    VirtualApp.prototype.getTime = function() {
        return this._sequenceTime;
    };

    /**
     * リソース使用量を返却する
     * 
     * @memberof HJN.util.VirtualApp
     * @param {Object}
     *            [resource| 指定なしのとき1.0を返却する] リソース
     * @return {Number} リソース使用量
     */
    VirtualApp.prototype.getAmount = function(resource) {
        return 1.0;
    };

    /**
     * 次の状態に遷移する、シーケンス終了時TATログを出力する
     * 
     * @memberof HJN.util.VirtualApp
     * @param {Object}
     *            system VirtualSystem
     * @return {Array}再スケジュールするイベント（仮想アプリケーションorリソース）の配列、登録処理完了時はthisを含まない
     */
    VirtualApp.prototype.next = function(system) {
        this.logger(4, system._log, system.getTime(), this, undefined, 'NEXT', undefined);
        var events = []; // 戻り値
        var ret = {result: true, events: [this]};
        
        if (this._sequenceIdx < this._sequence.length) { // イベントシーケンス処理途中のとき
            var seq = this._sequence[this._sequenceIdx]; // 現在の処理シーケンス位置
            // holdリソースを取得する
            if (seq.hold && seq.hold !== "") {
                // holdリソースが指定されているとき、指定リソースを確保する（確保できたとき[this]が戻り値）
                ret = system.getResouce(seq.hold).hold(system, this); // #61
                events = ret.events;
            } else {
                // holdリソースが指定されていないとき、無条件に自身をスケジュール対象に加える
                events = [this];
            }
            // リソースを確保できたとき、該当シーケンスを完了させる
            if (0 < events.length && (0 <= this._times) && ret.result) { // #61
                // 完了した処理の処理時間を加える
                var tatAdd = Math.ceil(HJN.util.Random().exponential(seq.tat - seq.tatMin));
                this.setSequenceTime(this._sequenceTime += seq.tatMin + tatAdd, seq.hold); // #61
                // シーケンスのfreeで指定されているリソースの解放
                if (seq.free) {
                    for (var i = 0; i < seq.free.length; i++) {
                        events = events.concat(system.getResouce(seq.free[i]).free(this));
                    }
                }
                // 次の処理を参照する（ シミュレータに登録したイベントシーケンスの位置）
                this._sequenceIdx++;
            }
            return events;
        }
        
        // イベントシーケンスを終えたときTATログを出力する(this._sequenceIdx >= this._sequence.length)
        var vApp = this._finish(system, "N_000");
        // シーケンスをstart状態に設定する
        // this._sequenceTime = system.getTime(); はfinishで更新されるので不可
        // this._startTime = this._sequenceTime; finishで設定する
        // 繰返し処理を継続する場合、自アプリケーションを再スケジュールする
        if (vApp) {
            events.push(this);
        }
        return events;
    };

    /**
     * Freeに伴い、次の状態に遷移する
     * 
     * @memberof HJN.util.VirtualApp
     * @param {Number}
     *            [time | 変更しない} イベント時刻（UNIX時刻：ミリ秒）
     * @param {String}
     *            status ログに追記する時刻設定理由文字列
     * @return {Object} 仮想アプリケーション(this)
     */
    VirtualApp.prototype.setSequenceTime = function(time, status) {
        status = status || ""; 
        // 解放された時刻をイベント時刻に設定する
        this._sequenceTime = time;
        // ログに状態遷移履歴を追記する
        return this.addHistory(status);
    };

    /**
     * ログにステータス変更履歴を追記する
     * 
     * @memberof HJN.util.VirtualApp
     * @param {String}
     *            status ログに追記する状態遷移の理由文字列
     * @param {Number}
     *            time 状態遷移時刻（ミリ秒）
     * @return {Object} 仮想アプリケーション(this)
     */
    VirtualApp.prototype.addHistory = function(status, time) {
// var timeStr = "";
// if (typeof(time) === "number") {
// timeStr = HJN.util.D2S(time, "mm:ss.ppp", true) + " seq:"
// }
// this._message += " [" + this._sequenceIdx + ":" + status + "]" // #61
// + timeStr + HJN.util.D2S(this._sequenceTime, "mm:ss.ppp", true);
        // 状態遷移履歴（ログ出力用）を追加する
        this._history.push({ // #62
            sequenceIdx : this._sequenceIdx,
            status : status,
            time : time,
            sequenceTime : this._sequenceTime
        });
        return this;
    };
    
    /**
     * アベンド処理（holdしている可能性のあるリソースを解放し、イベントシーケンスを強制終了する）
     * 
     * @memberof HJN.util.VirtualApp
     * @param {Object}
     *            system VirtualSystem
     * @param {Object}
     *            holdedResource アベンドさせたVirtualResource
     * @param {String}
     *            [logID="E_600"] ログID
     * @param {String}
     *            [logMesseage=""] ログメッセージ
     * @param {Boolean}
     *            [isHolding=true] リソース(holdedResource)をholdしているか否か<br>
     * @param {Number}
     *            [abendTime=sytem.getTime()] abend時刻
     * @return {Array}再スケジュールするイベント（仮想アプリケーションorリソース）の配列、登録処理完了時はthisを含まない
     */
    VirtualApp.prototype.abend = function(system, holdedResource, 
                                    logID, logMesseage, isHolding, abendTime) {
        logID = logID || "E_600";
        abendTime = abendTime || system.getTime();
        isHolding = (typeof(isHolding) === "boolean") ? isHolding : true; // #61
        var events = []; // 戻り値
        this.logger(3, system._log, this._sequenceTime, this, holdedResource, 'abend', undefined);
        var seq = this._sequence[this._sequenceIdx];
        // 現在のシーケンスでholdするリソースがあるとき、waitしている可能性があるため、waitから削除する
        if (seq && seq.hold) { // #61
            system._resources[seq.hold].release(this);
        }
        // holdingリソースを開放する
        var holdings;
        // シーケンスから、holdingリソース一覧を取得する #59
        if (seq) holdings = seq.holding;
        if (holdings) { // シーケンス上holdingリソースがあるとき(undefined対策） #61
            for (var i = holdings.length - 1; 0 <= i; i--) { // #61
                // holdedResourceは削除処理対象外（呼び出し元リソースは、呼び出し前に削除済なので）
                if (holdings[i] !== holdedResource._name || isHolding){ // #61
                    // holdingリソースを開放し、使用リソース減に伴って新たにスケジュールするvAppを取得 #59
                    events = events.concat(system._resources[holdings[i]].free(this));
                }
            }
        }
        // イベントシーケンスを強制終了する
        this.setSequenceTime(abendTime, logID); // #59
        var vApp = this._finish(system, logID, logMesseage);
        // 自vAppに継続処理があれば、自vAppをスケジュール対象に加える
        if (vApp && (0 <= this._times)) { // #61
            events = events.concat([vApp]);
        }
        return events;
    };
    
    /**
     * イベント終了時処理（ログ出力と、繰り返し判定）
     * 
     * @memberof HJN.util.VirtualApp
     * @param {Object}
     *            system VirtualSystem
     * @param {String}
     *            [logID="N_000"] ログID（ログメッセージの先頭文字）
     * @param {String}
     *            [logMesseage=""] ログメッセージ
     * @param {Number}
     *            [forceTime] 強制終了時刻を指定する（ミシュレーション停止後のeTat強制出力用）
     * @return {Object|undefined} 再スケジュールするときthis、再スケジュールしないときundefined
     */
    VirtualApp.prototype._finish = function(system, logID, logMesseage, forceTime) {
        logID = logID || "N__00";
        logMesseage = logMesseage || "";
        var events = []; // 戻り値
        var logText = logID + " " + this._userName + " " + logMesseage + " " + this._message;
        var now = this._sequenceTime;

        // 強制終了時（シミュレーション終了時刻到来時）、自APのシミュレーションを強制終了する
        if (typeof(forceTime) === "number") {
            // 起動済処理はTATログを出力する #59
            if (this._startTime <= forceTime) { 
                // TATログを出力する
                system.eTat.push( { x: forceTime, 
                                    y: Math.round(forceTime - this._startTime),
                                    sTatIdx: 0,
                                    message: logText,
                                    history: this._history} ); // #62
                this.logger(2, system._log, forceTime, this, undefined, 'finish() FORCE"', logText);
            }
            this._sequenceIdx = this._sequence.length; // #61 処理完了状態にする
            this._startTime = this._sequenceTime; // #61 念のため設定
            return undefined;
        }
        
        // 起動済処理はTATログを出力する #59
        if (this._startTime <= now ) { // || this._sequenceIdx ===
                                        // this._sequence.length) {
            system.eTat.push( { x: now,
                                y: Math.round(now - this._startTime),
                                sTatIdx: 0,
                                message: logText,
                                history: this._history} ); // #62
            this.logger(2, system._log, now, this, undefined, 'finish() "', logText);
        } else  {
            this.logger(0, system._log, now, this, undefined,
                    'finish() Unexpected error★ _startTime > _sequenceTime:'
                    + HJN.util.D2S(this._startTime, "hh:mm:ss.ppp", true)
                            + " " + this._startTime + " > " + now
                            + " Idx:" + this._sequenceIdx 
                    , logText);
        }
        this._message = this._baseMessage; // ログ末尾に追加するメッセージの初期化
 
        // 継続判定
        if (0 < this._times) { // イベントシーケンスを繰り返すとき
            // イベント時刻にThink time（指数分布）を加える
            var nextTime = this.getTime() + this._thinkTimeMin;
            if (this._thinkTimeMin < this._thinkTime) {
                nextTime += Math.ceil(Math.abs( // #61
                        HJN.util.Random().exponential(this._thinkTime - this._thinkTimeMin)));
            }
            // 処理の先頭に戻る
            return this.start(nextTime);
        }
        // イベントシーケンスを継続しない時(this._times < 0)
        this._times--;       // イベントシーケンスの繰り返し回数を1減らす
        this._sequenceIdx = this._sequence.length; // #61 処理完了状態にする
        this._startTime = this._sequenceTime; // #61
        return undefined;
    };

    /* new */
    return VirtualApp;
}());

/**
 * @class
 * @classdesc 仮想リソース(VirtualResource)
 * 
 * @param {Object}
 *            system 仮想システム（シミュレーション中の現在時刻取得等に用いる）
 * @param {String}
 *            [name = "unlimited"] リソース名（"unlimited"はリソース解放待ちを管理しない）
 * @param {Number}
 *            [holdCapacity = 1.0] 保有リソース総量（数）
 * @param {Number}
 *            [timeout = 10秒] 処理のタイムアウト時間（未使用）
 * @param {Number}
 *            [waitCapacity = Number.MAX_SAFE_INTEGER]
 *            リソース取得待ちキューの深さ（数）、キュー溢れ時は即時エラー終了しリソース処理しない
 * @param {Number}
 *            [queueWait = 10秒] 最大キュー滞留時間（リソース取得待ちタイムアウト時間）
 * @param {Boolean}
 *            [log=false] 詳細ログ出力有無
 */
HJN.util.VirtualResource = (function() { // #53
    "use strict";
    /** @constructor */
    function VirtualResource(system, name,
                        holdCapacity, timeout, waitCapacity, queueWait, log){
        if(!(this instanceof VirtualResource)){
            return new VirtualResource(system, name,
                        holdCapacity, timeout, waitCapacity, queueWait, log);
        }
        this._system = system;
        this._name = name || "unlimited";
        this._log = log ? +log : 0; // #59

        // 処理待ち管理用
        this._waitTimeout = (typeof(queueWait) !== "undefined")
                                ? queueWait : 10000;   // キュー滞留時間上限
        this._waitCapacity  = (typeof(waitCapacity) !== "undefined")
                                ? waitCapacity : Number.MAX_SAFE_INTEGER; // キューの深さ
        this._waitHeap = HJN.util.Heap(    // リソース解放待ちキュー（登録時間順）
                function(obj){ return obj.getTime(); });
        
        // リソース管理用
        this._holdTimeout  = (typeof(timeout)  !== "undefined") 
                                ? timeout : 10000;   // 処理のタイムアウト時間
        this._holdCapacity = (typeof(holdCapacity) !== "undefined")
                                ? holdCapacity : 1.0;   // 保有リソース量（数）
        this._holdingQty = 0;   // 使用リソース量
        this._holdHeap = HJN.util.Heap( // 処理のタイムアウト管理用ヒープ{obj:,val:} #59
                 function(node){ return node.val; }, // valはタイムアウト時刻
                 function(node){ return node.obj; }); // objはvApp
        
        // イベントスケジュール制御用
        this._sequenceTime = 0;   // シミュレータに登録したイベントの時刻（タイムアウトチェック用）
        this._isScheduled = false; // シミュレータにタイムアウトチェックイベントをスケジュールしたか
        if (0 < this._waitTimeout && 0 < this._holdTimeout){ // スケジュール間隔 #61
            this._interval = Math.min(this._waitTimeout, this._holdTimeout);
        } else if (0 < this._waitTimeout) {
            this._interval = this._waitTimeout;
        } else if (0 < this._holdTimeout) {
            this._interval = this._holdTimeout;
        } else {
            this._interval = 0;
        }
    }

    /** @private */
    //

    // public
    /**
     * リソースチェックイベント（タイムアウトチェック）を開始する
     * 
     * @memberof HJN.util.VirtualResource
     * @param {Number}
     *            startTime 開始時刻（UNIX時刻：ミリ秒）
     * @param {Object}
     *            system VirtualSystem
     * @return {Object} イベント(this)
     */
    VirtualResource.prototype.start = function(startTime, system) { // #59
        this._sequenceTime = startTime + this._interval; // シミュレータに登録するイベントの時刻
        system.setEvent(this);    // シミュレータにタイムアウトチェックイベントをスケジュールする
        this._isScheduled = true; // 「シミュレータにタイムアウトチェックイベントをスケジュールしたかフラグ」をON
        return this;
    };
    
    /**
     * イベント時刻を返却する
     * 
     * @memberof HJN.util.VirtualResource
     * @return {Number} イベント時刻（UNIX時刻：ミリ秒）
     */
    VirtualResource.prototype.getTime = function() {
        return this._sequenceTime;
    };
    
    /**
     * タイムアウトチェック用仮想イベント
     * 
     * @memberof HJN.util.VirtualResource
     * @param {Object}
     *            system VirtualSystem
     * @return {Array}再スケジュールするイベント（仮想アプリケーションorリソース）の配列、登録処理完了時はthisを含まない
     */
    VirtualResource.prototype.next = function(system) {
        var events = []; // 戻り値
        var now = this.getTime();
        // リソース解放待ち時間がタイムアウトしたappをタイムアウトさせる
        var queuedTime = Number.MIN_SAFE_INTEGER; 
        while (0 < this._waitHeap.size() && this._waitTimeout <= now - queuedTime) {
            queuedTime = this._waitHeap.top().getTime();
            if (this._waitTimeout <= now - queuedTime) { // キューイング取引がタイムアウトしているとき
                // リソース解放待ちHeapからfreeするappを取り出す
                var app = this._waitHeap.pop();
                // appをアベンドさせる(holdリソース解放なし）
                var apps = app.abend(system, this, "E_QTO", this._name + " queue timeout",
                        false, queuedTime + this._waitTimeout); // appにfree時刻をセットする
                // appsをスケジュールイベント登録対象に加える
                if (apps.length){
                    events = events.concat(apps);
                }
            }
        }
        // リソース使用時間がタイムアウトしたappをタイムアウトさせる #59
        var holdTimeoutTime = Number.MIN_SAFE_INTEGER;
        while (0 < this._holdHeap.size() && holdTimeoutTime <= now) {
            var top = this._holdHeap.top();
            holdTimeoutTime = top.val;
            if (holdTimeoutTime <= now) { // 処理中取引がタイムアウトしているとき #61
                var app = top.obj;
                // appがスケジュールされている場合削除する（スケジューラに登録されていない場合何も起きない）
                system.removeEvent(app);
                // appの使用時間がタイムアウトしたリソースを解放する（注：abendで解放させると永久ループする）
                events = events.concat(this.free(app));                
                // appをタイムアウト時刻にアベンドさせる(holdリソース解放を伴う）
                events = events.concat(app.abend(system, this,"E_HTO", 
                            this._name + " hold timeout", false, holdTimeoutTime));
            }
        }
        // 次回タイムアウトチェック時刻を設定する
        if ((0 < this._waitHeap.size()) || (0 < this._holdHeap.size())) {
            // タイムアウトの設定があるとき、 #61
            // リソース解放待ちvAppがあるとき、(タイムアウトしていない)最古vAppのタイムアウト時刻
            // リソース解放待ちvAppがないとき、現在からタイムアウト時刻後 にスケジュールする
            var nextWaitTimeout = Number.MAX_SAFE_INTEGER;
            if (0 < this._waitTimeout) {
                if ( 0 < this._waitHeap.size() 
                        && now <= this._waitTimeout + this._waitHeap.top().getTime()) {
                    nextWaitTimeout = this._waitHeap.top().getTime() + this._waitTimeout; 
                } else {
                    nextWaitTimeout = now + this._waitTimeout;
                }
            }            
            var nextHoldTimeout = Number.MAX_SAFE_INTEGER;
            if (0 < this._holdTimeout) {
                if(0 < this._holdHeap.size()) {
                    nextHoldTimeout = this._holdHeap.top().val;
                } else {
                    nextHoldTimeout = now + this._holdTimeout;
                }
            }
            this._sequenceTime = Math.min(nextWaitTimeout, nextHoldTimeout);
            if (this._sequenceTime < Number.MAX_SAFE_INTEGER) {
                events.push(this); // タイムアウトチェックイベントをケジュールイベント登録対象に加える
            } else {
                this._isScheduled = false;
            }
        } else { 
            // 以外のとき、シミュレータにタイムアウトチェックイベントを再スケジュールしない
            this._isScheduled = false;
        }
        return events;
    };

    /**
     * リソースを取得する
     * 
     * @memberof HJN.util.VirtualResource
     * @param {Object}
     *            system VirtualSystem
     * @param {Object}
     *            vApp リソースにhold要求する仮想AP
     * @return {Objcet} 処理結果{result:boolean, events:Array}<br>
     *         {boolean} result :
     *         true:正常（リソース取得、取得待ち、取得不要）、false:エラー（リソース枯渇E_QOF)）<br>
     *         {Array} :events リソース取得後、スケジューラに登録するイベントの配列<br>
     *         [vApp]： リソースを取得できたとき、もしくはリソース枯渇時でvApp再処理の場合、スケジュール対象の vApp
     *         が登録された配列[vApp]を返却<br>
     *         []： リソース待ちに登録されたとき、既にリソースが管理するスケジューラに登録さているので、空の配列[]を返却<br>
     *         もしくはリソース枯渇時で繰返し完了時、再スケジュールしないので[]を返却
     */
    VirtualResource.prototype.hold = function(system, vApp) {
        var ret = { result : true,
                    events : [vApp] }; // 戻り値 #61
        if (this._name === "unlimited") return ret; // [vApp] リソース解放待ちを管理しないとき
        vApp.logger(4, this._log, vApp._sequenceTime, vApp, this, 'HOLD' , undefined);
        // タイムアウトチェックイベントがスケジュールされていないとき、スケジュールする
        if (!this._isScheduled && (0 < this._interval)) {
            this.start(system.getTime(), system);
        }
        // リソースを取得できるとき、使用リソース量（数）を増やし、実行中処理管理ヒープに登録し、スケジュール対象とする
        var amount = vApp.getAmount(this); // 消費リソース量(デフォルト1.0）
        if (amount <= (this._holdCapacity - this._holdingQty)) {
            // 使用リソースを増やす
            this._holdingQty += amount;
            // タイムアウト管理対象リソースのとき、vAppをタイムアウト管理対象に加える #59
            if (0 < this._holdTimeout) {
                this._holdHeap.push({obj: vApp, val: system.getTime() + this._holdTimeout});
            }
            vApp.logger(3, this._log, system.getTime(), vApp, this, 'hold' , undefined);
            return ret; // [vApp]
        }

        // リソース解放待ちキューに空きがあるとき、vAppをリソース解放待ちに 登録する（スケジュールしない）
        if ((this._waitHeap.size() < this._waitCapacity) && (0 < this._waitTimeout)){
            // リソース解放待ちタイムアウト管理対象に加える
            this._waitHeap.push(vApp);
            vApp.addHistory("wait:" + this._name, system.getTime()); // #61
            vApp.logger(3, this._log, system.getTime(), vApp, this, 'wait' , undefined);
            return { result: true, events: [] };
        }
        
        // リソース解放待ちキューが溢れていた時、リソースを取得できずにアベンド（リソース解放なし、自AP継続の場合[vApp]をリターン） #61
        var apps = vApp.abend(system, this, "E_QOF",
                    "[" + this._name + "] over flow", false);
        vApp.logger(3, this._log, system.getTime(), vApp, this, 'over' , undefined);
        return { result: false, events: apps }; // #61
    };

    /**
     * 引数vAppが使用していたリソースを解放する
     * 
     * @memberof HJN.util.VirtualResource
     * @param {Object}
     *            vApp リソースにfree要求する仮想AP
     * @param {Boolean}
     *            [isHolding=true] 該当vAppが自リソースをholdしているか否か<br>
     *            false指定時、指定vAppはリソースをholdしていない前提で、hold vApp一覧からの削除処理を行わない
     * @return {Array} スケジューラに登録するイベントの配列([vApp] | [])
     */
    VirtualResource.prototype.free = function(vApp, isHolding) { // #59
        vApp.logger(4, this._log, this._system.getTime(), vApp, this, 'FREE' , undefined);
        isHolding = (typeof(isHolding) === "boolean") ? isHolding : true;
        if (this._name === "unlimited") return []; // リソース解放待ちを管理しないとき
        var vApps = []; // 戻り値
        // 自リソースを使用している可能性があるとき、使用リソースを解放する
        // 解放したvAppが使用していたリソース量(デフォルト1.0）を、使用リソース量（数）から減らす #59
        if (isHolding === true) { // #61
            this._holdingQty -= vApp.getAmount(this);
            // タイムアウト管理対象リソースのとき、vAppをタイムアウト管理対象から削除する #61
            if (0 < this._holdTimeout) { // #61
                var app = this._holdHeap.del(vApp);
            }
            vApp.addHistory("free:" + this._name, this._system.getTime());
            vApp.logger(3, this._log, this._system.getTime(), vApp, this, 'del' , undefined);
        }
        // リソース解放待ちキューから、空きリソースで処理できるようになったvAppを取り出しスケジュールする #61
        var marginQty = this._holdCapacity - this._holdingQty;
        var addQty = this._waitHeap.top()
                    ? this._waitHeap.top().getAmount(this) // 次のリソース解放待ちキューの使用量
                    : Number.MAX_SAFE_INTEGER;
        for (var i = this._waitHeap.size() && addQty <= marginQty; 0 < i; i--) {
            // リソース解放待ちキューからfreeするappを取り出す
            var app = this._waitHeap.pop();
            // appにfree時刻をセットし、スケジュールイベント登録対象に加える
            // (注：リソース取得はスケジュール後、E_HTOに伴う他のリソースの時刻は将来）
            app.setSequenceTime(this._system.getTime(), "release:" + this._name);
            vApps.push(app);
            // 次のappのリソース量を加える
            addQty += this._waitHeap.top() 
                    ? this._waitHeap.top().getAmount(this) // 次のリソース解放待ちキューの使用量
                    : Number.MAX_SAFE_INTEGER;
        }
        return vApps;
    };


    /**
     * 引数vAppをリソース開放待ちキューからリリースする
     * 
     * @memberof HJN.util.VirtualResource
     * @param {Object}
     *            vApp リリースする仮想AP
     * @return {Object | undefined} リリースした仮想AP
     */
    VirtualResource.prototype.release = function(vApp) { // #61
        var app = this._waitHeap.del(vApp);
        if (app) vApp.addHistory("release", this._system.getTime());
        return app;
    }

    
    
    /**
     * イベント終了時処理（リソースが管理しているvAppをfinishさせる（強制終了させ処理中vAppはTATログ出力する）
     * 
     * @memberof HJN.util.VirtualResource
     * @param {Object}
     *            system VirtualSystem
     * @param {String}
     *            [logID="N_000"] ログID（ログメッセージの先頭文字）
     * @param {String}
     *            [logMesseage=""] ログメッセージ
     * @param {Number}
     *            forceTime 強制終了時刻を指定する（ミシュレーション停止後のeTat強制出力用）
     * @return {null}
     */
    VirtualResource.prototype._finish = function(system, logID,
                                        logMesseage, forceTime) { // #59
        // シミュレーション終了後処理（処理中のvAppを強制終了する）
        logID = logID || "N_EoS";
        logMesseage = logMesseage || "";
        while(0 < this._waitHeap.size()){
            event = this._waitHeap.pop();
            if (event._finish) {
                event._finish(system, logID,
                        "[" + this._name + "] " + logMesseage , forceTime);
            }
        }
    }

    /* new */
    return VirtualResource;
}());


/**
 * @class
 * @classdesc 仮想システム生成ツール(virtualSystemByJson)
 *            <p>
 *            util管理用クラス（スタティックメソッドのみ）のためコンストラクタは使用しない
 */
HJN.util.virtualSystemByJson = (function() { // #53
    "use strict";
    /** @constructor */
    function virtualSystemByJson(){
        if(!(this instanceof virtualSystemByJson)){
            return new virtualSystemByJson();
        }
    }

    /** @private */
    //

    // public
    
    // static
    /**
     * 初期表示用サンプルデータ(ETAT)を自動生成する
     * 
     * @memberof HJN.util.virtualSystemByJson
     * @param {String}
     *            [jsonText] シミュレーション条件JSONテキスト
     * @return {ETAT} 終了時刻のTAT（応答時間）時系列データ [{x:終了時刻(UNIX時刻の経過時間(秒)),
     *         y:レスポンス(秒)}]
     */
    // CreateSampleTatLog
    virtualSystemByJson.Execute = function(jsonText){ // #53
        "use strict";
        var vSys = {};
        // parse
        var json = JSON.parse(jsonText)
        // virtual system と resources の設定
        var log = (json.log !== undefined) ? json.log : false; // #59
        var start = (json.start !== undefined) 
                    ? HJN.util.S2D(json.start) : new Date(1970,1,2);
        var end = start + HJN.util.S2N(json.end, "24*h");
        var resources = json.resources;
        for (var i = 0; i < resources.length; i++) {
            resources[i].timeout = HJN.util.S2N(resources[i].timeout, "10*sec");
            resources[i].qWait = HJN.util.S2N(resources[i].qWait, "10*sec");
        }
        vSys = HJN.util.VirtualSystem(start, end, json.resources, log);
        // model の取得
        var models = json.models;
        for (var i = 0; i < models.length; i++) {
            var model = models[i];
            var name = Object.keys(model)[0]; // モデルの名称
            var m = model[name]; // モデル
            var baseModel = m.baseModel; // baseModel
            for (var j = 0; j < m.sequence.length; j++) {
                // 時間指定文字列を、ミリ秒数値に変換する（例："3*sec"->3000)
                m.sequence[j].tatMin = HJN.util.S2N(m.sequence[j].tatMin);
                m.sequence[j].tat = HJN.util.S2N(m.sequence[j].tat);
            }
            // sequenceに、baseModelを展開し、未開放リソースの開放処理を登録する
            models[name] = HJN.util.VirtualSystem.getModel(
                        baseModel.holds, 
                        HJN.util.S2N(baseModel.tatMin), HJN.util.S2N(baseModel.tat),
                        m.sequence, 
                        (typeof(m.times) === "number") ? m.times : 1, // #61
                        HJN.util.S2N(m.thinkTimeMin), HJN.util.S2N(m.thinkTime)); 
        }
        // client の設定
        var clients = json.clients;
        for (var i = 0; i < clients.length; i++) {
            var c = clients[i];
            var cStart = start + HJN.util.S2N(c.start, 0);
            var cEnd   = start + HJN.util.S2N(c.end, 24*60*60*1000);
            vSys.setClients(c.user, c.message, c.num, cStart, cEnd, models[c.model]);
        }
        if (log) console.log(vSys); // #59
        return vSys.execute();
    }

    /**
     * シミュレーション条件JSONテキストを作成する
     * 
     * @memberof HJN.util.virtualSystemByJson
     * @param {Number}
     *            [n = 0] シナリオ番号
     * @return {String} シミュレーション条件JSONテキスト
     */
    // CreateSampleTatLogJson
    virtualSystemByJson.GetJsonConfig = function(n){ // #53
        "use strict";
        n = (typeof(n) !== "undefined") ? n : 0;
        var jsonText = "";
        if (n === 0) {
            jsonText =  '{\n'
                + '"log" : 1,\n'
                + '"start" : "2017/01/02 00:00:00.000",\n'
                + '"end"   : "17.0*h",\n'
                + '"resources" : [\n'
                + '  {"type" :"WEB", "thread":1024,"timeout":"300*sec", "q":1280, "qWait":0},\n'
                + '  {"type" :"AP",  "thread":20,  "timeout":"300*sec", "q":1280, "qWait":0},\n'
                + '  {"type" :"DB",  "thread":10,  "timeout": "10*sec", "q":10,  "qWait":"10*sec"}\n'
                + '],\n'
                + '\n'
                + '"models" : [\n' // 取引モデル一覧
                + '  { "ON-1" : {\n' // オンライン取引1
                + '    "times": 60, "thinkTimeMin":"3*sec", "thinkTime": "10*sec",\n'
                + '    "baseModel":  {"holds": ["WEB","AP","DB"], "tatMin": "2*ms", "tat":"5*ms"},\n'
                + '    "sequence": [\n'
                + '      {"tatMin":30, "tat":50, "note":"select A"},\n'
                + '      {"tatMin":50, "tat":50, "note":"updateB", "hold":"TBL_B"},\n'
                + '      {"tatMin":80, "tat":100,"note":"updateC", "hold":"TBL_C"}\n'
                + '    ]}},\n'
                + ' { "ON-2" : {\n' // オンライン取引2
                + '    "times": 60, "thinkTimeMin":"500*ms", "thinkTime": "1*sec",\n'
                + '    "baseModel":  {"holds": ["WEB","AP","DB"], "tatMin": "2*ms", "tat":"5*ms"},\n'
                + '    "sequence": [\n'
                + '      {"tatMin":"100*ms", "tat":"500*ms", "hold":""}\n'
                + '    ]}},\n'
                + ' { "BATCH-1" : {\n' // バッチ取引3
                + '    "baseModel":  {"holds": ["DB"], "tatMin": "2*ms", "tat":"5*ms"},\n'
                + '    "sequence": [\n'
                + '      {"tatMin":"2*sec","tat":"5*sec","note":"updateB","hold":"TBL_B"}\n'
                + '    ]}}\n'
                + '],\n'
                + '\n'
                + '"clients" : [\n' // ユーザ作成条件
                + '  {"num":100,"start":"16.0*h", "end":"17.0*h", "model":"ON-1",  "user" :"userU", "message":"select A update B,C"},\n'
                + '  {"num": 20,"start":"16.5*h", "end":"16.6*h", "model":"ON-1",  "user" :"userT", "message":"select A update B,C 【増】"},\n'
                + '  {"num":100,"start":"16.0*h", "end":"17.0*h", "model":"ON-2",  "user" :"userS", "message":"排他なし(WEBのみ)"},\n'
                + '  {"num": 20,"start":"16.0*h", "end":"17.0*h", "model":"BATCH-1","user":"userB", "message":"バッチ処理 update B＊＊＊＊＊"}\n'
                + ']\n'
                + '}\n';
        } else if (n === 1) {
            // test用
            jsonText =  '{\n'
                + '"//" : "log（任意、デフォルト3）:詳細ログ出力指定(0:なし, 1:エラー時のみ, 2:+ETAT, 3:+push/pop, 4:+HOLD/FREE)",\n'
                + '"//" : "start/end:シミュレーション開始時刻/終了時刻",\n'
                + '"log" : 1,\n'
                + '"start" : "1970/01/02 00:00:00.000",\n'
                + '"end"   : "30.0*sec",\n'
                + '\n'
                + '"//" : "resources:sequenceのhold/freeで指定するリソース名の定義",\n'
                + '"//" : "type:リソース名、thread:最大同時hold数、timeout：holdタイムアウト時間",\n'
                + '"//" : "　　　　　　　　　　　q:最大hold待ち数、qWait:最大hold待ち時間",\n'
                + '"resources" : [\n'
                + '  {"type" :"DB",  "thread":2,  "timeout": "5*sec", "q":1,  "qWait":"2*sec"}\n'
                + '],\n'
                + '\n'
                + '"//" : "models:clientsで指定するモデル名(model)の定義、以下modelsで指定できる項目",\n'
                + '"//" : "baseModel:複数リソースのsequenceをまとめて宣言できる、sequenceに展開した後処理される、任意指定",\n'
                + '"//" : "sequence:指定された順にリソースを取得する、配列内に複数指定可、sequenceも複数指定可",\n'
                + '"//" : "hold：リソース名、holds(baseModelのみ指定可）：リソース一覧、各々にtat/tatMinが適用される",\n'
                + '"//" : "tat/tatMin：リソースの取得に要する平均/最小時間、tatMinのデフォルトはtat",\n'
                + '"//" : "　　　　　　★注：tatはリソースの使用時間ではない、リソース使用時間を指定す場合はfreeで指定",\n'
                + '"//" : "数値はミリ秒単位、*ms,*sec,*min,*h,*day 指定可",\n'
                + '"//" : "times：繰返し回数",\n'
                + '"//" : "thinkTime/thinkTimeMin：繰返し時の間隔の平均/最小時間、thinkTimeMinのデフォルトはthinkTime",\n'
                + '"//" : "free：[リソース名の配列]、指定リソースを開放する、free指定の無いリソースはシーケンスの最後にfreeされる",\n'
                + '"models" : [\n' // 取引モデル一覧
                + ' { "TEST-AB" : {\n' // テスト取引
                + '    "baseModel":  {"holds": ["DB"], "tatMin": "2*ms", "tat":"2*ms"},\n'
                + '    "sequence": [{"hold":"TBL_A", "tatMin":"1*sec", "tat":"1*sec"}],\n'
                + '    "sequence": [{"hold":"TBL_B", "tatMin":"3*sec", "tat":"3*sec"}],\n'
                + '    "times": 2, "thinkTimeMin":"1*sec", "thinkTime": "1*sec"}},\n'
                + ' { "TEST-BA" : {\n' // テスト取引
                + '    "baseModel":  {"holds": ["DB"], "tatMin": "2*ms", "tat":"2*ms"},\n'
                + '    "sequence": [{"hold":"TBL_B", "tatMin":"1*sec", "tat":"1*sec"}],\n'
                + '    "sequence": [{"hold":"TBL_A", "tatMin":"3*sec", "tat":"3*sec"}],\n'
                + '    "times": 2, "thinkTimeMin":"1*sec", "thinkTime": "1*sec"}}\n'
                + '    ],\n'
                + '\n'
                + '"//" : "clients：仮想アプリケーションの起動クライアントの定義",\n'
                + '"//" : "num:作成クライアント数、start～endの間で、ランダム（指数分布）に指定回数起動する",\n'
                + '"//" : "start/end:仮想クライアント作成/終了時刻、先頭で宣言したstartからの相対時刻",\n'
                + '"//" : "model:modelsで宣言したモデル名",\n'
                + '"//" : "user:user+通番 のユーザ名で仮想クライアントが作成される",\n'
                + '"clients" : [\n' // ユーザ作成条件
                + '  {"num": 1,"start":"0*sec", "end":"0*sec", "model":"TEST-AB","user" :"testAB1"},\n'
                + '  {"num": 1,"start":"1*sec", "end":"1*sec", "model":"TEST-AB","user" :"testAB2"},\n'
                + '  {"num": 1,"start":"3*sec", "end":"3*sec", "model":"TEST-BA","user" :"testBA3"},\n'
                + '  {"num": 1,"start":"4*sec", "end":"4*sec", "model":"TEST-BA","user" :"testBA4"}\n'
                + ' ]\n'
                + '}\n';
        }

        return jsonText; 
    }

    /* new */
    return virtualSystemByJson;
}());