/**
 * @memberOf TimeSeries
 * @class Cash
 * @classdesc キャッシュ
 *            <p>
 *            キャッシュを保持させるオブジェクト
 * @param {Number}
 *            [size=10] キャッシュ最大件数（未対応機能、設定は無視される）
 */
export default (function() {
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