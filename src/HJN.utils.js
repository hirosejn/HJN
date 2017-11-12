/** ie11 互換用 * */
if(!Uint8Array.prototype.indexOf){
	Uint8Array.prototype.indexOf = function(target,index){
		"use strict";
		index = (index === undefined) ? 0 : index;	// #29
        for(var i = index, last = index + 4096; i < last; i++){ // 暫定：1レコード4KBまでチェック
            if(this[i] === target) return i; 
        }
        return -1;
    };
}
if (!Uint8Array.prototype.slice) {	// #29
	Uint8Array.prototype.slice = function(begin, end) {
		"use strict";
		return this.subarray(begin, end);
	};
}
// https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
if (!Array.prototype.findIndex) {
	Array.prototype.findIndex = function(predicate) {
		"use strict";
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
		var list = Object(this), length = list.length >>> 0, thisArg = arguments[1], value;
		for (var i = 0; i < length; i++) {
			value = list[i];
			if (predicate.call(thisArg, value, i, list)) { return value; }
		}
		return undefined;
	};
}


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
    
    // confが"Object"のとき、指定された構造体オブジェクトの条件でパースする（最も高速な処理）
    if(typeof(conf) === "Object"){
        return parse(str, conf);
    }
    // confが"String"のとき、指定された文字列フォーマットから構造体オブジェクトを作成し、パースする（準高速処理）
    else if(typeof(conf) === "string"){
        var config = {  // YYYY/MM/DD hh:mm:dd.ss.ppp #41
                YYYY: conf.indexOf("YYYY"),
                MM: conf.indexOf("MM"),
                DD: conf.indexOf("DD"),
                hh: conf.indexOf("hh"),
                mm: conf.indexOf("mm"),
                ss: conf.indexOf("ss"),
                ppp: conf.indexOf("p")};
        return parse(str, config);
    }
    // confが指定されていないとき、デフォルト条件でパースする（汎用処理）
    else {
        // デフォルトフォーマット："YYYY/MM/DD hh:mm:dd.ss.ppp" #42
        var config = {YYYY: 0, MM: 5, DD: 8, hh: 11, mm: 14, ss: 17, ppp: 20};
        return parse(str, config);
    }

    // 内部関数：構造体オブジェクトで指定された条件でパースする
    function parse(str, conf){
        var y   = (0 <= conf.YYYY) ? parseInt( str.substr( conf.YYYY, 4), 10) : 1970,  // デフォルト1970年
                m   = (0 <= conf.MM)   ? parseInt( str.substr( conf.MM, 2), 10) - 1 : 0,   // デフォルト1月
                // 1970/1/1だと時差でマイナスになることがあるので日付のデフォルトは2日
                d   = (0 <= conf.DD)   ? parseInt( str.substr( conf.DD, 2), 10) : 2,
                h   = (0 <= conf.hh)   ? parseInt( str.substr( conf.hh, 2), 10) : 0,
                min = (0 <= conf.mm)   ? parseInt( str.substr( conf.mm, 2), 10) : 0,
                sec = (0 <= conf.ss)   ? parseInt( str.substr( conf.ss, 2), 10) : 0,
                // ミリ秒以下を指定すると丸め誤差が生じるため、秒以下のミリ秒は個別に加算
                p   = (0 <= conf.ppp)  ? ("0." + str.substr( conf.ppp).match(/[0-9]*/)[0]) * 1000.0 : 0;
        return +(new Date( y, m, d, h, min, sec )) + p;  // #14
    }
};


/**
 * 日時(JS Date)から、指定フォーマットの文字列を取得する
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
    
    str = str.replace(/yyyy/, dt.getFullYear() );
    str = str.replace(/MM/, ('0' + (dt.getMonth() + 1) ).slice(-2) );
    str = str.replace(/dd/, ('0' + dt.getDate()).slice(-2) );
    str = str.replace(/hh/, ('0' + dt.getHours()).slice(-2) );
    str = str.replace(/mm/, ('0' + dt.getMinutes()).slice(-2) );
    str = str.replace(/ss/, ('0' + dt.getSeconds()).slice(-2) );
    str = str.replace(/ppp/,('00' + Math.floor(dt % 1000)).slice(-3) );

    return str;
};
/**
 * 日時(ミリ秒：Ｘ軸用）から、指定フォーマットの文字列を取得する
 * 
 * @param {Number|Date}
 *            ds 時刻をUNIX経過時間（ミリ秒）で表した数値、もしくはDate(日付）
 * @param {String}
 *            str フォーマット yyyy-MM-dd hh:mm:ss.ppp （戻り値で上書きされる）
 * @return {String} str 編集後文字列
 */
HJN.util.D2S = function(ds, str){
    "use strict";
    return HJN.util.DateToString(new Date(ds), str);
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
 * キャッシュ
 * 
 * @class
 * @memberof HJN.util
 * @classdesc キャッシュを保持させるオブジェクト
 * @param {Number}
 *            [size=10] キャッシュ最大件数（未対応機能、設定は無視される）
 */
HJN.util.Cash = (function() {
	"use strict";
	/** static member */
	var proto = Cash.prototype = {
			// クラス変数 _xxx: 0
		};
	/** constructor */
	function Cash(size){
		size = size || 10;	// TODO 未使用
		if(!(this instanceof Cash)) return new Cash(size);
		// インスタンス変数
		this._cash = {};	// キャッシュ {data:, count:, lastTime:}
		this._ranges = [];	// RangedCash用 {key: ,from: , to:, }
		this._size = size;	// キャッシュ最大件数
	}
	
	/* class method */
    /**
     * 第一引数のargumentsを配列に変換する<br>
     * （注：引数が１つ以上あることを前提）
     * 
     * @function
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
     * @function
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
     * @function
     * @memberof HJN.util.Cash
     * @param {Object}
     *            arguments 引数からキー文字列を定める
     * @return {Number|undefined} キャッシュデータ（デーがが無い場合は undefined)
     */
	proto.getCash = function () {
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
     * @param {Object}
     *            cashVal キャッシュするオブジェクト
     * @param {Object}
     *            arguments 第二引数以降の、引数からキー文字列を定める
     * @return {Object} キャッシュデータ（デーがが無い場合は undefined)
     */
	proto.setCash = function () {
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
     * @param {Number}
     *            from 抽出するキャッシュキー最小値
     * @param {Number}
     *            to 抽出するキャッシュキーの最大値
     * @return {Object} キャッシュデータ（デーがが無い場合は undefined)
     */
	proto.getRangedCash = function (from, to) {
			var range = this._ranges.find(function(e){
					return (e.from <= from && to <= e.to);
				});
			return (range !== undefined) ? this.getCash(range.from,range.to) : undefined;
		};
    /**
     * レンジキー(from,to)指定でキャッシュする<br>
     * キーは大小比較できること（通常、数値）、from-to期間内の既存のキャッシュは削除される
     * 
     * @param {Object}
     *            cashVal キャッシュするオブジェクト
     * @param {Number}
     *            from 抽出するキャッシュキー最小値
     * @param {Number}
     *            to 抽出するキャッシュキーの最大値
     * @return {Object} キャッシュデータ（デーがが無い場合は undefined)
     */
	proto.setRangedCash = function (cashVal, from, to) {
			if (arguments.length < 3) return undefined;
			// 登録キー範囲に包含される既存キャッシュを削除する
			var count = 0;
			this._ranges = this._ranges.filter(function(e){
					if (from <= e.from && e.to <= to){
						// 登録キャッシュ範囲内のキャッシュを削除する
						count += this._cash[e.key].count;	// 削除分のカウンタ合算
						delete this._cash[e.key];
						return false;
					}else{	// 登録キャッシュの範囲外の一覧を返却する
						return true;
					}
				}, this);
			// 引数をキャッシュに登録する
			var key = Cash._getKey([from, to]);
			this._ranges.push( {from: from, to: to, key: key} );
			this.setCash(cashVal, from, to);
			this._cash[key].count= count + 1;	// 再作成時はカウンタ合算値
			return cashVal;
		};

	// newの戻り値
	return Cash;
}());


/**
 * 非同期化 内部関数
 * 
 * @function
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
 * ロガー
 * 
 * @class
 * @name Logger
 * @memberof HJN.util
 * @classdesc モードに応じたログを出力する。画面ログ表示領域、コンソールログへの出力に対応
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
     * @function
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
            var t = HJN.util.DateToString(ts, "hh:mm:ss.ppp");
            console.log(t + "[" + i + "]~~~~" + text);
            HJN.util.Logger._logtime = ts;
        }
    };
    /**
     * ログ出力： ログテキストを初期化する
     * 
     * @function
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
     * @function
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
            text = (Math.round( HJN.util.Logger._timestamp - lastTimestamp ) / 1000.0) + "s " + text;
            // 数値のカンマ編集（小数部もカンマが入る）
            text = text.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
            text = HJN.util.DateToString(HJN.util.Logger._timestamp, "hh:mm:ss.ppp     ") + text;
        }
        HJN.util.Logger._logText.push(text);
        HJN.util.Logger.ShowText(HJN.util.Logger._logText);
        if(true) console.log(text);
    };
    /**
     * 第一引数のテキストアレイの内容を#fileInfoのiframeに表示する
     * 
     * @function
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
     * @function
     * @memberof HJN.util.Logger
     * @param {String}
     *            elementId iframeのID名
     * @param {String}
     *            iHtmlBody ログ（HTML化）
     */
    Logger.ShowIHtmlBody=function(elementId, iHtmlBody){
        var iHtml = "<html><head><style>"+
                        "body{font-size: 10px; margin: 1px; }" +
                    "</style></head>" +
                    "<body id='iHtmlBody'>" + 
                        iHtmlBody +
                    "</body></html>";
        var iframe = document.getElementById(elementId);
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(iHtml);
        iframe.contentWindow.document.close();
    };
    
    // newの戻り値
    return Logger;
}());


/*
 * 指定されたtextareaを使って、クリップボードにコピーする ************************************
 * HJN.CopyToClipboard = function(elementId) { // arg0:textareaのID名 "use
 * strict"; var area = document.getElementById(elementId); area.select();
 * document.execCommand("copy"); } //詳細表示対象の元データ(eTat)をコピー用領域にテキストで出力する
 * HJN.init.GetSliderRangedEtatText = function(elementId) { "use strict"; //
 * 開始メッセージを画面に設定する document.getElementById(elementId).value = "データの収集を開始しました
 * しばらくお待ち下さい"; // ブラウザに開始メッセージを描画させるために、集計処理は非同期でキックする
 * HJN.util.setZeroTimeout(function(){ // コピーデータを集計する var eTatDetail =
 * HJN.chartD.eTat; var eTatCsv = ""; if(0 < eTatDetail.length){ if(typeof
 * eTatDetail[0].pos === "undefined"){ eTatDetail.forEach(function(e){ eTatCsv +=
 * HJN.util.D2S(e.x, "yyyy/MM/dd hh:mm:ss.ppp") + "," + e.y + "\r\n"; }); }else{
 * eTatDetail.forEach(function(e){ eTatCsv += String.fromCharCode.apply(null,
 * new Uint8Array(HJN.file, e.pos, e.len)) + "\r\n"; }) } }else{ eTatCsv += "No
 * log in the time." } // 画面にコピー対象データのテキストを設定する
 * document.getElementById(elementId).value = eTatCsv; // クリップボードにコピーする
 * HJN.CopyToClipboard(elementId); }); }
 */



/**
 * 配列二分木検索
 * 
 * @class
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
	var	middle,
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
	    return -1;	// 完全一致指定のとき(-1)をリターンする
	} else {    	// 完全一致指定でないとき、値との差が最も少ない位置をリターンする #46
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
    	return -1;	// 指定範囲外
	}
};



/**
 * 期間指定eTat取得用Map
 * 
 * @class
 * @name MappedETat
 * @memberof HJN.util
 * @classdesc 指定期間に動いているeTatの一覧を、高速に取得するマップ
 * @param {ETAT}
 *            eTat インデックスを追加するETAT
 * @example eTat.tatMap = new HJN.util.MappedETat(eTat); var trans =
 *          eTat.tatMap.search(x, x, 1000);
 */
HJN.util.MappedETat = (function() { // #18
	"use strict";
	/** @static */
	var proto = MappedETat.prototype = {
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
					{ms:Number.MAX_VALUE, step:1, label:"12_overDay_"}]	// 最後はstep:１
		};
	/** @constructor */
	function MappedETat(eTat){
		if(!(this instanceof MappedETat)) return new MappedETat(eTat);
		// MappedArrayを作成する
		this._tatMap = new HJN.util.MappedArray(eTat, this._getKey, true);
	}

	/** @private */
	proto._row = function(label, step) {return label + step;};

	/**
     * MapKey取得関数
     * 
     * @private
     */
	proto._getKey = function(e, i) {		// MapedMap用Key配列関数
		var start = e.x - e.y,		// x,yはミリ秒
			end = e.x,
			_conf = proto._conf,
			_row = proto._row,
			term = _conf[0].ms,
			rowLv = 0;
		if(Math.ceil(end / term) - 1 === Math.floor(start / term)){	// 最小BOX
			return [_row(_conf[0].label, 0),
					(Math.ceil(e.x / _conf[0].ms) - 1) * _conf[0].ms];
		}
		for (i = 1; i < _conf.length; i++) {				// 最下位から上に評価
			term = _conf[i].ms;
			if(Math.floor(end / term) === Math.floor(start / term) 
					|| end - start < term){						 // 上位BOXを起点
				term = _conf[i-1].ms;	// ひとつ下位のBOX期間（下から評価したので二段下となることは無い
				rowLv = Math.floor(end / term) - Math.floor(start / term);
				return [_row(_conf[i-1].label, rowLv),
						(Math.ceil(e.x / _conf[i-1].ms) - 1) * _conf[i-1].ms];
			}
		}
		return "error";
	};

	// static メンバーの設定
	// _confから_abscissa(横軸）を生成する
	var c = proto._conf,
		e2 = c[c.length - 2],
		
		e  = c[c.length - 1];
	proto._abscissa.push( {label: proto._row(e.label, e.step), ms: e.ms ,i: 1,
				step: e.step, from: e2.ms * e2.step, to: e.ms} );	// 末尾を先頭に追加
	for (var j = c.length - 1; 0 <= j; j--){	// 降順に追加
		e = c[j];
		for (var i = e.step; 0 < i; i--){ // #39
			proto._abscissa.push( {label: proto._row(e.label, i), ms: e.ms, i: i, 
								step: e.step, from: e.ms * i, to: e.ms * (i + 1)} );
		}
	}
	proto._abscissa.push( {label: proto._row(c[0].label, 0), ms: c[0].ms, i: 0,
				step: 0, from: 0, to: c[0].ms} );	// 先頭を末尾に追加

	
	// public
	/**
     * 指定期間に動いているeTatを検索する
     * 
     * @function
     * @memberof HJN.util.MappedETat
     * @parm {Number} from 指定期間(from)
     * @parm {Number} [to=from] 指定期間(to)
     * @parm {Number} [cap] cap件数となったら抽出を終了する（指定なしの時：全件）
     * @return {ETAT} eTatArr 指定期間内のeTat配列
     */
	MappedETat.prototype.search = function (from, to, cap) {
		to = to || from;	// to省略時は時刻指定(from=to)
		cap = cap || Number.MAX_VALUE; // 指定なしの時：全件
		var	map = this._tatMap._map,
			eTat = this._tatMap._arr,
			abscissa = this._abscissa,
			eTatArr = [],
			start = 0,
			end = 0;
		// 検索対象のBOX一覧を生成する
		abscissa.forEach(function(e){	// 存在しうる横軸のうち（tatが長時間の方から）
			if (map[e.label]){			// 横軸が存在するものについて
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
					key += e.ms;	// 次のKey値
				}
			}
		}, this);
		return eTatArr;
	};
	
	// newの戻り値
	return MappedETat;
}());


/**
 * 配列に格納されているオブジェクトのx値で、配列位置を高速検索
 * 
 * @class
 * @name MappedArray
 * @memberof HJN.util
 * @classdesc 配列に格納されているオブジェクトのx値をキーとするマップ
 *            <p>
 *            参考 {@link http://qiita.com/alucky0707/items/10052866719ba5c5f5d7}
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
	"use strict";
	/** @static */
	var proto = MappedArray.prototype = {
			// クラス変数 _xxx: 0
		};
	/** @constructor */
	function MappedArray(arr, getKey, isMappedMap){
		if(!(this instanceof MappedArray)) return new MappedArray();
		this._arr = arr;
		// getKeyによりIndex作成関数を設定する
		if(!getKey || getKey === ""){
			// getKey指定がないとき、配列の値
			this._getKey = function(e){ return e.valueOf(); };
		}else if ((typeof(getKey) === "string") && (getKey !== "")){	// #29
			// getKeyが文字列のとき、配列内オブジェクトのgetKey要素の値
			this._getKey = function(e){ return e[getKey]; };
		}else if (typeof(getKey) === "function" ){	// #29
			// getKeyが関数のとき、配列内オブジェクトに関数を適用した戻り値
			this._getKey = getKey;
		}else{	// 以外のときエラーログを出力し、getKey指定なしと同様、配列の値
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
	proto._createMappedArray = function() {
		var key = ""; 
		this._map = this._arr.reduce(function(m, a, i) {
			key = this._getKey.call(a, a, i, m);
			m[key] = (m[key] || []).concat(i);
			return m;
		}, {});
	};
    /** @private */
	proto._createMappedMappedArray = function() {
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
     * @function
     * @memberof HJN.util.MappedArray
     */
	proto.has = function (keyValue) {
		return keyValue in this._map;
	};
    /**
     * 該当位置を配列で返す
     * 
     * @function
     * @memberof HJN.util.MappedArray
     */
	proto.indexes = function (keyValue) {
		return this._map[keyValue] || [];
	};
	/**
     * 該当する要素を配列で返す
     * 
     * @function
     * @memberof HJN.util.MappedArray
     */
	proto.search = function (keyValue) {	
		var arr = this._arr;
		return this.indexes(keyValue).reduce(function(m, i) {
			m.push(arr[i]);
			return m;
		}, []);
	};
    /**
     * Array.prototype.indexOf() 同等
     * 
     * @function
     * @memberof HJN.util.MappedArray
     */
	proto.indexOf = function (keyValue) {
		var idxArr = this._map[keyValue],
			i = idxArr ? idxArr.length : -1;
		return (0 < i) ? idxArr[0] : -1;
	};
    /**
     * Array.prototype.lastIndexOf() 同等
     * 
     * @function
     * @memberof HJN.util.MappedArray
     */
	proto.lastIndexOf = function (keyValue) {
		var idxArr = this._map[keyValue],
			i = idxArr ? idxArr.length : -1;
		return (0 < i) ? idxArr[i-1] : -1;
	};
	
	return MappedArray;
}());


/**
 * 定数設定機能
 * 
 * @class
 * @name Config
 * @memberof HJN.util
 * @classdesc 定数設定機能（設定HTML作成機能付き）
 *            <p>
 *            日時、TATフォーマット指定機能追加用に作成 #24
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
	var proto = Config.prototype = {
			__config : {}	// config設定コンテナ
	};
	/** @constructor */
	function Config(prefix, ol){ 
		if(!(this instanceof Config)) return new Config(prefix, ol);
		this._pre = (prefix || '') + ".";			// 各フィールド、要素の名称のプレフィックス(区切り文字
													// ".")
		this._ols = ol ? '<' + ol + '>' : '<ol>'; 	// リストに使用する要素（初期値 ol )
		this._ole = ol ? '</' + ol + '>' : '</ol>';
		this._html = this._ols;	// config設定画面のHtml
		this._nameHtml = '';	// HTMLタグの name属性指定
		this._name = '';		// radioのConfig.get用
		this._onFunctions = {}; // onイベント時に呼び出す関数の設定用 #51
	}

	/**
     * HTML要素の値が変更した時に、configに当該要素を登録する
     * 
     * @function
     * @memberof HJN.util.Config
     */
	Config.on = function(t) {
		if (t.type === "radio") {			// radioのとき、nameに対して、選択されたキー値（idからprefixを削除した値）を登録
			this.prototype.__config[t.name] = t.id.substr(t.id.indexOf(".") + 1);
			// on呼出し関数が登録されているとき、登録関数を呼び出す #51
			if(typeof(HJN.chart.fileReader._configFilter._onFunctions[t.id]) === "function"){ 
			    HJN.chart.fileReader._configFilter._onFunctions[t.id](); // ToDo:Config("m")から関数を取得する
			}
		}else if (t.type === "number") {	// numberのとき、idに対する、value(入力値)を数値として登録
			this.prototype.__config[t.id] = +t.value;
		} else {							// textのとき、idに対する、value(入力値)を登録
			this.prototype.__config[t.id] = t.value;
		}
	};

	/** @private */
	//

    // public
    /**
     * configに登録されているid(=prefix+key)の設定値を取得する
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.getObjctById = function(id) {
		return this.__config[id];
	};
    /**
     * configに登録されているkey(prefix補填)の設定値を取得する
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.getValueByKey = function(key) { 
		return this.getObjctById(this._pre + key);
	};
    /**
     * config設定用HTMLテキストを取得する
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.getHtml = function() { 
		return this._html + this._ole;
	};
    /**
     * keyに値を設定する
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.xset = function(key, val) { 
		this.value[this._pre + key] = val;
	};
	
	// config作成用 publicメソッド
    /**
     * 定義＆設定画面作成用機能： 改行
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.n = function (str) {
		str = str || "";
		this._html += this._ole + str + this._ols;
		return this;
	};
    /**
     * 定義＆設定画面作成用機能： ネスト一つ下げ
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.nDown = function () {
		this._html += this._ols;
		return this;
	};
    /**
     * 定義＆設定画面作成用機能： ネスト一つ上げ
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.nUp = function () {
		this._html += this._ole;
		return this;
	};
    /**
     * 定義＆設定画面作成用機能： nameを変更する（radio等の先頭で指定）
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.name = function (str) {
		this._nameHtml = str ? 'name="' + this._pre + str + '" ' : '';
		this._name = str;
		return this;
	};
    /**
     * 定義＆設定画面作成用機能： ラベル要素(prefix+keyで関連付けるformのid属性となる)
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.label = function (key, str, attribute) {
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
     * @function
     * @memberof HJN.util.Config
     */
	proto.labeledForm = function (key, type, typedAttribute,
								pLabel, sLabel, val, attribute, check, cssClass) {
	    var classStr = (cssClass) ? ' class="' + cssClass + '"' : ''; // #51
		this._html += '<label' + classStr + '>' + // #51
					(pLabel ? pLabel : '') +
					'<input type="' +type + '" ' +
						(typedAttribute || '') + 
						this._nameHtml +
						'id="' + this._pre + key + '" '+		// idがユニークになるようkeyにprefixを付与
						'onchange="HJN.util.Config.on(this);" ' +
						(val ? 'value="' + val + '" ' : '') +	// val は、キー値のまま
						(attribute || '') + 
						(check ? ' checked="checked;"' : '') +
					'>' +
					(sLabel ? sLabel : '') +
					'</label>\n'; // #51
		// デフォルト指定があるとき configにデフォルト値を設定する
		if (type === "radio" && check) {	// radioのとき、nameに対して、選択状態のkeyを登録
			proto.__config[this._pre + this._name] = key;
		} else if (type === "number") {	// numberradioのとき、keyに対する、val(入力値)を数値として登録
			proto.__config[this._pre + key] = +val;
		} else {	// text,numberのとき、keyに対する、val(入力値)を登録
			proto.__config[this._pre + key] = val;
		}
		return this;
	};
    /**
     * 定義＆設定画面作成用機能： テキストボックス要素で、文字列を設定
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.number = function (key, pLabel, sLabel, val, attribute) {
		proto.labeledForm.call(this, key, "number", "", 
								pLabel, sLabel, val, attribute);
		return this;
	};
    /**
     * 定義＆設定画面作成用機能： テキストボックス要素で、数値を設定
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.text = function (key, pLabel, sLabel, val, attribute) {
		proto.labeledForm.call(this, key, "text", "", 
								pLabel, sLabel, val, attribute);
		return this;
	};
    /**
     * 定義＆設定画面作成用機能： ラジオボタン要素で、選択肢の一つを設定
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.radio = function (key, pLabel, sLabel, check, attribute, func) {
		proto.labeledForm.call(this, key, "radio", (check ? 'checked="checked;"' : ''),
								pLabel, sLabel, "", attribute, check, "hjnLabel4Input");
		// 関数登録指定時、attributeを関数名として、指定関数を登録する #51
		if (func){
		    this._onFunctions[this._pre + key] = func;
		}
		return this;
	};

	/* new */
	return Config;
}());


/**
 * Heap
 * 
 * @class
 * @name Heap
 * @memberof HJN.util
 * @classdesc ヒープ(二分ヒープ)
 *            <p>
 *            最小値(最大値)を効率よく取り出すことができるデータ構造
 *            <p>
 *            参考 {@link http://d.hatena.ne.jp/otaks/20121220/1355993039}
 * @param {Function}
 *            [func=function(obj){ return +obj; }]
 *            pushで登録するオブジェクトからヒープの大小比較判定値を取り出す関数
 * @example h = HJN.util.Heap( function(obj){ return +obj; } ) h.push("12.34") //
 *          データを登録する h.push(0.12) // h.pop() // => 0.12 最小値のオブジェクトを取り出す h.pop() // =>
 *          "12.34" h.top() // =>undefined 最小値のオブジェクト h.size() // =>0 登録オブジェクト数
 */
HJN.util.Heap = (function() { // #55
    "use strict";
    /** @static */
    var proto = Heap.prototype = {
            // クラス変数 _xxx: 0
    };
    /** @constructor */
    function Heap(func){ 
        if(!(this instanceof Heap)) return new Heap(func);
        this._func = func || function(obj){ return +obj; };
        this._heap = []; // Heap構造体（大小比較数値用）
        this._size = 0;  // 格納要素数
    }

    /** @private */
    //

    // public
    /**
     * データを追加する
     * 
     * @function
     * @memberof HJN.util.Heap
     * @param {Object}
     *            obj 登録オブジェクト
     */
    proto.push = function(obj) {
        var k = this._size++;

        while( 0 < k ) {
            var p = Math.floor( (k - 1) / 2 );
            if( this._func(this._heap[p]) <= this._func(obj) ) break;
            this._heap[k] = this._heap[p];
            k = p;
        }
        this._heap[k] = obj;
    };

    /**
     * 最小値のデータを取り出す
     * 
     * @function
     * @memberof HJN.util.Heap
     * @return {Object|undefined} 最小値
     */
    proto.pop = function() {
        var ret = this._heap[0];
        if(0 < this._size){
            var x = this._heap[--this._size];
            var xVal = this._func(x);
            var k = 0;
            while( k * 2 + 1 < this._size ) {
                var a = k * 2 + 1;
                var b = k * 2 + 2;
                if( b < this._size && this._func(this._heap[b]) < this._func(this._heap[a]) ) a = b;
                
                if( xVal <= this._func(this._heap[a]) ) break;

                this._heap[k] = this._heap[a];
                k = a;
            }
            this._heap[k] = x;
            this._heap.pop();
        }
        return ret;
    };

    /**
     * 最小値を返却する（登録データは変更しない）
     * 
     * @function
     * @memberof HJN.util.Heap
     * @return {Object|undefined} 最小値
     */
    proto.top = function() {
        return this._heap[0];
    };

    /**
     * ヒープのサイズを返却する
     * 
     * @function
     * @memberof HJN.util.Heap
     * @return {Number} ヒープサイズ（0以上）
     */
    proto.size = function() {
        return this._size;
    };
    
    /* new */
    return Heap;
}());


/**
 * Random
 * 
 * @class
 * @name Random
 * @memberof HJN.util
 * @classdesc 乱数取得<br>
 *            ある事象の単位時間あたりの発生回数がポアソン分布, その発生間隔が指数分布に従う<br>
 *            M/M/1モデルは、到着がポアソン過程となり、(したがって到着間隔は指数分布に従う)、サービス時間が指数分布に従う
 *            <p>
 *            参考 {@link http://www.ishikawa-lab.com/montecarlo/4shou.html}
 * @param {Number}
 *            [average=0.5] 平均値
 * @example var r = HJN.util.Random(10), val = r.exponential();
 */
HJN.util.Random = (function() { // #56
    "use strict";
    /** @static */
    var proto = Random.prototype = {
            // クラス変数 _xxx: 0
    };
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
     * @function
     * @memberof HJN.util.Random
     * @param {Number}
     *            [average=this._average] 平均値<br>
     * @return {Number} 乱数
     */
    proto.uniform = function(average) {
        average = average || this._average;
        return  2.0 * average * Math.random();
    };

    /**
     * 指数分布となる乱数を返却する(lambda = 1/average)
     * 
     * @function
     * @memberof HJN.util.Random
     * @param {Number}
     *            [average=this._average] 平均値=1/λ、分散=1/(λ^2)<br>
     * @return {Number} 乱数
     */
    proto.exponential = function(average) {
        average = average || this._average;
        return (-1.0 * average) * Math.log(1.0 - Math.random());
    };
    
    /**
     * ポアソン分布となる乱数を返却する(lambda = average)
     * 
     * @function
     * @memberof HJN.util.Random
     * @param {Number}
     *            [average=this._average] 平均値=分散=λ<br>
     * @return {Number} 乱数
     */
    proto.poisson = function(average) {
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
 * VirtualSystem
 * 
 * @class
 * @name VirtualSystem
 * @memberof HJN.util
 * @classdesc Web3層(Web-AP-DB)をシミュレートしたWebのTATログ生成する
 * @param {Number}
 *            [start = 1970/01/02 00:00:00)] シミュレート開始時刻（UNIX日付（ミリ秒））
 * @param {Number}
 *            [end = startの24時間後] シミュレート終了時刻（UNIX日付（ミリ秒））
 * @param {Number}
 *            [maxClients=1024] Webサーバの最大スレッド数
 * @param {Number}
 *            [maxThreads=20] APサーバの最大スレッド数
 * @param {Number}
 *            [max_connections=2] DBサーバの最大コネクション数
 * @example sim = HJN.util.VirtualSystem()
 */
HJN.util.VirtualSystem = (function() { // #53
    "use strict";
    /** @static */
    var proto = VirtualSystem.prototype = {
            // クラス変数 _xxx: 0
    };
    /** @constructor */
    function VirtualSystem(start, end, maxClients, maxThreads, max_connections){
        if(!(this instanceof VirtualSystem)){
            return new VirtualSystem(start, end, maxClients, maxThreads, max_connections);
        }
        this._start = +start || HJN.util.S2D("1970/01/02 00:00:00");   // シミュレート開始時刻
        this._end = end || this._start + 86400000;    // シミュレート終了時刻（デフォルト：24時間後)
        // イベント予約スケジュール（ヒープ）
        this._simulator = HJN.util.Heap(function(obj){ return obj.getTime(); });
        // リソース
        this._resources = {}
        this._resources["WEB"] = HJN.util.VirtualResource("WEB", 1024, 90000); // Webサーバの最大スレッド数(maxClients)
        this._resources["AP"]  = HJN.util.VirtualResource("AP", 20, 60000); // APサーバの最大スレッド数(maxThreads)
        this._resources["DB"]  = HJN.util.VirtualResource("DB", 2, 10000); // DBサーバの最大コネクション数(max_connections)
    }

    /** @private */
    //

    // public
    /**
     * 仮想クライアントをスケジューラに登録する
     * 
     * @function
     * @memberof HJN.util.VirtualSystem
     * @param {String}
     *            [userName = "sampleSeq"] ログに出力するユーザ名
     * @param {Number}
     *            [num = 3] 期間内に生成する仮想クライアントの数
     * @param {Number}
     *            [start = HJN.util.S2D("1970/01/02 00:00:00")]
     *            仮想クライアント生成開始時刻（UNIX時刻の数値、ミリ秒）
     * @param {Number}
     *            [end = startの0.1秒後] 仮想クライアント生成終了時刻（UNIX時刻の数値、ミリ秒）
     * @param {Object}
     *            appModel 仮想クライアントが実行する取引モデル
     */
    proto.setClients = function(userName, num, start, end, appModel) {
        userName = userName || "Default_";
        num = num || 3;
        start = +start || HJN.util.S2D("1970/01/02 00:00:00");
        end = +end || start + 100;

        var r = HJN.util.Random((end - start) / num);
        var t = start;
        for (var i = 0; i < num; i++) {
            // 仮想クライアントを作成する
            var vApp = HJN.util.VirtualApp(userName+i, appModel);
            // 仮想クライアントに開始時刻（指数分布）を設定し、登録する
            t += Math.round(r.exponential());
            this._simulator.push(vApp.start(t));
        }
    };
    
    /**
     * シミュレーションを実行する
     * 
     * @function
     * @memberof HJN.util.VirtualSystem
     * @return {eTat} シミュレート実行結果のログ（eTat）
     */
    proto.execute = function() {
        var eTat = []; // 戻り値
        var vApp, vApps;
        // 処理対象がなくなるか、シミュレート終了時刻になるまでシミュレートする
        while(0 < this._simulator.size() &&
              this._simulator.top().getTime() <= this._end ) {
            // 次にイベントを迎える仮想APを取り出し、「次の処理」をシミュレートする
            vApp = this._simulator.pop();
            vApps = vApp.next(eTat, this);
            // 「次の処理」のシミュレートに伴い発生したイベントを、スケジュールする
            while (vApps.length) {
                this._simulator.push(vApps.pop());
            }
        }
        return eTat;
    };

    /**
     * リソースを取得する
     * 
     * @function
     * @memberof HJN.util.VirtualSystem
     * @param {String}
     *            [name = "unlimited"] 仮想リソース名
     * @return {Object} 仮想リソース（登録されていないときは、新たにcapacity=1の仮想リソースを登録）
     */
    proto.getResouce = function(name) {
        if (typeof(this._resources[name]) == "undefined") {
            this._resources[name] = HJN.util.VirtualResource(name);
        }
        return this._resources[name];
    };

    /* new */
    return VirtualSystem;
}());


/**
 * VirtualApp
 * 
 * @class
 * @name VirtualApp
 * @memberof HJN.util
 * @classdesc仮想アプリケーション
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
    /** @static */
    var proto = VirtualApp.prototype = {
            // クラス変数 _xxx: 0
    };

    /**
     * 取引モデルを取得する（ユーティリティ）
     * 
     * @function
     * @memberof HJN.util.VirtualApp
     * @param {Array}
     *            [webApDb = []] 使用リソースの一覧["WEB","AP","DB"]
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
     * @return {Object} 取引モデル
     */
    VirtualApp.getModel = function(webApDb, tatMin, tat, sequence, times, thinkTimeMin, thinkTime) {
        var model = {};
        if (typeof(times) == "number")model.times = times;
        if (typeof(thinkTime) == "number")model.thinkTime = thinkTime;
        if (typeof(thinkTimeMin) == "number")model.thinkTimeMin = thinkTimeMin;

        tat = tat || 5;
        tatMin = tatMin || tat;
        model.sequence = []; // 処理シーケンス
        // リソース（WebApDb)取得処理を登録する
        webApDb.forEach( function(e) {
            model.sequence.push({hold:e, tatMin:tatMin, tat:tat, free:[]});
        });
        // 指定シーケンスを登録する
        model.sequence = model.sequence.concat(sequence);
        // 指定シーケンスの未開放リソースを取得する
        var resources = [];
        sequence.forEach( function(tran) {
            if (tran.hold !== "") {
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
        // 未開放リソース（sequence未開放とWebApDb)開放処理を登録する
        var freeResources = resources.reverse().concat(webApDb.reverse());
        model.sequence = model.sequence.concat(
                [{hold: "", tatMin: tatMin * webApDb.length, tat: tat * webApDb.length,
                    free: freeResources}]);
        
        return model;
    };
    
    /** @constructor */
    function VirtualApp(userName, model){
        if(!(this instanceof VirtualApp)){
            return new VirtualApp(userName, model);
        }
        var sampleSeq = [
            {tatMin:6,   tat:15,  note:"Req",     hold:"DB",    free:[]},
            {tatMin:70,  tat:100, note:"selectA", hold:"TBL_A", free:["TBL_A"]},
            {tatMin:150, tat:200, note:"updateB", hold:"TBL_B", free:[]},
            {tatMin:30,   tat:50,  note:"Res",     hold:"",      free:["TBL_B","DB"]}
        ];
        this._userName = userName || "default"; // ログ出力テキスト

        if (typeof(model) == "undefined") model = {}
        
        this._sequence = model.sequence || sampleSeq; // イベントシーケンス
        if (model.baseModel) { // baseModel指定があるとき、イベントシーケンスにbaseModelを追加する
            var tmpModel = VirtualApp.getModel(
                    model.baseModel.holds, model.baseModel.tatMin, model.baseModel.tat,
                    model.sequence,
                    model.times, model.thinkTimeMin, model.thinkTime)
            this._sequence = tmpModel.sequence;
        }
        
        this._times = model.times || 1;   // イベントシーケンスの繰り返し回数
        this._thinkTime = Math.max(0, model.thinkTime) || 500;   // イベントシーケンス終了時に再実行する場合の平均再開時間
        this._thinkTimeMin = Math.max(0, model.thinkTimeMin) || 500;   // イベントシーケンス終了時に再実行する場合の最小再開時間
        this._startTime = 0;      // イベントシーケンス開始時刻（UNIX時刻：ミリ秒）
        this._sequenceIdx = 0;    // シミュレータに登録したイベントシーケンスの位置
        this._sequenceTime = 0;   // シミュレータに登録したイベントの時刻
    }

    /** @private */
    //

    // public
    /**
     * 取引を開始する
     * 
     * @function
     * @memberof HJN.util.VirtualApp
     * @param {Number}
     *            startTime 開始時刻（UNIX時刻：ミリ秒）
     * @return {Object}仮想アプリケーション(this)
     */
    proto.start = function(startTime) {
        this._times--; // イベントシーケンスの繰り返し回数を1減らす
        this._startTime = +startTime;      // イベントシーケンス開始時刻（UNIX時刻：ミリ秒）
        this._sequenceIdx = 0;    // シミュレータに登録したイベントシーケンスの位置
        this._sequenceTime = +startTime;   // シミュレータに登録したイベントの時刻
        return this;
    };

    /**
     * イベント時刻を返却する
     * 
     * @function
     * @memberof HJN.util.VirtualApp
     * @return {Number} イベント時刻（UNIX時刻：ミリ秒）
     */
    proto.getTime = function() {
        return this._sequenceTime;
    };

    /**
     * リソース使用量を返却する
     * 
     * @function
     * @memberof HJN.util.VirtualApp
     * @param {Object}
     *            [resource| 指定なしのとき1.0を返却する] リソース
     * @return {Number} リソース使用量
     */
    proto.getAmount = function(resource) {
        return 1.0;
    };

    /**
     * 次の状態に遷移する、シーケンス終了時TATログを出力する
     * 
     * @function
     * @memberof HJN.util.VirtualApp
     * @param {eTat}
     *            eTat ログ出力先
     * @param {Object}
     *            system VirtualSystem
     * @return {Array}再スケジュールする仮想アプリケーションの配列、登録処理完了時はthisを含まない
     */
    proto.next = function(eTat, system) {
        var vApps = []; // 戻り値
        if (this._sequenceIdx < this._sequence.length) { // イベントシーケンス処理途中のとき
            var seq = this._sequence[this._sequenceIdx]; // 現在の処理シーケンス位置
            
            if (seq.hold && seq.hold !== "") {
                // holdリソースがあるときリソースを取得する
                vApps = system.getResouce(seq.hold).hold(this);
            } else {
                // holdリソースがないとき
                vApps.push(this);
            }
            
            // リソースを確保できたとき、thisの処理を完了させる
            if (0 < vApps.length) {
                // 完了した処理の処理時間を加える
                var tatAdd = Math.ceil(HJN.util.Random().exponential(seq.tat - seq.tatMin));
                this._sequenceTime += seq.tatMin + tatAdd;
                // 処理完了に伴うリソース（freeで指定）の解放
                if (seq.free) {
                    for (var i = 0; i < seq.free.length; i++) {
                        vApps = vApps.concat(system.getResouce(seq.free[i]).free(this));
                    }
                }
                // 次の処理を参照する（ シミュレータに登録したイベントシーケンスの位置）
                this._sequenceIdx++;
            }
        } else { // イベントシーケンスを終えたとき
            // TATログを出力する
            eTat.push( {x: this._sequenceTime,
                        y: Math.round(this._sequenceTime - this._startTime), 
                        sTatIdx: 0,
                        message: this._userName} );
            // 継続判定
            if (0 < this._times) { // イベントシーケンスを繰り返すとき
                // イベント時刻にThink time（指数分布）を加える
                this._sequenceTime += this._thinkTimeMin;
                if (this._thinkTimeMin < this._thinkTime) {
                    this._sequenceTime += HJN.util.Random().exponential(
                                        this._thinkTime - this._thinkTimeMin);
                }
                this._times--; // イベントシーケンスの繰り返し回数を1減らす
                // 処理の先頭に戻る
                this._startTime = this._sequenceTime;
                this._sequenceIdx = 0;
                vApps.push(this);
            } else { // イベントシーケンスを継続しない時
                // return [];
            }
        }
        return vApps;
    };
    
    /**
     * Freeに伴い、次の状態に遷移する
     * 
     * @function
     * @memberof HJN.util.VirtualApp
     * @param {Number}
     *            [time | 変更しない} イベント時刻（UNIX時刻：ミリ秒）
     */
    proto.nextByFree = function(time) {
        // 解放された時刻をイベント時刻に設定する
        if (typeof(time) == "number") this._sequenceTime = time;
        // 次の処理を参照する（ シミュレータに登録したイベントシーケンスの位置）
        this._sequenceIdx++;
    };
    
    /* new */
    return VirtualApp;
}());



/**
 * VirtualResource
 * 
 * @class
 * @name VirtualResource
 * @memberof HJN.util
 * @classdesc仮想リソース
 * @param {String}
 *            [name = "unlimited"] リソース名（"unlimited"はリソース解放待ちを管理しない）
 * @param {Number}
 *            [capacity = 1] 保有リソース総量（数）
 * @param {Number}
 *            [timeout = 10秒] 解放待ちタイムアウト時間
 */
HJN.util.VirtualResource = (function() { // #53
    "use strict";
    /** @static */
    var proto = VirtualResource.prototype = {
            // クラス変数 _xxx: 0
    };
    /** @constructor */
    function VirtualResource(name, capacity, timeout){
        if(!(this instanceof VirtualResource)){
            return new VirtualResource(name, capacity);
        }
        this._name = name || "unlimited";   // リソース名
        this._capacity = capacity || 1.0;       // 保有リソース量（数）
        this._timeout = timeout || 10000;   // 解放待ちタイムアウト時間

        this._remaining = this._capacity;     // 残リソース量（数）
        this._waitQueue = HJN.util.Heap(    // リソース解放待ちキュー（登録時間順）
                function(obj){ return obj.getTime(); });
    }

    /** @private */
    //

    // public
    /**
     * リソースを取得する
     * 
     * @function
     * @memberof HJN.util.VirtualResource
     * @param {Object}
     *            vApp リソースにhold要求する仮想AP
     * @return {Array} スケジューラに登録するイベントの配列([vApp] | [])
     */
    proto.hold = function(vApp) {
        if (this._name == "unlimited") return [vApp]; // リソース解放待ちを管理しないとき
        
        var amount = vApp.getAmount(this); // 消費リソース量(デフォルト1.0）
        if (amount <= this._remaining) { // リソースを取得できるとき
            this._remaining -= amount;  // 残リソース量（数）を減らす
            return [vApp];           
        } else { // リソース解放待ちとなるとき
            this._waitQueue.push(vApp);
            return []; // リソース解放待ちタイムアウトイベント ToDo
        }
    };

    /**
     * リソースを解放する
     * 
     * @function
     * @memberof HJN.util.VirtualResource
     * @param {Object}
     *            vApp リソースにfree要求する仮想AP
     * @return {Array} スケジューラに登録するイベントのリスト
     */
    proto.free = function(vApp) {
        if (this._name == "unlimited") return []; // リソース解放待ちを管理しないとき
        var vApps = []; // 戻り値
        this._remaining += vApp.getAmount(this); // 解放した分、残リソース量（数）を増やす(デフォルト1.0）
        while (0 < this._waitQueue.size() && 0 < this._remaining){ // リソースに余裕がある間
            var amount = this._waitQueue.top().getAmount(this); // 次のリソース解放待ちキューの使用量
            if (amount <= this._remaining) { // リソースに余裕があるとき
                var app = this._waitQueue.pop(); // リソース解放待ちキューからfreeするappを取り出す
                app.nextByFree(vApp.getTime()); // appにfree時刻をセットする
                vApps.push(app); // appをスケジュールイベントに登録する
                this._remaining -= amount; // 残リソースを更新
            }
        }
        return vApps;
    };
    
    /* new */
    return VirtualResource;
}());
