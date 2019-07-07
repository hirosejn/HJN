import * as Util from '../util/util.js';
import * as TimeSeries from '../timeSeries/timeSeries.js';
import * as Simulator from '../simulator/simulator.js';
import {HJN} from './tatLogDiver-HJN.js';
import {Copyright} from "./tatLogDiver-Copyright.js";
import Graph from './tatLogDiver-Graph.js';
import Plot  from './tatLogDiver-Plot.js';
import MenuConfigDetailGraph from './tatLogDiver-MenuConfigDetailGraph.js';


/* *****1*********2*********3*********4*********5*********6*********7******* */
/**
 * HTMLから呼び出すAPI
 * 
 * @memberof HJN
 * @class Init
 * @param {string}
 *            [chartName=HJN.chartName="chart"] グラフを作成するHTMLタグ名
 * @return {ETAT} 終了時刻のTAT（応答時間）時系列データ
 * @example <!doctype html> <html> <head> <meta charset="UTF-8"> <link
 *          type="text/css" rel="stylesheet" href="../libs/dygraph.css"> <link
 *          type="text/css" rel="stylesheet" href="./tatLogDiver.css"> </head>
 *          <body> <div id="hjn_chart"></div> <script src="../libs/dygraph.js"></script>
 *          <script src="../libs/extras/synchronizer.js"></script> <script
 *          type="module"> import {HJN_init_ChartRegist} from
 *          "./tatLogDiver-Init.js";
 *          window.addEventListener("DOMContentLoaded",function(eve){
 *          Bundle("chart"); // チャートを作成する }); </script> </body> </html>
 */
export default function Init(chartName){ // #70
    // グローバル登録
    HJN.Util = Util; // #95
	// 引数１ ：デフォルトHJN.chartName("chart")
	HJN.chartName = chartName = chartName || HJN.chartName;
	// タイトルを設定する #57
	document.title = "tat log diver " + Copyright.Version;
	// htmlを作成する #52
	var html_chart = document.getElementById("hjn_" + chartName) || document.body;
	html_chart.innerHTML = ''
		+ '<div id="' + chartName + '"></div>'
		+ '<div id="' + chartName + 'D"></div>'
	// CONCデータ表示領域 #78
		+ '<div class="lineViewer hjnDraggableBox hjnCode" >' // #79
		+ '<div id="lineViewer" readonly>logdata</div></div>';
	// 手前にメニュ－用htmlを作成する #52
	var html_nav = document.createElement('nav');
	html_nav.innerHTML = ''
		+ '<header>'
		// シミュレータ JSON Edit画面 領域 #53
		+ '<div id="Simulator" class="hjnDraggableBox" style="visibility:hidden"></div>'
		// ハンバーガーメニュー 領域
		+ '<div class="hjnBurgerTray">'
			// ステータスバー（ログ表示）領域
		+	'<div class="statusbar hjnDraggableBox">'
		+	'<iframe id="fileInfo" style="height:100%;"></iframe></div>' // #79
			// ×ボタン
		+	'<input id="hjnBoxBuger" type="checkbox" class="hjnBurger hjnResize" checked="checked" />'
		+	 '<label for="hjnBoxBuger" class="hjnCtrlBox"><span></span></label>'
		// グラフZoomリセットボタン #78
		+	 '<input id="chartZoom" type="buttom" class="hjnBoxSwitch hjnResize" '
		+	 'onClick="HJN.init.ResetStyle();" />'
		+		'<label for="chartZoom" class="hjnCtrlBox"><span></span></label>'
			// メニュー上部タイトル
		+	'<div class="hjnBurgerTitle">'
				// メニューオーバレイモード変更 ボタン
		+	 '<input id="hjnBoxPlaceOn" type="checkbox" class="hjnBoxSwitch hjnResize" />'
		+		'<label for="hjnBoxPlaceOn" class="hjnCtrlBox"><span></span></label>'
				// メニュー上部テキスト 領域
		+	 '<p>'
					// ツール名称＆JSDocリンク
		+		'<a class="hjnLabel4Input" href="../jsdoc/index.html" '
		+				 'target=”_hirosejnJSDoc3”>TAT log diver</a><BR>'
		+	 '</p>'
		+	'</div>'
		// メニュー画面本体（左右開閉ラッパー）
		+	'<div class="hjnBurgerWrap">'
			// アコーディオンメニュー
		+	 '<div class="hjnAccordion">'
		+		'<div id="' + chartName + '_menu"></div>'
		+		'<div id="' + chartName + 'D_menu"></div>'
		+	 '</div>'
		+	'</div>'
		+ '</div>'
		+ '</header>';
	html_chart.parentNode.insertBefore(html_nav, html_chart);
	HJN.init.ResetStyle(true); // #79

	var dropFieldName = chartName;	// ファイルドロップを受け付けるタグ名
	Util.Logger.ShowLogTextInit(); // 処理時間計測の初期化

	// コンフィグプロパティを初期化する #74
	// HJN.Config = HJN.Config || Util.Config;
	TimeSeries.MenuConfigFile.config();
	TimeSeries.MenuConfigFilter.config();
	Simulator.MenuConfig.config();
	MenuConfigDetailGraph.config();

	// グラフのインスタンスを作成し初期化する
	HJN.chart = new Graph(chartName, "HJN.chart");
	HJN.chart.init();
	HJN.chartD = new Graph(chartName + "D", "HJN.chartD");
	HJN.chartD.init();
	// ドロップフィールドに、処理を登録する(注：dygraphはイベントリスナーを登録しないとクリック時にエラーが出る）
	Init.DropField(dropFieldName);
	Init.DropField(dropFieldName+ "D");

	// 初期表示データを自動生成する // #53
	Util.Config.GetConfig("Simulator").getFunctionByKey("S_SIMU")(); // #53

	// イベントハンドラを登録する
	Util.Element.enableDraggableClass();
}

/**
 * スタイルを初期設定する（Reset zoomボタンからも呼ばれる）
 * 
 * @memberof HJN.init
 * @param {Boolean}
 *            [isInit=false] リセット時true：初期設定値も再設定する
 *            シミュレーション条件JSONテキスト、もしくはサンプルJSON番号
 * 
 */
HJN.init.ResetStyle = Init.ResetStyle = function(isInit){ // #79
	// 指定クラス名が設定された要素にスタイルを設定する
	var elements = document.getElementsByClassName("lineViewer");
	for(var i = 0; i < elements.length; i++){
		Util.Element.SetStyles(elements[i],
				{ bottom: 0, left: "", top: "", width: "70%", height: "10vh"});
	}
	elements = document.getElementsByClassName("statusbar");
	for(var i = 0; i < elements.length; i++){
		Util.Element.SetStyles(elements[i],
				{ left: "10px", top: 0, width: "155px", height: "40px"});
	}
	Util.Element.SetStyles(document.getElementById("Simulator"),
				{ left: 0, top: 0, width: "190px", height: 0});
	// 別途初期設定される値を再設定する
	if (!isInit) {
		HJN.chart.graph.resetZoom();
		HJN.chartD.graph.resetZoom();
	}
}
/**
 * データを自動生成し表示する
 * 
 * @memberof HJN.init
 * @param {String|Number}
 *            [json = Simulator.virtualSystemByJson.GetJsonConfig(0)]
 *            シミュレーション条件JSONテキスト、もしくはサンプルJSON番号
 */
export function CreateSampleTatLogAndChartShow(json){ // #53
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
	Init.ChartShow(HJN.chart.eTatOriginal);
}

/**
 * 終了時刻とtatの配列をグラフ表示する（Menuイベントから呼び出される）
 * 
 * @memberof HJN.init
 * @param {ETAT}
 *            HJN.chart.eTatOriginal 終了時刻とtatを含む配列
 */
HJN.init.ChartShow = Init.ChartShow = function(eTatOriginal){
	// フィルタしたeTatを取得する #34
	var eTat = HJN.chart.fileParser.createFilter().filter(eTatOriginal);

	// グラフを初期表示する
	HJN.Plot.List = []; // #53
	// 上段
	if (eTat.length === 0) eTat = [{x:0, y:0}]; // #72
	var tat = new TimeSeries.Tat(eTat); // #75
	HJN.chart.setSeriesSet(tat);
	HJN.chart.update();
	showLogForUpperGraph("Simulator"); // #79

	// 下段(非同期）
	Util.setZeroTimeout( function(){
		HJN.chartD.update(Init.ChartRegistDetail(HJN.chart.cTps));
		HJN.chart.showBalloon();	// 上段のBalloonを描画する
		if (HJN.chartD.eTat){
			showLogForLowerGraph("Simulator"); // #79
		} else { // #72
			Util.Logger.ShowLogText("<mark>表示データがありません</mark>", "msg");
		}
		// 上下段のマウス操作同期設定 #49
		var sync = Dygraph.synchronize(
				 [ HJN.chart.graph, HJN.chartD.graph ],
				 {selection: true, zoom: false});
	});
}
function showLogForUpperGraph(fileName){
	// 上段グラフの処理時間をログに出力
	// Util.Logger.ShowLogText("+ ", "elaps");
}
function showLogForLowerGraph(fileName){
	// 下段グラフの処理時間をログに出力
	// Util.Logger.ShowLogText("", "elaps", true);

	// ファイル名、取込レコード数のログ編集
	var text = "<mark>" + /* fileName + */ " ["
			+ (HJN.chart.eTat.length.toString() + "")
				.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') // 整数文字列のカンマ編集
			+ "]行</mark> ";
	// 下段の表示レコード数をログに出力
	if (HJN.chartD.eTat){
		text += "下段["
				+ (HJN.chartD.eTat.length + "")
					.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') // 整数文字列のカンマ編集
				+ "]行";
	}else{
		text = "" +
				"表示データなし　要確認：Charset, delimiter, Line feed code"
	}
	// ログ出力
	Util.Logger.ShowLogText(text, "msg");
}

/**
 * HTMLタグに、CSVファイルのドロップを受付けイベントを登録する
 * 
 * @memberof HJN.init
 * @param {string}
 *            dropFieldName ファイルのドロップイベントを受けるフィールド名
 */
Init.DropField = function (dropFieldName) {
	// 第一引数で指定された名前の ID 属性のエレメントを取得する
	var element = document.getElementById(dropFieldName);

	// ドラッグ操作中に実行されるイベント（マウスカーソルが要素内に滞在中）
	element.addEventListener("dragover" , function (e){
		e.preventDefault();	// ドロップを許可し受け入れを表明
	});

	// ドロップ時に実行されるイベント
	element.addEventListener("drop", function (e){
			var data_transfer = e.dataTransfer;		// DataTransfer オブジェクトを取得する
			if(!data_transfer.types) return;		// ファイルのコンテンツタイプを取得できたことを確認する
			var files = data_transfer.files;	// ファイルのリストを取得する
			Init.FileReader(files);
			e.preventDefault();		// デフォルトのドロップ機能を無効化
	});
};

/**
 * 指定されたファイルを読込んで処理する
 * 
 * @memberof HJN.init
 * @param {Object}
 *            files ファイルハンドラ
 */
HJN.init.FileReader = Init.FileReader = function (files){  // #15
	for(var i = 0; i < files.length; i++){	// データを順番に取得する
		try{
			// ファイルを取得する
			var file = files[i];
			// ログ出力用にファイル名、ファイルサイズ、ファイル更新日時を編集する
			var textArray = "<mark><b>" + file.name + "</b></mark><BR>"
						+ (file.size + "")
							.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') // 整数文字列のカンマ編集
						+ "Kbyte<BR>"
						+ file.lastModifiedDate.toLocaleString() + "<BR>";
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
			Util.Logger.ResetTimestamp();			  // 情報表示 : 初期化
			Util.Logger.ShowLogText(textArray, "msg");  // 情報表示：ドロップファイル情報
			// 指定ファイルを読み込む
			// CSVファイルを上段用eTatに展開する[{x:, y:,pos:,len:},...] 全件展開する
			if (i === 0 && HJN.chart.fileParser.isNewETAT()){
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
				var eTat = HJN.chart.fileParser.createFilter().filter(HJN.chart.eTatOriginal);

				// 上段グラフを描画する（ eTatから上段用 時系列分析データ(seriesSet)を展開する）
				if (eTat.length === 0) eTat = [{x:0, y:0}]; // #72
				var tat = new TimeSeries.Tat(eTat); // #75
				HJN.chart.setSeriesSet(tat);
				HJN.chart.update();
				showLogForUpperGraph(HJN.files[0].name); // #79

				// 下段用データの展開とグラフ描画（非同期処理）
				HJN.Plot.List = [];
				Util.setZeroTimeout(function(){
					if (HJN.chart.cTps) {
						// 下段グラフを描画する（下段用 時系列分析データ(seriesSet)を展開する）
						HJN.chartD.update(Init.ChartRegistDetail(HJN.chart.cTps));
						// 上段のBalloonを描画する(上段update時にはplots登録されていないので、ここで処理）
						HJN.chart.showBalloon();
						showLogForLowerGraph(HJN.files[0].name); // #79
					} else { // #72
						Util.Logger.ShowLogText("<mark>表示データがありません</mark>", "msg");
					}
				});
			}
		}
	}

	// 内部関数： 指定ファイルの先頭ｎ行を、改行文字<BR> のテキストに変換してリターンする
	function topLines(file, n) {
		var fileInfo = "",
			line;
		try{	// 先頭からnレコード取得
			var getterOfLine = HJN.chart.fileParser.createGetterOfLine(file);
			for (var i = 0; i < n; i++) {
				line = getterOfLine.next();
				fileInfo += line.str + "<BR>";
			}
		}catch (e) {
			alert("[Init.DropField 改行コードの無いファイルは扱えません]");
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
			getterOfLine = HJN.chart.fileParser.createGetterOfLine(file),
			getterOfXY = HJN.chart.fileParser.createGetterOfXY(),
			isDataType_TatStart = (Util.Config.File.getConfig("DATATYPE") == "DATATYPE_TATSTART"),
			isDataType_StartEnd = (Util.Config.File.getConfig("DATATYPE") == "DATATYPE_START_END"), // #89
			line = getterOfLine.next(), // 先頭行の初期処理
			lineNum = 0,
			errorNum = 0,
			charset = HJN.Config.File.getConfig("CHAR");
		while (!line.isEoF) {				// 以降最終行まで処理する
		    lineNum++;
			try {
				Util.Logger.ByInterval(i++, line); // 一定時刻毎に進捗を出力する
				xy = getterOfXY.parse(line);
				if(!xy.isError){
					if (isDataType_TatStart){ // #81 DATATYPE_TATSTART
						eTat.push( {x: (xy.x + xy.y), y: xy.y, fileIdx: idx, // #93
							pos: line.pos, len: line.array.byteLength, sTatIdx: 0} );
					} else { // DATATYPE_TATEND
						eTat.push( {x: xy.x, y: xy.y, fileIdx: idx, // #23
							pos: line.pos, len: line.array.byteLength, sTatIdx: 0} );
					}
					// 先頭４行までパース結果をログ出力する
					if (lineNum < 5){
					    log(true, xy, line);
					}
				} else {
				    log(false, xy, line);
				}
			} catch (e) {	/* 改行だけレコードをスキップ */
			    log(false, xy, line);
	            if (e) console.log(e); // #93
			}
            line = getterOfLine.next(); // #24 #96
		}
		// エラーレコード数をログ出力する
        if (!errorNum){
            Util.Logger.ShowLogText(errorNum + " times failed to parse as CSV.", "msg");
        }
		Util.Logger.ShowLogText("[0:file readed & got eTat]---------------","calc");
		return eTat;

		// ログ出力する（内部関数）
		function log(okng, xy, line){
            if (okng){
                // 正常ログの出力は、５行目まで
                if (lineNum > 5) return;
                else Util.Logger.ShowLogText("<br>OK:line " + lineNum + " <br>"
                        + " [" +  window.HJN.Util.D2S(xy.x, "yyyy/MM/dd hh:mm:ss.000")
                        + ", " + window.HJN.Util.N2S(xy.y) + "]<br>"
                        + window.HJN.Util.Encoding.charset.convert(line.str, "Unicode", charset)
                        , "msg");
            } else {
                errorNum++;
                // エラーログの出力は、５回まで
                if  (errorNum > 5) return;
                else Util.Logger.ShowLogText("<br>NG:line " + lineNum + " <br>" 
                        + window.HJN.Util.Encoding.charset.convert(line.str, "Unicode", charset)
                        , "msg");
            }
		}
	}
};


/**
 * 詳細グラフ用機能： 表示対象期間のcTpsから、eTps範囲を取得し、詳細Seriesを生成する。併せてPlotsを登録する。
 * 
 * @memberof HJN.init
 * @param {xMs}
 *            cTps 日時（ミリ秒単位）
 * @return {seriesSet} dygraph用時系列データ配列
 */
Init.ChartRegistDetail = function(cTps){
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
		var tat = new TimeSeries.Tat(HJN.init.GetSliderRangedEtat()); // #75
		HJN.chartD.setSeriesSet(tat);
		// plotsアイコン用 HJN.Plot.Listに、下段表示したplotを登録する
		HJN.Plot.Add(HJN.Tat.CTPS.N, cTps[maxYIdx].x, cTps[maxYIdx].y);
	}
	Util.Logger.ShowLogText("[6:Plot added] " + HJN.Plot.List.length + " plots","calc");

	return HJN.chartD.seriesSet;
};
/**
 * 詳細グラフ用機能： sliderRangeで指定された範囲のeTatを返却する（グラフの点クリックイベント時に呼び出される）
 * 
 * @memberof HJN.init
 * @return {ETAT} 詳細グラフ用eTat
 */
HJN.init.GetSliderRangedEtat = function() {
	// 指定時刻（ｄｔ ± range）を取得し、HJNグローバル変数に退避する #27
	var rangeTagPlus  = Util.Config.DetailGraph.getConfig("D_RANGE_PLUS");
	var rangeTagMinus = Util.Config.DetailGraph.getConfig("D_RANGE_MINUS");
	var rangeTagUnit  = Util.Config.DetailGraph.getConfig("D_UNIT"); // #48
	var rangeCycle = HJN.chart.cTpsUnit.unit / 1000; // 変動する #38

	rangeTagPlus = rangeTagPlus  ? +rangeTagPlus : 1 + rangeCycle;	 // 幅（秒）
	rangeTagMinus = rangeTagMinus ? +rangeTagMinus : rangeCycle;	 // 幅（秒）
	rangeTagUnit = rangeTagUnit  ? +rangeTagUnit : TimeSeries.Tat.CYCLE; // #48

	Util.Config.DetailGraph.setValueByKey("D_RANGE_PLUS",rangeTagPlus);
	Util.Config.DetailGraph.setValueByKey("D_RANGE_MINUS",rangeTagMinus);
	Util.Config.DetailGraph.setValueByKey("D_UNIT",rangeTagUnit);

	var detailDateTime = Util.Config.DetailGraph.getValueByKey("D_TIME");
	var eTatDetail = (new TimeSeries.ETat(HJN.chart.eTat)).sliceByRangeUnit(detailDateTime,
				rangeTagMinus, rangeTagPlus, rangeTagUnit); // #75

	Util.Logger.ShowLogText("[0:HJN.init.GetSliderRangedEtat] ","calc");
	return eTatDetail;  // 詳細グラフ用eTatを返却する
};
/**
 * 詳細グラフ用機能： 指定日時を秒単位に丸めて、FORMのslider Rangeに設定する（Plotから呼び出される）
 * 
 * @memberof HJN.init
 * @param {xMs}
 *            date 日時（ミリ秒単位）
 */
HJN.init.SetDetailDateTime=function(date) {
	Util.Config.DetailGraph.setValueByKey("D_TIME",
			Math.floor(date / 1000) * 1000); // 秒単位に丸める #27
};

/**
 * 使い方HTMLを取得する（Menuイベントから呼び出される） #84
 * 
 * @memberof HJN.init
 * @return {String} str 使い方HTML
 */
HJN.init.Usage=function(){
    var UsageHtmlFile = "tatLogDiver-Usage.html";
    var UsageHtmlURL = "./tatLogDiver/" + UsageHtmlFile;
    // requireメソッドの有無で、webpack環境下か判定する
    if (typeof require === "undefined") {
        // webpack でパッケージ化していないとき、ダイアログ内にhtmlへのパスを表示する
        var url = "https://github.com/hirosejn/HJN/wiki/Usage(JP)";
        var label = "GitHub wiki : " + url;
        var html = 'Usage of TAT log diver'
            + '<br>'
            + 'webpack 未適用モード'
            + '<br>'
            + '<a class="hjnLabel4Input" href="' + url + '"'
            + 'target=”_hirosejnUsage”>' + label +'</a><BR>'
            + '<br>'
            + '<a class="hjnLabel4Input" href="' + UsageHtmlURL + '"'
            + 'target=”_hirosejnUsage”>' + UsageHtmlURL +'</a><BR>';
        return html;
    } else {
        // webpack でパッケージ化するとき、ダイアログ内にhtmlを表示する
        return require("./" + UsageHtmlFile); // #94
    }
};

/**
 * 著作権表記文字を取得する（Menuイベントから呼び出される）
 * 
 * @memberof HJN.init
 * @return {String} str 著作権表記文字
 */
HJN.init.Copyright=function(){
	return Copyright.getAboutText();
};