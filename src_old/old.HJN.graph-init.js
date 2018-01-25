/* *****1*********2*********3*********4*********5*********6*********7******* */
/**
 * HTMLから呼ばれるサンプル実装
 * 
 * @param {string}
 *            [chartName=HJN.chartName="chart"] グラフを作成するHTMLタグ名
 * @return {ETAT} 終了時刻のTAT（応答時間）時系列データ
 * @example window.addEventListener("DOMContentLoaded",function(eve){
 *          HJN.init.ChartRegist("chart"); });
 */
HJN.init.ChartRegist = function(chartName){
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
	HJN.util.Logger.ShowLogTextInit(); // 処理時間計測の初期化

	// グラフのインスタンスを作成し初期化する
	HJN.chart = new HJN.Graph(chartName, "HJN.chart");
	HJN.chart.init();
	HJN.chartD = new HJN.Graph(chartName + "D", "HJN.chartD");
	HJN.chartD.init();
	// ドロップフィールドに、処理を登録する(注：dygraphはイベントリスナーを登録しないとクリック時にエラーが出る）
	HJN.init.DropField(dropFieldName);
	HJN.init.DropField(dropFieldName+ "D");

	// 初期表示データを自動生成する // #53
	HJN.util.Config.GetConfig("Simulator").getFunctionByKey("S_SIMU")(); // #53
	
}

/**
 * データを自動生成し表示する
 * 
 * @param {String|Number}
 *            [json = HJN.util.virtualSystemByJson.GetJsonConfig(0)]
 *            シミュレーション条件JSONテキスト、もしくはサンプルJSON番号
 */
HJN.init.CreateSampleTatLogAndChartShow = function(json){ // #53
    "use strict";
    var jsonText;
    if (typeof(json) === "number") { // #53
        jsonText = HJN.util.virtualSystemByJson.GetJsonConfig(json);
    } else{
        jsonText = json || HJN.util.virtualSystemByJson.GetJsonConfig(0);
    }
    // JSON Editorを更新する
    document.getElementById("SimulatorEditor").value = jsonText;
    // 初期表示データを自動生成する
    HJN.chart.eTatOriginal = HJN.util.virtualSystemByJson.Execute(jsonText);
    // データを表示する
    HJN.init.ChartShow(HJN.chart.eTatOriginal);
}

/**
 * HJN.init.ChartShow: 終了時刻とtatの配列をグラフ表示する
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
    HJN.util.Logger.ShowLogText(text, "elaps");       // 処理時間ログ出力

    // 下段(非同期）
    HJN.util.setZeroTimeout( function(){
        HJN.chartD.update(HJN.init.ChartRegistDetail(HJN.chart.cTps));
        HJN.chart.showBalloon();    // 上段のBalloonを描画する
        var text = "下段表示 [" + HJN.chartD.eTat.length + "]";
        HJN.util.Logger.ShowLogText(text, "elaps");
        text = "<mark>Simulated data</mark>["
            + HJN.chart.eTat.length.toString()
                .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') + "]"; // 整数文字列のカンマ編集
        HJN.util.Logger.ShowLogText(text, "msg");
        // 上下段のマウス操作同期設定 #49
        var sync = Dygraph.synchronize(
                 [ HJN.chart.graph, HJN.chartD.graph ],
                 {selection: true, zoom: false});
    });
}

/**
 * HJN.init.DropField: HTMLタグに、CSVファイルのドロップを受付けイベントを登録する
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
 * HJN.init.FileReader: 指定されたファイルを読込んで処理する
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
			HJN.util.Logger.ShowText( ["<mark>"+msg+"</mark>"] );
			console.error("[%o]%o",msg,e );
		}
	}

	// 内部関数：ファイルを読み込みｸﾞﾗﾌを表示する（指定ファイルを読み込んだ後に呼び出される） #23
    function funcOnloadend(file, i, evt) {
        if (evt.target.readyState === FileReader.DONE) { // DONE == 2
            var filesIdx = HJN.files.length;
            // ファイルの先頭2行をログ表示する
            HJN.filesArrayBuffer[filesIdx] = evt.target.result;
            HJN.util.Logger.ShowLogTextInit();              // 情報表示 : 初期化
            HJN.util.Logger.ShowLogText(textArray, "msg");  // 情報表示：ドロップファイル情報
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
                HJN.util.Logger.ShowLogText("上段表示", "elaps");

                // 下段用データの展開とグラフ描画（非同期処理）
                HJN.Plot.List = [];
                HJN.util.setZeroTimeout(function(){
                    // 下段グラフを描画する（下段用 時系列分析データ(seriesSet)を展開する）
                    HJN.chartD.update(HJN.init.ChartRegistDetail(HJN.chart.cTps));
                    // 上段のBalloonを描画する(上段update時にはplots登録されていないので、ここで処理）
                    HJN.chart.showBalloon();
                    HJN.util.Logger.ShowLogText("下段表示", "elaps");
                    HJN.util.Logger.ShowLogText("<mark>"+ HJN.files[0].name +
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
	    HJN.util.Logger.ShowLogText("----- read file -----------------------------","calc");
	    var file = files[idx], // #23
	        eTat = [],
	        xy = {date: 0, value: 0, isError: false },
	        i = 0,  // timelog用
	        getterOfLine = HJN.chart.fileReader.createGetterOfLine(file),
	        getterOfXY = HJN.chart.fileReader.createGetterOfXY(),
	        line = getterOfLine.next();     // 先頭行の初期処理
	    while (!line.isEoF) {               // 以降最終行まで処理する
	        try {
	            HJN.util.Logger.ByInterval(i++, line); // 一定時刻毎に進捗を出力する
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
	    HJN.util.Logger.ShowLogText("[0:file readed & got eTat]---------------","calc");
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
	HJN.util.Logger.ShowLogText("[6:Plot added] " + HJN.Plot.List.length + " plots","calc");

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
	HJN.util.Logger.ShowLogText("[0:HJN.init.GetSliderRangedEtat] ","calc");
	
	return eTatDetail;	// 詳細グラフ用eTatを返却する
};
/**
 * 詳細グラフ用機能： 表示期間変更時に、Detailを再描画する（onChangeイベント時に呼び出される）
 */
HJN.init.setDetailRange = function(){
    "use strict";
    clearTimeout(HJN.timer);
    HJN.timer = setTimeout(function(){
            HJN.util.Logger.ShowLogTextInit("[-:HJN.init.setDetailRange]start---------------","calc");
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
	HJN.util.Logger.ShowLogText("[0:PointClickCallback]start---------------","calc");
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
	if (!HJN.util.TouchPanel.isTouchableDevice()) { // #22
	    HJN.util.CopyToClipboard("lineViewer"); // #61
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
		label = HJN.util.D2S(x, format, true) + " " + // #61
				HJN.seriesConfig[n].label.replace("%N",HJN.util.N2S(y));
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
			i = HJN.util.binarySearch(x, conc, function(e){ return e.x; });
		for (; i < conc.length && conc[i].x < toX; i++){	// #26
			if (concMax <= conc[i].y){
    				maxTime = conc[i].x;
    				concMax = conc[i].y;
			}
		}
		if (concMax === y) { // 補正すべき時刻が求まったときCONC,ETATを追加する #23
            x = maxTime;
            format = "hh:mm:ss.ppp";
            label = HJN.util.D2S(x, format, true) + " " + // #61
                    HJN.seriesConfig[n].label.replace("%N",HJN.util.N2S(y));
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
 * @class
 * @classdesc ファイルをパースして読み込む
 *            <p>
 *            パース条件指定画面生成つき
 */
HJN.util.FileReader = (function() {
	"use strict";
	/** @static */
	FileReader.prototype.__keyConfig = {};	// configで使用する値の定義

	/** constructor */
	function FileReader(){
		if(!(this instanceof FileReader)) return new FileReader();

        this.configId = "_config_" + "File"; // #53

		// コンストラクタ内部関数：keyを定義する
		var def = function(key, val, onFunc) {
					var _keyConf = FileReader.prototype.__keyConfig[key] = {};
					_keyConf.value = (val === undefined) ? key : val; // getValueByKeyの返却値（デフォルト：keyと同じ文字列）
					_keyConf.getValue = function () { return (val === undefined) ? key : val; };
					_keyConf.onFunc = onFunc || null;	// onイベント時に実行する処理（メニューのa属性などで利用）
					return key;
				};
		var v = function(key, fieldId) { // fieldIdの値を返却値とする(デフォルト： key+".v")
					var _keyConf = FileReader.prototype.__keyConfig[key] = {};
					_keyConf.value = key;			// getValueByKeyの返却値（デフォルト：keyと同じ文字列）
					_keyConf.getValue = function () {
							return HJN.util.Config("m").getValueByKey(fieldId || key + ".v"); // TODO:
                                                                                                // m
                                                                                                // の指定
						};
					return key;
				};

		// 名称と挙動の定義
		var env = "File";
		this["_config_" + env] = HJN.util.Config(env) // #53
		    // File Format Config設定画面定義 #51
            .name("NEWFILE").label(null,"Registered ") // #23
                .radio("NEWDATA", null, "newly", true)
                .radio("ADDDATA", null, "additionally").n()
			.label(null,"----- File format definition --------").n()
			.n("<br>")
			.name("LF").label(null, "[Line feed code]").n()
			.radio(v("LF_FIX"), null, "Fixed Length")
				.number("LF_FIX.v",  null, "byte","80",'style="width:60px;"').n()
			.radio(def("LF_WIN",  13), null, "Windows:CR(13)+LF(10)", true).n()
			.radio(def("LF_UNIX", 10), null, "Unix/Linux:LF(10)").n()
			.radio(def("LF_ZOS",  15), null, "zOS:NEL(15)").n()
			.radio(def("LF_MAC",  13), null, "Mac:CR(13)").n()
			.radio(v("LF_ELSE"), null, "other charcode")
				.number("LF_ELSE.v", "(", ")", "10", 'style="width:40px;"').n()
			.n("<br>")
			.name("SEP").label(null,"[CSV delimiter]").n()
			.radio(def("SEP_COMMA", ','), null, "comma", true)
			.radio(def("SEP_TAB", '\t'),   null,"tab")
			.radio(v("SEP_ELSE"), null, "other")
				.text("SEP_ELSE.v", '"', '"', ',', 'size="2" placeholder=","').n()
			.n("<br>")
			.name("TIME").label(null, "[Timestamp field]").n()
			.number("TIME_COL", "", "th column of CSV", "1", 'style="width:40px;"').n()
			.name("TIME_POS")
				.number("TIME_POS", "Position(byte): from", null, "1", 'style="width:40px;"')
				.number("TIME_LEN", "length", null, null, 'style="width:40px;"').n()
			.name("TIME_FORM").label(null,"Format:").n()
                .radio("TIME_FORM_YMD", "text", null, true)
                    .text("TIME_YMD", null, null, null, 'size="23" placeholder="YYYY/MM/DD hh.mm.ss.ppp"').n()
                .radio("TIME_FORM_TEXT", "(num)", "text")
                .radio("TIME_FORM_LONG", null, "long").n()
				.nDown()
                .name("TIME_UNIT").label(null, "Units of numbers:")
                    .radio(def("TIME_UNIT_MS", 1), null, "msec")
                    .radio(def("TIME_UNIT_SEC", 1000), null, "sec", true)
				.nUp()
			.n("<br>")
			.name("TAT").label(null,"[Turnaround time(TAT) field]").n()
			.number("TAT_COL", "", "th column of CSV", "2", 'style="width:40px;"').n()
			.name("TAT_POS")
				.number("TAT_POS", "Position(byte): from", null, "1", 'style="width:40px;"')
				.number("TAT_LEN", "length", null, null, 'style="width:40px;"').n()
			.name("TAT_UNIT").label(null, "Units of numbers:")
					.radio(def("TAT_UNIT_MS", 1), null, "msec")
					.radio(def("TAT_UNIT_SEC", 1000), null, "sec", true).n()
            .name("TAT_FORM").label(null,"Format: ")
                .radio("TAT_FORM_TEXT", null, "text", true)
                .radio("TAT_FORM_LONG", null, "long").n()
                .nDown()
                .name("ENDIAN").label(null, "for long Endian: ")
    				.radio(def("ENDIAN_LIL", true), null, "little", true)
    				.radio(def("ENDIAN_BIG", false), null, "big")
				.nUp()
            .n("<br>")
		;

		// Filter Config用関数定義(radio用） #51
		env = "Filter"
		var func_F_SYNC_UPPER = function(){ HJN.Graph.DrawCallback(HJN.chart.graph); },
		    func_F_SYNC_DETAIL = function(){ HJN.Graph.DrawCallback(HJN.chartD.graph); };
		// Filter Config設定画面定義 #51
        this["_config_" + env] = HJN.util.Config(env) // #53
            .name("F_SYNC").label(null,"Sync") // #50
                .radio("F_SYNC_UPPER", null, "Upper", false ,null, func_F_SYNC_UPPER) // #51
                .radio("F_SYNC_DETAIL", null, "Detail", false, null, func_F_SYNC_DETAIL)
                .radio("F_ASYNC", null, "Async", true).n()
    		.label(null,"----- Data filter condition--------").n()
    			.n("<br>")
    			.name("F_TIME").label(null, "[Date filter]").n()
    			.label(null,"Include if end time is between").n()
    				.text("F_TIME_FROM", null, null, null, 'size="23" placeholder="YYYY/MM/DD hh.mm.ss.ppp"')
    				.label(null,"and").n()
    				.text("F_TIME_TO", null, null, null, 'size="23" placeholder="YYYY/MM/DD hh.mm.ss.ppp"').n()
    			.n("<br>")
    			.name("F_TAT").label(null,"[Turnaround time(TAT) filter]").n()
    			.label(null,"Include if TAT is between").n()
    				.number("F_TAT_FROM", null, null, "0", 'style="width:80px;"')
    				.number("F_TAT_TO", "and", null, null, 'style="width:80px;"').n()
    			.n("<br>")
    			.name("F_TEXT").label(null,"[Text filter]")
    				.radio("F_TEXT_NON", null, "Don't use.", true).n()
    				.radio("F_TEXT_INCLUDE", null, "Include ")
    				.radio("F_TEXT_EXCLUDE", null, "Exclude ").n()
    				.number("F_TEXT_LEN", "if ", " bytes", null, 'style="width:40px;"')
    				.number("F_TEXT_POS", "from the ", "th byte", "1", 'style="width:40px;"').n()
    				.number("F_TEXT_COL", "from head of the", "th column of CSV", "3", 'style="width:40px;"').n()
    				.text("F_TEXT_REG", "match the regular expression", null, null, 'size="7" placeholder=".*"').n()
    			.n("<br>")
		;

        // Simulator Config用関数定義(radio用） #53
        env = "Simulator"
        var func_S_SIMU_000 = function(){ HJN.init.CreateSampleTatLogAndChartShow(0); };
        var func_S_SIMU_001 = function(){ HJN.init.CreateSampleTatLogAndChartShow(1); };
		// Simulator Config設定画面定義 #53
        this["_config_" + env] = HJN.util.Config(env) // #53
            .n("<br>")
            .label(null," If you change the scenario below,").n()
            .label(null,"JSON is initialized and re-simulated.").n()
            .n("<br>")
            .name("S_SIMU")
                .radio("S_SIMU_000", null, 
                          "1 hour with table(B) lock.<br>"
                        + "- online[100-500ms 2-5tps]<br>" 
                        + "- batch[2-5sec evry3min]",
                        true ,null, func_S_SIMU_000).n()
                .radio("S_SIMU_001", null, "for test", 
                        false ,null, func_S_SIMU_001).n()
        ;
	}

	// class method
    /**
     * ファイルリーダのプロパティ管理インスタンスを取得する
     * 
     * @memberof HJN.util.FileReader
     * @param {Object}
     *            fileReader ファイルリーダ
     * @param {String}
     *            type プロパティ種別名（"File"|"Filter"|"Simulator")
     * @return {Object} プロパティ
     */
    FileReader.Property = (function() {
        "use strict";
        /** @constructor */
        function Property(fileReader, type){ 
            if(!(this instanceof Property)) return new Property(fileReader, type);
            this._type = type || "File";
            this._config     = fileReader["_config_" + this._type];
            this.__keyConfig = fileReader.__keyConfig;
        }

        // public
        /**
         * keyの値に指定されたvalue（なければkey値）を返却する
         * 
         * @memberof HJN.util.FileReader.Property
         * @param {String}
         *            key Conginのキー値
         */
        Property.prototype.getValue = function(key) {
            var cKey = this._config.getValueByKey(key);
            if(!this.__keyConfig[cKey] || this.__keyConfig[cKey].value === undefined){
                return cKey;    // valueが定義されていないとき、keyの設定値を返却
            }else{
                return this.__keyConfig[cKey].getValue(); // keyの設定値のvalueが定義されているとき
            }
        };
        /**
         * configに登録されているkey(prefix補填)の設定値を取得する
         * 
         * @memberof HJN.util.FileReader.Property
         */
        Property.prototype.getValueByKey = function(key) {
            return this._config.getValueByKey(key);
        };
    
        /* new */
        return Property;
    }());
    
    /** @private */
	//
	// public


	/**
     * ファイルが新たに指定された時、eTatOriginalを再構築するか否（データを追加する）か
     * 
     * @memberof HJN.util.FileReader
     * @return {boolean} 再構築モードするときtrue、データを追加するときfalse
     */
    FileReader.prototype.isNewETAT = function() { // #23
        return this.getValue("NEWFILE") === "NEWDATA";
    }
	
	/**
     * 「ファイルから次の1レコードを取得するutil」 を取得する
     * 
     * @memberof HJN.util.FileReader
     */
	FileReader.prototype.createGetterOfLine = function(file) {

	    /**
         * @class
         * @classdesc ファイルから１レコード取得する
         *            <p>
         *            ファクトリのFileReaderが保持する改行コードを用いて、ファイルから１レコードを取得する
         * 
         * @memberof HJN.util.FileReader
         * @example try{ var getterOfLine =
         *          HJN.chart.fileReader.createGetterOfLine(file), fileInfo;<br>
         *          for(var i = 0; i < n; i++) { <br>
         *          line = getterOfLine.next(); fileInfo += line.str + "<BR>"; }<br>
         *          }catch (e) {<br>
         *          console.error("改行コードの無いファイルは扱えません]%o",e); }
         */
		function GetterOfLine(file, maxLength){ /* constructor */
			if(!(this instanceof GetterOfLine)) return new GetterOfLine(file, maxLength);

			this.file = file;
			this.buf = new Uint8Array(file);
			this.maxLength = maxLength || this.buf.length,
			this.confLF = HJN.chart.fileReader.getValue("LF");	// 改行コードor固定レコード長
			this.from = 0;
			this.to = 0;
			this.len = 0;
			this.line = {file: this.file, pos: 0, array: null, str: "", isEoF: false };
		}
		// public
        /**
         * 次の1レコードを取得する
         * 
         * @name getValueByKey
         * @memberof HJN.util.FileReader.GetterOfLine
         */
		if (HJN.chart.fileReader.getValueByKey("LF") === "LF_FIX"){	// 固定長のとき
			GetterOfLine.prototype.next = function () {	// 次の1レコードを取得する
				if(this.from >= this.maxLength ){	// ファイル末尾のとき
					this.line = {file: this.file, pos: this.maxLength, array: null, str: "", isEoF: true };
				} else {
					this.len = Math.min(this.maxLength - this.from, this.confLF);
					var array = new Uint8Array(this.file, this.from, this.len);
					this.line = {
							file: this.file,
							pos: this.from,
							array: array,
							str: String.fromCharCode.apply(null, array),
							isEoF: false };
				}
				this.from += this.confLF;	// 次の行を指しておく
				return this.line;
			};
		} else { // 可変長のとき
			GetterOfLine.prototype.next = function () {	// 次の1レコードを取得する
				if(this.from >= this.maxLength ){	// ファイル末尾のとき
					this.line = {file: this.file, pos: this.maxLength, array: null, str: "", isEoF: true };
				} else {
					this.to = this.buf.indexOf(this.confLF, this.from);
					if(this.to < 0) this.to = this.maxLength;	// 最終レコード（EOFで改行コードなし）のとき
					this.len = Math.min(this.to - this.from, 1024);
					var array = new Uint8Array(this.file, this.from, this.len);
					this.line = {
							file: this.file,
							pos: this.from,
							array: array,
							str: String.fromCharCode.apply(null, array),
							isEoF: false };
				}
				this.from = this.to + 2;	// 次の行を指しておく
				return this.line;
			};
		}
		return new GetterOfLine(file);
	};
	
	
    /**
     * eTatのフィルター
     * 
     * @memberof HJN.util.FileReader
     */
    FileReader.prototype.createFilter = function() { // #34
       /**
         * @class
         * @classdesc FileReaderのフィルター
         *            <p>
         *            ファクトリのFileReaderが保持するフィルタ条件を用いるフィルターを取得する
         * 
         * @memberof HJN.util.FileReader
         */
        function Filter(){ /* constructor */
            if(!(this instanceof Filter)) return new Filter();
            this._fileReader = HJN.chart.fileReader; // #62
            var c = HJN.util.FileReader.Property(this._fileReader, "Filter");

            this.confF_TIME_FROM = HJN.util.S2D(c.getValue("F_TIME_FROM"));    // 時刻(X)の最小値フィルター
            this.confF_TIME_TO   = HJN.util.S2D(c.getValue("F_TIME_TO"));      // 時刻(X)の最大値フィルター
            this.confF_TIME = (isNaN(this.confF_TIME_FROM) && isNaN(this.confF_TIME_TO))
                            ? false : true; // 時刻(x）フィルター指定の有無
            
            this.confF_TAT_FROM = c.getValue("F_TAT_FROM") || 0; // 時間(Y)の最小値フィルター
            this.confF_TAT_TO   = c.getValue("F_TAT_TO") || Number.MAX_VALUE; // 時間(Y)の最大値フィルター
            this.confF_TAT = (this.confF_TAT_FROM === 0 && this.confF_TAT_TO === Number.MAX_VALUE)
                            ? false : true; // 時間(ｙ）フィルター指定の有無

            this.confF_TEXT = c.getValue("F_TEXT") || null; // テキストフィルタの条件（使用しない、Include,Exclude
            if (this.confF_TEXT === "F_TEXT_INCLUDE") {
                this.confF_TEXT = true;
            } else if (this.confF_TEXT === "F_TEXT_EXCLUDE") {
                this.confF_TEXT = false;
            } else { // "F_TEXT_NON"
                this.confF_TEXT = null;
            }
            
            this.confF_TEXT_LEN = c.getValue("F_TEXT_LEN") || null;    // フィルタテキストのバイト長
            this.confF_TEXT_POS = c.getValue("F_TEXT_POS") || 0;       // フィルタテキストの先頭バイト位置
            this.confF_TEXT_COL = (c.getValue("F_TEXT_COL") || 3) - 1; // フィルタテキストのカラム位置（先頭：０）
            this.confF_TEXT_REG = new RegExp(c.getValue("F_TEXT_REG") || ".*");    // フィルタテキストの正規表現
            
            this.confF_IS = (this.confF_TIME === true 
                            || this.confF_TAT === true || this.confF_TEXT != null)
                          ? true : false; // フィルタ指定の有無
            
            c = HJN.util.FileReader.Property(HJN.chart.fileReader, "File");
            this.confF_SEP = c.getValue("SEP").charCodeAt(0);
        }
        
        // class method
        // private
        /**
         * フィルター条件で判定する
         * 
         * @memberof HJN.util.FileReader.Filter
         */
        Filter.prototype._isIn = function (e) {
            // フィルタ指定が無いときフィルタしない（初期表示時に無駄な処理をしない）
            if (this.confF_IS === false) return true;
            // 時刻（ｘ）フィルタの判定 （conf指定なしのとき NaNとの比較となりfalseとなる）
            if (e.x < this.confF_TIME_FROM || this.confF_TIME_TO < e.x ) {
                return false;
            }
            // 時間（ｙ）フィルタの判定
            if (e.y < this.confF_TAT_FROM || this.confF_TAT_TO < e.y){
                return false;
            }
            // テキストフィルタの判定
            if (this.confF_TEXT === null) {
                return true; // フィルタ指定なし
            }
            var text = "";
            if (e.pos === undefined) { // テキスト読み込みでないとき（自動生成データのとき）
                // レコードを取得する #62
                text = this._fileReader.getRecordAsText(e); // #61
                // 指定正規表現に合致するか判定し、Include/Exclude指定に応じてリターンする
                return this.confF_TEXT === this.confF_TEXT_REG.test(text);
            } else { // ファイル読み込みのとき
                // レコードを取得する
                var arr = new Uint8Array(HJN.filesArrayBuffer[e.fileIdx+1], e.pos, e.len);
                // CSVレコードの指定カラムを取得する(arr)
                var colPos = 0;
                for (var i = 0; i < this.confF_TEXT_COL; i++) {
                    colPos = arr.indexOf(this.confF_SEP,colPos + 1);
                }
                if (colPos === -1){
                    // 指定数のカラムが無い場合、Includeは処理対象外、Excludeは処理対象
                    return !this.confF_TEXT;
                }
                var col = arr.slice(colPos, arr.length);
                // 判定用文字列を取得する
                text = col.slice(this.confF_TEXT_POS, this.confF_TEXT_POS + this.confF_TEXT_LEN);
                // 指定正規表現に合致するか判定し、Include/Exclude指定に応じてリターンする
                return this.confF_TEXT === this.confF_TEXT_REG.test(String.fromCharCode.apply(null, text));
            }
            return true;
        };
        
        // public
        /**
         * eTatをフィルターする
         * 
         * @memberof HJN.util.FileReader.Filter
         * @param {eTat}
         *            eTat フィルター処理対象のeTat
         * @return {eTat} eTat フィルターされたeTat
         * 
         */
        Filter.prototype.filter = function (eTat) {
            if (!eTat) return [];
            return eTat.filter(this._isIn, this);
        };

        return new Filter();
    };


    /**
     * 「１レコードからx:時刻（数値：ミリ秒）,y:Tat(数値：秒)を取得するutil」を取得する
     * 
     * @memberof HJN.util.FileReader
     */
	FileReader.prototype.createGetterOfXY = function() {

	    /**
         * @class
         * @classdesc １レコードをパースし、XとYをレコード取得する
         *            <p>
         *            ファクトリのFileReaderが保持するレコードフォーマット情報を用いて、ファイルの指定レコードからＸ(data)とＹ(value)を取得する
         * 
         * @memberof HJN.util.FileReader
         */
		function GetterOfXY(){ /* constructor */
			if(!(this instanceof GetterOfXY)) return new GetterOfXY();

			var c = HJN.chart.fileReader;
			this.configId = "_config_" + "Filter"; // #53
			this.confSEP = c.getValue("SEP");	// セパレータ
			
			this.confTIME_COL = c.getValue("TIME_COL") - 1 || 0;	// 時刻(X)のカラム位置
			this.confTIME_POS = (c.getValue("TIME_POS") || 1) - 1;	// 時刻(X)の先頭バイト位置
			this.confTIME_LEN = (c.getValue("TIME_LEN") || 0);		// 時刻(X)のバイト長
			this.confTIME_FORM = c.getValue("TIME_FORM");			// 時刻(X)の文字フォーマット指定
			this.confTIME_YMD = (c.getValue("TIME_YMD") || "YYYY/MM/DD hh.mm.ss.ppp"); // #42
			                                                        // 時刻(X)のYMDフォーマット
			this.paseDateConf = {  // YYYY/MM/DD hh:mm:dd.ss.ppp #41
				YYYY: this.confTIME_YMD.indexOf("YYYY"),
				MM: this.confTIME_YMD.indexOf("MM"),
				DD: this.confTIME_YMD.indexOf("DD"),
				hh: this.confTIME_YMD.indexOf("hh"),
				mm: this.confTIME_YMD.indexOf("mm"),
				ss: this.confTIME_YMD.indexOf("ss"),
				ppp: this.confTIME_YMD.indexOf("p"),
			};
			this.isYMD = (this.confTIME_FORM === "TIME_FORM_YMD");
			// 時刻(X)の数値単位(1or1000,YMDのとき1)
			this.confTIME_UNIT = this.isYMD? 1 : (c.getValue("TIME_UNIT") || 1);
			
			
			this.confTAT_COL = c.getValue("TAT_COL") - 1 || 1;		// 時間(Y)のカラム位置
			this.confTAT_POS = (c.getValue("TAT_POS") || 1) - 1;	// 時間(Y)の先頭バイト位置
			this.confTAT_LEN = (c.getValue("TAT_LEN") || 0);		// 時間(Y)のバイト長
			this.confTAT_FORM = c.getValue("TAT_FORM");				// 時間(Y)のフォーマット指定
			this.confTAT_UNIT = c.getValue("TAT_UNIT") || 1;		// 時間(Y)の数値単位(1/1000)
			this.confENDIAN =  c.getValue("ENDIAN");    // リトルエンディアンはtrue、ビッグエンディアンはfalse
			this.isLittle = (function(){
		        // long用に4バイト取得する
				var buf = new ArrayBuffer(4);				
				// true:bufに、リトルエンディアン指定で1を書き込む
				new DataView(buf).setUint32(0, 1, true);
				// プラットフォームのエンディアンを使用するUint32Arrayと比較する
				return (new Uint32Array(buf)[0] === 1);		
			}());
			
			this.dateAndValue = {date: 0, value: 0, isError: false };
		}
		
		// class method
        /**
         * 数字をパースして数値（ミリ秒）を取得する<br>
         * 例："-1:1:1.2 -> -3661200 ms = -1*(3600+60+1+0.2)*1000
         * 
         * @memberof HJN.util.FileReader.GetterOfXY
         */
		GetterOfXY.parseNumber = function (){ // str, unit,
			var str = arguments[0],
				unit = arguments[1];
			if(!str) {console.log("data Y parse error"); return 0; }
			var ds = (str.indexOf(":") < 0) ? [str] : str.split(":"),	// #40
				pm = (0 <= ds[0]) ? 1 : -1,
				sec = 0.0;
			for(var i = 0; i < ds.length; i++){
				sec += pm * Math.abs(ds[i]) * Math.pow(60, ds.length - i - 1);
			}
			return sec * (unit || 1);
		};

		/**
         * Long(4バイトバイナリ）数字をパースして数値（ミリ秒）を取得する
         * 
         * @private
         */
		GetterOfXY.prototype._parseLong = function (arr){
			if (4 <= arr.length ) {	// Long(4byte)以上のときunsigned longとして処理する
				// bufの先頭4byteを、指定バイトオーダ(endian)で、符号無32bit intとして参照
				return (new DataView(arr.buffer, 0 , 4)).getUint32(0, this.confENDIAN);
			} else {
			    // Long(4バイト）より短いとき、Byte単位に処理する
				if (this.confENDIAN) { // little endianのとき
					return arr.reduceRight(function(a, b){ return a*256 + b; });
				} else {	           // big endianのとき
					return arr.reduce(function(a, b){ return a*256 + b; });
				}
			}
		};

		// public
        /**
         * レコードからXとYを取得する
         * 
         * @memberof HJN.util.FileReader.GetterOfXY
         */
		GetterOfXY.prototype.parse = function (line) {
			// セパレータでカラム分割する
			var posMax = Math.max(this.confTIME_COL, this.confTAT_COL),
				sep = this.confSEP.charCodeAt(0),	// 区切り文字のUint値
				pos = 0,
				nextPos = line.array.indexOf(sep),	// 行末（次の区切り文字位置）
				x = 0,
				y = -1;
			for (var i = 0; i <= posMax; i++) {
				if (i === this.confTIME_COL){
					// パース対象フィールドを切り出す
					var posX =  pos + this.confTIME_POS;
					var arrX = (0 < this.confTIME_LEN) 
						     ? line.array.slice(posX, posX + this.confTIME_LEN)
				             : line.array.slice(posX, nextPos);
					var strX = "";
					// フィールドをパースする
					if (this.isYMD){	// 年月日時分秒の文字列のとき
						strX = String.fromCharCode.apply(null,arrX);
						x = HJN.util.S2D(strX, this.paseDateConf);
					} else if (this.confTIME_FORM === "TIME_FORM_TEXT"){	// テキスト数字のUNIX経過時間のとき
						strX = String.fromCharCode.apply(null,arrX);
						x = GetterOfXY.parseNumber(strX);
					} else{	// this.confTIME_FORM === "TIME_FORM_LONG"
                            // longのUNIX経過時間のとき
						x = this._parseLong(arrX);
					}
					// 単位を補正する
					x *= this.confTIME_UNIT;
				}
				if (i === this.confTAT_COL){
					// パース対象フィールドを切り出す
					var posY =  pos + this.confTAT_POS;
					var arrY = (0 < this.confTAT_LEN) 
					         ? line.array.slice(posY, posY + this.confTAT_LEN)
							 : line.array.slice(posY, nextPos);
					// フィールドをパースする
					if (this.confTAT_FORM === "TAT_FORM_TEXT"){
					    // テキスト数字によるUNIX経過時間のとき
						var strY = String.fromCharCode.apply(null,arrY);
						y = GetterOfXY.parseNumber(strY);
					} else{
					    // TAT_FORM_TEXT === "TAT_FORM_LONG" 数値によるUNIX経過時間のとき
						y = this._parseLong(arrY);
					}
					// 単位を補正する
					y *= this.confTAT_UNIT;
				}
				pos = nextPos + 1;
				nextPos = line.array.indexOf(sep, pos);
				if (nextPos < 0) nextPos = line.array.length;
			}
			
			if(0 < x && 0 <= y){ // 正常時
				return {x: x, y: y, isError: false };
			} else {			// エラー時
				return {x: x, y: y, isError: true };
			}
		};
		
		return new GetterOfXY();
	};
	
    /**
     * configに登録されているid(=prefix+key)の設定値を取得する
     * 
     * @memberof HJN.util.FileReader
     */
	FileReader.prototype.getObjctById = function(id) {
		return this[this.configId].getObjctById(id);
	};
    /**
     * configに登録されているkey(prefix補填)の設定値を取得する
     * 
     * @memberof HJN.util.FileReader
     */
	FileReader.prototype.getValueByKey = function(key) {
		return this[this.configId].getValueByKey(key);
	};
    /**
     * 設定値を保有するオブジェクトを返却する
     * 
     * @memberof HJN.util.FileReader
     */
	FileReader.prototype.getConfig = function() {
		return this[this.configId]._config;
	};
    /**
     * HTML（config設定用）テキストを返却する
     * 
     * @memberof HJN.util.FileReader
     */
	FileReader.prototype.getConfigHtml = function(type) {
	    type = type || "File";
        return this["_config_" + type].getHtml(); // #53
	};
    /**
     * keyの値に指定された関数（なければ何もしない関数）を返却する
     * 
     * @memberof HJN.util.FileReader
     */
	FileReader.prototype.getFunction = function(key) {
		var cKey = this[this.configId].getValueByKey(key);
		if(!this.__keyConfig[cKey] || !this.__keyConfig[cKey].func){
			return function(){};	// funcが定義されていないとき、何もしない関数を返却する
		}else{
			return this.__keyConfig[cKey].func;	// keyの設定値のfuncが定義されているとき
		}
	};
    /**
     * eTatの指定行の編集元レコードを、テキストフォーマットに変換して取得する
     * 
     * @memberof HJN.util.FileReader
     * @param {Object}
     *            e eTat[n]：eTatの指定行
     * @return {String} eTatの指定行の表示用テキスト
     */
	FileReader.prototype.getRecordAsText = function (e) { // #62 ADD
        if (!e) return "";
        var text = "";
        if (typeof e.pos === "undefined") { // 生成データのとき
            // 生成データをCSVのログデータとして編集する #61
            text = HJN.util.D2S(e.x, "yyyy/MM/dd hh:mm:ss.ppp", true)
                    + ", " + e.y + ", " + e.message; // #53
            // 状態遷移履歴を追加する #62
            if (e.history){
                e.history.forEach(function(h){
                    var timeStr = "";
                    if (typeof(h.time) === "number") {
                        timeStr = HJN.util.D2S(h.time, "mm:ss.ppp", true) + " seq:"
                    }
                    text += " [" + h.sequenceIdx + ":" + h.status + "]" // #61
                        + timeStr + HJN.util.D2S(h.sequenceTime, "mm:ss.ppp", true);
                }, this);
            }
        } else { // ファイル読込のとき
            // ファイルの該当行を Uint8Arrayに登録する
            var buff = new Uint8Array(e.len + 2);
            var file = HJN.filesArrayBuffer[e.fileIdx]; // #23
            buff.set(new Uint8Array(file, e.pos,
                    Math.min(e.len + 2, file.byteLength - e.pos)));
            // ログデータを編集する
            text = String.fromCharCode.apply(null, buff);
        }
        return text;
        
    };
    /**
     * keyの値に指定されたvalue（なければkey値）を返却する
     * 
     * @memberof HJN.util.FileReader
     * @param {String}
     *            key Conginのキー値
     */
	FileReader.prototype.getValue = function(key) {
        var cKey = this[this.configId].getValueByKey(key);
		if(!this.__keyConfig[cKey] || this.__keyConfig[cKey].value === undefined){
			return cKey;	// valueが定義されていないとき、keyの設定値を返却
		}else{
			return this.__keyConfig[cKey].getValue(); // keyの設定値のvalueが定義されているとき
		}
	};
	
	// new
	return FileReader;
}());

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