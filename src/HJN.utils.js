/** ie11 互換用 * */
if(!Uint8Array.prototype.indexOf){
	Uint8Array.prototype.indexOf = function(target,index){
		"use strict";
		index = (index === undefined) ? 0 : index;	// #29
        for(var i = index, last = index + 4096; i < last; i++){ // 暫定：1レコード4KBまでチェック
            if(this[i] === target) return i; 
        }
        return -1;
    };
}
if (!Uint8Array.prototype.slice) {	// #29
	Uint8Array.prototype.slice = function(begin, end) {
		"use strict";
		return this.subarray(begin, end);
	};
}
// https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
if (!Array.prototype.findIndex) {
	Array.prototype.findIndex = function(predicate) {
		"use strict";
		var list = Object(this), length = list.length >>> 0, thisArg = arguments[1], value;
		for (var i = 0; i < length; i++) {
			value = list[i];
			if (predicate.call(thisArg, value, i, list)) return i;
		}
		return -1;
	};
}
// https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/find
if (!Array.prototype.find) {
	Array.prototype.find = function(predicate) {
		"use strict";
		var list = Object(this), length = list.length >>> 0, thisArg = arguments[1], value;
		for (var i = 0; i < length; i++) {
			value = list[i];
			if (predicate.call(thisArg, value, i, list)) { return value; }
		}
		return undefined;
	};
}
/* *****1*********2*********3*********4*********5*********6*********7******* */

/**
 * 初期表示用サンプルデータ(ETAT)を自動生成する
 * 
 * @param {Number}
 *            [num=10000] 生成データ数（デフォルト:100、50*100*100)
 * @param {Number}
 *            [response=1500] 最大応答時間振れ幅（ミリ秒) ※ 乱数を二乗して長時間ほど長くする
 * @param {Blob}
 *            [freq=10] データ発生頻度の目安（tps)
 * @return {ETAT} 終了時刻のTAT（応答時間）時系列データ [{x:終了時刻(JulianDayからの経過時間(秒)),
 *         y:レスポンス(秒)}]
 */
HJN.init.CreateSampleTatLog = function(num, response, freq){
	"use strict";
	HJN.util.Logger.ShowLogText("----- create data -----------------------------","calc");
	num = num || 100*100;        // arg0
	response = response || 1500;   // arg1
	freq = freq || 10;             // arg2
	var eTat = [];                 // 戻り値

	var x = new Date(),
		d= Math.floor(x.getTime()),
		y = 0.0,
		random = 0;
	for (var i = 0; i < num; i++) {		// jsはミリ秒単位
	    // 次の電文発生時刻を求める
		d += Math.round( Math.random() * 1000.0 / (2 * freq) *
							(1 + (0.5 * Math.cos(2 * Math.PI * i / num)))
						);
		// レスポンスを求める
		random = Math.random();
		y  = Math.round( random*random*response * 1e+6 *
							(1 + (1.0 * Math.sin(2 * Math.PI * (i / num - 0.25))))
						) / 1e+6;
		var y2 = Math.random() < 20 / num ? 3 : 1;
		// 生成データを登録する
		eTat.push( {x: d , y: y * y2, sTatIdx: 0} );
	}
	HJN.util.Logger.ShowLogText("got     " + eTat.length + " plots [tat/endT]","calc");
	return eTat;
};

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
	var dropFieldName = chartName;	// ファイルドロップを受け付けるタグ名
	HJN.util.Logger.ShowLogTextInit();			// 処理時間計測の初期化

	// グラフのインスタンスを作成し初期化する
	HJN.chart = new HJN.Graph(chartName, "HJN.chart");
	HJN.chart.init();
	HJN.chartD = new HJN.Graph(chartName + "Detail", "HJN.chartD");
	HJN.chartD.init();
	// ドロップフィールドに、処理を登録する(注：dygraphはイベントリスナーを登録しないとクリック時にエラーが出る）
	HJN.init.DropField(dropFieldName);
	HJN.init.DropField(dropFieldName+ "Detail");

	// 初期表示データを自動生成する
	var tatESeries = HJN.init.CreateSampleTatLog();	// arg0：生成データ数
	
	// グラフを初期表示する
	// 上段
	HJN.chart.update(HJN.chart.createSeries(tatESeries));
	HJN.util.Logger.ShowLogText("上段表示", "elaps");		// 処理時間ログ出力

	// 下段(非同期）
	HJN.util.setZeroTimeout( function(){
		HJN.chartD.update(HJN.init.ChartRegistDetail(HJN.chart.cTps));
		HJN.chart.showBalloon();	// 上段のBalloonを描画する
		HJN.util.Logger.ShowLogText("下段表示", "elaps");
		HJN.util.Logger.ShowLogText("<mark>サンプルを表示しました</mark>", "msg");
	});
};

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
	HJN.files = files;
	HJN.filesIdx = 0;
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
			reader.onloadend = function(evt) {
		        if (evt.target.readyState === FileReader.DONE) { // DONE == 2
		        	HJN.filesIdx++;
		        	/** ファイルの先頭2行をログ表示する * */
		        	console.log("HJN.filesIdx="  + HJN.filesIdx);

		        	HJN.filesArrayBuffer[HJN.filesIdx] = evt.target.result;
		        	textArray += topLines(				// 2行展開する
		        						HJN.filesArrayBuffer[HJN.filesIdx], 2);
	        		HJN.util.Logger.ShowLogTextInit();		// 情報表示 : 初期化
	        		HJN.util.Logger.ShowLogText(textArray, "msg");	// 情報表示 ：
                                                                    // ドロップファイル情報
	        		
	        		/** 上段用データの展開とグラフ描画 * */
	        		// CSVファイルを上段用eTatに展開する[{x:, y:,pos:,len:},...] 全件展開する
	        		var tatESeries = getTatLogArray(HJN.filesArrayBuffer[HJN.filesIdx] );
	        		// 上段グラフを描画する（ eTatから上段用 時系列分析データ(seriesSet)を展開する）
	        		HJN.chart.update(HJN.chart.createSeries(tatESeries));
	    			HJN.util.Logger.ShowLogText("上段表示", "elaps");

	        		// 下段用データの展開とグラフ描画（非同期処理）
	        		HJN.Plot.List = [];
	        		HJN.util.setZeroTimeout(function(){
		        		// 下段グラフを描画する（下段用 時系列分析データ(seriesSet)を展開する）
		        		HJN.chartD.update(HJN.init.ChartRegistDetail(HJN.chart.cTps));
	        			// 上段のBalloonを描画する(上段update時にはplots登録されていないので、ここで処理）
		        		HJN.chart.showBalloon();
		    			HJN.util.Logger.ShowLogText("下段表示", "elaps");
		    			HJN.util.Logger.ShowLogText("<BR><mark>"+ HJN.files[0].name +
		    					"["+ HJN.chart.eTat.length +
		    					"]を表示しました</mark><BR>", "msg");
	        		});
		        }
		    };
			// ファイルにArrayBufferで参照を取得する（loadイベントを起こす）
		    reader.readAsArrayBuffer(HJN.files[HJN.filesIdx]);
		}catch(e){
			// 第一引数のテキストアレイの内容を#fileInfoのiframeに表示する
			var msg = "The " + i + "th dropped object is not a file";
			HJN.util.Logger.ShowText( ["<mark>"+msg+"</mark>"] );
			console.error("[%o]%o",msg,e );
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
	function getTatLogArray(file) { // arg0:csvﾌｧｲﾙのファイルﾊﾟｽ
	    HJN.util.Logger.ShowLogText("----- read file -----------------------------","calc");
	    var eTat = [],
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
	                eTat.push( {x: xy.x, y: xy.y,
	                    fileIdx: 0, pos: line.pos, len: line.array.byteLength, sTatIdx: 0} );
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
		if(HJN.chart.cTpsCycle >= 1000){
			var cTpsIdx = HJN.chart.conc.findIndex(function(e,i){return e.y === cTps[maxYIdx].y;});
			x = HJN.chart.conc[cTpsIdx].x;
		}
		// slider rangeに、下段の表示時刻を設定する
		HJN.init.SetSliderRange(x);
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
 * @return {ETAT 詳細グラフ用eTat
 */
HJN.init.GetSliderRangedEtat = function() {
	"use strict";
	// 指定時刻（ｄｔ ± range）を得る
	var rangeTagPlus  = document.getElementById("DetailRangePlus"),
		rangeTagMinus = document.getElementById("DetailRangeMinus"),
		rangeCycle = HJN.chart.cTpsCycle / 1000;					// #38
	// HJNグローバル変数に退避する
	HJN.detailRangePlus  = rangeTagPlus ? +rangeTagPlus.value : 1 + rangeCycle;	// 幅（秒）
	HJN.detailRangeMinus= rangeTagMinus ? +rangeTagMinus.value : rangeCycle;	// 幅（秒）
	var dt = Math.floor(HJN.detailDateTime * 1000) / 1000,		// 中央時刻 // ミリ秒
		rangePlus  = HJN.detailRangePlus * 1000,	// 幅（ミリ秒）
		rangeMinus = HJN.detailRangeMinus * 1000,
		from = dt - rangeMinus,
		to = dt + rangePlus;
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
            HJN.Plot.List[i].rangePlus  = document.getElementById("DetailRangePlus").value;
            HJN.Plot.List[i].rangeMinus = document.getElementById("DetailRangeMinus").value;
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
HJN.init.SetSliderRange=function(date) {
    "use strict";
    HJN.detailDateTime = Math.floor(date / 1000) * 1000;    // 秒単位に丸める
};



/**
 * Plotの一覧
 * 
 * @memberof HJN.Plot
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
	// グラフの日時で、詳細グラフを再作成する
	HJN.init.SetSliderRange(x);
	HJN.chartD.createSeries(HJN.init.GetSliderRangedEtat());
	// 下段の残処理終了後、下段データを登録描画する
	HJN.chartD.graph.ready(function(){ HJN.chartD.update(HJN.chartD.seriesSet); });
	// Hover表示しているplotを、HJN.Plot.Listに登録し、plotsアイコンを再描画する
	HJN.Plot.Add(n, x, y);
	// Balloonを再描画する
	HJN.Plot.ShowBalloon();
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
		label = HJN.util.D2S(x, format) + " " +
				HJN.seriesConfig[n].label.replace("%N",HJN.util.N2S(y));
	// 幅(range)を取り込む（秒）
	var	rangePlusTag  =  document.getElementById("DetailRangePlus"),
		rangeMinusTag =  document.getElementById("DetailRangeMinus"),
		rangePlus  = rangePlusTag  ? +rangePlusTag.value  : 1,	// 幅
		rangeMinus = rangeMinusTag ? +rangeMinusTag.value : 1;
	// ETAT,STATのとき、TATが幅に含まれるよう、幅(range)を拡大する #30
	if (n === HJN.ETAT.N){
		rangeMinus = Math.max(rangeMinus,
							Math.floor(x / 1000) - Math.floor((x - y) / 1000));
		document.getElementById("DetailRangeMinus").value = rangeMinus; 
	}else if (n === HJN.STAT.N){
		rangePlus = Math.max(rangePlus,
				Math.floor((x + y) / 1000)) - Math.floor(x / 1000) ;
		document.getElementById("DetailRangePlus").value = rangePlus;
	}
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
		plot.rangePlus  = rangePlus;	// 秒
		plot.rangeMinus = rangeMinus;
	}else{		// 既存に無いときPlotを追加する
		plot = {label: label, ckBox:false,
				 radio:true, n: n, x: x, y: y, 
				 rangePlus: rangePlus , rangeMinus: rangeMinus };
		if (n === HJN.CTPS.N){			// CTPSのとき秒内最大CONCとして登録する
			adjustMaxPlot(HJN.chartD.conc, x, x + HJN.chart.cTpsCycle, y, HJN.CONC.N, plot, rangePlus, rangeMinus);
		}else if (n === HJN.EMPS.N){	// EMPSのとき秒内最大ETATとして登録する
			adjustMaxPlot(HJN.chartD.eTat, x, x + HJN.chart.cycle, y, HJN.ETAT.N, plot, rangePlus, rangeMinus);
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
	function adjustMaxPlot(conc, x, toX, y, n, plot, rangePlus, rangeMinus){
		var	maxTime = 0,
			concMax = 0,
			i = HJN.util.binarySearch(x, conc, function(e){ return e.x; });
		for (; i < conc.length && conc[i].x < toX; i++){	// #26
			if (concMax < conc[i].y){
				maxTime = conc[i].x;
				concMax = conc[i].y;
			}
		}
		// if(x < maxTime){ // 補正すべき時刻が求まったときCONC,ETATを追加する
			x = maxTime;
			format = "hh:mm:ss.ppp";
			label = HJN.util.D2S(x, format) + " " +
					HJN.seriesConfig[n].label.replace("%N",HJN.util.N2S(y));
			HJN.Plot.List.push(	{label: label, ckBox:false,
				 radio:true, n: n, x: x, y: y, 
				 rangePlus: rangePlus , rangeMinus: rangeMinus,
				 tpsPlot: plot} );	// 詳細plotには、tpsのplot情報も保持する
		// }
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
	HJN.Plot.List[i].radio = true;
	// グラフの日時で、詳細グラフを再作成する
	HJN.init.SetSliderRange(HJN.Plot.List[i].x);	// 中心時刻に設定する
	document.getElementById("DetailRangePlus").value = HJN.Plot.List[i].rangePlus;	// 幅を設定する
	document.getElementById("DetailRangeMinus").value = HJN.Plot.List[i].rangeMinus;
	HJN.chartD.createSeries( HJN.init.GetSliderRangedEtat() );
	// 下段データを登録描画する
	HJN.chartD.update(HJN.chartD.seriesSet);
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
 * 日時(JS Date)から、指定フォーマットの文字列を得る
 * 
 * @param {Date}
 *            dt Date型（内部実装はミリ秒単位）
 * @param {Stromg}
 *            str フォーマット ｙｙｙｙ-MM-dd hh:mm:ss.ppp （戻り値で上書きされる）
 * @return {String} str 編集後文字列
 */
HJN.util.DateToString=function() {
    "use strict";
    var dt = arguments[0],  // arg0
        str = arguments[1]; // arg1
    
    str = str.replace(/yyyy/, dt.getFullYear() );
    str = str.replace(/MM/, ('0' + (dt.getMonth() + 1) ).slice(-2) );
    str = str.replace(/dd/, ('0' + dt.getDate()).slice(-2) );
    str = str.replace(/hh/, ('0' + dt.getHours()).slice(-2) );
    str = str.replace(/mm/, ('0' + dt.getMinutes()).slice(-2) );
    str = str.replace(/ss/, ('0' + dt.getSeconds()).slice(-2) );
    str = str.replace(/ppp/,('00' + Math.floor(dt % 1000)).slice(-3) );

    return str;
};
/**
 * 日時(ミリ秒：Ｘ軸用）から、指定フォーマットの文字列を得る
 * 
 * @param {Number|Date}
 *            ds 時刻をユリウス経過時間（ミリ秒）で表した数値、もしくはDate(日付）
 * @param {Stromg}
 *            str フォーマット ｙｙｙｙ-MM-dd hh:mm:ss.ppp （戻り値で上書きされる）
 * @return {String} str 編集後文字列
 */
HJN.util.D2S = function(ds, str){
    "use strict";
    return HJN.util.DateToString(new Date(ds), str);
};
/**
 * 数値(Ｙ軸用）から、誤差のない表示用文字列を得る<br>
 * （hover、legendなどでY軸の値を使うときに使用する）
 * 
 * @param {Number|Date}
 *            y 時刻をユリウス経過時間（ミリ秒）で表した数値、もしくはDate(日付）
 * @return {String} str 編集後文字列
 *         {@linkhttps://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/NumberFormat}
 */
HJN.util.N2S = function(y){
    "use strict";
    return Intl.NumberFormat('en-IN').format(y);
};


/**
 * キャッシュ
 * 
 * @class
 * @memberof HJN.util
 * @classdesc キャッシュを保持させるオブジェクト
 * @param {Number}
 *            [size=10] キャッシュ最大件数（未対応機能、設定は無視される）
 */
HJN.util.Cash = (function() {
	"use strict";
	/** static member */
	var proto = Cash.prototype = {
			// クラス変数 _xxx: 0
		};
	/** constructor */
	function Cash(size){
		size = size || 10;	// TODO 未使用
		if(!(this instanceof Cash)) return new Cash(size);
		// インスタンス変数
		this._cash = {};	// キャッシュ {data:, count:, lastTime:}
		this._ranges = [];	// RangedCash用 {key: ,from: , to:, }
		this._size = size;	// キャッシュ最大件数
	}
	
	/* class method */
    /**
     * 第一引数のargumentsを配列に変換する<br>
     * （注：引数が１つ以上あることを前提）
     * 
     * @function
     * @memberof HJN.util.Cash
     * @param {Number}
     *            args 引数一覧（arguments）
     * @return {Array} 引数の配列
     */
	Cash._arg2arr = function(args) {
			return args.length === 1 ? [args[0]] : Array.apply(null, args);
		};
    /**
     * cash判定Keyを取得する<br>
     * （注：引数を'.'でつないだ文字列をkeyとするので、関数名長の上限を超える大きな配列は不可）
     * 
     * @function
     * @memberof HJN.util.Cash
     * @param {Number}
     *            args 引数一覧（argumentsオブジェクト）
     * @return {String} キャッシュキー用の文字列
     */
	Cash._getKey = function(args) {
			var argsArr = this._arg2arr(args);
			return argsArr.reduce(function(a,b){return a+'.'+b; });
		};
		
	/* private */

	/* public */
    /**
     * cashオブジェクトを、cashが無いときはundefinedを返却する<br>
     * cashヒットした場合、cashの使用回数をカウントアップする
     * 
     * @function
     * @memberof HJN.util.Cash
     * @param {Object}
     *            arguments 引数からキー文字列を定める
     * @return {Number|undefined} キャッシュデータ（デーがが無い場合は undefined)
     */
	proto.getCash = function () {
			if (arguments.length < 1) return undefined;
			var args = Cash._arg2arr(arguments),
				key = Cash._getKey(args);
			if (key in this._cash){
				var cash = this._cash[key];
				cash.lastTime = new Date();
				cash.count++;
				return cash.data;
			}else{
				return undefined;
			}
		};
    /**
     * オブジェクトをcashする
     * 
     * @param {Object}
     *            cashVal キャッシュするオブジェクト
     * @param {Object}
     *            arguments 第二引数以降の、引数からキー文字列を定める
     * @return {Object} キャッシュデータ（デーがが無い場合は undefined)
     */
	proto.setCash = function () {
			if (arguments.length < 2) return undefined;
			var cashVal = arguments[0],
				args = Cash._arg2arr(arguments).slice(1, arguments.length),
				key = Cash._getKey(args);
			this._cash[key] = {data: cashVal, count: 0, lastTime:new Date()};
			return cashVal;
		};

    /**
     * レンジキー(form,to)範囲内でキーマッチするcashを、cashが無いときはundefinedを返却する<br>
     * キーは大小比較できる数値であることが前提
     * 
     * @param {Number}
     *            from 抽出するキャッシュキー最小値
     * @param {Number}
     *            to 抽出するキャッシュキーの最大値
     * @return {Object} キャッシュデータ（デーがが無い場合は undefined)
     */
	proto.getRangedCash = function (from, to) {
			var range = this._ranges.find(function(e){
					return (e.from <= from && to <= e.to);
				});
			return (range !== undefined) ? this.getCash(range.from,range.to) : undefined;
		};
    /**
     * レンジキー(from,to)指定でキャッシュする<br>
     * キーは大小比較できること（通常、数値）、from-to期間内の既存のキャッシュは削除される
     * 
     * @param {Object}
     *            cashVal キャッシュするオブジェクト
     * @param {Number}
     *            from 抽出するキャッシュキー最小値
     * @param {Number}
     *            to 抽出するキャッシュキーの最大値
     * @return {Object} キャッシュデータ（デーがが無い場合は undefined)
     */
	proto.setRangedCash = function (cashVal, from, to) {
			if (arguments.length < 3) return undefined;
			// 登録キー範囲に包含される既存キャッシュを削除する
			var count = 0;
			this._ranges = this._ranges.filter(function(e){
					if (from <= e.from && e.to <= to){
						// 登録キャッシュ範囲内のキャッシュを削除する
						count += this._cash[e.key].count;	// 削除分のカウンタ合算
						delete this._cash[e.key];
						return false;
					}else{	// 登録キャッシュの範囲外の一覧を返却する
						return true;
					}
				}, this);
			// 引数をキャッシュに登録する
			var key = Cash._getKey([from, to]);
			this._ranges.push( {from: from, to: to, key: key} );
			this.setCash(cashVal, from, to);
			this._cash[key].count= count + 1;	// 再作成時はカウンタ合算値
			return cashVal;
		};

	// newの戻り値
	return Cash;
}());


/**
 * 非同期化 内部関数
 * 
 * @function
 * @param {function}
 *            global 非同期化して実行する関数
 *            <p>
 *            参考 {@link https://jsfiddle.net/kou/j73tLum4/8/}
 *            {@link https://gist.github.com/mathiasbynens/579895}
 *            {@link http://dbaron.org/log/20100309-faster-timeouts}
 */
HJN.util.setZeroTimeout = (function(global) {
	"use strict";
    var timeouts = [], 
    	messageName = "zero-timeout-message";
    function handleMessage(event) {
        if (event.source === global && event.data === messageName) {
            if (event.stopPropagation)  event.stopPropagation();
            if (timeouts.length) timeouts.shift()();
        }
    }
    if (global.postMessage) {
        if (global.addEventListener) {
        	global.addEventListener("message", handleMessage, true); 
        }else if (global.attachEvent) {
        	global.attachEvent("onmessage", handleMessage); 
        }
        return function (fn) { timeouts.push(fn); global.postMessage(messageName, "*"); };
    } 
    else {
    	return function (fn) { setTimeout(fn, 0); }; 
    }
}(window));



/**
 * ロガー
 * 
 * @class
 * @name Logger
 * @memberof HJN.util
 * @classdesc モードに応じたログを出力する。画面ログ表示領域、コンソールログへの出力に対応
 * @param {String}
 *            [mode=0] ログ出力モード
 */
HJN.util.Logger = (function() { // #27
    "use strict";
    /** @static */
    Logger.prototype = {
            _logText: [],
            _timestamp : new Date(),
            _logtime : new Date()
        };
    /** @constructor */
    function Logger(mode){
        if(!(this instanceof Logger)) return new Logger(mode);
        this._mode = mode || 0;
        // getKeyによりIndex作成関数を設定する
    }
    /**
     * 一定時間（１分）経過後、最初に本メソッドが呼ばれたときのみログ出力する（ループ用）
     * 
     * @function
     * @memberof HJN.util.Logger
     * @param {Number}
     *            i 参考番号<br>
     *            経過時間内のループ回数などの表示に使用することを想定
     * @param {String}
     *            text ログ出力文字列
     */
    Logger.ByInterval = function(i, text) {
        var ts = new Date(),
            freq = 60000;   // 1分毎
        if (freq < ts - HJN.util.Logger._logtime){
            var t = HJN.util.DateToString(ts, "hh:mm:ss.ppp");
            console.log(t + "[" + i + "]~~~~" + text);
            HJN.util.Logger._logtime = ts;
        }
    };
    /**
     * ログ出力： ログテキストを初期化する
     * 
     * @function
     * @memberof HJN.util.Logger
     * @param {String}
     *            text ログ出力文字列
     * @param {String}
     *            [type] ログ区分（"calc"：計算用ログ、"msg"：メッセージのみ（タイムスタンプなし））
     */
    Logger.ShowLogTextInit=function(text, type) {
        HJN.util.Logger._timestamp = new Date();
        HJN.util.Logger._logText = [];
        if(text) HJN.util.Logger.ShowLogText(text, type);
    };
    /**
     * ログ出力： ログテキストをテキストアレイに追記し、表示する
     * 
     * @function
     * @memberof HJN.util.Logger
     * @param {String}
     *            text ログ出力文字列
     * @param {String}
     *            [type] ログ区分（"calc"：計算用ログ、"msg"：メッセージのみ（タイムスタンプなし））
     */
    Logger.ShowLogText=function(text, type) {
// if (type === "calc") return; // 集計時評価用ログ出力抑止
        // "msg"指定のときは経過時間を取らずに、ログのみ出力する
        if (type !== "msg"){
            // 処理時間情報を追加する
            var lastTimestamp = HJN.util.Logger._timestamp;
            HJN.util.Logger._timestamp = new Date();
            text = (Math.round( HJN.util.Logger._timestamp - lastTimestamp ) / 1000.0) + "s " + text;
            // 数値のカンマ編集（小数部もカンマが入る）
            text = text.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
            text = HJN.util.DateToString(HJN.util.Logger._timestamp, "hh:mm:ss.ppp     ") + text;
        }
        HJN.util.Logger._logText.push(text);
        HJN.util.Logger.ShowText(HJN.util.Logger._logText);
        if(true) console.log(text);
    };
    /**
     * 第一引数のテキストアレイの内容を#fileInfoのiframeに表示する
     * 
     * @function
     * @memberof HJN.util.Logger
     * @param {String}
     *            textArray 出力するログ（配列１行がログ１件）
     */
    Logger.ShowText=function(textArray) {
        var iHtmlBody = "";
        for (var i = textArray.length - 1; 0 <= i; i--){
            iHtmlBody += textArray[i] + "<BR>"; 
        }
        HJN.util.Logger.ShowIHtmlBody('fileInfo',iHtmlBody);
    };
    /**
     * 第一引数のID名のiframeに、第二引数のログ（HTML化）を表示する
     * 
     * @function
     * @memberof HJN.util.Logger
     * @param {String}
     *            elementId iframeのID名
     * @param {String}
     *            iHtmlBody ログ（HTML化）
     */
    Logger.ShowIHtmlBody=function(elementId, iHtmlBody){
        var iHtml = "<html><head><style>"+
                        "body{font-size: 10px; margin: 1px; }" +
                    "</style></head>" +
                    "<body id='iHtmlBody'>" + 
                        iHtmlBody +
                    "</body></html>";
        var iframe = document.getElementById(elementId);
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(iHtml);
        iframe.contentWindow.document.close();
    };
    
    // newの戻り値
    return Logger;
}());


/*
 * 指定されたtextareaを使って、クリップボードにコピーする ************************************
 * HJN.CopyToClipboard = function(elementId) { // arg0:textareaのID名 "use
 * strict"; var area = document.getElementById(elementId); area.select();
 * document.execCommand("copy"); } //詳細表示対象の元データ(eTat)をコピー用領域にテキストで出力する
 * HJN.init.GetSliderRangedEtatText = function(elementId) { "use strict"; //
 * 開始メッセージを画面に設定する document.getElementById(elementId).value = "データの収集を開始しました
 * しばらくお待ち下さい"; // ブラウザに開始メッセージを描画させるために、集計処理は非同期でキックする
 * HJN.util.setZeroTimeout(function(){ // コピーデータを集計する var eTatDetail =
 * HJN.chartD.eTat; var eTatCsv = ""; if(0 < eTatDetail.length){ if(typeof
 * eTatDetail[0].pos === "undefined"){ eTatDetail.forEach(function(e){ eTatCsv +=
 * HJN.util.D2S(e.x, "yyyy/MM/dd hh:mm:ss.ppp") + "," + e.y + "\r\n"; }); }else{
 * eTatDetail.forEach(function(e){ eTatCsv += String.fromCharCode.apply(null,
 * new Uint8Array(HJN.file, e.pos, e.len)) + "\r\n"; }) } }else{ eTatCsv += "No
 * log in the time." } // 画面にコピー対象データのテキストを設定する
 * document.getElementById(elementId).value = eTatCsv; // クリップボードにコピーする
 * HJN.CopyToClipboard(elementId); }); }
 */



/**
 * 配列二分木検索
 * 
 * @class
 * @param {Number}
 *            val 検索する値
 * @param {Array}
 *            arr 検索対象の配列
 * @param {Function}
 *            [func=function(val){return val.valueOf();}] 配列要素に対して、値を取得する関数
 * @param {Index}
 *            [low=0] 配列の検査範囲の下限
 * @param {Index}
 *            [high=arr.length-1] 配列の下限検査範囲の上限
 * @param {Boolean}
 *            [isEqual=false] 完全一致しないときのリターン値：trueのとき-1、falseのとき値との差が最も少ない位置
 * @example i=HJN.util.binarySearch(x,arrXY,function(e){return e.x;});
 */
HJN.util.binarySearch = function (val, arr, func, low, high, isEqual) {
	"use strict";
	func = func || function(val){ return val.valueOf(); };
	low = low || 0;
	high = high || arr.length - 1;
	isEqual = isEqual || false;
	var	middle,
		valMiddle;
	while( low <= high ){
		middle = Math.floor(low + high) / 2 | 0;
		valMiddle = func(arr[middle]);
		if(valMiddle === val) return middle;
		else if(val < valMiddle) high = middle - 1;
		else low = middle + 1;
	}
	// 値が完全一致する要素がなかった場合の戻り値を編集する
	if (isEqual){
	    return -1;	// 完全一致指定のとき(-1)をリターンする
	} else {    	// 完全一致指定でないとき、値との差が最も少ない位置をリターンする #46
    	// low,middle,high を補正する
    	low = Math.min(Math.max(0, low), arr.length - 1);
    	high = Math.max(0, Math.min(high, arr.length - 1));
    	middle = Math.max(low, Math.min(middle, high));
    	if(high < low){
    	    var tmp = high;
    	    high= low;
    	    low = tmp;
    	}
        // low,middle,high のうち、値との差が最も少ない位置をリターンする
    	if(func(arr[middle]) < val){
    		if (val - func(arr[middle]) < func(arr[high]) - val) {
    		    return middle;
    		} else {
    		    return high;
    		}
    	}else{
    		if (func(arr[high]) <= val && val < func(arr[middle])){
    		    return high;
    		} else if (val - func(arr[low]) < func(arr[middle]) - val){
    		    return low;
    		} else {
    		    return middle;
    		}
    	}
    	return -1;	// 指定範囲外
	}
};



/**
 * 期間指定eTat取得用Map
 * 
 * @class
 * @name MappedETat
 * @memberof HJN.util
 * @classdesc 指定期間に動いているeTatの一覧を、高速に取得するマップ
 * @param {ETAT}
 *            eTat インデックスを追加するETAT
 * @example eTat.tatMap = new HJN.util.MappedETat(eTat); var trans =
 *          eTat.tatMap.search(x, x, 1000);
 */
HJN.util.MappedETat = (function() { // #18
	"use strict";
	/** @static */
	var proto = MappedETat.prototype = {
			_abscissa: [],
			_conf :[{ms:      10, step:5, label:"0_10ms_"},
					{ms:      50, step:2, label:"1_50ms_"},
					{ms:     100, step:5, label:"2_100ms_"},
					{ms:     500, step:2, label:"3_500ms_"},
					{ms:    1000, step:5, label:"4_1sec_"},
					{ms:    5000, step:4, label:"5_5sec_"},
					{ms:   20000, step:3, label:"6_20sec_"},
					{ms:   60000, step:5, label:"7_1min_"},
					{ms:  300000, step:4, label:"8_5min_"},
					{ms: 1200000, step:3, label:"9_20min_"},
					{ms: 3600000, step:6, label:"10_1h_"},
					{ms:21600000, step:4, label:"11_6h_"},
					{ms:Number.MAX_VALUE, step:1, label:"12_overDay_"}]	// 最後はstep:１
		};
	/** @constructor */
	function MappedETat(eTat){
		if(!(this instanceof MappedETat)) return new MappedETat(eTat);
		// MappedArrayを作成する
		this._tatMap = new HJN.util.MappedArray(eTat, this._getKey, true);
	}

	/** @private */
	proto._row = function(label, step) {return label + step;};

	/**
     * MapKey取得関数
     * 
     * @private
     */
	proto._getKey = function(e, i) {		// MapedMap用Key配列関数
		var start = e.x - e.y,		// x,yはミリ秒
			end = e.x,
			_conf = proto._conf,
			_row = proto._row,
			term = _conf[0].ms,
			rowLv = 0;
		if(Math.ceil(end / term) - 1 === Math.floor(start / term)){	// 最小BOX
			return [_row(_conf[0].label, 0),
					(Math.ceil(e.x / _conf[0].ms) - 1) * _conf[0].ms];
		}
		for (i = 1; i < _conf.length; i++) {				// 最下位から上に評価
			term = _conf[i].ms;
			if(Math.floor(end / term) === Math.floor(start / term) 
					|| end - start < term){						 // 上位BOXを起点
				term = _conf[i-1].ms;	// ひとつ下位のBOX期間（下から評価したので二段下となることは無い
				rowLv = Math.floor(end / term) - Math.floor(start / term);
				return [_row(_conf[i-1].label, rowLv),
						(Math.ceil(e.x / _conf[i-1].ms) - 1) * _conf[i-1].ms];
			}
		}
		return "error";
	};

	// static メンバーの設定
	// _confから_abscissa(横軸）を生成する
	var c = proto._conf,
		e2 = c[c.length - 2],
		
		e  = c[c.length - 1];
	proto._abscissa.push( {label: proto._row(e.label, e.step), ms: e.ms ,i: 1,
				step: e.step, from: e2.ms * e2.step, to: e.ms} );	// 末尾を先頭に追加
	for (var j = c.length - 1; 0 <= j; j--){	// 降順に追加
		e = c[j];
		for (var i = e.step - 1; 0 < i; i--){
			proto._abscissa.push( {label: proto._row(e.label, i), ms: e.ms, i: i, 
								step: e.step, from: e.ms * i, to: e.ms * (i + 1)} );
		}
	}
	proto._abscissa.push( {label: proto._row(c[0].label, 0), ms: c[0].ms, i: 0,
				step: 0, from: 0, to: c[0].ms} );	// 先頭を末尾に追加

	
	// public
	/**
     * 指定期間に動いているeTatを検索する
     * 
     * @function
     * @memberof HJN.util.MappedETat
     * @parm {Number} from 指定期間(from)
     * @parm {Number} [to=from] 指定期間(to)
     * @parm {Number} [cap] cap件数となったら抽出を終了する（指定なしの時：全件）
     * @return {ETAT} eTatArr 指定期間内のeTat配列
     */
	MappedETat.prototype.search = function (from, to, cap) {
		to = to || from;	// to省略時は時刻指定(from=to)
		cap = cap || Number.MAX_VALUE; // 指定なしの時：全件
		var	map = this._tatMap._map,
			eTat = this._tatMap._arr,
			abscissa = this._abscissa,
			eTatArr = [],
			start = 0,
			end = 0;
		// 検索対象のBOX一覧を生成する
		abscissa.forEach(function(e){	// 存在しうる横軸のうち（tatが長時間の方から）
			if (map[e.label]){			// 横軸が存在するものについて
				var boxNum = e.i + Math.ceil(to / e.ms) - Math.floor(from / e.ms), // #45
					key = Math.floor(from / e.ms) * e.ms;
				// 存在しうるKey値を終了時間が早い方から集計する
				for(var j = 0; j <= boxNum; j++){
					// Key値が存在するものみが集計対象
					if (map[e.label][key]){ 
						// かつ、Keyが持っている要素(eTatへの参照:k)が集計対象
						map[e.label][key].forEach(function(k){
							// かつ、from-toの期間に動いている要素(eTatのindex)が集計対象
							start = eTat[k].x - eTat[k].y;
							end   = eTat[k].x;
							if((start <= to) && (from <= end)){
								// かつ、戻り値の配列要素数がcap未満の場合が集計対象
								if(eTatArr.length < cap){
									// 集計対象条件に合致する要素を、戻り値の配列に追加する
									eTatArr = eTatArr.concat(eTat[k]);
								}
							}
						});
					}
					key += e.ms;	// 次のKey値
				}
			}
		}, this);
		return eTatArr;
	};
	
	// newの戻り値
	return MappedETat;
}());


/**
 * 配列に格納されているオブジェクトのx値で、配列位置を高速検索
 * 
 * @class
 * @name MappedArray
 * @memberof HJN.util
 * @classdesc 配列に格納されているオブジェクトのx値をキーとするマップ
 *            <p>
 *            参考 {@link http://qiita.com/alucky0707/items/10052866719ba5c5f5d7}
 * @param {Array}
 *            arr インデクスをつける対象の配列
 * @param {String|function}
 *            [getKey=""] MappedArrayのKey値の取得方法
 *            <p>
 *            String指定のとき（デフォルト""を含む）、配列要素の値(valueOf)
 *            <p>
 *            注： 0,00,"0"は同値、1,01,"1"は同値 Stringのとき、 配列要素が持つ指定要素の値
 *            <p>
 *            functionのとき、配列要素に指定関数を適用した戻り値
 *            <p>
 *            関数の引数：(配列要素オブジェクト、配列のインデックス、作成中のMappedArrayへの参照）
 * @param {Boolean}
 *            [isMappedMap] getKeyが2段Map用の配列を返却する
 * @return {object} Index arrに対するインデックス（連想配列名で検索）
 * @example _tatMap = new HJN.util.MappedArray(eTat, this._getKey, true);
 */
HJN.util.MappedArray = (function() {    // #18
	"use strict";
	/** @static */
	var proto = MappedArray.prototype = {
			// クラス変数 _xxx: 0
		};
	/** @constructor */
	function MappedArray(arr, getKey, isMappedMap){
		if(!(this instanceof MappedArray)) return new MappedArray();
		this._arr = arr;
		// getKeyによりIndex作成関数を設定する
		if(!getKey || getKey === ""){
			// getKey指定がないとき、配列の値
			this._getKey = function(e){ return e.valueOf(); };
		}else if ((typeof(getKey) === "string") && (getKey !== "")){	// #29
			// getKeyが文字列のとき、配列内オブジェクトのgetKey要素の値
			this._getKey = function(e){ return e[getKey]; };
		}else if (typeof(getKey) === "function" ){	// #29
			// getKeyが関数のとき、配列内オブジェクトに関数を適用した戻り値
			this._getKey = getKey;
		}else{	// 以外のときエラーログを出力し、getKey指定なしと同様、配列の値
			console.error("MappedArrayの第二引数エラー：[ %o ]を無視します ",getKey);
			this._getKey = function(e){ return e.valueOf(); };
		}
		// MappedArrayを作成する
		if(!isMappedMap){
			this._createMappedArray();			
		}else{
			this._createMappedMappedArray();
		}
	}

	/** @private */
	proto._createMappedArray = function() {
		var key = ""; 
		this._map = this._arr.reduce(function(m, a, i) {
			key = this._getKey.call(a, a, i, m);
			m[key] = (m[key] || []).concat(i);
			return m;
		}, {});
	};
    /** @private */
	proto._createMappedMappedArray = function() {
		var keys = [],
			key = "",
			mKey = "",
			_getKey = this._getKey;
		this._map = this._arr.reduce(function(m, a, i) {
			keys = _getKey.call(a, a, i, m);
			key = keys[1] || "error";
			mKey = keys[0] || "error";
			if(m[mKey] === undefined) m[mKey] = {};
			m[mKey][key] = (m[mKey][key] || []).concat(i);
			return m;
		}, {});
	};

	// public
	/**
     * 値の存在チェック
     * 
     * @function
     * @memberof HJN.util.MappedArray
     */
	proto.has = function (keyValue) {
		return keyValue in this._map;
	};
    /**
     * 該当位置を配列で返す
     * 
     * @function
     * @memberof HJN.util.MappedArray
     */
	proto.indexes = function (keyValue) {
		return this._map[keyValue] || [];
	};
	/**
     * 該当する要素を配列で返す
     * 
     * @function
     * @memberof HJN.util.MappedArray
     */
	proto.search = function (keyValue) {	
		var arr = this._arr;
		return this.indexes(keyValue).reduce(function(m, i) {
			m.push(arr[i]);
			return m;
		}, []);
	};
    /**
     * Array.prototype.indexOf() 同等
     * 
     * @function
     * @memberof HJN.util.MappedArray
     */
	proto.indexOf = function (keyValue) {
		var idxArr = this._map[keyValue],
			i = idxArr ? idxArr.length : -1;
		return (0 < i) ? idxArr[0] : -1;
	};
    /**
     * Array.prototype.lastIndexOf() 同等
     * 
     * @function
     * @memberof HJN.util.MappedArray
     */
	proto.lastIndexOf = function (keyValue) {
		var idxArr = this._map[keyValue],
			i = idxArr ? idxArr.length : -1;
		return (0 < i) ? idxArr[i-1] : -1;
	};
	
	return MappedArray;
}());


/**
 * 定数設定機能
 * 
 * @class
 * @name Config
 * @memberof HJN.util
 * @classdesc 定数設定機能（設定HTML作成機能付き）
 *            <p>
 *            日時、TATフォーマット指定機能追加用に作成 #24
 * @param {String}
 *            [prefix=''] 定数の名前空間を一位に指定する文字列、指定しない場合グローバル
 * @param {String}
 *            [ol='ol'] インデント(.nDown() .nUp())に使うHTMLタグ
 * @example this._config = HJN.util.Config("m") // config設定画面定義
 *          .label(null,"------").n() // ラベルを表示し、改行
 *          .name("ENDIAN").label(null,"[endian(long field)]") //key:ENDIAN
 *          .radio(def("ENDIAN_LIL", true), null, "little", true) //表示ラベルと選択時設定値
 *          .radio(def("ENDIAN_BIG", false), null, "big");
 */
HJN.util.Config = (function() { // #24
	"use strict";
	/** @static */
	var proto = Config.prototype = {
			__config : {}	// config設定コンテナ
	};
	/** @constructor */
	function Config(prefix, ol){ 
		if(!(this instanceof Config)) return new Config(prefix, ol);
		this._pre = (prefix || '') + ".";			// 各フィールド、要素の名称のプレフィックス(区切り文字
													// ".")
		this._ols = ol ? '<' + ol + '>' : '<ol>'; 	// リストに使用する要素（初期値 ol )
		this._ole = ol ? '</' + ol + '>' : '</ol>';
		this._html = this._ols;	// config設定画面のHtml
		this._nameHtml = '';	// HTMLタグの name属性指定
		this._name = '';		// radioのConfig.get用
	}

	/**
     * HTML要素の値が変更した時に、configに当該要素を登録する
     * 
     * @function
     * @memberof HJN.util.Config
     */
	Config.on = function(t) {
		if (t.type === "radio") {			// radioのとき、nameに対して、選択されたキー値（idからprefixを削除した値）を登録
			this.prototype.__config[t.name] = t.id.substr(t.id.indexOf(".") + 1);
		}else if (t.type === "number") {	// numberのとき、idに対する、value(入力値)を数値として登録
			this.prototype.__config[t.id] = +t.value;
		} else {							// textのとき、idに対する、value(入力値)を登録
			this.prototype.__config[t.id] = t.value;
		}
	};

	/** @private */
	//

    // public
    /**
     * configに登録されているid(=prefix+key)の設定値を取得する
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.getObjctById = function(id) {
		return this.__config[id];
	};
    /**
     * configに登録されているkey(prefix補填)の設定値を取得する
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.getValueByKey = function(key) { 
		return this.getObjctById(this._pre + key);
	};
    /**
     * config設定用HTMLテキストを取得する
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.getHtml = function() { 
		return this._html + this._ole;
	};
    /**
     * keyに値を設定する
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.xset = function(key, val) { 
		this.value[this._pre + key] = val;
	};
	
	// config作成用 publicメソッド
    /**
     * 定義＆設定画面作成用機能： 改行
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.n = function (str) {
		str = str || "";
		this._html += this._ole + str + this._ols;
		return this;
	};
    /**
     * 定義＆設定画面作成用機能： ネスト一つ下げ
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.nDown = function () {
		this._html += this._ols;
		return this;
	};
    /**
     * 定義＆設定画面作成用機能： ネスト一つ上げ
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.nUp = function () {
		this._html += this._ole;
		return this;
	};
    /**
     * 定義＆設定画面作成用機能： nameを変更する（radio等の先頭で指定）
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.name = function (str) {
		this._nameHtml = str ? 'name="' + this._pre + str + '" ' : '';
		this._name = str;
		return this;
	};
    /**
     * 定義＆設定画面作成用機能： ラベル要素(prefix+keyで関連付けるformのid属性となる)
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.label = function (key, str, attribute) {
		this._html += '<label ' +
						(key ? 'for="' + this._pre + key + '" ': '') +
						(attribute || '') + '>' +
						(str || '') +
						'<label>\n';
		return this;
	};
    /**
     * 定義＆設定画面作成用機能： ラベル付された各種入力フォーム
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.labeledForm = function (key, type, typedAttribute,
								pLabel, sLabel, val, attribute, check) {
		this._html += '<label>' +
					(pLabel ? pLabel : '') +
					'<input type="' +type + '" ' +
						(typedAttribute || '') + 
						this._nameHtml +
						'id="' + this._pre + key + '" '+		// idがユニークになるようkeyにprefixを付与
						'onchange="HJN.util.Config.on(this);" ' +
						(val ? 'value="' + val + '" ' : '') +	// val は、キー値のまま
						(attribute || '') + 
						(check ? ' checked="checked;"' : '') +
					'>' +
					(sLabel ? sLabel : '') +
					'<label>\n';
		// デフォルト指定があるとき configにデフォルト値を設定する
		if (type === "radio" && check) {	// radioのとき、nameに対して、選択状態のkeyを登録
			proto.__config[this._pre + this._name] = key;
		} else if (type === "number") {	// numberradioのとき、keyに対する、val(入力値)を数値として登録
			proto.__config[this._pre + key] = +val;
		} else {	// text,numberのとき、keyに対する、val(入力値)を登録
			proto.__config[this._pre + key] = val;
		}
		return this;
	};
    /**
     * 定義＆設定画面作成用機能： テキストボックス要素で、文字列を設定
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.number = function (key, pLabel, sLabel, val, attribute) {
		proto.labeledForm.call(this, key, "number", "", 
								pLabel, sLabel, val, attribute);
		return this;
	};
    /**
     * 定義＆設定画面作成用機能： テキストボックス要素で、数値を設定
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.text = function (key, pLabel, sLabel, val, attribute) {
		proto.labeledForm.call(this, key, "text", "", 
								pLabel, sLabel, val, attribute);
		return this;
	};
    /**
     * 定義＆設定画面作成用機能： ラジオボタン要素で、選択肢の一つを設定
     * 
     * @function
     * @memberof HJN.util.Config
     */
	proto.radio = function (key, pLabel, sLabel, check, attribute) {
		proto.labeledForm.call(this, key, "radio", (check ? 'checked="checked;"' : ''),
								pLabel, sLabel, "", attribute, check);
		return this;
	};

	/* new */
	return Config;
}());


/**
 * ファイルをパースして読み込む
 * 
 * @class
 * @name FileReader
 * @memberof HJN.util
 * @classdesc ファイルをパースして読み込む、パース条件指定画面生成つき
 */
HJN.util.FileReader = (function() {
	"use strict";
	/** @static */
	var proto = FileReader.prototype = {
			__keyConfig : {}	// configで使用する値の定義
	};

	/** constructor */
	function FileReader(arg){ 
		if(!(this instanceof FileReader)) return new FileReader(arg);

		// コンストラクタ内部関数：keyを定義する
		var def = function(key, val, onFunc) {
					var _keyConf = proto.__keyConfig[key] = {};
					_keyConf.value = (val === undefined) ? key : val;	// getValueByKeyの返却値（デフォルト：keyと同じ文字列）
					_keyConf.getValue = function () { return (val === undefined) ? key : val; };
					_keyConf.onFunc = onFunc || null;	// onイベント時に実行する処理（メニューのa属性などで利用）
					return key;
				};
		var v = function(key, fieldId) {	// fieldIdの値を返却値とする(デフォルト： key +
											// ".v")
					var _keyConf = proto.__keyConfig[key] = {};
					_keyConf.value = key;			// getValueByKeyの返却値（デフォルト：keyと同じ文字列）
					_keyConf.getValue = function () {
							return HJN.util.Config("m").getValueByKey(fieldId || key + ".v");
						};
					return key;
				};

				
		// 名称と挙動の定義
		this._configFileFormat = HJN.util.Config("m")	// File Format
                                                        // Config設定画面定義
			.n("<br>")
			.label(null,"----- Configration of file format --------").n()
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
			.name("TIME_FORM").label(null,"Format:")
				.radio("TIME_FORM_YMD", null, null, true)
					.text("TIME_YMD", null, null, null, 'size="23" placeholder="YYYY/MM/DD hh.mm.ss.ppp"').n()
				.nDown()
				.radio("TIME_FORM_TEXT", "(num)", "text")
				.radio("TIME_FORM_LONG", null, "long").n()

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
			.name("TAT_FORM").label(null,"Format: ").n()
				.nDown()
				.radio("TAT_FORM_TEXT", "(num)", "text", true)
				.radio("TAT_FORM_LONG", null, "long").n()
				.name("TAT_UNIT").label(null, "Units of numbers:")
					.radio(def("TAT_UNIT_MS", 1), null, "msec")
					.radio(def("TAT_UNIT_SEC", 1000), null, "sec", true)
				.nUp()
			.name("ENDIAN").label(null, "[endian(long field)]")
				.radio(def("ENDIAN_LIL", true), null, "little", true)
				.radio(def("ENDIAN_BIG", false), null, "big")
			;

		this._configFilter = HJN.util.Config("f")	// Filter Config設定画面定義
			.label(null,"----- Configration of data filter --------").n()
			.n("<br>")
			.name("F_TIME").label(null, "[Date filter]").n()
			.label(null,"Include if end time is between").n()
				.text("F_TIME_FROM", null, null, null, 'size="23" placeholder="YYYY/MM/DD hh.mm.ss.ppp"')
				.label(null,"and").n()
				.text("F_TIME_TO", null, null, null, 'size="23" placeholder="YYYY/MM/DD hh.mm.ss.ppp"').n()
			.n("<br>")
			.name("F_TAT").label(null,"[Turnaround time(TAT) filter]").n()
			.label(null,"Include If TAT is between").n()
				.number("F_TAT_FROM", null, null, "0", 'style="width:40px;"')
				.number("F_TAT_TO", "and", null, null, 'style="width:40px;"').n()
			.n("<br>")
			.name("F_TEXT").label(null,"[Text filter]")
				.radio("F_TEXT_NON", null, "Don't use.", true).n()
				.radio("F_TEXT_INCLUDE", null, "Include ")
				.radio("F_TEXT_EXCLUDE", null, "Exclude ").n()
				.number("F_TEXT_LEN", "if ", " bytes", null, 'style="width:40px;"')
				.number("F_TEXT_POS", "from the ", "th byte", "1", 'style="width:40px;"').n()
				.number("F_TEXT_COL", "from head of the", "th column of CSV", "2", 'style="width:40px;"').n()
				.text("F_TEXT_REG", "match the regular expression", null, null, 'size="7" placeholder=".*"').n()
			.n("<br>")
			;
	}

	// class method
	/** @private */
	//
	// public
    /**
     * 「ファイルから次の1レコードを取得するutil」 を取得する
     * 
     * @function
     * @memberof HJN.util.FileReader
     */
	proto.createGetterOfLine = function(file) {
	    /**
         * ファイルから１レコード取得する
         * 
         * @class
         * @name GetterOfLine
         * @memberof HJN.util.FileReader
         * @classdesc ファクトリのFileReaderが保持する改行コードを用いて、ファイルから１レコードを取得する
         * @example try{ var getterOfLine =
         *          HJN.chart.fileReader.createGetterOfLine(file), fileInfo;
         *          for(var i = 0; i < n; i++) { line = getterOfLine.next();
         *          fileInfo += line.str + "<BR>"; } }catch (e)
         *          {console.error("改行コードの無いファイルは扱えません]%o",e); }
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
         * @function
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
		} else {			// 可変長のとき
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
     * 「１レコードからx:時刻（数値：ミリ秒）,y:Tat(数値：秒)を取得するutil」を取得する
     * 
     * @function
     * @memberof HJN.util.FileReader
     */
	proto.createGetterOfXY = function() {
       /**
         * ファイルから１レコード取得する
         * 
         * @class
         * @name GetterOfXY
         * @memberof HJN.util.FileReader
         * @classdesc ファクトリのFileReaderが保持するレコードフォーマット情報を用いて、ファイルからＸ(data)とＹ(value)を取得する
         */
		function GetterOfXY(){ /* constructor */
				if(!(this instanceof GetterOfXY)) return new GetterOfXY();

				var c = HJN.chart.fileReader;
				this.confSEP = c.getValue("SEP");	// セパレータ
				
				this.confTIME_COL = c.getValue("TIME_COL") - 1 || 0;	// 時刻(X)のカラム位置
				this.confTIME_POS = (c.getValue("TIME_POS") || 1) - 1;	// 時刻(X)の先頭バイト位置
				this.confTIME_LEN = (c.getValue("TIME_LEN") || 0);		// 時刻(X)のバイト長
				this.confTIME_FORM = c.getValue("TIME_FORM");			// 時刻(X)の文字フォーマット指定
				this.confTIME_YMD = (c.getValue("TIME_YMD") || "YYYY/MM/DD hh.mm.ss.ppp");	// 時刻(X)の
                                                                                            // #42
																							// YMDフォーマット
				this.paseDateConf = {  // YYYY/MM/DD hh:mm:dd.ss.ppp #41
						YYYY: this.confTIME_YMD.indexOf("YYYY"),
						MM: this.confTIME_YMD.indexOf("MM"),
						DD: this.confTIME_YMD.indexOf("DD"),
						hh: this.confTIME_YMD.indexOf("hh"),
						mm: this.confTIME_YMD.indexOf("mm"),
						ss: this.confTIME_YMD.indexOf("ss"),
						ppp: this.confTIME_YMD.indexOf("p"),};
				this.isYMD = (this.confTIME_FORM === "TIME_FORM_YMD");
				// 時刻(X)の数値単位(1or1000,YMDのとき1)
				this.confTIME_UNIT = this.isYMD? 1 : (c.getValue("TIME_UNIT") || 1);
				
				
				this.confTAT_COL = c.getValue("TAT_COL") - 1 || 1;		// 時間(Y)のカラム位置
				this.confTAT_POS = (c.getValue("TAT_POS") || 1) - 1;	// 時間(Y)の先頭バイト位置
				this.confTAT_LEN = (c.getValue("TAT_LEN") || 0);		// 時間(Y)のバイト長
				this.confTAT_FORM = c.getValue("TAT_FORM");				// 時間(Y)のフォーマット指定
				this.confTAT_UNIT = c.getValue("TAT_UNIT") || 1;		// 時間(Y)の数値単位(1/1000)
				this.confENDIAN =  c.getValue("ENDIAN"); // little
															// endian:
															// true、 big
															// endian:
															// false
				this.isLittle = (function(){
						var buf = new ArrayBuffer(4);				// long用に4バイト取得する
						new DataView(buf).setUint32(0, 1, true);	// true:
																	// bufに、リトルエンディアン指定で1を書き込む
						return (new Uint32Array(buf)[0] === 1);		// プラットフォームのエンディアンを使用するUint32Array
																	// と比較する
					}());
				
				this.dateAndValue = {date: 0, value: 0, isError: false };
		}
		
		// class method
	    /**
         * 日時をでパースして数値（ミリ秒）を取得する
         * 
         * @function
         * @memberof HJN.util.FileReader.GetterOfXY
         */
		GetterOfXY.parseDate = function (str, conf){
			if(!str) {console.log("GetterOfXY.parseDate:no data cannot parse"); return 0; }
			conf = conf || {YYYY: 0, MM: 5, DD: 8, hh: 11, mm: 14, ss: 17, ppp: 20};  // YYYY/MM/DD
                                                                                        // #42
																						// hh:mm:dd.ss.ppp
			var y   = conf.YYYY < 0 ? 1970 : parseInt( str.substr( conf.YYYY, 4), 10),	// デフォルト1970年
				m   = conf.MM   < 0 ? 0 : parseInt( str.substr( conf.MM, 2), 10) - 1,	// デフォルト1月
				d   = conf.DD   < 0 ? 2				// 1970/1/1
                                                    // だと時差でマイナスになることがあるのでデフォルトは2日
						: parseInt( str.substr( conf.DD, 2), 10),
				h   = conf.hh   < 0 ? 0 : parseInt( str.substr( conf.hh, 2), 10),
				min = conf.mm   < 0 ? 0 : parseInt( str.substr( conf.mm, 2), 10),
				sec = conf.ss   < 0 ? 0 : parseInt( str.substr( conf.ss, 2), 10),
				p   = conf.ppp  < 0 ? 0 
						: ("0." + str.substr( conf.ppp).match(/[0-9]*/)[0]) * 1000.0, // 秒以下のミリ秒
				// ミリ秒以下を指定すると丸め誤差が生じるため、個別に加算
				dateNum = +(new Date( y, m, d, h, min, sec )) + p;	// #14
			return dateNum;
		};
        /**
         * 数字をパースして数値（ミリ秒）を取得する 例："-1:1:1.2 -> -3661200 ms =
         * -1*(3600+60+1+0.2)*1000
         * 
         * @function
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
			if (4 <= arr.length ) {	// Long(4byte)以上のときLongとして処理する
				// bufの先頭4byteを、指定バイトオーダ(endian)で、符号無32bit int(unsigned
				// long)として参照する
				return (new DataView(arr.buffer, 0 , 4)).getUint32(0, this.confENDIAN);
			} else {	// Long(4バイト）より短いとき、Byte単位に処理する
				if (this.confENDIAN) {	// little endianのとき
					return arr.reduceRight(function(a, b){ return a*256 + b; });
				} else {	// big endianのとき
					return arr.reduce(function(a, b){ return a*256 + b; });
				}
			}
		};

		// public
        /**
         * レコードからXとYを取得する
         * 
         * @function
         * @memberof HJN.util.FileReader.GetterOfXY
         */
		GetterOfXY.prototype.parse = function (line) {
			// セパレータでカラム分割する
			var // err = {x: null, y: null, isError: true},
				// posMin = Math.min(this.confTIME_COL,
				// this.confTAT_COL),
				posMax = Math.max(this.confTIME_COL, this.confTAT_COL),
				sep = this.confSEP.charCodeAt(0),	// 区切り文字のUint値
				pos = 0,
				nextPos = line.array.indexOf(sep),	// 行末（次の区切り文字位置）
				x = 0,
				y = -1;
			for (var i = 0; i <= posMax; i++) {
				if (i === this.confTIME_COL){
					// パース対象フィールドを切り出す
					var posX =  pos + this.confTIME_POS,
						arrX = (0 < this.confTIME_LEN) ? line.array.slice(posX, posX + this.confTIME_LEN)
								: line.array.slice(posX, nextPos),
						 strX = "";
					// フィールドをパースする
					if (this.isYMD){	// 年月日時分秒の文字列のとき
						strX = String.fromCharCode.apply(null,arrX);
						x = GetterOfXY.parseDate(strX, this.paseDateConf);
					} else if (this.confTIME_FORM === "TIME_FORM_TEXT"){	// テキスト数字のユリウス経過時間のとき
						strX = String.fromCharCode.apply(null,arrX);
						x = GetterOfXY.parseNumber(strX);
					} else{	// this.confTIME_FORM === "TIME_FORM_LONG"
							// // longのユリウス経過時間のとき
						x = this._parseLong(arrX);
					}
					// 単位を補正する
					x *= this.confTIME_UNIT;
				}
				if (i === this.confTAT_COL){
					// パース対象フィールドを切り出す
					var posY =  pos + this.confTAT_POS;
					var arrY = (0 < this.confTAT_LEN) ? line.array.slice(posY, posY + this.confTAT_LEN)
							: line.array.slice(posY, nextPos);
					// フィールドをパースする
					if (this.confTAT_FORM === "TAT_FORM_TEXT"){	// テキスト数字のユリウス経過時間のとき
						var strY = String.fromCharCode.apply(null,arrY);
						y = GetterOfXY.parseNumber(strY);
					} else{	// TAT_FORM_TEXT === "TAT_FORM_LONG" //
							// longのユリウス経過時間のとき
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
     * @function
     * @memberof HJN.util.FileReader
     */
	proto.getObjctById = function(id) {
		return this._configFileFormat.getObjctById(id);
	};
    /**
     * configに登録されているkey(prefix補填)の設定値を取得する
     * 
     * @function
     * @memberof HJN.util.FileReader
     */
	proto.getValueByKey = function(key) {
		return this._configFileFormat.getValueByKey(key);
	};
    /**
     * 設定値を保有するオブジェクトを返却する
     * 
     * @function
     * @memberof HJN.util.FileReader
     */
	proto.getConfig = function() {
		return this._configFileFormat._config;
	};
    /**
     * HTML（config設定用）テキストを返却する
     * 
     * @function
     * @memberof HJN.util.FileReader
     */
	proto.getConfigHtml = function(type) {
		if (type === "Filter"){
			return this._configFilter.getHtml();
		} else{	// "File"
			return this._configFileFormat.getHtml();
		}
	};
    /**
     * keyの値に指定された関数（なければ何もしない関数）を返却する
     * 
     * @function
     * @memberof HJN.util.FileReader
     */
	proto.getFunction = function(key) {
		var cKey = this._configFileFormat.getValueByKey(key);
		if(!this.__keyConfig[cKey] || !this.__keyConfig[cKey].func){
			return function(){};	// funcが定義されていないとき、何もしない関数を返却する
		}else{
			return this.__keyConfig[cKey].func;	// keyの設定値のfuncが定義されているとき
		}
	};
    /**
     * keyの値に指定されたvalue（なければkey値）を返却する
     * 
     * @function
     * @memberof HJN.util.FileReader
     */
	proto.getValue = function(key) {
		var cKey = this._configFileFormat.getValueByKey(key);
		if(!this.__keyConfig[cKey] || this.__keyConfig[cKey].value === undefined){
			return cKey;	// valueが定義されていないとき、keyの設定値を返却
		}else{
			return this.__keyConfig[cKey].getValue();	// keyの設定値のvalueが定義されているとき
		}
	};

	
	// new
	return FileReader;
}());


/**
 * 使い方を記載したHTMLを取得する
 * 
 * @return {String} html 使い方を記載したHTML（未実装）
 */
HJN.util.HowToUse=function(){
    "use strict";
    var str =   "Sorry. Under construction _(..)_";
    return str;
};
/**
 * 著作権表記文字を取得する
 * 
 * @return {String} str 著作権表記文字
 */
HJN.util.Copyright=function(){
    "use strict";
    var str =   "&copy; 2017 Junichiroh Hirose\n" +
            "https://github.com/hirosejn/HJN";
    return str;
};
