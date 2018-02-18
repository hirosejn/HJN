import {Logger} from './util.js';

/**
 * @memberOf Util
 * @class DraggableBox
 * @classdesc 参考 {@link https://q-az.net/elements-drag-and-drop/}
 */
export default (function (){ 
    /** @constructor */
    function DraggableBox(){ 
        if(!(this instanceof DraggableBox)) return new DraggableBox();
    }

    var pos = {};        // 要素内のクリックされた位置を取得するグローバル（のような）変数

    /**
     * CSSクラス名"hjnDraggableBox"が付いた要素をドラッグ＆ドロップで移動できるようにする
     * 
     * @memberOf Util.DraggableBox
     * @example .hjnDraggableBox {}
     * .hjnDraggableItem:hover {cursor: move;  background: rgba(128, 128, 128, 0.5); transition: all 0.2s; }
     * @example <div class="hjnDraggableBox"></div>
     */
    DraggableBox.enableDraggableClass = function(){
        var elements = document.getElementsByClassName("hjnDraggableBox");  // 要素の取得
        // マウスが要素内で押されたとき、又はタッチされたとき発火
        for(var i = 0; i < elements.length; i++)  addDuDElement(elements[i]);
    }

    
    /**
     * クリック用要素を追加
     * @private
     * @param {DOM}
     *            element 下地divを追加するDOM要素
     */
    function addDuDElement(element){
        // width,height :100%が有効となるようposition: absoluteを指定する
        element.style.position = "absolute";
        // ドラッグ＆ドロップ用divを作成する
        var divDuD = document.createElement('div');
        setStyles(divDuD, { background : "rgba(0, 0, 0, 0)",
            position : "absolute", width : "100%", height : "100%", top : "0", left : "0" });
        // 制御用divを追加する
        addHandleElement(divDuD, {top:"50%", left:"50%"}, dud_mdown); // 中央
        addHandleElement(divDuD, {top:"0", left:"50%", width:"50%"}, dud_mdown); // 上
        addHandleElement(divDuD, {top:"100%", left:"50%", width:"50%"}, dud_mdown); // 下
        addHandleElement(divDuD, {top:"50%", left:"0", height:"50%"}, dud_mdown); // 左
        addHandleElement(divDuD, {top:"50%", left:"100%", height:"50%"}, dud_mdown); // 右
        addHandleElement(divDuD, {top:"0", left:"0"}, dud_mdown);       // 左上
        addHandleElement(divDuD, {top:"0", left:"100%"}, dud_mdown);    // 右上
        addHandleElement(divDuD, {top:"100%", left:"0"}, dud_mdown);    // 左下
        addHandleElement(divDuD, {top:"100%", left:"100%"}, dud_mdown); // 右下
        // ドラッグ＆ドロップ用divを登録する
       element.appendChild(divDuD);
    }

    /**
     * マウスクリック用要素を追加
     * @private
     * @param {DOM}
     *            element マウスイベントを取得するdivを追加する下地DOM要素
     * @param {object}
     *            style elementに設定するスタイル　{top:"50%", left:"50%"}
     * @param {Function}
     *            func マウス押下時に発火する処理
     * @param {String}
     *            [className="hjnDraggableItem"] マウスイベントを取得するdivに設定するCSSクラス名
     */
    function addHandleElement(element, style, func, className){
        var div = document.createElement('div');
        div.classList.add(className || "hjnDraggableItem");
        // 要素がpaddingの内側になるtransform設定値を求める 例："translateY(-50%) translateX(-50%)"
        var transform = "translateX(-" + (style.left || 0) + ") translateY(-" + (style.top || 0) + ")";
        // スタイルを設定する（デフォルト：縦横10pxで左上{top:0,ledt:0}に配置）
        setStyles(div, style, { width : "10px", height : "10px", // background : "rgba(0, 0, 0, 0.2)",
            position : "absolute", transform : transform });
        // 要素を登録する
        element.appendChild(div);
        // マウス押下時の処理を登録する
        div.addEventListener("mousedown", func, false);
        div.addEventListener("touchstart", func, false);
    }
    /**
     * DOM要素にスタイル設定
     * @private
     * @param {DOM}
     *            element CSSスタイルを設定するDOM要素
     * @param {object}
     *            [style] elementに設定するスタイル　{top:"50%", left:"50%"}
     * @param {object}
     *            [styleD] elementに設定するデフォルトスタイル　{top:"50%", left:"50%"}
     */
    function setStyles(element, style, styleD){
        // デフォルトスタイルを設定する
        for (var property in styleD) element.style[property] = styleD[property];
        // 指定スタイルを設定する
        for (var property in style) element.style[property] = style[property];
    }

    /**
     * マウスが押された際の関数
     * @private
     * @param {DOM}
     *            element CSSスタイルを設定するDOM要素
     * @param {object}
     *            [style] elementに設定するスタイル　{top:"50%", left:"50%"}
     * @param {object}
     *            [styleD] elementに設定するデフォルトスタイル　{top:"50%", left:"50%"}
     */
    function dud_mdown(e) {
        // タッチデイベントとマウスのイベントの差異を吸収
        if(e.type === "mousedown") {
            var event = e;
        } else {
            var event = e.changedTouches[0];
        }
        // 親の親要素(hjnDraggableBox指定)内の相対座標を取得
        var grandparent = this.parentNode.parentNode;
        pos.x = event.pageX - grandparent.offsetLeft;
        pos.y = event.pageY - grandparent.offsetTop;
        // margin補正値を取得
        var style = document.defaultView.getComputedStyle(grandparent);
        pos.marginLeft = parseInt(style.getPropertyValue("margin-left")) || 0;
        pos.marginTop = parseInt(style.getPropertyValue("margin-top")) || 0;

        // 処理範囲外のとき何もしない
        //if (pos.y > 10) return;

        // 親の親要素（hjnDraggableBox指定)に、クラス名 .drag を追加
        this.parentNode.parentNode.classList.add("drag");
        // ムーブイベントにコールバック
        document.body.addEventListener("mousemove", dud_mmove, false);
        document.body.addEventListener("touchmove", dud_mmove, false);
    }
    /**
     * マウスカーソルが動いたときに発火
     * @private
     * @param {DOM}
     *            element マウス押下後、マウスカーソル移動が発火したDOM要素、
     */
    function dud_mmove(e) {
        // ドラッグしている要素を取得する（同時に一つしか存在しない前提）
        var drag = document.getElementsByClassName("drag")[0];
        // マウスとタッチの差異を吸収する
        if(e.type === "mousemove") {
            var event = e;
        } else {
            var event = e.changedTouches[0];
        }
        // フリックしたときに画面を動かさないようにデフォルト動作を抑制する
        e.preventDefault();

        // マウスが動いた場所に要素を動かす
        drag.style.left = event.pageX - pos.x - pos.marginLeft + "px";
        drag.style.top = event.pageY - pos.y - pos.marginTop + "px";

        // マウスボタンが離されたとき、またはカーソルが外れたときに発火するイベントを登録する
        drag.addEventListener("mouseup", dud_mup, false);
        drag.addEventListener("touchend", dud_mup, false);
        document.body.addEventListener("mouseleave", dud_mup, false);
        document.body.addEventListener("touchleave", dud_mup, false);
    }
    /**
     * マウスボタンが上がった場合、もしくは画面外にマウスが出た場合に発火
     * @private
     * @param {DOM}
     *            element マウス押下後、マウスボタンが上がり発火したDOM要素、
     */
    function dud_mup(e) {
        //イベントハンドラを消去する
        document.body.removeEventListener("mousemove", dud_mmove, false);
        document.body.removeEventListener("touchmove", dud_mmove, false);
        document.body.removeEventListener("mouseleave", dud_mup, false);
        document.body.removeEventListener("touchleave", dud_mup, false);
        
        var drag = document.getElementsByClassName("drag")[0];
        if (drag) {
            drag.removeEventListener("mouseup", dud_mup, false);
            drag.removeEventListener("touchend", dud_mup, false);
            //クラス名 .drag も消す
            drag.classList.remove("drag");
        }
    }

    
    return DraggableBox;
}());