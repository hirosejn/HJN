/**
 * @memberOf Util
 * @class Config
 * @classdesc 定数設定機能（設定HTML作成機能付き）
 *            <p>
 *            日時、TATフォーマット指定機能追加用に作成
 * 
 * @param {String}
 *            [prefix=''] 定数の名前空間を一位に指定する文字列、指定しない場合グローバル
 * @param {String}
 *            [ol='ol'] インデント(.nDown() .nUp())に使うHTMLタグ
 * @param {String}
 *            [globalName='HJN'] Configを登録するグローバル変数(window)の変数名
 * @example this._config = HjnConfig("m") // config設定画面定義
 *          .label(null,"------").n() // ラベルを表示し、改行
 *          .name("ENDIAN").label(null,"[endian(long field)]") //key:ENDIAN
 *          .radio(def("ENDIAN_LIL", true), null, "little", true) //表示ラベルと選択時設定値
 *          .radio(def("ENDIAN_BIG", false), null, "big");
 */
export default (function() { // #24
    /** @static */
    Config.prototype.__config = {};   // config設定コンテナ
    Config.prototype.__config._onFunctions = {}; // 関数登録用
    Config.prototype.__config.__keyConfig = {};  // キー値登録用

    /** @constructor */
    function Config(prefix, ol, globalName){ 
        if(!(this instanceof Config)) return new Config(prefix, ol, globalName);

        // グローバル変数(window)にHJN.Configを登録する #74
        this._globalName = globalName || "HJN";
        var globalConfig = window[this._globalName].Config;
        globalConfig = globalConfig || Config;

        this._prefix = prefix; // #76
        this._pre = (prefix || '') + "."; // 各フィールド、要素の名称のプレフィックス(区切り文字".")
        this._ols = ol ? '<' + ol + '>' : '<ol>';   // リストに使用する要素（初期値 ol )
        this._ole = ol ? '</' + ol + '>' : '</ol>';
        this._html = this._ols; // config設定画面のHtml
        this._nameHtml = '';    // HTMLタグの name属性指定
        this._name = '';        // radioのConfig.get用

        if (globalConfig[prefix] === undefined){
            globalConfig[prefix] = this;
            return this;
        } else {
            return globalConfig[prefix]; 
        }
    }

    /**
     * HTML要素の値が変更した時に、configに当該要素を登録する
     * 
     * @memberof Util.Config
     */
    Config.on = function(t) {
        var funcId = t.id;
        if (t.type === "radio") { // radioのとき、nameに対して、選択されたキー値（idからprefixを削除した値）を登録
            this.prototype.__config[t.name] = t.id.substr(t.id.indexOf(".") + 1);
        }else if (t.type === "number") {    // numberのとき、idに、value(入力値)を数値として登録
            this.prototype.__config[t.id] = +t.value;
        } else if (t.type === "select-one") {    // selectのとき、idに、valueの設定値を登録
            this.prototype.__config[t.id] = this.prototype.__config.__keyConfig[t.value].getConfig();
            funcId = t.value;
        } else {                            // textのとき、idに、value(入力値)を登録
            this.prototype.__config[t.id] = t.value;
        }
        // on呼出し関数が登録されているとき、登録関数を呼び出す #51
        var func = Config.GetConfig().getFunctionById(funcId); // #59
        if(typeof(func) === "function") func();
    };

    /**
     * Configリポジトリ管理インスタンスを取得する
     * 
     * @memberof Util.Config
     * @example  
     * Config.GetConfig("File") === Config("File"); // true 既に登録されているとき
     */
    Config.GetConfig = function(prefix) { // #59
        return new Config(prefix);
    }
    
    /** @private */
    //

    // public
    /**
     * keyの値に指定されたvalue（なければkey値）を返却する
     * 
     * @memberof Util.Config
     * @param {String}
     *            key Conginのキー値
     */
    Config.prototype.getConfig = function(key) {
        var cKey = this.getValueByKey(key);
        var keyConfig = Config.prototype.__config.__keyConfig[this._pre + cKey];
        if(!keyConfig || keyConfig.value === undefined){
            return cKey;    // valueが定義されていないとき、keyの設定値を返却
        }else{
            return keyConfig.getConfig(); // keyの設定値のvalueが定義されているとき
        }
    };
    /**
     * configに登録されているid(=prefix+key)の設定値を取得する
     * 
     * @memberof Util.Config
     */
    Config.prototype.getObjctById = function(id) {
        // return this.__config[id];
        return Config.prototype.__config[id];
    };
    /**
     * configに登録されているkey(prefix補填)の設定値を取得する
     * 
     * @memberof Util.Config
     */
    Config.prototype.getValueByKey = function(key) { 
        return Config.prototype.__config[this._pre + key];
    };
    /**
     * configにkey(prefix補填)に値を設定する
     * 
     * @memberof Util.Config
     */
    Config.prototype.setValueByKey = function(key, val) { 
        Config.prototype.__config[this._pre + key] = val;
    };
    /**
     * configの指定Idに登録されている関数を取得する<br>
     * 
     * @memberof Util.Config
     * @example  //  Config.onでradioボタン選択時に関数を呼ぶ場合に使用
     * var func = Config.GetConfig().getFunctionById(t.id);
     */

    Config.prototype.getFunctionById = function(id) { // #53
        return Config.prototype.__config._onFunctions[id];
    };
    /**
     * configに登録されているkey(prefix補填)の関数を取得する
     * 
     * @memberof Util.Config
     * @example Util.Config.GetConfig("Simulator").getFunctionByKey("S_SIMU")();
     */
    Config.prototype.getFunctionByKey = function(key) { // #59
        return Config.prototype.__config._onFunctions[this._pre + this.getValueByKey(key)];
    };
    /**
     * 指定keyに登録されている関数を取得する
     * 
     * @memberof Util.Config
     */
    Config.prototype.getFunction = function(key) { // #76
        return Config.prototype.__config._onFunctions[this._pre + key];
    };
    /**
     * 指定keyに関数を登録する
     * 
     * @memberof Util.Config
     */
    Config.prototype.setFunction = function(key, func) { // #76
        Config.prototype.__config._onFunctions[this._pre + key] = func;
    };
    

    /**
     * config設定用HTMLテキストを取得する
     * 
     * @memberof Util.Config
     */
    Config.prototype.getHtml = function() { 
        return this._html + this._ole;
    };
    /**
     * keyに値を設定する
     * 
     * @memberof Util.Config
     */
    Config.prototype.set = function(key, val) { 
        this.value[this._pre + key] = val;
    };
    
    // config作成用 メソッド
    /**
     * 定義＆設定画面作成用機能： 改行
     * 
     * @memberof Util.Config
     */
    Config.prototype.n = function (str) {
        str = str || "";
        this._html += this._ole + str + this._ols;
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： ネスト一つ下げ
     * 
     * @memberof Util.Config
     */
    Config.prototype.nDown = function () {
        this._html += this._ols;
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： ネスト一つ上げ
     * 
     * @memberof Util.Config
     */
    Config.prototype.nUp = function () {
        this._html += this._ole;
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： nameを変更する（radio等の先頭で指定）
     * 
     * @memberof Util.Config
     */
    Config.prototype.name = function (str) {
        this._nameHtml = str ? 'name="' + this._pre + str + '" ' : '';
        this._name = str;
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： ラベル要素(prefix+keyで関連付けるformのid属性となる)
     * 
     * @memberof Util.Config
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
     * @memberof Util.Config
     */
    Config.prototype.labeledForm = function (key, type, typedAttribute,
                                pLabel, sLabel, val, attribute, check, cssClass) {
        var classStr = (cssClass) ? ' class="' + cssClass + '"' : ''; // #51
        // optionの時(select用）
        if (type === "option"){
            this._html += '<option value="' + this._pre + key + '"' + (typedAttribute || '') + '>' +
                    (pLabel ? pLabel : '') + (sLabel ? sLabel : '') + '</option>\n'
            return this;
        }
        // option以外の時
        this._html += '<label' + classStr + '>' + // #51
                    (pLabel ? pLabel : '') +
                    '<input type="' +type + '" ' +
                        (typedAttribute || '') + 
                        this._nameHtml +
                        'id="' + this._pre + key + '" '+ // idがユニークになるようkeyにprefixを付与
                        'onchange="' + this._globalName + '.Config.on(this);" ' + // #74
                        (val ? "value='" + val + "' " : "") +   // val は、キー値のまま #92
                        (attribute || '') + 
                        (check ? ' checked="checked;"' : '') +
                    '>' +
                    (sLabel ? sLabel : '') +
                    '</label>\n'; // #51
        // デフォルト指定があるとき configにデフォルト値を設定する
        if (type === "radio" && check) {    // radioのとき、nameに対して、選択状態のkeyを登録
            Config.prototype.__config[this._pre + this._name] = key;
        } else if (type === "number") { // numberのとき、keyに対する、val(入力値)を数値として登録
            Config.prototype.__config[this._pre + key] = +val;
        } else {    // textのとき、keyに対する、val(入力値)を登録
            Config.prototype.__config[this._pre + key] = val;
        }
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： テキストボックス要素で、文字列を設定
     * 
     * @memberof Util.Config
     */
    Config.prototype.number = function (key, pLabel, sLabel, val, attribute, func) {
        Config.prototype.labeledForm.call(this, key, "number", "", 
                                pLabel, sLabel, val, attribute);
        if (func) this.setFunction(key, func); // #74
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： テキストボックス要素で、数値を設定
     * 
     * @memberof Util.Config
     */
    Config.prototype.text = function (key, pLabel, sLabel, val, attribute) {
        Config.prototype.labeledForm.call(this, key, "text", "", 
                                pLabel, sLabel, val, attribute);
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： ラジオボタン要素で、選択肢の一つを設定
     * 
     * @memberof Util.Config
     */
    Config.prototype.radio = function (key, pLabel, sLabel, check, attribute, func) {
        Config.prototype.labeledForm.call(this, key, "radio", (check ? 'checked="checked;"' : ''),
                                pLabel, sLabel, "", attribute, check, "hjnLabel4Input");
        // 関数登録指定時、attributeを関数名として、指定関数を登録する #51
        if (func) this.setFunction(key, func);
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： セレクトボックス要素で、選択肢の一つを設定
     * 
     * @memberof Util.Config
     */
    Config.prototype.option = function (key, pLabel, sLabel, check, attribute, func) { // #74
        Config.prototype.labeledForm.call(this, key, "option", (check ? ' selected' : ''),
                                pLabel, sLabel, "", attribute, check, "hjnLabel4Input");
        // 関数登録指定時、attributeを関数名として、指定関数を登録する #51
        if (func) this.setFunction(key, func);
        // 逆引きリストに追加する 
        var reverseList = Config.prototype.__config.__keyConfig[this._pre + this._name] || {};
        var reverseVal = this._pre + key;
        var reverseKey = this.__config.__keyConfig[reverseVal].getConfig(); 
        reverseList[reverseKey] = reverseVal;
        Config.prototype.__config.__keyConfig[this._pre + this._name] = reverseList; 
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： option用タグの開始宣言（selectタグ用）
     * 
     * @memberof Util.Config
     */
    Config.prototype.startTag = function (type) { // #74
        this._tag = type || "";
        this._html += '<' + this._tag 
                            + ' id="' + this._pre + this._name + '"'
                            + 'class="hjnLabel4Input" onchange="HJN.Config.on(this);">\n'  ;
        return this;
    };
    /**
     * 定義＆設定画面作成用機能： option用タグの終了宣言（selectタグ用）
     * 
     * @memberof Util.Config
     */
    Config.prototype.endTag = function (type) { // #74
        this._html += '</' + this._tag + '>\n'
        this._tag = undefined;
        return this;
    };

    /**
     * 定義＆設定画面作成用機能： keyConfigの設定値を取得する
     * 
     * @memberof Util.Config
     */
    Config.prototype.getKeyConfig = function (key) { // #74
        return this.__config.__keyConfig[this._pre + key];
    };
    /**
     * 定義＆設定画面作成用機能： option設定値からoptionキー値を逆引きする（selectタグ用）
     * 
     * @memberof Util.Config
     */
    Config.prototype.getOptionKey = function (key, val) { // #74
        return this.__config.__keyConfig[this._pre + key][val];
    };
    /**
     * 定義＆設定画面作成用機能： 固定値を取得するキーの宣言<br>
     * __keyConfig["File.SEP_COMMA"] = {value: ",", getConfig: LF_ELSE.vから値を取得するfunction, onFunc: null}  
     * 
     * @memberof Util.Config
     * @param {String}
     *            key キー値
     * @param {Object}
     *            [val=key] 取得する固定値（getValueByKeyの返却値、デフォルト：keyと同じ文字列）
     * @param {function}
     *            [onFunc] onイベント時に実行する処理（メニューのa属性などで利用）
     */
    Config.prototype.def = function(key, val, onFunc) { // #76
        var _keyConf = Config.prototype.__config.__keyConfig[this._pre + key] = {};
        _keyConf.value = (val === undefined) ? key : val; // 
        _keyConf.getConfig = function () { return (val === undefined) ? key : val; };
        _keyConf.onFunc = onFunc || null; 
        return key;
    }
    /**
     * 定義＆設定画面作成用機能： 画面より値を取得するキーの宣言<br>
     * __keyConfig["File.LF_ELSE"] = {value: "LF_ELSE", getConfig: LF_ELSE.vから値を取得するfunction}  
     * 
     * @memberof Util.Config
     * @param {String}
     *            key キー値
     * @param {String}
     *            [fieldId=key+".v"] 値を取得する画面フィールドのキー
     */
    Config.prototype.v = function (key, fieldId) { // #76
        var _keyConf = Config.prototype.__config.__keyConfig[this._pre + key] = {};
        _keyConf.value = key;           // getValueByKeyの返却値（デフォルト：keyと同じ文字列）
        _keyConf.getConfig = function () {
                return Util.Config(this._prefix).getValueByKey(fieldId || key + ".v");
            };
        return key;
    };


    /**
     * HTMLの入力フィールドに、指定値を設定し、Configに反映する
     * 
     * @memberof Util.Config
     * @param {String}
     *            key Conginのキー値
     */
    Config.prototype.setText = function(key, val) { // #76
        var id = this._pre + key;
        document.getElementById(id).value = val;
        document.getElementById(id).onchange();
    }    
    /**
     * HTMLのselectorを、指定値を選択し、Configに反映する
     * 
     * @memberof Util.Config
     * @param {String}
     *            key Conginのキー値
     */
    Config.prototype.setSelector = function(key) { // #76
        var id = this._pre + key;
        document.getElementById(id).checked = true;
        document.getElementById(id).onchange();
    }    
    
    /* new */
    return Config;
}());