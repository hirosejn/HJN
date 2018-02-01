"use strict";
import * as Util from '../util/util.js';
import * as Simulator from '../simulator/simulator.js';
import {HJN} from './tatLogDiver-hjn.js';
import Graph from './tatLogDiver-graph.js';
import Plot  from './tatLogDiver-plot.js';
import * as TimeSeries from '../timeSeries/timeSeries.js';
import {Copyright} from "./tatLogDiver-Copyright.js";


/* *****1*********2*********3*********4*********5*********6*********7******* */
/**
 * HTMLから呼び出すAPI
 * 
 * @memberof Init
 * @param {string}
 *            [chartName=HJN.chartName="chart"] グラフを作成するHTMLタグ名
 * @return {ETAT} 終了時刻のTAT（応答時間）時系列データ
 * @example <!doctype html> <html> <head> <meta charset="UTF-8"> <link
 *          type="text/css" rel="stylesheet" href="../libs/dygraph.css"> <link
 *          type="text/css" rel="stylesheet" href="./tatLogDiver.css"> </head>
 *          <body> <div id="hjn_chart"></div> <script src="../libs/dygraph.js"></script>
 *          <script src="../libs/extras/synchronizer.js"></script> <script
 *          type="module"> import {HJN_init_ChartRegist} from
 *          "./tatLogDiver-init.js";
 *          window.addEventListener("DOMContentLoaded",function(eve){
 *          Bundle("chart"); // チャートを作成する }); </script> </body> </html>
 */
export default function Init(chartName){ // #70

	"use strict";
	// 引数１ ：デフォルトHJN.chartName("chart")
	HJN.chartName = chartName = chartName || HJN.chartName;
	// タイトルを設定する #57
	document.title = "tat log diver " + Copyright.Version; 
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
	HJN.chart = new Graph(chartName, "HJN.chart");
	HJN.chart.init();
	HJN.chartD = new Graph(chartName + "D", "HJN.chartD");
	HJN.chartD.init();
	// ドロップフィールドに、処理を登録する(注：dygraphはイベントリスナーを登録しないとクリック時にエラーが出る）
	Init.DropField(dropFieldName);
	Init.DropField(dropFieldName+ "D");

	// 初期表示データを自動生成する // #53
	Util.Config.GetConfig("Simulator").getFunctionByKey("S_SIMU")(); // #53
}

/**
 * データを自動生成し表示する
 * 
 * @memberof Init
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
    Init.ChartShow(HJN.chart.eTatOriginal);
}

/**
 * 終了時刻とtatの配列をグラフ表示する（Menuイベントから呼び出される）
 * 
 * @memberof Init
 * @param {ETAT}
 *            HJN.chart.eTatOriginal 終了時刻とtatを含む配列
 */
Init.ChartShow = function(eTatOriginal){
    // フィルタしたeTatを取得する #34
    var eTat = HJN.chart.fileReader.createFilter().filter(eTatOriginal);
    
    // グラフを初期表示する
    HJN.Plot.List = []; // #53
    // 上段
    var tatSet = (new TimeSeries.Tat()).createSeries(eTat); // #75
    HJN.chart.setSeriesSet(tatSet.seriesSet, tatSet.cTpsUnit);
    HJN.chart.update();
    var text = "上段表示 [" + HJN.chart.eTat.length + "]";
    Util.Logger.ShowLogText(text, "elaps");       // 処理時間ログ出力

    // 下段(非同期）
   Util.setZeroTimeout( function(){
       HJN.chartD.update(Init.ChartRegistDetail(HJN.chart.cTps));
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
 * @memberof Init
 * @param {string}
 *            dropFieldName ファイルのドロップイベントを受けるフィールド名
 */
Init.DropField = function (dropFieldName) {
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
			Init.FileReader(files);
			e.preventDefault();		// デフォルトのドロップ機能を無効化
	});
};

/**
 * 指定されたファイルを読込んで処理する
 * 
 * @memberof Init
 * @param {Object}
 *            files ファイルハンドラ
 */
Init.FileReader = function (files){  // #15
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
                var tatSet = (new TimeSeries.Tat()).createSeries(eTat); // #75
                HJN.chart.setSeriesSet(tatSet.seriesSet, tatSet.cTpsUnit);
                HJN.chart.update();
                Util.Logger.ShowLogText("上段表示", "elaps");

                // 下段用データの展開とグラフ描画（非同期処理）
                HJN.Plot.List = [];
                Util.setZeroTimeout(function(){
                    // 下段グラフを描画する（下段用 時系列分析データ(seriesSet)を展開する）
                    HJN.chartD.update(Init.ChartRegistDetail(HJN.chart.cTps));
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
 * @memberof Init
 * @param {xMs}
 *            cTps 日時（ミリ秒単位）
 * @return {seriesSet} dygraph用時系列データ配列
 */
Init.ChartRegistDetail = function(cTps){
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
	    var tatSet = (new TimeSeries.Tat()).createSeries(Init.GetSliderRangedEtat()); // #75
	    HJN.chartD.setSeriesSet(tatSet.seriesSet, tatSet.cTpsUnit);
		// plotsアイコン用 HJN.Plot.Listに、下段表示したplotを登録する
		HJN.Plot.Add(HJN.CTPS.N, cTps[maxYIdx].x, cTps[maxYIdx].y);
	}
	Util.Logger.ShowLogText("[6:Plot added] " + HJN.Plot.List.length + " plots","calc");

	return HJN.chartD.seriesSet;
};
/**
 * 詳細グラフ用機能： sliderRangeで指定された範囲のeTatを返却する
 * 
 * @memberof Init
 * @return {ETAT} 詳細グラフ用eTat
 */
Init.GetSliderRangedEtat = function(n) {
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
	Util.Logger.ShowLogText("[0:Init.GetSliderRangedEtat] ","calc");
	
	return eTatDetail;	// 詳細グラフ用eTatを返却する
};
/**
 * 詳細グラフ用機能： 表示期間変更時に、Detailを再描画する（onChangeイベント時に呼び出される）
 * 
 * @memberof Init
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
            HJN.chartD.seriesSet = HJN.chartD.createSeries( Init.GetSliderRangedEtat() );
            // 下段グラフを描画する
            Graph.prototype.update.call(HJN.chartD, HJN.chartD.seriesSet);
        }, 750);    // 750ms 値の変更がなかった時に、処理を開始する
};
/**
 * 詳細グラフ用機能： 指定日時を秒単位に丸めて、FORMのslider Rangeに設定する（Plotから呼び出される）
 * 
 * @memberof Init
 * @param {xMs}
 *            date 日時（ミリ秒単位）
 */
HJN.init.SetDetailDateTime=function(date) {
    "use strict";
    HJN.detailDateTime = Math.floor(date / 1000) * 1000;    // 秒単位に丸める
};


/**
 * 著作権表記文字を取得する（Menuイベントから呼び出される）
 * 
 * @memberof Init
 * @return {String} str 著作権表記文字
 */
HJN.init.Copyright=function(){
    "use strict";
    return Copyright.text;
};