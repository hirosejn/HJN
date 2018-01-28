/**
 * @memberOf Util
 * @class　Config
 * @classdesc 定数設定機能（設定HTML作成機能付き）
 *            <p>
 *            日時、TATフォーマット指定機能追加用に作成
 * 
 * @param {String}
 *            [prefix=''] 定数の名前空間を一位に指定する文字列、指定しない場合グローバル
 * @param {String}
 *            [ol='ol'] インデント(.nDown() .nUp())に使うHTMLタグ
 * @example this._config = HjnConfig("m") // config設定画面定義
 *          .label(null,"------").n() // ラベルを表示し、改行
 *          .name("ENDIAN").label(null,"[endian(long field)]") //key:ENDIAN
 *          .radio(def("ENDIAN_LIL", true), null, "little", true) //表示ラベルと選択時設定値
 *          .radio(def("ENDIAN_BIG", false), null, "big");
 */
export default (function() { // #24
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
     * @memberof Config
     */
    Config.on = function(t) {
        if (t.type === "radio") { // radioのとき、nameに対して、選択されたキー値（idからprefixを削除した値）を登録
            this.prototype.__config[t.name] = t.id.substr(t.id.indexOf(".") + 1);
            // on呼出し関数が登録されているとき、登録関数を呼び出す #51
            var func = Config.GetConfig().getFunctionById(t.id); // #59
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
     * @memberof Config
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
     * @memberof Config
     */
    Config.prototype.getObjctById = function(id) {
        return this.__config[id];
    };
    /**
     * configに登録されているkey(prefix補填)の関数を取得する
     * 
     * @memberof Config
     */
    Config.prototype.getFunctionByKey = function(key) { // #59
        return Config.prototype.__config
                ._onFunctions[this._pre + this.getValueByKey(key)];
    };
    /**
     * configの指定Idに登録されている関数を取得する
     * 
     * @memberof Config
     */
    Config.prototype.getFunctionById = function(id) { // #53
        return Config.prototype.__config._onFunctions[id];
    };
    /**
     * configに登録されているkey(prefix補填)の設定値を取得する
     * 
     * @memberof Config
     */
    Config.prototype.getValueByKey = function(key) { 
        return this.getObjctById(this._pre + key);
    };
    /**
     * config設定用HTMLテキストを取得する
     * 
     * @memberof Config
     */
    Config.prototype.getHtml = function() { 
        return this._html + this._ole;
    };
    /**
     * keyに値を設定する
     * 
     * @memberof Config
     */
    Config.prototype.set = function(key, val) { 
        this.value[this._pre + key] = val;
    };
    
    // config作成用 メソッド
    /**
     * 定義＆設定画面作成用機能： 改行
     * 
     * @memberof Config
     */
    Config.prototype.n = function (str) {
        str = str || "";
        this._html += this._ole + str + this._ols;
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： ネスト一つ下げ
     * 
     * @memberof Config
     */
    Config.prototype.nDown = function () {
        this._html += this._ols;
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： ネスト一つ上げ
     * 
     * @memberof Config
     */
    Config.prototype.nUp = function () {
        this._html += this._ole;
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： nameを変更する（radio等の先頭で指定）
     * 
     * @memberof Config
     */
    Config.prototype.name = function (str) {
        this._nameHtml = str ? 'name="' + this._pre + str + '" ' : '';
        this._name = str;
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： ラベル要素(prefix+keyで関連付けるformのid属性となる)
     * 
     * @memberof Config
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
     * @memberof Config
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
                        'onchange="Config.on(this);" ' +
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
     * @memberof Config
     */
    Config.prototype.number = function (key, pLabel, sLabel, val, attribute) {
        Config.prototype.labeledForm.call(this, key, "number", "", 
                                pLabel, sLabel, val, attribute);
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： テキストボックス要素で、数値を設定
     * 
     * @memberof Config
     */
    Config.prototype.text = function (key, pLabel, sLabel, val, attribute) {
        Config.prototype.labeledForm.call(this, key, "text", "", 
                                pLabel, sLabel, val, attribute);
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： ラジオボタン要素で、選択肢の一つを設定
     * 
     * @memberof Config
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