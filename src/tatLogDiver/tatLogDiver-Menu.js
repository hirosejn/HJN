import * as Util from '../util/util.js';
import * as Simulator from '../simulator/simulator.js';
import MenuConfigDetailGraph from './tatLogDiver-MenuConfigDetailGraph.js';

/**
 * tatLogDiverのメニューを追加する
 * 
 * @memberof tatLogDiver
 */
export default function Menu(that) {
    "use strict";
    // メニュー用のエレメントを取得する
    var divMenuId = that.chartIdName + "_menu";
    var divMenu = document.getElementById(divMenuId);
    // menu用divがないとき、chartの直前に追加する #13
    if (!divMenu) {
        var div = document.createElement('div');
        div.id = divMenuId;
        div.className = "menuBar";
        divMenu = that.chartId.parentNode.insertBefore(div, that.chartId);
    }
    // メニューボタン定義を登録する
    var g = that.globalName;
    // 上下段共通ボタンの定義(Download Menu)
    var menuDownloadImg = { // getATag
        menuLabel : "graph image(.png)",
        funcName : g + ".menuDownloadImg",
        menuId : divMenuId + "_DownloadImg",
        fileName : "graph.png"
    };
    var menuDownloadCsv = { // getATag
        menuLabel : "graph data(.csv)",
        funcName : g + ".menuDownloadCsv",
        menuId : divMenuId + "_DownloadCsv",
        fileName : "graph.csv"
    };
    var menuDownloadLog = { // getATag
        menuLabel : "graph log records(.csv)",
        funcName : g + ".menuDownloadLog",
        menuId : divMenuId + "_DownloadLog",
        fileName : "tatlog.csv"
    };
    var menuDownloadConc = { // getATag
        menuLabel : "conc log records(.csv)",
        funcName : g + ".menuDownloadConc",
        menuId : divMenuId + "_DownloadConc",
        fileName : "conclog.csv"
    };

    // メニューを追加する
    var accordion = document.createElement('div'); // 要素の作成
    var _id = 0;
    if (HJN.chart.chartId === that.chartId) { // 上段グラフ用機能のメニュー追加
        // File Menu
        var menuOpenCsv = { // getInputTag
            menuLabel : "Open csv data file",
            funcName : g + ".menuOpenCsv",
            menuId : divMenuId + "_OpenCsv "
        };
        var menuSaveConfig = { // getATag
            menuLabel : "save format (.json)",
            funcName : g + ".menuSaveConfig",
            menuId : divMenuId + "_SaveCongig",
            fileName : "hjnconfig.json"
        };
        var menuLoadConfig = { // getInputTag #10
            menuLabel : "load format (.json)",
            funcName : g + ".menuLoadConfig",
            menuId : divMenuId + "_LoadCongig"
        };
        accordion.innerHTML = '<li class="hjnMenuLv1">'
                + getAccordionTag(that, ++_id, "File")
                + '<ul class="hjnMenuLv2">'
                + getInputTag(menuOpenCsv)     // オープンボタン #24
                + Util.Config.File.getHtml()          // 設定HTML #76
                + getATag(menuSaveConfig)        // セーブボタン
                + getInputTag(menuLoadConfig) // ロードボタン #10
                + '</ul>' + '</li>';

        // Filter Menu #34
        var menuFilterApply = { // getFuncTag #34
            menuLabel : "Apply filter & reload",
            funcName : g + ".menuFilterApply",
            menuId : divMenuId + "_FilterApply"
        };
        var menuFilterReset = { // getFuncTag #34
            menuLabel : "Reset filter condition",
            funcName : g + ".menuFilterReset",
            menuId : divMenuId + "_FilterClear"
        };
        accordion.innerHTML += '<li class="hjnMenuLv1" id="menu_Filter">'
                + getAccordionTag(that, ++_id, "Filter")   
                + '<ul class="hjnMenuLv2">'   // #24
                + Util.Config.Filter.getHtml()     // 設定HMTL #76
                + getFuncTag(menuFilterApply)  // フィルターボタン
                + getFuncTag(menuFilterReset)   // クリアボタン
                + '</ul>' + '</li>';

        // Simulator Menu #53
        var menuSimulatorSimulate = {
            menuLabel : "Simulate",
            funcName : g + ".menuSimulatorSimulate",
            menuId : divMenuId + "_SimulatorSimulate"
        };
        var menuSimulatorEditor = {
            menuLabel : "JSON Editor(Open/Close)",
            funcName : g + ".menuSimulatorEditor",
            menuId : divMenuId + "_SimulatorEditor"
        };
        accordion.innerHTML += '<li class="hjnMenuLv1" id="menu_Simulator">'
                + getAccordionTag(that, ++_id, "Simulator")
                + '<ul class="hjnMenuLv2">' 
                + getFuncTag(menuSimulatorSimulate) // シミュレート実行ボタン
                + getFuncTag(menuSimulatorEditor)     // JSONエディタボタン
                + Util.Config.Simulator.getHtml()        // 設定HTML #74
                + '</ul>' + '</li>';
        // シミュレーション条件JSON Editエリアを設定する
        var divSimulator = document.getElementById("Simulator");
        var jsonEditor = document.createElement('div'); // 要素の作成
        jsonEditor.innerHTML = '<textarea id="SimulatorEditor" '
                + 'style="width:99%;border:none;resize:none;background:rgba(255,255,255,0.5);height:100%;">'
        divSimulator.appendChild(jsonEditor);
        var divSimulatorEditor = document.getElementById("SimulatorEditor");
        // divSimulatorEditor.readOnly = true; // #22
        divSimulatorEditor.value = Simulator.virtualSystemByJson
                .GetJsonConfig(); // デフォルトJSON

        // View Menu
        accordion.innerHTML += '<li class="hjnMenuLv1" id="menu_View">'
                + getAccordionTag(that, ++_id, "View", true)
                + '<ul class="hjnMenuLv2">' // 
                + '<li><div id="' + that.chartIdName + '_legend"></div></li>'
                + '</ul>' + '</li>';

        // Download Menu
        accordion.innerHTML += '<li class="hjnMenuLv1" id="menu_Download">'
                + getAccordionTag(that, ++_id, "Download")
                + '<ul class="hjnMenuLv2">'
                + getATag(menuDownloadImg, "Upper ")   // 上段画像ダウンロード ボタン
                + getATag(menuDownloadCsv, "Upper ")    // 上段グラフcsvダウンロード ボタン
                + getATag(menuDownloadLog, "Upper ")    // 上段生データダウンロードボタン
                + '</ul>' + '</li>';

        // メニュー登録
        divMenu.appendChild(accordion);
        // イベントリスナー登録
        document.getElementById(menuOpenCsv.menuId).addEventListener('change',
                that.menuOpenCsv.bind(that), false); // File Open用
        document.getElementById(menuLoadConfig.menuId).addEventListener(
                'change', that.menuLoadConfig.bind(that), false); // LoadConfig用

    } else { // 下段用グラフ機能のメニュー追加
        _id += 100;
        // Download Menu
        var chartDownloadUl = document.createElement('ul');
        chartDownloadUl.className = "hjnMenuLv2";
        chartDownloadUl.innerHTML = '' //
                + getATag(menuDownloadImg, "Detail ")    // 下段画像ダウンロードボタン
                + getATag(menuDownloadCsv, "Detail ")     // 下段グラフcsvダウンロードボタン
                + getATag(menuDownloadLog, "Detail ")     // 下段生データダウンロードボタン
                + getATag(menuDownloadConc, "Detail "); // 下段conc csvダウンロードボタン
        var chartDownload = document.getElementById("menu_Download");
        chartDownload.appendChild(chartDownloadUl);

        // View Menu
        var chartViewUl = document.createElement('ul');
        chartViewUl.className = "hjnMenuLv2";
        chartViewUl.innerHTML = '<li><div id="' + that.chartIdName
                + '_legend"></div></li>';
        var chartView = document.getElementById("menu_View");
        chartView.appendChild(chartViewUl);

        // "Bottom detail graph" Menu
        accordion.innerHTML = '<li class="hjnMenuLv1">'
                + getAccordionTag(that, ++_id, "Bottom detail graph", true)
                + '<ul class="hjnMenuLv2">' //
                
                + '<ol><div id="detailTimeRange">' 
                + Util.Config.DetailGraph.getHtml()     // 設定HMTL #76
                + '</div></ol>' // #51

                + '<li><div id="chartPlots"></div></li>' // Plot一覧用タグ
                + '</ul>' + '</li>';
        
        // Help Menu
        var menuHelpAbout = { // getAlertTag
            menuLabel : "about TAT log diver",
            menuId : divMenuId + "_HelpAbout",
            strFuncName : "HJN.init.Copyright()"
        };
        accordion.innerHTML += '<li class="hjnMenuLv1">'
                + getAccordionTag(that, ++_id, "Help")
                + '<ul class="hjnMenuLv2" style="width: 100%;">' //
                + getAlertTag(menuHelpAbout)
                + '</ul>' + '</li>';

        // メニュー登録
        divMenu.appendChild(accordion);
    }

    // アコーディオンラベル用<input><label>タグ編集（内部関数宣言） #31
    // idは、ユニークな英数字なら何でもよい（ラベル押下時のアコーディオン開閉ラジオボタン連動用の接尾語）
    function getAccordionTag(that, id, labelText, isChecked) {
        var isAccordion = true, // true:アコーディオン型 false:折りたたみ型 #21
        typeStr = isAccordion ? ' type="checkbox" name="accordion" '
                : ' type="radio" name="accordion" ', //
        checkedStr = ' checked="checked" ';
        return '' + '<input id="ac-' + that.chartIdName + id + '"' + typeStr
                + (isChecked ? checkedStr : '') + '">' + '<label for="ac-'
                + that.chartIdName + id + '">' + labelText + '</label>';
    }

    // File Open用<input>タグ編集（内部関数宣言）
    // '<ol><a><label>Child Menu<input type="file" id="xxx"
    // multiple/></label></a></ol>
    function getInputTag(arg) {
        return '' + '<ol><a><label class="hjnButton4Input">' + arg.menuLabel // #51
                + '<input type="file" id="' + arg.menuId + '"  multiple />'
                + '</label></a></ol>';
    }

    // ダウンロード用<A>タグ編集（内部関数宣言）
    // '<li><a id="xxx" href="#">Child Menu</a><li/>'
    function getATag(arg, preLabel) {
        preLabel = preLabel || "";
        return '' + '<li><a id="' + arg.menuId + '" '
                + 'class="hjnButton4Input" href="#" ' // #51
                + 'download="' + arg.fileName + '" ' //
                + 'onclick="' + arg.funcName + '(' + "'" + arg.menuId + "', '"
                + arg.fileName + "'" + ')" ' + '>' + preLabel + arg.menuLabel
                + '</a></li>';
    }

    // グローバルメソッド呼出用<A>タグ編集（内部関数宣言） #34
    // '<li><a id="xxx" href="#">Child Menu</a></li>'
    function getFuncTag(arg, preLabel) {
        preLabel = preLabel || "";
        return '' + '<li><a id="' + arg.menuId + ' "'
                + 'class="hjnButton4Input" href="#" ' // #51
                + 'onclick="' + arg.funcName + '()">' //
                + preLabel + arg.menuLabel + '</a></li>';
    }

    // Alert用<A>タグ編集（内部関数宣言）
    // '<a id="xxx" onclick=Alert("xxx")>Child Menu</a>'
    function getAlertTag(arg) {
        return '' + '<ol><a id="' + arg.menuId + '"'
                + 'class="hjnButton4Input" ' // #51
// + ' onclick="alert(' + arg.strFuncName + ")" + '"' + '>'
                + ' onclick="HJN.init.ShowDialog(' + arg.strFuncName + ")" + '"' + '>' // #79
                + '<label>' + arg.menuLabel + '</label></a></ol>';
    }
};