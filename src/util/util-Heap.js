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
export default (function() { // #55
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