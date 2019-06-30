import * as Util from '../util/util.js';
import * as Simulator from '../simulator/simulator.js';

/**
 * tatLogDiverのメニューを追加する
 * 
 * @memberof tatLogDiver
 * @class Menu
 * @param {Object}
 *            that グラフへの参照
 */
export default function Menu(that) {
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
    var menuDownloadImg = (new Util.Menu( // ATag
                divMenuId + "_DownloadImg",
                "graph image(.png)",
                g + ".menuDownloadImg"))
            .makeDownloadable("graph.png");
    var menuDownloadCsv = (new Util.Menu( // ATag
                divMenuId + "_DownloadCsv",
                "graph data(.csv)",
                g + ".menuDownloadLog"))
            .makeDownloadable("graph.csv");
    var menuDownloadLog = (new Util.Menu( // ATag
                divMenuId + "_DownloadLog",
                "graph log records(.csv)",
                g + ".menuDownloadLog"))
            .makeDownloadable("tatlog.csv");
    var menuDownloadConc = (new Util.Menu( // ATag
                divMenuId + "_DownloadConc",
                "conc log records(.csv)",
                g + ".menuDownloadConc"))
            .makeDownloadable("conclog.csv");
    
    // メニューを追加する
    var accordion = document.createElement('div'); // 要素の作成
    var _id = 0;
    if (HJN.chart.chartId === that.chartId) { // 上段グラフ用機能のメニュー追加
        // File Menu
        var menuOpenCsv = (new Util.Menu( // FileOpenTag
                divMenuId + "_OpenCsv ",
                "Open csv data file",
                g + ".menuOpenCsv"));
        var menuSaveConfig = (new Util.Menu( // ATag
                divMenuId + "_SaveCongig",
                "save format (.json)",
                g + ".menuSaveConfig"))
            .makeDownloadable("hjnconfig.json");
        var menuLoadConfig = (new Util.Menu( // FileOpenTag
                divMenuId + "_LoadCongig", // #10
                "load format (.json)",
                g + ".menuLoadConfig"));
        accordion.innerHTML = '<li class="hjnMenuLv1">'
                + Util.Menu.getAccordionTag(that, ++_id, "File")
                + '<ul class="hjnMenuLv2">'
                + menuOpenCsv.getFileOpenTag()     // オープンボタン #24
                + Util.Config.File.getHtml()       // 設定HTML #76
                + menuSaveConfig.getATag()         // セーブボタン
                + menuLoadConfig.getFileOpenTag()  // ロードボタン #10
                + '</ul>' + '</li>';

        // Filter Menu #34
        var menuFilterApply = (new Util.Menu( // FuncTag
                divMenuId + "_FilterApply",
                "Apply filter & reload",
                g + ".menuFilterApply"));
        var menuFilterReset = (new Util.Menu( // FuncTag
                divMenuId + "_FilterClear",
                "Reset filter condition",
                g + ".menuFilterReset"));

        accordion.innerHTML += '<li class="hjnMenuLv1" id="menu_Filter">'
                + Util.Menu.getAccordionTag(that, ++_id, "Filter")
                + '<ul class="hjnMenuLv2">'    // #24
                + Util.Config.Filter.getHtml() // 設定HMTL #76
                + menuFilterApply.getFuncTag() // フィルターボタン
                + menuFilterReset.getFuncTag() // クリアボタン
                + '</ul>' + '</li>';

        // Simulator Menu #53
        var menuSimulatorSimulate = (new Util.Menu( // FuncTag
                divMenuId + "_SimulatorSimulate",
                "Simulate",
                g + ".menuSimulatorSimulate"));
        var menuSimulatorEditor = (new Util.Menu( // FuncTag
                divMenuId + "_SimulatorEditor",
                "JSON Editor(Open/Close)",
                g + ".menuSimulatorEditor"));
        accordion.innerHTML += '<li class="hjnMenuLv1" id="menu_Simulator">'
                + Util.Menu.getAccordionTag(that, ++_id, "Simulator")
                + '<ul class="hjnMenuLv2">'
                + menuSimulatorSimulate.getFuncTag()   // シミュレート実行ボタン
                + menuSimulatorEditor.getFuncTag()     // JSONエディタボタン
                + Util.Config.Simulator.getHtml()      // 設定HTML #74
                + '</ul>' + '</li>';
        // シミュレーション条件JSON Editエリアを設定する
        var divSimulator = document.getElementById("Simulator");
        var jsonEditor = document.createElement('div'); // 要素の作成
        jsonEditor.innerHTML = '<textarea id="SimulatorEditor" '
                + 'style="width:100%;border:none;resize:none;background:rgba(255,255,255,0.5);height:100%;">'
        divSimulator.appendChild(jsonEditor);
        var divSimulatorEditor = document.getElementById("SimulatorEditor");
        // divSimulatorEditor.readOnly = true; // #22
        divSimulatorEditor.value = Simulator.virtualSystemByJson
                .GetJsonConfig(); // デフォルトJSON

        // View Menu
        accordion.innerHTML += '<li class="hjnMenuLv1" id="menu_View">'
                + Util.Menu.getAccordionTag(that, ++_id, "View", true)
                + '<ul class="hjnMenuLv2">' //
                + '<li><div id="' + that.chartIdName + '_legend"></div></li>'
                + '</ul>' + '</li>';

        // Download Menu
        accordion.innerHTML += '<li class="hjnMenuLv1" id="menu_Download">'
                + Util.Menu.getAccordionTag(that, ++_id, "Download")
                + '<ul class="hjnMenuLv2">'
                + menuDownloadImg.getATag("Upper ")   // 上段画像ダウンロードボタン
                + menuDownloadCsv.getATag("Upper ")   // 上段グラフcsvダウンロードボタン
                + menuDownloadLog.getATag("Upper ")   // 上段生データダウンロードボタン
                + '</ul>' + '</li>';

        
        // メニュー登録
        divMenu.appendChild(accordion);
        // イベントリスナー登録
        document.getElementById(menuOpenCsv.menuId).addEventListener( //
                'change', that.menuOpenCsv.bind(that), false); // File Open用
        document.getElementById(menuLoadConfig.menuId).addEventListener(
                'change', that.menuLoadConfig.bind(that), false); // LoadConfig用

    } else { // 下段用グラフ機能のメニュー追加
        _id += 100;
        // Download Menu
        var chartDownloadUl = document.createElement('ul');
        chartDownloadUl.className = "hjnMenuLv2";
        chartDownloadUl.innerHTML = '' //
                + menuDownloadImg.getATag("Detail ")   // 下段画像ダウンロードボタン
                + menuDownloadCsv.getATag("Detail ")   // 下段グラフcsvダウンロードボタン
                + menuDownloadLog.getATag("Detail ")   // 下段生データダウンロードボタン
                + menuDownloadConc.getATag("Detail "); // 下段conc csvダウンロードボタン
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
        accordion.innerHTML = ''
                + '<li class="hjnMenuLv1">'
                +   Util.Menu.getAccordionTag(that, ++_id, "Bottom detail graph", true)
                +   '<ul class="hjnMenuLv2">'
                +     '<ol><div id="detailTimeRange">'
                +     Util.Config.DetailGraph.getHtml()     // 設定HMTL #76
                +     '</div></ol>' // #51
                +   '<li><div id="chartPlots"></div></li>' // Plot一覧用タグ
                +   '</ul>'
                + '</li>';

        // Help Menu
        var menuHelpUsage = (new Util.Menu( // DialogTag
                divMenuId + "_HelpUsage", // #84
                "Usage of TAT log diver",
                "HJN.init.Usage"))
            .makePopupable("HJN.dialogUsage", 70, 60);
        var menuHelpAbout = (new Util.Menu( // DialogTag
                divMenuId + "_HelpAbout",
                "about TAT log diver",
                "HJN.init.Copyright"))
            .makePopupable("HJN.dialogAbout", 30, 50);

        
        accordion.innerHTML += '<li class="hjnMenuLv1">'
                + Util.Menu.getAccordionTag(that, ++_id, "Help")
                + '<ul class="hjnMenuLv2" style="width: 100%;">' //
                + menuHelpUsage.getSubWindowTag() // #84 #95
                + menuHelpAbout.getDialogTag()
                + '</ul>' + '</li>';

        // メニュー登録
        divMenu.appendChild(accordion);
    }
};