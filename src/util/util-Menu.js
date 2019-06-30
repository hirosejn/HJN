/**
 * @memberOf Util
 * @class Menu
 * @classdesc Menu メニュー
 *            <p>
 *            メニューを操作する
 * @param {String}
 *            menuId メニューのID（メニュー要素をユニークに指定するID）
 * @param {String}
 *            [menuLabel=""] メニューのラベル
 * @param {String}
 *            funcName メニュー要素選択時に発行する関数名
 * 
 * @example // TopHogeBottom と表示するサブウィンドウを表示し、閉じる<br>
 *          var menu1 = new Util.Menu( "Usage of TAT log diver", divMenuId +
 *          "_HelpUsage", "HJN.init.Usage"); menu1.mekeAsDialog(
 *          "HJN.dialogUsage", 50 , 40);
 */
export default (function() { // #95
    /** @constructor */
    function Menu(menuId, menuLabel, funcName){ 
        if(!(this instanceof Menu)) return new Menu(id, label, funcName);

        this.menuId = menuId;
        this.menuLabel = menuLabel;
        this.funcName = funcName;
    }

    // private
    // クラス変数
    
    // メソッド
    
    // public
    /**
     * アコーディオンラベル用タグを取得する
     * 
     * @memberOf Util.Menu
     * @param {Object}
     *            that ラベル押下時のアコーディオン開閉ラジオボタン連動用の接頭語
     * @param {String}
     *            id ラベル押下時のアコーディオン開閉ラジオボタン連動用の接尾語（ユニークな英数字）
     * @param {String}
     *            labelText ラベル表示文字列
     * @param {Boolean}
     *            [isChecked=閉じた状態て初期表示] trueを指定したとき展開して初期表示
     * @return {String} html アコーディオンラベル用HTMLテキスト
     */
    Menu.getAccordionTag = function(that, id, labelText, isChecked) { // #31
        var isAccordion = true, // true:アコーディオン型 false:折りたたみ型 #21
        typeStr = isAccordion ? ' type="checkbox" name="accordion" '
                : ' type="radio" name="accordion" ', //
        checkedStr = ' checked="checked" ';

        return ''
                + '<input id="ac-' + that.chartIdName + id + '"' // 
                + typeStr + (isChecked ? checkedStr : '') + '">' // 
                + '<label for="ac-' + that.chartIdName + id + '">' //
                + labelText + '</label>';
    };

    /**
     * File Open用タグを取得する
     * 
     * @example
     * <ol>
     * <a><label>Child Menu<input type="file" id="xxx" multiple/></label></a>
     * </ol>
     * @memberOf Util.Menu
     * @param {String}
     *            [preLabel=""] ラベルの先頭文字列
     * @return {String} html メニュー要素の表示用HTMLテキスト
     */
    Menu.prototype.getFileOpenTag = function(preLabel) {
        preLabel = preLabel || "";

        return ''
                + '<ol><a><label class="hjnButton4Input">' + this.menuLabel // #51
                + '<input type="file" id="' + this.menuId + '"  multiple />'
                + '</label></a></ol>';
    };
    
    /**
     * ダウンロード処理に対応する
     * 
     * @memberOf Util.Menu
     * @param {String}
     *            [fileName="HJN_download"] ダウンロードファイル名
     * @return {Object} this
     */
    Menu.prototype.makeDownloadable = function(fileName) {
        this["fileName"] = fileName || "HJN_download";

        return this;
    };
    /**
     * ダウンロード用アンカータグを取得する
     * 
     * @example
     * <li><a id="xxx" href="#">Child Menu</a><li/>
     * @memberOf Util.Menu
     * @param {String}
     *            [preLabel=""] ラベルの先頭文字列
     * @return {String} html メニュー要素の表示用HTMLテキスト
     */
    Menu.prototype.getATag = function(preLabel) {
        preLabel = preLabel || "";

        return '' + '<li><a id="' + this.menuId + '" '
                + 'class="hjnButton4Input" href="#" ' // #51
                + 'download="' + this.fileName + '" ' //
                + 'onclick="' + this.funcName + '(' + "'" + this.menuId + "', '"
                + this.fileName + "'" + ')" ' + '>' + preLabel + this.menuLabel
                + '</a></li>';
    };

    /**
     * グローバルメソッド呼出用アンカータグを取得する
     * 
     * @example
     * <li><a id="xxx" href="#" onclick="funcName()">Child Menu</a></li>
     * @memberOf Util.Menu
     * @param {String}
     *            [preLabel=""] ラベルの先頭文字列
     * @return {String} html メニュー要素の表示用HTMLテキスト
     */
    Menu.prototype.getFuncTag = function(preLabel) { // #34
        preLabel = preLabel || "";
        
        return ''
                + '<li><a id="' + this.menuId + ' "'
                + 'class="hjnButton4Input" href="#" ' // #51
                + 'onclick="' + this.funcName + '()">' //
                + preLabel + this.menuLabel + '</a></li>';
    };
    
    
    /**
     * ポップアップダイアログ処理に対応する
     * 
     * @memberOf Util.Menu
     * @param {String}
     *            dialogId ダイアログのID（同一IDのダイアログは上書きされる）
     * @param {Number}
     *            [w=40] ダイアログの幅
     * @param {Number}
     *            [h=40] ダイアログの高さ
     * @return {Object} this
     */
    Menu.prototype.makePopupable = function(dialogId, w, h) {
        this["dialogId"] = dialogId;
        this["w"] = w || 40;
        this["h"] = h || 40;

        return this;
    };
    /**
     * ダイアログ用タグを取得する
     * 
     * @example
     * <ol>
     * <a id="xxx" class="hjnButton4Input"
     * onclick="HJN.init.ShowDialog(FUNC_NAME(), 'DIALOG_ID', w , h)">
     * <label>Child Menu</label></a>
     * </ol>
     * @memberOf Util.Menu
     * @param {String}
     *            [preLabel=""] ラベルの先頭文字列
     * @return {String} html メニュー要素の表示用HTMLテキスト
     */
    Menu.prototype.getDialogTag = function(preLabel) {
        preLabel = preLabel || "";

        return ''
            + '<ol><a id="' + this.menuId + '" '
            + 'class="hjnButton4Input" ' // #51
            + ' onclick="HJN.Util.Element.createDialog(' // #95
                + this.funcName + "()"+ ", " // #84
                + "false, " 
                + "'" + this.dialogId + "',"
                + this.w + ","
                + this.h +")" 
            + '"' + '>' // #79
            + '<label>' + preLabel + this.menuLabel + '</label></a></ol>';
    };
    /**
     * サブウィンドウ用タグを取得する
     * 
     * @example
     * <ol>
     * <a id="xxx" class="hjnButton4Input"
     * onclick="HJN.init.ShowDialog(FUNC_NAME(), 'DIALOG_ID', w , h)">
     * <label>Child Menu</label></a>
     * </ol>
     * @memberOf Util.Menu
     * @param {String}
     *            [preLabel=""] ラベルの先頭文字列
     * @return {String} html メニュー要素の表示用HTMLテキスト
     */
    Menu.prototype.getSubWindowTag = function(preLabel) { // #95
        preLabel = preLabel || "";

        return ''
        + '<ol><a id="' + this.menuId + '" '
        + 'class="hjnButton4Input" ' // #51
        + ' onclick="HJN.Util.SubWindow.createSubWindow(' // #95
            + this.funcName + "()"+ ", " // #84
            + "false, " 
            + "'" + this.dialogId + "',"
            + this.w + ","
            + this.h +")" 
        + '"' + '>' // #79
        + '<label>' + preLabel + this.menuLabel + '</label></a></ol>';
    };


    /* new */
    return Menu;
}());