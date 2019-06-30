/**
 * @memberOf Util
 * @class SubWindow
 * @classdesc SubWindow サブウィンドウ
 *            <p>
 *            サブウィンドウを操作する
 * 
 * @param {String}
 *            [name="HJN_subwindow"] サブウィンドウの名前（ウィンドウをユニークに指定する名前）
 * 
 * @example // TopHogeBottom と表示するサブウィンドウを表示し、閉じる<br>
 *          var sub = new SubWindow("SUB_NAME");
 *          sub.openHtml("hoge").appendHtml("Bottom").prependHtml("Top");
 *          sub.close();
 */
export default (function() { // #95
    /** @constructor */
    function SubWindow(name){ 
        if(!(this instanceof SubWindow)) return new SubWindow(name);

        this._name = name || "HJN_subwindow";
        SubWindow._map[name] = {};
    }

    // private
    // クラス変数
    SubWindow._map = {};
    // メソッド
    
    // public
    /**
     * サブウィンドウを表示する(HTML指定）<br>
     * Element.createDialog と同一引数
     * 
     * @memberOf Util.SubWindow
     * @param {String}
     *            [iHtml="no message"] サブウィンドウのbodyに設定する文字列
     * @param {DOM}
     *            [element=window] サブウィンドウの位置とサイズを指定する際の基準となるウィンドウ
     * @param {String}
     *            [id="HJN_subwindow"] サブウィンドウのid名、同一名称のダイアログを閉じて作成する
     * @param {Number}
     *            [w=40] ウィンドウに対するサブウィンドウの幅の比率％
     * @param {Number}
     *            [h=40] ウィンドウに対するサブウィンドウの高さの比率％
     * @param {Object}
     *            [style={bgColor: "rgba(255, 255, 255, 0.8)"}] ダイアログ背景のCSSスタイル
     */
    SubWindow.createSubWindow = function(iHtml, win, id, w, h, style){
        iHtml = iHtml || "no message";
        win = win || window;
        style = style || {};
        id = id || "HJN_subwindow";
        w = w || 40; // 幅40%
        h = h || 40; // 高さ40%

        // サブウィンドウ表示オプションを編集する
        var width  = Math.round(win.innerWidth  * ( w / 100 ));
        var height = Math.round(win.innerHeight * ( h / 100 ));
        var top    = Math.round(win.screenTop  + (win.innerHeight / 2) - (height / 2));
        var left   = Math.round(win.screenLeft + (win.innerWidth / 2) - (width  / 2));
        var opt = "width=" + width + ", height=" + height 
                + ", top=" + top + ", left=" + left
                + ", menubar=no, toolbar=no, location=no"
                + ", status=yes, resizable=yes, scrollbars=yes";

        // サブウィンドウを作成する
        var sub = new SubWindow(id);
        // サブウィンドウにHTMLを表示する（別ウィンドウ処理なのでスケジュールが反転しないよう非同期）
        HJN.Util.setZeroTimeout( function(){
            // HTMLを表示する
            sub.openHtml(iHtml, opt);

            // デフォルトスタイルを設定する
            var body = SubWindow._map[id].document.body;
            var styleD = {bgColor: "rgba(255, 0, 255, 0.8)"};
            for (var property in styleD) body.style[property] = styleD[property];
            // 指定スタイルを設定する
            for (var property in style) body.style[property] = style[property];
        });
    }
    
    /**
     * サブウィンドウを表示する(URI指定）
     * 
     * @memberOf Util.SubWindow
     * @param {String}
     *            [uri="about:blank"] サブウィンドウに表示するURI
     * @param {String}
     *            [opt="width=600, height=450 ,menubar=no, toolbar=no,
     *            location=no, status=yes, resizable=yes, scrollbars=yes"]
     *            サブウィンドウ生成時に指定するオプション
     * @return {Object} Window サブウィンドウ
     */
    SubWindow.prototype.openUri = function(uri, opt) {
        uri = uri || "about:blank";
        opt = opt || "width=600, height=450 "
            + ",menubar=no, toolbar=no, location=no, status=yes, resizable=yes, scrollbars=yes";
        // サブウィンドウが既に開いている時、閉じる
        var sub = SubWindow._map[this._name]; // サブウィンドウへの参照
        if (sub && (typeof sub.close === "function") && !sub.closed){
                sub.close();
        }
        // サブウィンドウを開く
        SubWindow._map[this._name] = sub = window.open(uri, this._name, opt);
        // サブウィンドウを最前面にする
        sub.blur();
        window.focus();
        window.blur();
        sub.focus();
        // サブウィンドウを返却する
        return sub;
    };
    /**
     * サブウィンドウを表示する(HTML指定）
     * 
     * @memberOf Util.SubWindow
     * @param {String}
     *            [body=""] サブウィンドウに表示するHTML
     * @param {String}
     *            [opt="width=600, height=450 ,menubar=no, toolbar=no,
     *            location=no, status=yes, resizable=yes, scrollbars=yes"]
     *            サブウィンドウ生成時に指定するオプション
     * @return {Object} this 自オブジェクト
     */
    SubWindow.prototype.openHtml = function(body, opt) {
        body = body || "";
        opt = opt || "width=600, height=450 "
            + ",menubar=no, toolbar=no, location=no, status=yes, resizable=yes, scrollbars=yes";
        // サブウィンドウを開く
        var sub = this.openUri("about:blank" ,opt);
        // サブウィンドウのHTML bodyを設定する
        sub.document.body.innerHTML = body;
        // 自オブジェクトを返却する
        return this;
    };
    /**
     * サブウィンドウを閉じる
     * 
     * @memberOf Util.SubWindow
     */
    SubWindow.prototype.close = function() {
        var sub = SubWindow._map[this._name]; // サブウィンドウへの参照
        // サブウィンドウを閉じる
        sub.close();
    };
    /**
     * サブウィンドウのHTML body の末尾にHTMLを追記する
     * 
     * @memberOf Util.SubWindow
     * @param {String}
     *            [html=""] 追記するHTML文字列
     * @return {Object} this 自オブジェクト
     */
    SubWindow.prototype.append = function(html) {
        html = html || "";
        var sub = SubWindow._map[this._name]; // サブウィンドウへの参照
        // サブウィンドウのHTML bodyに追記する
        sub.document.body.innerHTML += html;
        // サブウィンドウを返却する
        return win;
    };
    /**
     * サブウィンドウのHTML body の先頭にHTMLを追記する
     * 
     * @memberOf Util.SubWindow
     * @param {String}
     *            [html=""] 追記するHTML文字列
     * @return {Object} this 自オブジェクト
     */
    SubWindow.prototype.prepend = function(html) {
        html = html || "";
        var sub = SubWindow._map[this._name]; // サブウィンドウへの参照
        // サブウィンドウのHTML bodyに追記する
        sub.document.body.innerHTML = html + sub.document.body.innerHTML;
        // サブウィンドウを返却する
        return win;
    };
    
    /* new */
    return SubWindow;
}());