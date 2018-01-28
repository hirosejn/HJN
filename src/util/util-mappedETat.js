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
export default (function() { // #18
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
var MappedArray = (function() {    // #18
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