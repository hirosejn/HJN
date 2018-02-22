import {Logger} from './util.js';

/**
 * @memberOf Util
 * @class DraggableBox
 * @classdesc 追加する挙動の操作要素は、後に記述した挙動の要素が上位になる 参考
 *            {@link https://q-az.net/elements-drag-and-drop/}
 * @param {DOM}
 *            element ドラッグ機能を付与するDOM要素
 * @constructor
 */
export default function DraggableBox(element){
    this._element = element;    // 挙動を追加する要素
    this._wrapper = {};         // マウスイベントを取得するdivを追加する下地要素
    
    // width,height :100%が有効となるようposition: absoluteを指定する
    element.style.position = "absolute";
    // ドラッグ＆ドロップ用divを作成する(下地のみクリック透過）
    this._wrapper = document.createElement('div');
    setStyles(this._wrapper, { background : "rgba(192,192,192,0.1)",
        position : "absolute", width : "100%", height : "100%", top : "0", left : "0",
        "pointer-events": "none"});
    // ドラッグ＆ドロップ用divを登録する
    this._element.appendChild(this._wrapper);
}

// グローバル（のような）変数
var pos = {};        // マウス押下時の位置情報の保管用

/**
 * CSSクラス名"hjnDraggableBox"が付いた要素をドラッグ＆ドロップで移動できるようにする
 * 
 * @memberOf Util
 * @example .hjnDraggableBox {} .hjnDraggableItem:hover {cursor: move;
 *          background: rgba(128, 128, 128, 0.5); transition: all 0.2s; }
 * @example <div class="hjnDraggableBox"></div>
 */
DraggableBox.enableDraggableClass = function(){
    var elements = document.getElementsByClassName("hjnDraggableBox");  // 要素の取得
    // マウスが要素内で押されたとき、又はタッチされたとき発火
    for(var i = 0; i < elements.length; i++){
        var element = new DraggableBox(elements[i]);
        element     // 移動指定要素がリサイズ指定要素よりが下になるよう、移動を先に記述する
            .makeMoveable()
            .makeResizable();
    }
}

/**
 * ダイアログを生成し表示する
 * 
 * @memberOf Util
 * @param {String}
 *            [iHtml="no message"] ダイアログのinnerHTMLに設定する文字列
 * @param {DOM}
 *            [element=document.body] ダイアログの位置とサイズを指定する際の基準となる要素
 * @param {String}
 *            [id="HJN.dialog"] ダイアログ要素のid名、同一名称のダイアログを閉じて作成する
 * @param {Number}
 *            [w=40] elementに対するダイアログの幅の比率％
 * @param {Number}
 *            [h=40] elementに対するダイアログの高さの比率％
 * @param {Object}
 *            [style={ width: w+"%", height: h+"%", left: 50-w/2+"%", top:
 *            50-h/2+"%", position: "absolute", background: "rgba(255, 255, 255,
 *            0.8)", border: "medium solid #aaa"}] ダイアログ背景のCSSスタイル
 * @memberOf Util.DraggableBox
 */
DraggableBox.createDialog = function(iHtml, element, id, w, h, style){
    iHtml = iHtml || "no message";
    element = element || document.body;
    style = style || {};
    id = id || "HJN.dialog";
    w = w || 40; // 幅40%
    h = h || 40; // 高さ40%
    // 既存の同一idの要素を削除する
    var div = document.getElementById(id);
    if (div) { div.parentElement.removeChild(div);}
    // ダイアログ要素を作成する
    div = document.createElement('div');
    div.id = id;
    element.appendChild(div);
    div.innerHTML ="<iframe></iframe>";
    setStyles(div.children[0],
            {width: "100%", height: "100%", border: 0, "pointer-events": "auto"});
    var body = document.createElement('body');
    body.innerHTML = "<body>" + iHtml + "</body>";
    div.children[0].contentDocument.body = body;
    // スタイルを設定する（デフォルト：縦横40%（親サイズに連動）で中央に配置）
    setStyles(div, style, 
            { width: w+"%", height: h+"%", left: 50-w/2+"%", top: 50-h/2+"%",
              position: "absolute",
              background: "rgba(255, 255, 255, 0.8)", border: "medium solid #aaa"});
    var draggable = new DraggableBox(div);
    draggable        // 移動指定要素がリサイズ指定要素よりが下になるよう、×ボタン、移動、リサイズの順に記述する
        .makeRemovable()
        .makeMoveable()
        .makeResizable();
}

/**
 * ×ボタンによる要素削除機能を付与する
 * 
 * @memberOf Util
 * @param {Object}
 *            [style={cursor: "move", top:"0", left:"50%", width:"100%",
 *            height:"20px"};] ×ボタン要素のCSSスタイル
 * @return this
 */
DraggableBox.prototype.makeRemovable = function(style) {
    // inputタグを追加する
    // <input id="hjnDialog" type="checkbox" class="hjnBurger" checked="checked"
    // onChange="..."/>
    var input = document.createElement("input");
    input.type = "checkbox";
    input.id = "hjnDialog";
    input.classList.add("hjnBurger");
    input.checked = true;
    input.onchange = function(){
                var e = this.parentElement.parentElement;
                e.parentElement.removeChild(e); };
    this._wrapper.appendChild(input);
    // ×ボタンlabelタグを追加する
    // <label for="hjnDialog"><span></span></label>
    var label = document.createElement("label");
    label.classList.add("hjnCtrlBox");
    label.htmlFor = input.id;
    label.appendChild(document.createElement("span"));
    setStyles(label, style, { top:"4px", right: "4px", 
        position: "absolute", background: "transparent"});
    this._wrapper.appendChild(label);
    return this;
}
/**
 * ドラッグによる移動機能を付与する
 * 
 * @memberOf Util
 * @param {Object}
 *            [style={cursor: "move", top:"0", left:"50%", width:"100%",
 *            height:"20px"};] ドラッグ移動機能要素のCSSスタイル
 * @return this
 */
DraggableBox.prototype.makeMoveable = function(style) {
    // 制御用divを追加する
    this.addHandleElement(elementMove, style, // 上：20px
            {cursor: "move", top:"0",  left:"50%", width:"100%", height:"20px"},
            "inside");
    return this;
}
/**
 * ドラッグによる リサイズ機能を付与する
 * 
 * @param {object}
 *            [style] リサイズ機能要素のCSSスタイルを、デフォルトから変更する際に指定
 * 
 * @return this
 */
DraggableBox.prototype.makeResizable = function(style) {
    // 制御用divを追加する
    this.addHandleElement(elementUpper,  style,  // 上:Upper
            {cursor: "ns-resize", top:"0",    left:"50%", width:"100%"});
    this.addHandleElement(elementBottom, style,  // 下:Bottom
            {cursor: "ns-resize", top:"100%", left:"50%", width:"100%"});
    this.addHandleElement(elementLeft,   style,  // 左:Left
            {cursor: "ew-resize", top:"50%",  left:"0",   height:"100%"});
    this.addHandleElement(elementRight,  style,  // 右:Right
            {cursor: "ew-resize", top:"50%",  left:"100%",height:"100%"});
    this.addHandleElement(elementUpperLeft,  style,  // 左上:UpperLeft
            {cursor: "nwse-resize", top:"0",    left:"0"});
    this.addHandleElement(elementUpperRight, style,  // 右上:UpperRight
            {cursor: "nesw-resize", top:"0",    left:"100%"});
    this.addHandleElement(elementBottomLeft, style,  // 左下:BottomLeft
            {cursor: "nesw-resize", top:"100%", left:"0"});
    this.addHandleElement(elementBottomRight,style,  // 右下:BottomRight
            {cursor: "nwse-resize", top:"100%", left:"100%"});
   return this;
}
/**
 * マウスクリック用要素を追加
 * 
 * @param {Function}
 *            func マウス押下時に発火する処理
 * @param {object}
 *            [style] elementに設定するスタイル
 * @param {object}
 *            [styleD={top:"0", left:"0" width:"5px", height:"5px"}]
 *            elementに設定するデフォルトスタイル（styleに同じ属性がある場合styleが優先される）
 * @param {String}
 *            [transform="over"] paddingに対する要素の位置
 *            "onFrame":線上、"inside":内側、その他：指定文字列をtransformスタイルに設定
 * @param {String}
 *            [className="hjnDraggableItem"] マウスイベントを取得するdivに設定するCSSクラス名
 */
DraggableBox.prototype.addHandleElement = function(func, style, styleD, transform, className) {
    style = style || {};
    styleD = styleD || {};
    transform = transform || "onFrame";
    for (var property in style) styleD[property] = style[property];
    
    var div = document.createElement('div');
    div.classList.add(className || "hjnDraggableItem");
    // 要素がpaddingの内側になるtransform設定値を求める
    // 例：上下左右中央の時"translateY(-50%) translateX(-50%)"
    if (transform === "onFrame") {
        transform = 'translateX(-50%) translateY(-50%)';
    } else if (transform === "inside"){
        transform = 'translateX(-' + (styleD.left || 0) + ') translateY(-' + (styleD.top || 0) + ')';
    }
    // スタイルを設定する（デフォルト：縦横10pxで左上{top:0,ledt:0}に配置）
    setStyles(div, styleD, 
            { width : "5px", height : "5px", position : "absolute", transform : transform });
    // 要素を追加する
    this._wrapper.appendChild(div);
    // 追加した要素に、マウス押下時の処理を登録する
    div.addEventListener("mousedown", func, false);
    div.addEventListener("touchstart", func, false);
};


// マウス押下後の発火関数定義（イベントリスナーに登録する関数を指定）
function elementMove(e)       {dragStart(e, this, draggingMove,        dragEndMove       ); }
function elementUpper(e)      {dragStart(e, this, draggingUpper,       dragEndUpper      ); }
function elementBottom(e)     {dragStart(e, this, draggingBottom,      dragEndBottom     ); }
function elementLeft(e)       {dragStart(e, this, draggingLeft,        dragEndLeft       ); }
function elementRight(e)      {dragStart(e, this, draggingRight,       dragEndRight      ); }
function elementUpperLeft(e)  {dragStart(e, this, draggingUpperLeft,   dragEndUpperLeft  ); }
function elementUpperRight(e) {dragStart(e, this, draggingUpperRight,  dragEndUpperRight ); }
function elementBottomLeft(e) {dragStart(e, this, draggingBottomLeft,  dragEndBottomLeft ); }
function elementBottomRight(e){dragStart(e, this, draggingBottomRight, dragEndBottomRight); }
// マウスドラッグ時の挙動定義（マウス移動距離に乗算する値を定義）
function draggingMove(e)       {dragging(e, {posX: 1, posY: 1, width: 0, height: 0 }); }  // 移動
function draggingUpper(e)      {dragging(e, {posX: 1, posY: 1, width: 0, height:-1 }); }  // 上リサイズ
function draggingBottom(e)     {dragging(e, {posX: 0, posY: 0, width: 0, height: 1 }); }  // 下リサイズ
function draggingLeft(e)       {dragging(e, {posX: 1, posY: 0, width:-1, height: 0 }); }  // 左リサイズ
function draggingRight(e)      {dragging(e, {posX: 0, posY: 0, width: 1, height: 0 }); }  // 右リサイズ
function draggingUpperLeft(e)  {dragging(e, {posX: 1, posY: 1, width:-1, height:-1 }); }  // 左上リサイズ
function draggingUpperRight(e) {dragging(e, {posX: 0, posY: 1, width: 1, height:-1 }); }  // 右上リサイズ
function draggingBottomLeft(e) {dragging(e, {posX: 1, posY: 0, width:-1, height: 1 }); }  // 左下リサイズ
function draggingBottomRight(e){dragging(e, {posX: 0, posY: 0, width: 1, height: 1 }); }  // 右下リサイズ
// マウス解放後の発火関数定義（イベントリスナーから解放する関数を指定）
function dragEndMove(e)       {dragEnd(draggingMove,        dragEndMove       ); }
function dragEndUpper(e)      {dragEnd(draggingUpper,       dragEndUpper      ); }
function dragEndBottom(e)     {dragEnd(draggingBottom,      dragEndBottom     ); }
function dragEndLeft(e)       {dragEnd(draggingLeft,        dragEndLeft       ); }
function dragEndRight(e)      {dragEnd(draggingRight,       dragEndRight      ); }
function dragEndUpperLeft(e)  {dragEnd(draggingUpperLeft,   dragEndUpperLeft  ); }
function dragEndUpperRight(e) {dragEnd(draggingUpperRight,  dragEndUpperRight ); }
function dragEndBottomLeft(e) {dragEnd(draggingBottomLeft,  dragEndBottomLeft ); }
function dragEndBottomRight(e){dragEnd(draggingBottomRight, dragEndBottomRight); }

/**
 * DOM要素にスタイル設定
 * 
 * @private
 * @param {DOM}
 *            element CSSスタイルを設定するDOM要素
 * @param {object}
 *            [style] elementに設定するスタイル {top:"50%", left:"50%"}
 * @param {object}
 *            [styleD] elementに設定するデフォルトスタイル {top:"50%", left:"50%"}
 */
function setStyles(element, style, styleD){
    // ポインタ操作の透過が指定されていないとき有効化にする（ダイアログなど上位レイヤで透過となっていることがあるため）
    styleD = styleD || {};
    styleD["pointer-events"] = styleD["pointer-events"] || "auto";
    // デフォルトスタイルを設定する
    for (var property in styleD) element.style[property] = styleD[property];
    // 指定スタイルを設定する
    for (var property in style) element.style[property] = style[property];
}

/**
 * マウス押下したときに発火する関数から呼ばれる
 * 
 * @private
 * @param {Event}
 *            e 発火イベント
 * @param {DOM}
 *            element マウス押下を発火したDOM要素（CALL元のthis)
 * @param {function}
 *            dragging マウス移動イベントに登録する関数消去するイベントに登録されている関数
 * @param {function}
 *            dragEnd 消去するイベントに登録する関数
 */
function dragStart(e, element, dragging, dragEnd) {
    // タッチイベントとマウスのイベントの差異を吸収する
    var event = (e.type === "mousedown") ? e : e.changedTouches[0];
    pos.pageX = event.pageX; 
    pos.pageY = event.pageY;
    // 親の親要素(hjnDraggableBox指定)内の相対座標を取得
    var grandparent = element.parentNode.parentNode;
    pos.offsetLeft = grandparent.offsetLeft;
    pos.offsetTop = grandparent.offsetTop;
    // margin補正値、縦横を取得
    var style = document.defaultView.getComputedStyle(grandparent);
    pos.marginLeft = parseInt(style.getPropertyValue("margin-left")) || 0;
    pos.marginTop = parseInt(style.getPropertyValue("margin-top")) || 0;
    pos.width = parseInt(style.getPropertyValue("width")) || 0;
    pos.height = parseInt(style.getPropertyValue("height")) || 0;

    // 処理範囲外のとき何もしない
    // if (pos.y > 10) return;

    // ムーブイベントにコールバック
    document.body.addEventListener("mousemove", dragging, false);
    document.body.addEventListener("touchmove", dragging, false);
    // 親の親要素（hjnDraggableBox指定)に、CSSクラス"drag"を追加
    grandparent.classList.add("drag");
    // マウスボタンが離されたとき、またはカーソルが外れたときに発火するイベントを登録する
    var drag = document.getElementsByClassName("drag")[0];
    drag.addEventListener("mouseup", dragEnd, false);
    drag.addEventListener("touchend", dragEnd, false);
    document.body.addEventListener("mouseleave", dragEnd, false);
    document.body.addEventListener("touchleave", dragEnd, false);
}
/**
 * 親の親要素をマウス押下後、マウスカーソルが動いたときに発火する関数から呼ばれる
 * 
 * @private
 * @param {Event}
 *            e 発火イベント
 * @param {Object}
 *            multiply 補正スタイル毎のマウスカーソル移動幅の掛け目<br>
 *            要素を移動する場合 {posX:1, posY:1, width:0, height:0}<br>
 *            左上リサイズの場合 {posX:1, posY:1, width:-1, height:-1}<br>
 *            右下リサイズの場合 {posX:0, posY:0, width:1, height:1}
 */
function dragging(e, multiply) {
    // タッチイベントとマウスのイベントの差異を吸収する
    var event = (e.type === "mousemove") ? e : e.changedTouches[0];
    // フリックしたときに画面を動かさないようにデフォルト動作を抑制する
    event.preventDefault();
    // マウスが動いた場所に要素を動かす（"drag"は同時に一つしか存在しない前提）
    var drag = document.getElementsByClassName("drag")[0];
    drag.style.left = pos.offsetLeft - pos.marginLeft 
                + multiply.posX * (event.pageX - pos.pageX) + "px";
    drag.style.top  = pos.offsetTop  - pos.marginTop
                + multiply.posY * (event.pageY - pos.pageY) + "px";
    drag.style.width  = pos.width  
                + multiply.width  * (event.pageX - pos.pageX) + "px";
    drag.style.height = pos.height 
                + multiply.height * (event.pageY - pos.pageY) + "px";
}
/**
 * マウスボタンが上がった場合、もしくは画面外にマウスが出た場合に発火する関数から呼ばれる
 * 
 * @private
 * @param {function}
 *            dragging 消去するイベントに登録されている関数
 * @param {function}
 *            dragEnd 消去するイベントに登録されている関数
 */
function dragEnd(dragging, dragEnd) {
    // イベントハンドラを消去する
    document.body.removeEventListener("mousemove", dragging, false);
    document.body.removeEventListener("touchmove", dragging, false);
    document.body.removeEventListener("mouseleave", dragEnd, false);
    document.body.removeEventListener("touchleave", dragEnd, false);
    
    var drag = document.getElementsByClassName("drag")[0];
    if (drag) {
        drag.removeEventListener("mouseup", dragEnd, false);
        drag.removeEventListener("touchend", dragEnd, false);
        // クラス名 .drag も消す
        drag.classList.remove("drag");
    }
}
