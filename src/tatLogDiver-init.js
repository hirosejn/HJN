"use strict";
import * as Util from './util/utils.js';
import * as Simulator from './util/simulators.js';
import {HjnConfig} from './util/hjn-config.js';
import {HJN} from './tatLogDiver-graph.js';

/* *****1*********2*********3*********4*********5*********6*********7******* */
/**
 * HTMLから呼び出すAPI
 * 
 * @param {string}
 *            [chartName=HJN.chartName="chart"] グラフを作成するHTMLタグ名
 * @return {ETAT} 終了時刻のTAT（応答時間）時系列データ
 * @example
 * <!doctype html>
 * <html>
 * <head>
 * <meta charset="UTF-8">
 * <link type="text/css" rel="stylesheet" href="../libs/dygraph.css">
 * <link type="text/css" rel="stylesheet" href="./tatLogDiver.css">
 * </head>
 * <body>
 * <div id="hjn_chart"></div>
 * <script src="../libs/dygraph.js"></script>
 * <script src="../libs/extras/synchronizer.js"></script>
 * <script type="module">
 * import {HJN_init_ChartRegist} from "./tatLogDiver-init.js";
 * window.addEventListener("DOMContentLoaded",function(eve){
 * 　　HJN_init_ChartRegist("chart");      // チャートを作成する
 * });
 * </script>
 * </body>
 * </html>
 */
export function HJN_init_ChartRegist(chartName){ // #70

	"use strict";
	// 引数１ ：デフォルトHJN.chartName("chart")
	HJN.chartName = chartName = chartName || HJN.chartName;
	// タイトルを設定する #57
	document.title = "tat log diver " + HJN.ver; 
	// htmlを作成する #52
	var html_chart = document.getElementById("hjn_" + chartName) || document.body;
	html_chart.innerHTML = ''
	    + '<div id="' + chartName + '"></div>'
        + '<div id="' + chartName + 'D"></div>'
        + '<textarea id="lineViewer" class="lineViewer">logdata</textarea>';
	// 手前にメニュ－用htmlを作成する #52
	var html_nav = document.createElement('nav');
	html_nav.innerHTML = ''
	    + '<header>'
        + '<div id="Simulator"></div>' // #53
        + '<div class="statusbar">'
        + '  <iframe id="fileInfo"></iframe>'
        + '</div>'
        + '<div class="hjnBurgerTray">'
        + '  <input id="hjnBoxBuger" type="checkbox" class="hjnBurger hjnResize" checked="checked" />'
        + '    <label for="hjnBoxBuger" class="hjnCtrlBox"><span></span></label>'
        + '  <div class="hjnBurgerTitle">'
        + '    <input id="hjnBoxPlaceOn" type="checkbox" class="hjnBoxSwitch hjnResize" />'
        + '      <label for="hjnBoxPlaceOn" class="hjnCtrlBox"><span></span></label>'
        + '    <p>'
        + '      <a class="hjnLabel4Input" href="../jsdoc/index.html"'
        + '                target=”_hirosejnJSDoc3”>TAT log diver</a><BR>'
        + '      <a class="hjnLabel4Input" href="https://github.com/hirosejn/"'
        + '                target=”_hirosejnGit”>&copy;2017 Junichiroh Hirose</a>'
        + '    </p>'
        + '  </div>'
        + '  <div class="hjnBurgerWrap">'
        + '    <div class="hjnAccordion">'
        + '      <div id="' + chartName + '_menu"></div>'
        + '      <div id="' + chartName + 'D_menu"></div>'
        + '    </div>'
        + '  </div>'
        + '</div>'
        + '</header>';
	html_chart.parentNode.insertBefore(html_nav, html_chart);
	
	var dropFieldName = chartName;	// ファイルドロップを受け付けるタグ名
	Util.Logger.ShowLogTextInit(); // 処理時間計測の初期化

	// グラフのインスタンスを作成し初期化する
	HJN.chart = new HJN.Graph(chartName, "HJN.chart");
	HJN.chart.init();
	HJN.chartD = new HJN.Graph(chartName + "D", "HJN.chartD");
	HJN.chartD.init();
	// ドロップフィールドに、処理を登録する(注：dygraphはイベントリスナーを登録しないとクリック時にエラーが出る）
	HJN.init.DropField(dropFieldName);
	HJN.init.DropField(dropFieldName+ "D");

	// 初期表示データを自動生成する // #53
	HjnConfig.GetConfig("Simulator").getFunctionByKey("S_SIMU")(); // #53
	
}

/**
 * データを自動生成し表示する
 * 
 * @param {String|Number}
 *            [json = Simulator.virtualSystemByJson.GetJsonConfig(0)]
 *            シミュレーション条件JSONテキスト、もしくはサンプルJSON番号
 */
export function CreateSampleTatLogAndChartShow(json){ // #53
    "use strict";
    var jsonText;
    if (typeof(json) === "number") { // #53
        jsonText = Simulator.virtualSystemByJson.GetJsonConfig(json);
    } else{
        jsonText = json || Simulator.virtualSystemByJson.GetJsonConfig(0);
    }
    // JSON Editorを更新する
    document.getElementById("SimulatorEditor").value = jsonText;
    // 初期表示データを自動生成する
    HJN.chart.eTatOriginal = Simulator.virtualSystemByJson.Execute(jsonText);
    // データを表示する
    HJN.init.ChartShow(HJN.chart.eTatOriginal);
}

/**
 * 終了時刻とtatの配列をグラフ表示する
 * 
 * @param {ETAT}
 *            HJN.chart.eTatOriginal 終了時刻とtatを含む配列
 */
HJN.init.ChartShow = function(eTatOriginal){
    // フィルタしたeTatを取得する #34
    var eTat = HJN.chart.fileReader.createFilter().filter(eTatOriginal);
    
    // グラフを初期表示する
    HJN.Plot.List = []; // #53
    // 上段
    HJN.chart.update(HJN.chart.createSeries(eTat));
    var text = "上段表示 [" + HJN.chart.eTat.length + "]";
    Util.Logger.ShowLogText(text, "elaps");       // 処理時間ログ出力

    // 下段(非同期）
   Util.setZeroTimeout( function(){
        HJN.chartD.update(HJN.init.ChartRegistDetail(HJN.chart.cTps));
        HJN.chart.showBalloon();    // 上段のBalloonを描画する
        var text = "下段表示 [" + HJN.chartD.eTat.length + "]";
        Util.Logger.ShowLogText(text, "elaps");
        text = "<mark>Simulated data</mark>["
            + HJN.chart.eTat.length.toString()
                .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') + "]"; // 整数文字列のカンマ編集
        Util.Logger.ShowLogText(text, "msg");
        // 上下段のマウス操作同期設定 #49
        var sync = Dygraph.synchronize(
                 [ HJN.chart.graph, HJN.chartD.graph ],
                 {selection: true, zoom: false});
    });
}

/**
 * HTMLタグに、CSVファイルのドロップを受付けイベントを登録する
 * 
 * @param {string}
 *            dropFieldName ファイルのドロップイベントを受けるフィールド名
 */
HJN.init.DropField = function (dropFieldName) {
	"use strict";
	// 第一引数で指定された名前の ID 属性のエレメントを取得する
	var element = document.getElementById(dropFieldName);
	
	// ドラッグ操作中に実行されるイベント（マウスカーソルが要素内に滞在中）
	element.addEventListener("dragover" , function (e){
		e.preventDefault();   // ドロップを許可し受け入れを表明
	});
	
	// ドロップ時に実行されるイベント
	element.addEventListener("drop", function (e){
			var data_transfer = e.dataTransfer;		// DataTransfer オブジェクトを取得する
			if(!data_transfer.types) return;		// ファイルのコンテンツタイプを取得できたことを確認する
			var files = data_transfer.files;	// ファイルのリストを取得する
			HJN.init.FileReader(files);
			e.preventDefault();		// デフォルトのドロップ機能を無効化
	});
};

/**
 * 指定されたファイルを読込んで処理する
 * 
 * @param {Object}
 *            files ファイルハンドラ
 */
HJN.init.FileReader = function (files){  // #15
	"use strict";
	for(var i = 0; i < files.length; i++){	// データを順番に取得する
		try{
			// ファイルを取得する
			var file = files[i];
			// ログ出力用にファイル名（サイズ）を編集する
			var textArray =	"<BR><mark><b>" + file.name + "</b></mark> " +
							"["+ file.size + "byte] " + 
							file.lastModifiedDate.toLocaleString() +"<BR>";
			// ファイルの読み込みに成功したら、その内容をドロップエリアに追記して表示する
			var reader = new FileReader();
			reader.onloadend = funcOnloadend.bind(this, files[i], i);
			// ファイルにArrayBufferで参照を取得する（loadイベントを起こす）
		    reader.readAsArrayBuffer(files[i]);
		}catch(e){
			// 第一引数のテキストアレイの内容を#fileInfoのiframeに表示する
			var msg = "The " + i + "th dropped object is not a file";
			Util.Logger.ShowText( ["<mark>"+msg+"</mark>"] );
			console.error("[%o]%o",msg,e );
		}
	}

	// 内部関数：ファイルを読み込みｸﾞﾗﾌを表示する（指定ファイルを読み込んだ後に呼び出される） #23
    function funcOnloadend(file, i, evt) {
        if (evt.target.readyState === FileReader.DONE) { // DONE == 2
            var filesIdx = HJN.files.length;
            // ファイルの先頭2行をログ表示する
            HJN.filesArrayBuffer[filesIdx] = evt.target.result;
            Util.Logger.ShowLogTextInit();              // 情報表示 : 初期化
            Util.Logger.ShowLogText(textArray, "msg");  // 情報表示：ドロップファイル情報
            // 指定ファイルを読み込む
            // CSVファイルを上段用eTatに展開する[{x:, y:,pos:,len:},...] 全件展開する
            if (i === 0 && HJN.chart.fileReader.isNewETAT()){
                // 新規モードかつ、同時複数ファイル指定時の最初のファイルのとき、新たに作成する
                HJN.files = [file];
                HJN.chart.eTatOriginal = getTatLogArray(HJN.filesArrayBuffer, filesIdx);
            } else { // 2件目以降のファイルのとき、もしくは、追加モード"ADDDATA"のとき、追加する
                HJN.files.push(file);
                HJN.chart.eTatOriginal = HJN.chart.eTatOriginal.concat(
                        getTatLogArray(HJN.filesArrayBuffer, filesIdx));
            }
            
            // 全ファイルを読み込んだらグラフを描画する
            if (HJN.files[HJN.files.length - 1] === file){ // 指定ファイル群の最後のファイルを処理しているとき
                // フィルタしたeTatを取得する #34
                var eTat = HJN.chart.fileReader.createFilter().filter(HJN.chart.eTatOriginal);

                // 上段グラフを描画する（ eTatから上段用 時系列分析データ(seriesSet)を展開する）
                HJN.chart.update(HJN.chart.createSeries(eTat));
                Util.Logger.ShowLogText("上段表示", "elaps");

                // 下段用データの展開とグラフ描画（非同期処理）
                HJN.Plot.List = [];
                Util.setZeroTimeout(function(){
                    // 下段グラフを描画する（下段用 時系列分析データ(seriesSet)を展開する）
                    HJN.chartD.update(HJN.init.ChartRegistDetail(HJN.chart.cTps));
                    // 上段のBalloonを描画する(上段update時にはplots登録されていないので、ここで処理）
                    HJN.chart.showBalloon();
                    Util.Logger.ShowLogText("下段表示", "elaps");
                    Util.Logger.ShowLogText("<mark>"+ HJN.files[0].name +
                            "["+ HJN.chart.eTat.length +
                            "]を表示しました</mark>", "msg");
                });
            }
        }
    }

	// 内部関数： 指定ファイルの先頭ｎ行を、改行文字<BR> のテキストに変換してリターンする
	function topLines(file, n) {
	    var fileInfo = "",
	        line;
	    try{    // 先頭からnレコード取得
	        var getterOfLine = HJN.chart.fileReader.createGetterOfLine(file);
	        for (var i = 0; i < n; i++) {
	            line = getterOfLine.next();
	            fileInfo += line.str + "<BR>";
	        }
	    }catch (e) {
	        alert("[HJN.init.DropField 改行コードの無いファイルは扱えません]");
	        console.error(e);
	    }
	    return fileInfo;
	}

    // 内部関数： CSVファイルを読み込み、TatLog用アレイ[{x:日時, y:値, pos:レコード開始位置,
    // len:レコード長},...]に展開する
	function getTatLogArray(files, idx) { // arg0:csvﾌｧｲﾙのファイルﾊﾟｽ
	    Util.Logger.ShowLogText("----- read file -----------------------------","calc");
	    var file = files[idx], // #23
	        eTat = [],
	        xy = {date: 0, value: 0, isError: false },
	        i = 0,  // timelog用
	        getterOfLine = HJN.chart.fileReader.createGetterOfLine(file),
	        getterOfXY = HJN.chart.fileReader.createGetterOfXY(),
	        line = getterOfLine.next();     // 先頭行の初期処理
	    while (!line.isEoF) {               // 以降最終行まで処理する
	        try {
	            Util.Logger.ByInterval(i++, line); // 一定時刻毎に進捗を出力する
	            xy = getterOfXY.parse(line);
	            if(!xy.isError){
	                eTat.push( {x: xy.x, y: xy.y, fileIdx: idx, // #23
	                    pos: line.pos, len: line.array.byteLength, sTatIdx: 0} );
	            }
	            line = getterOfLine.next(); // #24
	        } catch (e) {   /* 改行だけレコードをスキップ */
	            console.error(e);
	            console.err("err: %o",e);
	        }
	    }
	    Util.Logger.ShowLogText("[0:file readed & got eTat]---------------","calc");
	    return eTat;
	}
};



/**
 * 詳細グラフ用機能： 表示対象期間のcTpsから、eTps範囲を取得し、詳細Seriesを生成する。併せてPlotsを登録する。
 * 
 * @param {xMs}
 *            cTps 日時（ミリ秒単位）
 * @return {seriesSet} dygraph用時系列データ配列
 */
HJN.init.ChartRegistDetail = function(cTps){
	"use strict";
	// CTPSの最大値となるplotを取得する
	var maxY =Number.MIN_VALUE,
		maxYIdx = -1;
	cTps.forEach(function(c, i){
		if (maxY < c.y){
			maxY = c.y;
			maxYIdx = i;
		}
	});
	if(0 <= maxYIdx){	// #26
		// 秒単位より大きいとき、最大値を含む時刻(秒)に補正する #38
		var x = cTps[maxYIdx].x;
		if(HJN.chart.cTpsUnit.unit >= 1000){
			var cTpsIdx = HJN.chart.conc.findIndex(function(e,i){return e.y === cTps[maxYIdx].y;});
			x = HJN.chart.conc[cTpsIdx].x;
		}
		// slider rangeに、下段の表示時刻を設定する
		HJN.init.SetDetailDateTime(x);
		// eTpsの範囲を取得し、詳細用seriesSet(HJN.chartD.seriesSet）を設定する
		HJN.chartD.createSeries(HJN.init.GetSliderRangedEtat());
		// plotsアイコン用 HJN.Plot.Listに、下段表示したplotを登録する
		HJN.Plot.Add(HJN.CTPS.N, cTps[maxYIdx].x, cTps[maxYIdx].y);
	}
	Util.Logger.ShowLogText("[6:Plot added] " + HJN.Plot.List.length + " plots","calc");

	return HJN.chartD.seriesSet;
};
/**
 * 詳細グラフ用機能： sliderRangeで指定された範囲のeTatを返却する
 * 
 * @return {ETAT} 詳細グラフ用eTat
 */
HJN.init.GetSliderRangedEtat = function(n) {
	"use strict";
	// 指定時刻（ｄｔ ± range）を取得する
	var rangeTagPlus  = document.getElementById("DetailRangePlus");
	var	rangeTagMinus = document.getElementById("DetailRangeMinus");
    var rangeTagUnit  = document.getElementById("DetailRangeUnit"); // #48
	var	rangeCycle = HJN.chart.cTpsUnit.unit / 1000; // #38
    // HJNグローバル変数に退避する
    HJN.detailRangePlus  = rangeTagPlus  ? +rangeTagPlus.value  : 1 + rangeCycle; // 幅（秒）
    HJN.detailRangeMinus = rangeTagMinus ? +rangeTagMinus.value : rangeCycle;     // 幅（秒）
    HJN.detailRangeUnit  = rangeTagUnit  ? +rangeTagUnit.value  : HJN.chart.cycle; // #48

	var rangeUnit = HJN.detailRangeUnit; // #48
	var dt = Math.floor(HJN.detailDateTime / rangeUnit) * rangeUnit; // 中央時刻(ミリ秒)
	var	from = dt - HJN.detailRangeMinus * rangeUnit;  // #48
	var	to = dt + HJN.detailRangePlus  * rangeUnit;  // 幅（ミリ秒）
	var eTatDetail = [{x: 0, y: 0.001, sTatIdx: 0}];	// tatMapが無い場合の返却値
	if (HJN.chart.eTat.tatMap){	// #18
		// eTatDetailがレンジキャッシュにあるか確認する #30
		eTatDetail = HJN.chart.eTat.cash.getRangedCash(from, to);
		if(eTatDetail === undefined){
			// キャッシュヒットしないとき、eTatDetailを抽出し、キャッシュにセットする
			eTatDetail = HJN.chart.eTat.tatMap.search(from,to);
			HJN.chart.eTat.cash.setRangedCash(eTatDetail, from, to);
		}
	}
	Util.Logger.ShowLogText("[0:HJN.init.GetSliderRangedEtat] ","calc");
	
	return eTatDetail;	// 詳細グラフ用eTatを返却する
};
/**
 * 詳細グラフ用機能： 表示期間変更時に、Detailを再描画する（onChangeイベント時に呼び出される）
 */
HJN.init.setDetailRange = function(){
    "use strict";
    clearTimeout(HJN.timer);
    HJN.timer = setTimeout(function(){
            Util.Logger.ShowLogTextInit("[-:HJN.init.setDetailRange]start---------------","calc");
            // 表示中Plotsのrangeを更新する #30
            var i = HJN.Plot.List.findIndex(function(e){ return (e.radio === true); });
            var plot = HJN.Plot.List[i];
            plot.rangePlus  = document.getElementById("DetailRangePlus").value;
            plot.rangeMinus = document.getElementById("DetailRangeMinus").value;
            var rangeTagUnit = document.getElementById("DetailRangeUnit"); // #48
            HJN.detailRangeUnit  = rangeTagUnit  ? +rangeTagUnit.value  : HJN.chart.cycle; // #57
            plot.rangeUnit  = HJN.detailRangeUnit; // #48

            // 下段データを登録する
            HJN.chartD.seriesSet = HJN.chartD.createSeries( HJN.init.GetSliderRangedEtat() );
            // 下段グラフを描画する
            HJN.Graph.prototype.update.call(HJN.chartD, HJN.chartD.seriesSet);
        }, 750);    // 750ms 値の変更がなかった時に、処理を開始する
};
/**
 * 詳細グラフ用機能： 指定日時を秒単位に丸めて、FORMのslider Rangeに設定する
 * 
 * @param {xMs}
 *            date 日時（ミリ秒単位）
 */
HJN.init.SetDetailDateTime=function(date) {
    "use strict";
    HJN.detailDateTime = Math.floor(date / 1000) * 1000;    // 秒単位に丸める
};

/**
 * Plot一覧（過去にクリックしたplotの一覧）およびグラフのplot(点)のクリック時の処理群
 * 
 * @namespace
 */
HJN.Plot = {}; // plot関連

/**
 * Plotの一覧
 * 
 * @type array.<String, Boolean, Boolean, index, xMs, Number, Number, Number>
 * @prop {String} label Plot一覧に表示する文字列
 * @prop {Boolean} ckBox チェックボックスの選択状態<br>
 *       （選択後すぐに削除されるのでtrueとなることはない）
 * @prop {Boolean} radio ラジオボタンの選択状態
 * @prop {index} n グラフ番号
 * @prop {xMs} x xの値
 * @prop {Number} y yの値
 * @prop {Number} rangeMinus 表示幅時間マイナス（秒）
 * @prop {Number} rangePlus 表示幅時間プラス（秒）
 * @prop {Number} rangeUnit 表示幅時間 単位（sec:1/min:60/hour:3600/day:86400)
 * 
 */
HJN.Plot.List = [];

/**
 * point/baloonクリック時呼出し用関数<br>
 * 詳細グラフを描画し、Plotを更新する
 * 
 * @param {Objcet}
 *            point dygraph の point
 */
HJN.Plot.PointClickCallback = function(point) {
	"use strict";
	Util.Logger.ShowLogText("[0:PointClickCallback]start---------------","calc");
	var	n = HJN.seriesConfig.findIndex(function(e){	return e.key === point.name; }),// シリーズ番号
		x = point.xval,	// ミリ秒
		y = point.yval; // 秒

	// ETPS,EMPS,EAPSのとき、TATが幅に含まれるよう、幅(range)を拡大する #57
    var rangeTagUnit = document.getElementById("DetailRangeUnit");
    var rangeUnit  = rangeTagUnit  ? +rangeTagUnit.value : HJN.chart.cycle;
	if ((n === HJN.ETPS.N || n === HJN.EMPS.N || n === HJN.EAPS.N) 
            && rangeUnit < HJN.chart.cycle) {
        rangeUnit = HJN.chart.cycle;
        HJN.detailRangeUnit = rangeUnit;
        // selectリストの選択を、rangeUnitに合わせる #57
        for (var i = 0; i < rangeTagUnit.length; i++) {
            if(HJN.detailRangeUnit <= rangeTagUnit[i].value){
                rangeTagUnit[i].selected = true;
                break;
            }
        }
    }

	// グラフの日時で、詳細グラフを再作成する
	HJN.init.SetDetailDateTime(x);
	HJN.chartD.createSeries(HJN.init.GetSliderRangedEtat(n)); // #57
	// 下段の残処理終了後、下段データを登録描画する
	HJN.chartD.graph.ready(function(){ HJN.chartD.update(HJN.chartD.seriesSet, n); }); // #57
	// Hover表示しているplotを、HJN.Plot.Listに登録し、plotsアイコンを再描画する
	HJN.Plot.Add(n, x, y);
	// Balloonを再描画する
	HJN.Plot.ShowBalloon();
    // タッチデバイスでないとき、lineViewerに表示をクリップボードにコピーする
	if (!Util.TouchPanel.isTouchableDevice()) { // #22
	    Util.CopyToClipboard("lineViewer"); // #61
	}
};

/**
 * point/baloonダブルクリック時呼出し用関数<br>
 * Plotを削除する
 * 
 * @param {object}
 *            plot dygraphのpoint
 */
HJN.Plot.PointDblClickCallback = function(point) {
	"use strict";
	// 指定plotを削除する
	var n = HJN.seriesConfig.findIndex(function(e){	return e.key === point.name; }),
		x = point.xval,	// ミリ秒
		i = HJN.Plot.List.findIndex(function(p){
				return(p.n === n && p.x === x) ||	// 完全一致
						("tpsPlot" in p &&			// 詳細一致
						p.tpsPlot.n === n && p.tpsPlot.x === x); });
	if(0 <= i) HJN.Plot.List.splice(i, 1);
	
	HJN.Plot.Render();
	// グラフ内の吹き出しを再表示する
	HJN.Plot.ShowBalloon();
};

/**
 * クリック時のHoverからHJN.Plot.Listを設定する
 * 
 * @param {index}
 *            n グラフのシリーズ番号
 * @param {xMs}
 *            x マウスクリック時のxの値（ミリ秒）
 * @param {Number}
 *            y マウスクリック時のyの値
 * @return {index} i plots内のplotの位置
 */
HJN.Plot.Add=function(n, x, y) {
	"use strict";
	// 各plotを非選択状態とする
	HJN.Plot.List.forEach(function(e){e.radio = false;});
	// ラベルフォーマットの設定
	var format = (n === HJN.ETPS.N || n === HJN.CTPS.N) ? "hh:mm:ss" : "hh:mm:ss.ppp",
		label = Util.D2S(x, format, true) + " " + // #61
				HJN.seriesConfig[n].label.replace("%N",Util.N2S(y));
	// 幅(range)を取り込む（秒）
	var	rangePlusTag  =  document.getElementById("DetailRangePlus"),
		rangeMinusTag =  document.getElementById("DetailRangeMinus"),
	    rangeUnitTag  =  document.getElementById("DetailRangeUnit"), // #48
        rangeUnit  = rangeUnitTag  ? +rangeUnitTag.value : HJN.chart.cycle, // #57
	    rangePlus  = rangePlusTag  ? +rangePlusTag.value  : 1,	// 幅
		rangeMinus = rangeMinusTag ? +rangeMinusTag.value : 1;

	// 既存Poltを検索する
	var	i = HJN.Plot.List.findIndex(function(p){
				return(p.n === n && p.x === x) ||	// 完全一致
						("tpsPlot" in p &&			// 詳細一致
						p.tpsPlot.n === n && p.tpsPlot.x === x); });
	// Plotを設定する
	var plot;
	if(0 <= i){	// 既存Plotsにある時、選択状態とし、rangeを再設定する
		plot = HJN.Plot.List[i];
		plot.radio = true;
		plot.rangePlus  = rangePlus; // 秒
		plot.rangeMinus = rangeMinus;
	    plot.rangeUnit  = rangeUnit; // #48
	}else{		// 既存に無いときPlotを追加する
	    // ETAT,STATのとき、TATが幅に含まれるよう、幅(range)を拡大する #30 #48 #57
	    if (n === HJN.ETAT.N){
	        rangeMinus = Math.max(rangeMinus, 
	                Math.floor(x / rangeUnit) - Math.floor((x - y) / rangeUnit)); // #48
	        document.getElementById("DetailRangeMinus").value = rangeMinus; 
	    }else if (n === HJN.STAT.N){
	        rangePlus = Math.max(rangePlus,
	                Math.floor((x + y) / rangeUnit)) - Math.floor(x / rangeUnit) ; // #48
	        document.getElementById("DetailRangePlus").value = rangePlus;
	    }
	    // Plotを追加する
	    plot = {label: label, ckBox:false,
				 radio:true, n: n, x: x, y: y, 
				 rangePlus: rangePlus, rangeMinus: rangeMinus, rangeUnit: rangeUnit };
		if (n === HJN.CTPS.N){			// CTPSのとき秒内最大CONCとして登録する
			adjustPlotToY(HJN.chartD.conc, x, x + HJN.chart.cTpsUnit.unit, y, 
			        HJN.CONC.N, plot, rangePlus, rangeMinus, rangeUnit);
		}else if (n === HJN.EMPS.N){	// EMPSのとき秒内最大ETATとして登録する
			adjustPlotToY(HJN.chartD.eTat, x, x + HJN.chart.cycle, y, 
			        HJN.ETAT.N, plot, rangePlus, rangeMinus, rangeUnit);
		}else {	// CTPS,EMPS以外の時、選択Plotを追加する
			HJN.Plot.List.push(plot);
		}
		// Plotsを時刻順にソートする
		HJN.Plot.List.sort(
				function(a, b) { return a.x - b.x; });
		i = HJN.Plot.List.findIndex(
				function(p){ return(p.n === n && p.x === x); });
	}
	HJN.Plot.Render();
	return i;	// plots内のplotの位置

	
	// 内部関数：プロット位置を、指定秒から詳細グラフの最大時刻に変更する #19
	function adjustPlotToY(conc, x, toX, y, n, plot, rangePlus, rangeMinus, rangeUnit){
		var	maxTime = 0,
			concMax = 0,
			i = Util.binarySearch(x, conc, function(e){ return e.x; });
		for (; i < conc.length && conc[i].x < toX; i++){	// #26
			if (concMax <= conc[i].y){
    				maxTime = conc[i].x;
    				concMax = conc[i].y;
			}
		}
		if (concMax === y) { // 補正すべき時刻が求まったときCONC,ETATを追加する #23
            x = maxTime;
            format = "hh:mm:ss.ppp";
            label = Util.D2S(x, format, true) + " " + // #61
                    HJN.seriesConfig[n].label.replace("%N",Util.N2S(y));
            HJN.Plot.List.push( {label: label, ckBox:false,
                 radio:true, n: n, x: x, y: y, 
                 rangePlus: rangePlus , rangeMinus: rangeMinus, rangeUnit: rangeUnit,
                 tpsPlot: plot} );  // 詳細plotには、tpsのplot情報も保持する
        } else { // 補正すべき時刻がない場合、元のPlotを追加する
            HJN.Plot.List.push(plot);
        }

	}
};

/**
 * HJN.Plot.Listを再表示する
 */
HJN.Plot.Render = function() {
	"use strict";
    var divCheckedPlots =  document.getElementById(HJN.chartName + "Plots");
	// 既存のアイコンを削除する
	while (divCheckedPlots.firstChild){
		divCheckedPlots.removeChild(divCheckedPlots.firstChild);
	}
	// 登録されているplots分のアイコンを追加する
	HJN.Plot.List.forEach( function(e, i){
		var div = document.createElement('div'),		// 要素の作成
			radio = e.radio ? 'checked="checked"' : '',	// radio選択指定
			ckBox = e.ckBox ? 'checked="checked"' : '';	// check boxのチェック指定
		div.className = "hjnPlot";
		div.innerHTML =
	    	'<input type="checkbox" value="' + e.x + '" id="checkBox_' + i + '" ' + ckBox +
	    			' title="delete" onclick="HJN.Plot.CheckBox(' + i + ')">' +
	    	'<label for="checkBox_' + i + '"></label>' +
	    	'<input type="radio" name="CheckedPlot" id="SaveTime_' + i + '" ' + radio +
	    			' onclick="HJN.Plot.CheckRadio(' + i + ')">' +
	    	'<label for="SaveTime_' + i + '">' + e.label + '</label>';
    	divCheckedPlots.appendChild(div);
	} );
};
/**
 * PlotのChekBox変更時呼出用関数<br>
 * 指定Plotを削除し、PlotsとBaloonを再描画する
 * 
 * @param {index}
 *            i 削除対象plotの、plots内位置
 */
HJN.Plot.CheckBox = function(i) {
	"use strict";
	HJN.Plot.List.splice(i,1);		// checkされたplotを削除する
	HJN.Plot.Render();			// Plotsを再描画する
	HJN.Plot.ShowBalloon();		// グラフのBalloonを再描画する
};
/**
 * PlotのRadioボタン変更時呼出用関数<br>
 * radio選択時に下段グラフを更新する
 * 
 * @param {index}
 *            i 選択されたplotの、plots内位置
 */
HJN.Plot.CheckRadio = function(i) {
	"use strict";
	// HJN.Plot.Listにradioの状態を反映する
	HJN.Plot.List.forEach(function(e){ e.radio = false; });
	var plot = HJN.Plot.List[i];
	plot.radio = true;
	// グラフの日時で、詳細グラフを再作成する
	HJN.init.SetDetailDateTime(plot.x);	// 中心時刻に設定する
	document.getElementById("DetailRangePlus").value = plot.rangePlus;	// 幅を設定する
	document.getElementById("DetailRangeMinus").value = plot.rangeMinus;
	document.getElementById("DetailRangeUnit").value = plot.rangeUnit; // #48
	var n = plot.tpsPlot ? plot.tpsPlot.n : plot.n; // #61
	HJN.chartD.createSeries( HJN.init.GetSliderRangedEtat(n) ); // #57
	// 下段データを登録描画する
	HJN.chartD.update(HJN.chartD.seriesSet, n); // #57
	// Balloonを再描画する
	HJN.Plot.ShowBalloon();
};
/**
 * Balloonを再描画する
 */
HJN.Plot.ShowBalloon =function(){
	"use strict";
	HJN.chart.showBalloon();
	HJN.chartD.showBalloon();
};

/**
 * 著作権表記文字を取得する
 * 
 * @return {String} str 著作権表記文字
 */
HJN.init.Copyright=function(){
    "use strict";
    var str =   "&copy; 2017 Junichiroh Hirose\n" +
            "https://github.com/hirosejn/HJN";
    return str;
};