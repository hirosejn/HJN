/** ie11 互換用  **/
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
/** *****1*********2*********3*********4*********5*********6*********7****** **/


/** ************************************ 
 * HJN.util
 * 	HNJのクラスメソッド群
 * ************************************ */

/** ************************************ 
 * 	初期表示用サンプルデータ(終了時刻のTAT（応答時間）時系列データ)を自動生成する※
 * ************************************ */
HJN.CreateSampleTatLog = function(num, response, freq){
	"use strict";
	HJN.ShowLogText("----- create data -----------------------------","calc");
	// 第一引数：	生成データ数（デフォルト:100、50*100*100)
	num = num || 100　*　100; //50*100*100;
	// 第二引数：　 最大応答時間振れ幅（ミリ秒) ※　乱数を二乗して長時間ほど長くする
	response = response || 1500;
	// 第三引数:　データ発生頻度の目安（tps)(デオフォルト:20tps)
	freq = freq || 10;
	// 戻り値：	終了時刻のTAT（応答時間）時系列データ
	//			[{x:終了時刻(JulianDayからの経過時間(秒)), y:レスポンス(秒)}]
	var eTat = [];

	var x = new Date(),
		d　= Math.floor(x.getTime()),
		y = 0.0,
		random = 0;
	for (var i = 0; i < num; i++) {		// jsはミリ秒単位
		d += Math.round( Math.random() * 1000.0 / (2 * freq) *
							(1 + (0.5 * Math.cos(2 * Math.PI * i / num)))
						);	// 次の電文発生時刻を求める
		random = Math.random();
		y  = Math.round( random　*　random　*　response * 1e+6 *
							(1 + (1.0 * Math.sin(2 * Math.PI * (i / num - 0.25))))
						) / 1e+6;　// レスポンスを求める
		eTat.push( {x: d , y: y, sTatIdx: 0} );
	}
	HJN.ShowLogText("got     " + eTat.length + " plots [tat/endT]","calc");
	return eTat;
};


/**  
 * HTMLから呼ばれるサンプル実装
 * @parm {string} chartName @default "chart"
 * 
 * @example 
 * window.addEventListener("DOMContentLoaded",function(eve){ HJN.ChartRegist("chart"); });
 */
HJN.ChartRegist = function(chartName){
	"use strict";
	// 引数１　：デフォルトHJN.chartName("chart")
	HJN.chartName = chartName = chartName || HJN.chartName;
	var dropFieldName = chartName;	// ファイルドロップを受け付けるタグ名
	HJN.ShowLogTextInit();			// 処理時間計測の初期化

	// グラフのインスタンスを作成し初期化する
	HJN.chart = new HJN(chartName, "HJN.chart");
	HJN.chart.init();
	HJN.chartD = new HJN(chartName + "Detail", "HJN.chartD");
	HJN.chartD.init();
	// ドロップフィールドに、処理を登録する(注：dygraphはイベントリスナーを登録しないとクリック時にエラーが出る）
	HJN.DropField(dropFieldName);
	HJN.DropField(dropFieldName+ "Detail");

	// 初期表示データを自動生成する
	var tatESeries = HJN.CreateSampleTatLog();	// arg0：生成データ数
	
	// グラフを初期表示する
	// 上段
	HJN.chart.update(HJN.chart.createSeries(tatESeries));
	HJN.ShowLogText("上段表示", "elaps");		// 処理時間ログ出力

	// 下段(非同期）
	HJN.setZeroTimeout( function(){
		HJN.chartD.update(HJN.ChartRegistDetail(HJN.chart.cTps));
		HJN.chart.showBalloon();	// 上段のBalloonを描画する
		HJN.ShowLogText("下段表示", "elaps");
		HJN.ShowLogText("<mark>サンプルを表示しました</mark>", "msg");
	}　);
};


/** ************************************ 
 * HJN.DropField	CSVファイルのドロップ領域
 * ************************************ */
HJN.DropField = function (dropFieldName) {	// 第一引数　ファイルのドロップイベントを受けるフィールド名
	"use strict";
	// 第一引数で指定された名前の ID 属性のエレメントを取得する
	var element = document.getElementById(dropFieldName);
	
	/** ドラッグ操作中に実行されるイベント（マウスカーソルが要素内に滞在中） **/
	element.addEventListener("dragover" , function (e){
		e.preventDefault();							// ドロップを許可し受け入れを表明
	});
	
	/** ドロップ時に実行されるイベント **/
	element.addEventListener("drop", function (e){
			var data_transfer = e.dataTransfer;		// DataTransfer オブジェクトを取得する
			if(!data_transfer.types) return;		// ファイルのコンテンツタイプを取得できたことを確認する
			var files = data_transfer.files;	// ファイルのリストを取得する
			HJN.FileReader(files);
			e.preventDefault();		// デフォルトのドロップ機能を無効化
	});
};
/**  イベントで指定されたファイルを処理する  #15 **/
HJN.FileReader = function (files){
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
		        	/** ファイルの先頭2行をログ表示する **/
		        	console.log("HJN.filesIdx="  + HJN.filesIdx);

		        	HJN.filesArrayBuffer[HJN.filesIdx] = evt.target.result;
		        	textArray += HJN.DropField.topLines(				// 2行展開する
		        						HJN.filesArrayBuffer[HJN.filesIdx], 2);
	        		HJN.ShowLogTextInit();		// 情報表示　:　初期化
	        		HJN.ShowLogText(textArray, "msg");	// 情報表示　：　ドロップファイル情報
	        		
	        		/** 上段用データの展開とグラフ描画 **/
	        		// CSVファイルを上段用eTatに展開する[{x:, y:,pos:,len:},...]
	        		var tatESeries = HJN.DropField.getTatLogArray(		// 全件展開する
	        							HJN.filesArrayBuffer[HJN.filesIdx] );
	        		// 上段グラフを描画する（ eTatから上段用 時系列分析データ(seriesSet)を展開する）
	        		HJN.chart.update(HJN.chart.createSeries(tatESeries));
	    			HJN.ShowLogText("上段表示", "elaps");

	        		/** 下段用データの展開とグラフ描画（非同期処理） **/
	        		HJN.plots = [];
	        		HJN.setZeroTimeout(function(){
		        		// 下段グラフを描画する（下段用 時系列分析データ(seriesSet)を展開する）
		        		HJN.chartD.update(HJN.ChartRegistDetail(HJN.chart.cTps));
	        			// 上段のBalloonを描画する(上段update時にはplots登録されていないので、ここで処理）
		        		HJN.chart.showBalloon();
		    			HJN.ShowLogText("下段表示", "elaps");
		    			HJN.ShowLogText("<BR><mark>"+ HJN.files[0].name +
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
			HJN.ShowText( ["<mark>"+msg+"</mark>"] );
			console.error("[%o]%o",msg,e );
		}
	}
};

/**  指定ファイルの先頭ｎ行を、改行文字<BR>のテキストに変換してリターンする **/
HJN.DropField.topLines = function(file, n) {
	"use strict";
	var fileInfo = "",
		line;
	try{	// 先頭からnレコード取得
		var getterOfLine = HJN.chart.fileReader.getGetterOfLine()(file);
		for (var i = 0; i < n; i++) {
			line = getterOfLine.next();
			fileInfo += line.str + "<BR>";
		}
	}catch (e) {
		alert("[HJN.DropField 改行コードの無いファイルは扱えません]");
		console.error(e);
	}
	return fileInfo;
};
/** CSVファイルを読み込み、TatLog用アレイ[{x:日時, y:値, pos:レコード開始位置, len:レコード長},...]に展開する **/
HJN.DropField.getTatLogArray　=　function(file) {	// arg0:csvﾌｧｲﾙのファイルﾊﾟｽ
	"use strict";
	HJN.ShowLogText("----- read file -----------------------------","calc");
	var eTat = [],
		xy = {date: 0, value: 0, isError: false },
		i = 0,	// timelog用
		getterOfLine = HJN.chart.fileReader.getGetterOfLine()(file),
		getterOfXY = HJN.chart.fileReader.getGetterOfDateAndValue()(),
		line = getterOfLine.next();		// 先頭行の初期処理
	while (!line.isEoF) {				// 以降最終行まで処理する
		try {
			HJN.LogTime(i++, line);	// 一定時刻毎に進捗を出力する
			xy = getterOfXY.parse(line);
			if(!xy.isError){
				eTat.push( {x: xy.x, y: xy.y,
					fileIdx: 0, pos: line.pos, len: line.array.byteLength, sTatIdx: 0} );
			}
			line = getterOfLine.next();	// #24
		} catch (e) {	/* 改行だけレコードをスキップ */
			console.error(e);
			console.err("err: %o",e);
		}
	}
	HJN.ShowLogText("[0:file readed & got eTat]---------------","calc");
	return eTat;
};


/** ************************************ 
 * フォーマットした文字列を取得する 
 * ************************************ */
/** 日時(JS Date)から、指定フォーマットの文字列を得る **/
HJN.DateToString　=　function() {
	"use strict";
	var dt = arguments[0],	// arg0: Date型（ミリ秒単位） 
		str = arguments[1];	// arg1: フォーマット ｙｙｙｙ-MM-dd hh:mm:ss.ppp
	
	str = str.replace(/yyyy/, dt.getFullYear() );
	str = str.replace(/MM/, ('0' + (dt.getMonth() + 1) ).slice(-2) );
	str = str.replace(/dd/, ('0' + dt.getDate()).slice(-2) );
	str = str.replace(/hh/, ('0' + dt.getHours()).slice(-2) );
	str = str.replace(/mm/, ('0' + dt.getMinutes()).slice(-2) );
	str = str.replace(/ss/, ('0' + dt.getSeconds()).slice(-2) );
	str = str.replace(/ppp/,('00' + Math.floor(dt % 1000)).slice(-3) );

	return str;
};
/** 日時(ミリ秒：Ｘ軸用）から、指定フォーマットの文字列を得る **/
HJN.D2S = function(ds, str){ // arg0: 日時(ミリ秒)の数値
	"use strict";
	return HJN.DateToString(new Date(ds), str);
};
/** 数値(Ｙ軸用）から、誤差のない表示用文字列（数）を得る **/
HJN.N2S = function(y){ // arg0: Y軸の値
	"use strict";
	return Intl.NumberFormat('en-IN').format(y);
};

/** ************************************ 
 * 詳細グラフ用　HJN.chartD.seriesSet　設定関連機能
 * ************************************ */
/**  指定日時をFORMのslider Rangeに、設定する **/
HJN.SetSliderRange　=　function(date) {	// arg0: 日時（ミリ秒単位）
	"use strict";
	HJN.detailDateTime = Math.floor(date / 1000) * 1000;	// 秒単位に丸める
};

/** 表示対象期間のcTpsから、eTps範囲を取得し、詳細Seriesを生成する。併せてPlotsを登録する。 **/
HJN.ChartRegistDetail = function(cTps){
	"use strict";
	// CTPSの最大値となるplotを取得する
	var maxY =　Number.MIN_VALUE,
		maxYIdx = -1;
	cTps.forEach(function(c, i){
		if (maxY < c.y){
			maxY = c.y;
			maxYIdx = i;
		}
	});
	if(0 <= maxYIdx){	// #26
		// slider rangeに、下段の表示時刻を設定する
		HJN.SetSliderRange(cTps[maxYIdx].x);
		// eTpsの範囲を取得し、詳細用seriesSet(HJN.chartD.seriesSet）を設定する
		HJN.chartD.createSeries(HJN.GetSliderRangedEtat());
		// plotsアイコン用 HJN.plotsに、下段表示したplotを登録する
		HJN.PlotAdd(HJN.CTPS.N, cTps[maxYIdx].x, cTps[maxYIdx].y);
	}
	HJN.ShowLogText("[6:Plot added] " + HJN.plots.length + " plots","calc");

	return HJN.chartD.seriesSet;
};
/** sliderRangeで指定された範囲のeTatを返却する **/
HJN.GetSliderRangedEtat = function() {
	"use strict";
	// 指定時刻（ｄｔ ±　range）を得る
	var rangeTagPlus  = document.getElementById("DetailRangePlus"),
		rangeTagMinus = document.getElementById("DetailRangeMinus");
	// HJNグローバル変数に退避する
	HJN.detailRangePlus  　= rangeTagPlus ? +rangeTagPlus.value : 2;	// 幅（秒）
	HJN.detailRangeMinus　= rangeTagMinus ? +rangeTagMinus.value : 1;	// 幅（秒）
	var dt = Math.floor(HJN.detailDateTime * 1000) / 1000,		// 中央時刻	// ミリ秒
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
			eTatDetail = HJN.chart.eTat.tatMap.search(from,　to);
			HJN.chart.eTat.cash.setRangedCash(eTatDetail, from, to);
		}
	}
	HJN.ShowLogText("[0:HJN.GetSliderRangedEtat] ","calc");
	
	return eTatDetail;	// 詳細グラフ用eTatを返却する
};


/** ************************************ 
 * HJN.plotsアイコン用　HJN.Plot設定関連機能
 * ************************************ */
/**  plotsクリック時の処理 **/
HJN.PointClickCallback = function(p) {
	"use strict";
	HJN.ShowLogText("[0:PointClickCallback]start---------------","calc");
	//var hover = HJN.hoverXY, // { x: , pts:, row:, seriesName: };
	var	n = HJN.seriesConfig.findIndex(function(e){	return e.key === p.name; }),　// シリーズ番号
		x = p.xval,	// ミリ秒
		y = p.yval; // 秒
	// グラフの日時で、詳細グラフを再作成する
	HJN.SetSliderRange(x);
	HJN.chartD.createSeries(HJN.GetSliderRangedEtat());
	// 下段の残処理終了後、下段データを登録描画する
	HJN.chartD.graph.ready(function(){ HJN.chartD.update(HJN.chartD.seriesSet); });
	// Hover表示しているplotを、HJN.plotsに登録し、plotsアイコンを再描画する
	HJN.PlotAdd(n, x, y);
	// Balloonを再描画する
	HJN.PlotShowBalloon();
};

/**  plotsダブルクリック時の処理（削除する） **/
HJN.PointDblClickCallback = function(plot) {
	"use strict";
	// 指定plotを削除する
	var n = HJN.seriesConfig.findIndex(function(e){	return e.key === plot.name; }),
		x = plot.xval,	// ミリ秒
		i = HJN.plots.findIndex(function(p){
				return　　(p.n === n && p.x === x) ||	// 完全一致
						("tpsPlot" in p &&			// 詳細一致
						　p.tpsPlot.n === n && p.tpsPlot.x === x); });
	if(0 <= i) HJN.plots.splice(i, 1);
	
	HJN.PlotRender();
	// グラフ内の吹き出しを再表示する
	HJN.PlotShowBalloon();
};

/**  クリック時のHoverからHJN.plotsを設定する **/
HJN.PlotAdd　=　function(n, x, y) { // arg: シリーズ番号、HJN.hoverXY マウスクリック時の値、x,y:ミリ秒
	"use strict";
	// 各plotを非選択状態とする
	HJN.plots.forEach(function(e){e.radio = false;});
	// ラベルフォーマットの設定
	var format = (n === HJN.ETPS.N || n === HJN.CTPS.N) ? "hh:mm:ss" : "hh:mm:ss.ppp",
		label = HJN.D2S(x, format) + " " +
				HJN.seriesConfig[n].label.replace("%N",HJN.N2S(y));
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
	var	i = HJN.plots.findIndex(function(p){
				return　　(p.n === n && p.x === x) ||	// 完全一致
						("tpsPlot" in p &&			// 詳細一致
						　p.tpsPlot.n === n && p.tpsPlot.x === x); });
	// Plotを設定する
	var plot;
	if(0 <= i){	// 既存Plotsにある時、選択状態とし、rangeを再設定する
		plot = HJN.plots[i];
		plot.radio = true;
		plot.rangePlus  = rangePlus;	// 秒
		plot.rangeMinus = rangeMinus;
	}else{		// 既存に無いときPlotを追加する
		plot = {label: label, ckBox:false,
				 radio:true, n: n, x: x, y: y, 
				 rangePlus: rangePlus , rangeMinus: rangeMinus };
		if (n === HJN.CTPS.N){	// CTPSのとき秒内最大CONCとして登録する
			var conc = HJN.chartD.conc,	// PlotAddは下段集計後に呼ばれる
				toX = x + 1000, // ミリ秒
				maxTime = 0,
				concMax = 0;
			i = HJN.util.binarySearch(x, conc, function(e){ return e.x; });
			for (; conc[i].x < toX && i < conc.length; i++){	// #26
				if (concMax < conc[i].y){
					maxTime = conc[i].x;
					concMax = conc[i].y;
				}
			}
			if(x < maxTime){	// 補正すべき時刻が求まったときCONCを追加する
				n = HJN.CONC.N;
				x = maxTime;
				format = "hh:mm:ss.ppp";
				label = HJN.D2S(x, format) + " " +
						HJN.seriesConfig[n].label.replace("%N",HJN.N2S(y));
				HJN.plots.push(	{label: label, ckBox:false,
					 radio:true, n: n, x: x, y: y, 
					 rangePlus: rangePlus , rangeMinus: rangeMinus,
					 tpsPlot: plot} );	// 詳細plotには、tpsのplot情報も保持する
			}else{	// 詳細plotが見つからないときは、選択Plotを追加する
				HJN.plots.push(plot);
			}
		}else{	// CTPS以外の時、選択Plotを追加する
			HJN.plots.push(plot);
		}
		// Plotsを時刻順にソートする
		HJN.plots.sort(
				function(a, b) { return a.x - b.x; });
		i = HJN.plots.findIndex(
				function(p){ return(p.n === n && p.x === x); });
	}
	HJN.PlotRender();
	return i;	//　plots内のplotの位置
};


/**  HJN.plotsを再表示する **/
HJN.PlotRender = function() {
	"use strict";
	var divCheckedPlots =  document.getElementById(HJN.chartName + "Plots");
	// 既存のアイコンを削除する
	while (divCheckedPlots.firstChild){
		divCheckedPlots.removeChild(divCheckedPlots.firstChild);
	}
	// 登録されているplots分のアイコンを追加する
	HJN.plots.forEach( function(e, i){
		var div = document.createElement('div'),		// 要素の作成
			radio = e.radio ? 'checked="checked"' : '',	//　radio選択指定
			ckBox = e.ckBox ? 'checked="checked"' : '';	//　check boxのチェック指定
		div.className = "hjnPlot";
		div.innerHTML =
	    	'<input type="checkbox" value="' + e.x + '" id="checkBox_' + i + '" ' + ckBox +
	    			' title="delete" onclick="HJN.PlotCheckBox(' + i + ')">' +
	    	'<label></label>' +
	    	'<input type="radio" name="CheckedPlot" id="SaveTime_' + i + '" ' + radio +
	    			' onclick="HJN.PlotCheckRadio(' + i + ')">' +
	    	'<label for="SaveTime_' + i + '">' + e.label + '</label>';
    	divCheckedPlots.appendChild(div);
	} );
};



/*
HJN.PlotRender = function() {
	"use strict";
	var divCheckedPlots =  document.getElementById(HJN.chartName + "Plots");
	// 既存のアイコンを削除する
	while (divCheckedPlots.firstChild){
		divCheckedPlots.removeChild(divCheckedPlots.firstChild);
	}

	var div = document.createElement('div');		// 要素の作成
	// 登録されているplots分のアイコンを追加する
	HJN.plots.forEach( function(e, i, a){
		var div = document.createElement('div'),		// 要素の作成
			radio = e.radio ? 'checked="checked"' : '',	//　radio選択指定
			ckBox = e.ckBox ? 'checked="checked"' : '';	//　check boxのチェック指定
	    div.innerHTML =
	    	'<input type="checkbox" value="' + e.x + '" id="checkBox_' + i + '" ' + ckBox +
	    			' onclick="HJN.PlotCheckBox(' + i + ')">' +
	    	'<input type="radio" name="CheckedPlot" id="SaveTime_' + i + '" ' + radio + 
	    			' onclick="HJN.PlotCheckRadio(' + i + ')">' +
	    	'<label class="label" for="SaveTime_' + i + '">' + e.label + '</label>';
    	divCheckedPlots.appendChild(div);
	} );
}
/**  checkboxのクリックをHJN.plotsに反映する **/
HJN.PlotCheckBox = function(i) {
	"use strict";
	HJN.plots.splice(i,1);		// checkされたplotを削除する
	HJN.PlotRender();			// Plotsを再描画する
	HJN.PlotShowBalloon();		// グラフのBalloonを再描画する
};
/**  radio選択時に下段グラフを更新する **/
HJN.PlotCheckRadio = function(i) {
	"use strict";
	// HJN.plotsにradioの状態を反映する
	HJN.plots.forEach(function(e){ e.radio = false; });
	HJN.plots[i].radio = true;
	// グラフの日時で、詳細グラフを再作成する
	HJN.SetSliderRange(HJN.plots[i].x);	// 中心時刻に設定する
	document.getElementById("DetailRangePlus").value = HJN.plots[i].rangePlus;	// 幅を設定する
	document.getElementById("DetailRangeMinus").value = HJN.plots[i].rangeMinus;
	HJN.chartD.createSeries( HJN.GetSliderRangedEtat() );
	// 下段データを登録描画する
	HJN.chartD.update(HJN.chartD.seriesSet);
	// Balloonを再描画する
	HJN.PlotShowBalloon();
};
/** Balloonを再描画する **/
HJN.PlotShowBalloon =　function(){
	"use strict";
	HJN.chart.showBalloon();
	HJN.chartD.showBalloon();
};

/** ************************************ 
 * cashを管理する	
 * ************************************ */
HJN.util.Cash = (function() {
	"use strict";
	/** static member */
	var proto = Cash.prototype = {
			// クラス変数	_xxx: 0
		};
	/** constructor */
	function Cash(size){
		size = size || 10;	// ToDo 未使用
		if(!(this instanceof Cash)) return new Cash(size);
		// インスタンス変数
		this._cash = {};	// キャッシュ	{data:, count:, lastTime:}  
		this._ranges = [];	// RangedCash用　{key: ,from: , to:, }
		this._size = size;	// キャッシュ最大件数
	}
	
	/* class method */
	// 第一引数のargumentsを配列に変換する（注：引数が１つ以上あることを前提）
	Cash._arg2arr = function　(args) {
			return args.length === 1 ? [args[0]] : Array.apply(null, args);
		};
	// cash判定Keyを取得する(（注：引数を'.'でつないだ文字列をkeyとするので、大きな配列はNG)
	Cash._getKey = function　(args) {
			var argsArr = this._arg2arr(args);
			return argsArr.reduce(function(a,b){return a+'.'+b; });
		};
		
	/* private */

	/* public */
	// cashを返却する（cashが無いときは undefined）
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
	// cashする（arg0:キャッシュ値、arg1以降:ハッシュキー）
	proto.setCash = function () {
			if (arguments.length < 2) return undefined;
			var cashVal = arguments[0],
				args = Cash._arg2arr(arguments).slice(1, arguments.length),
				key = Cash._getKey(args);
			this._cash[key] = {data: cashVal, count: 0, lastTime:new Date()};
			return cashVal;
		};

	// レンジキー(form,to)範囲内でキーマッチするcashを返却する（cashが無いときは undefined）
	proto.getRangedCash = function (from, to) {
			var range = this._ranges.find(function(e){
					return (e.from <= from && to <= e.to);
				});
			return (range !== undefined) ? this.getCash(range.from,range.to) : undefined;
		};
	// レンジキー指定でcashする（arg0:キャッシュ値、arg1：範囲from、arg2:範囲to）
	proto.setRangedCash = function (cashVal, from, to) {
			if (arguments.length < 3) return undefined;
			// 登録キー範囲に包含される既存キャッシュを削除する
			var count = 0;
			this._ranges = this._ranges.filter(function(e){
					if (from <= e.from && e.to <= to){
						//　登録キャッシュ範囲内のキャッシュを削除する
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
			this._cash[key].count　= count + 1;	// 再作成時はカウンタ合算値
			return cashVal;
		};

	// newの戻り値
	return Cash;
}());




/** ************************************ 
 * slider range変更時に、Detailを再描画する
 * ************************************ */
HJN.setDetailRange = function(){
	"use strict";
	clearTimeout(HJN.timer);
	HJN.timer = setTimeout(function(){
			HJN.ShowLogTextInit("[-:HJN.setDetailRange]start---------------","calc");
			// 表示中Plotsのrangeを更新する #30
			var i = HJN.plots.findIndex(function(e){ return (e.radio === true); });
			HJN.plots[i].rangePlus  = document.getElementById("DetailRangePlus").value;
			HJN.plots[i].rangeMinus = document.getElementById("DetailRangeMinus").value;
			// 下段データを登録する
			HJN.chartD.seriesSet = HJN.chartD.createSeries( HJN.GetSliderRangedEtat() );
			// 下段グラフを描画する
			HJN.prototype.update.call(HJN.chartD, HJN.chartD.seriesSet);
		}, 750);	// 750ms 値の変更がなかった時に、処理を開始する
};

/** ************************************ 
 * 非同期化 内部関数
	https://jsfiddle.net/kou/j73tLum4/8/
	https://gist.github.com/mathiasbynens/579895
	http://dbaron.org/log/20100309-faster-timeouts
 * ************************************ */
HJN.setZeroTimeout = (function(global) {
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


/** ************************************ 
 * テキスト領域関連
 * ************************************ */
/** 経過時間でログ出力する **/
HJN.LogTime　=　function(i, text) {
	"use strict";
	var ts = new Date(),
		freq = 60000;	// 1分毎
	if (freq < ts - HJN.logtime){
		var t = HJN.DateToString(ts, "hh:mm:ss.ppp");
		console.log(t + "[" + i + "]~~~~" + text);
		HJN.logtime = ts;
	}
};


/** ログテキストを初期化する **/
HJN.ShowLogTextInit　=　function(text, mode) {
	"use strict";
	HJN.timestamp = new Date();
	HJN.logText = [];
	if(text) HJN.ShowLogText(text, mode);
};
/** ログテキストをテキストアレイに追記し、表示する **/
HJN.ShowLogText　=　function(text, mode) {
	"use strict";
	if (mode === "calc") return;	// 集計時評価用ログ出力抑止
	// "msg"指定のときは経過時間を取らずに、ログのみ出力する
	if (mode !== "msg"){
		// 処理時間情報を追加する
		var lastTimestamp = HJN.timestamp;
		HJN.timestamp = new Date();
		text = (Math.round( this.timestamp - lastTimestamp ) / 1000.0) + "s " + text;
		// 数値のカンマ編集（小数部もカンマが入る）
		text = text.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
		text = HJN.DateToString(HJN.timestamp, "hh:mm:ss.ppp     ") + text;
	}
	HJN.logText.push(text);
	HJN.ShowText(HJN.logText);
	if(true) console.log(text);
};
/** 第一引数のテキストアレイの内容を#fileInfoのiframeに表示する **/
HJN.ShowText　=　function(textArray) {
	"use strict";
	var iHtmlBody = "";
	for (var i = textArray.length - 1; 0 <= i; i--){
		iHtmlBody += textArray[i] + "<BR>"; 
	}
	HJN.ShowIHtmlBody('fileInfo',　iHtmlBody);
};
/** 第一引数のID名のiframeに、第二引数のテキストを表示する **/
HJN.ShowIHtmlBody　=　function(elementId, iHtmlBody){
	"use strict";
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

/** 第一引数のID名のiframeに、第二引数のテキストを表示する **/
HJN.Copyright　=　function(){
	"use strict";
	var str = 	"&copy; copyright 2017 Junichiroh Hirose\n" +
			"https://github.com/hirosejn/HJN";
	return str;
};
HJN.HowToUse　=　function(){
	"use strict";
	var str = 	"Sorry. Under construction _(..)_";
	return str;
};

/** ************************************ 
 * 指定されたtextareaを使って、クリップボードにコピーする
 * ************************************ 
HJN.CopyToClipboard　= function(elementId)　{	// arg0:textareaのID名
	"use strict";
	var area = document.getElementById(elementId);
    area.select();
    document.execCommand("copy");
} 
//詳細表示対象の元データ(eTat)をコピー用領域にテキストで出力する
HJN.GetSliderRangedEtatText = function(elementId) {
	"use strict";
	// 開始メッセージを画面に設定する
	document.getElementById(elementId).value = "データの収集を開始しました しばらくお待ち下さい";
	// ブラウザに開始メッセージを描画させるために、集計処理は非同期でキックする
	HJN.setZeroTimeout(function(){
		// コピーデータを集計する
		var eTatDetail = HJN.chartD.eTat;
		var eTatCsv = "";
		if(0 < eTatDetail.length){
			if(typeof eTatDetail[0].pos === "undefined"){
				eTatDetail.forEach(function(e){
					eTatCsv +=  HJN.D2S(e.x, "yyyy/MM/dd hh:mm:ss.ppp") +
								"," + e.y + "\r\n"; 
				});		
			}else{
				eTatDetail.forEach(function(e){
					eTatCsv += String.fromCharCode.apply(null,
								new Uint8Array(HJN.file, e.pos, e.len)) + "\r\n";
				})
			}
		}else{
			eTatCsv += "No log in the time."
		}
		// 画面にコピー対象データのテキストを設定する
		document.getElementById(elementId).value = eTatCsv;
		// クリップボードにコピーする
		HJN.CopyToClipboard(elementId);
	});
}
*/


/**  配列二分木検索 **/
HJN.util.binarySearch = function (val, arr, func, low, high, isEqual) {
	"use strict";
	func = func || function(val){ return val.valueOf(); };
	low = low || 0;
	high = high || arr.length - 1;
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
	if (isEqual) return -1;	// 完全一致指定のとき(-1)をリターンする
	// 完全一致指定でないとき、値との差が最も少ない位置をリターンする
	if(func(arr[middle]) < val){
		if (val - func(arr[middle]) < func(arr[high]) - val) {return middle;}
		else {return high;}
	}else{
		if (val - func(arr[low]) < func(arr[middle]) - val) {return low;}
		else {return middle;}
	}
	return -1;	// 指定範囲外
};



/** ************************************ 
 * 期間指定eTat取得用Map　#18
 * @parm {array} eTat インデクスをつける対象の配列
 * @return {eTatMap} eTatMap 期間指定eTat取得用Map
 * ************************************ */
HJN.util.MappedETat = (function() {
	"use strict";
	/** static member */
	var proto = MappedETat.prototype = {
			_abscissa: [],
			_conf :[{ms:      10,　step:5, label:"0_10ms_"},
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
	/** constructor */
	function MappedETat(eTat){
		if(!(this instanceof MappedETat)) return new MappedETat(eTat);
		// MappedArrayを作成する
		this._tatMap = new HJN.util.MappedArray(eTat, this._getKey, true);
	}

	/** private */
	proto._row = function　(label, step) {　return label + step;　};

	/* MapKey取得関数 **/
	proto._getKey = function　(e, i) {		// MapedMap用Key配列関数
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
		for (i = 1; i < _conf.length; i++) {						// 最下位から上に評価
			term = _conf[i].ms;
			if(Math.floor(end / term) === Math.floor(start / term) || end - start < term){ // 上位BOXを起点
				term = _conf[i-1].ms;	// ひとつ下位のBOX期間（下から評価したので二段下となることは無い
				rowLv = Math.floor(end / term) - Math.floor(start / term);
				return [_row(_conf[i-1].label, rowLv),
						(Math.ceil(e.x / _conf[i-1].ms) - 1) * _conf[i-1].ms];
			}
		}
		return "error";
	};

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
							step: 0, from: 0, to: c[0].ms} );	//　先頭を末尾に追加

	
	/** public */
	// 指定期間に動いているeTatを検索する
	proto.search = function (from, to, cap) {
		to = to || from;	// to省略時は時刻指定(from=to)
		cap = cap || Number.MAX_VALUE; // cap件数となったら抽出を終了する（指定なしの時：全件）
		var	map = this._tatMap._map,
			eTat = this._tatMap._arr,
			abscissa = this._abscissa,
			eTatArr = [],
			start = 0,
			end = 0;
		// 検索対象のBOX一覧を生成する
		abscissa.forEach(function(e){	// 存在しうる横軸のうち（tatが長時間の方から）
			if (map[e.label]){			// 横軸が存在するものについて
				var boxNum = e.i + (Math.ceil(to / e.ms) - 1) - Math.floor(from / e.ms),
					key = Math.floor(from / e.ms) * e.ms;
				for(var j = 0; j <= boxNum; j++){　	// 存在しうるKey値のうち（終了時間が早い方から）
					if (map[e.label][key]){			// Key値が存在し
//						console.log(e.label, e.i, key, map[e.label][key]);
						map[e.label][key].forEach(function(k){	// Keyが持っている要素(eTatへの参照:k)のうち
							start = eTat[k].x - eTat[k].y;
							end   = eTat[k].x;
							if((start <= to) && (from <= end)){		// from-toの期間に動いている要素(eTatのindex)を
//								console.log(i, k, eTat[k]);
								if(eTatArr.length < cap){			// 戻り値の配列要素数がcap未満の場合
									eTatArr = eTatArr.concat(eTat[k]);	// 戻り値の配列に追加する
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


/** ************************************ 
 * 配列に格納されているオブジェクトのx値で、配列位置を高速検索 #18
 * @parm {array} arr インデクスをつける対象の配列
 * @parm {string|function} getKey （任意）MappedArrayのKey値の取得方法
 *  （デフォルト）　　配列要素の値(valueOf)　	注： 0,00,"0"は同値、1,01,"1"は同値
 *   Stringのとき、　配列要素が持つ指定要素の値
 *   functionのとき、配列要素に指定関数を適用した戻り値
 *			関数の引数：(配列要素オブジェクト、配列のインデックス、作成中のMappedArrayへの参照）
 * @parm {boolean} isMappedMap （任意） getKeyが2段Map用の配列を返却する
 * @return {object} Index arrに対するインデックス（連想配列名で検索）
 * 参考　http://qiita.com/alucky0707/items/10052866719ba5c5f5d7
 * ************************************ */
HJN.util.MappedArray = (function() {
	"use strict";
	/** static member */
	var proto = MappedArray.prototype = {
			// クラス変数	_xxx: 0
		};
	/** constructor */
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

	/* private */
	proto._createMappedArray = function　() {
		var key = ""; 
		this._map = this._arr.reduce(function(m, a, i) {
			key = this._getKey.call(a, a, i, m);
			m[key] = (m[key] || []).concat(i);
			return m;
		}, {});
	};
	proto._createMappedMappedArray = function　() {
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

	
	/* public */

	// 値の存在チェック
	proto.has = function (keyValue) {
		return keyValue in this._map;
	};

	// 該当位置を配列で返す
	proto.indexes = function (keyValue) {
		return this._map[keyValue] || [];
	};

	// 該当する要素を配列で返す
	proto.search = function (keyValue) {	
		var arr = this._arr;
		return this.indexes(keyValue).reduce(function(m, i) {
			m.push(arr[i]);
			return m;
		}, []);
	};

	// Array.prototype.indexOf() 同等
	proto.indexOf = function (keyValue) {
		var idxArr = this._map[keyValue],
			i = idxArr ? idxArr.length : -1;
		return (0 < i) ? idxArr[0] : -1;
	};

	// Array.prototype.lastIndexOf() 同等
	proto.lastIndexOf = function (keyValue) {
		var idxArr = this._map[keyValue],
			i = idxArr ? idxArr.length : -1;
		return (0 < i) ? idxArr[i-1] : -1;
	};
	
	return MappedArray;
}());


/** ************************************ 
 * 日時、TATフォーマット指定機能追加 #24
 * ************************************ */
HJN.util.Config = (function() {
	"use strict";
	/** static member */
	var proto = Config.prototype = {
			__config : {}	// config設定コンテナ
	};
	/** constructor */
	function Config(prefix, ol){ 
		if(!(this instanceof Config)) return new Config(prefix, ol);
		this._pre = (prefix || '') + ".";			// 各フィールド、要素の名称のプレフィックス(区切り文字 ".")
		this._ols = ol ? '<' + ol + '>' : '<ol>'; 	// リストに使用する要素（初期値 ol )
		this._ole = ol ? '</' + ol + '>' : '</ol>';
		this._html = this._ols;	// config設定画面のHtml
		this._nameHtml = '';	// HTMLタグの name属性指定
		this._name = '';		// radioのConfig.get用
	}

	/** class method */
	// HTML要素の値が変更した時に、configに当該要素を登録する
	Config.on = function(t) {
		if (t.type === "radio") {			// radioのとき、nameに対して、選択されたキー値（idからprefixを削除した値）を登録
			this.prototype.__config[t.name] = t.id.substr(t.id.indexOf(".") + 1);
		}else if (t.type === "number") {	// numberのとき、idに対する、value(入力値)を数値として登録
			this.prototype.__config[t.id] = +t.value;
		} else {							// textのとき、idに対する、value(入力値)を登録
			this.prototype.__config[t.id] = t.value;
		}
	};

	/* private */

	/* public */
	proto.getObjctById = function(id) {		// configに登録されているid(=prefix+key)の設定値を取得する
		return this.__config[id];
	};
	proto.getValueByKey = function(key) {	// // configに登録されているkey(prefix補填)の設定値を取得する
		return this.getObjctById(this._pre + key);
	};
	proto.getHtml = function() {	// config設定用HTMLテキストを取得する
		return this._html + this._ole;
	};
	proto.xset = function(key, val) {	// keyに値を設定する
		this.value[this._pre + key] = val;
	};
	
	// config作成用 publicメソッド
	proto.n = function (str) {	// 改行　
		str = str || "";
		this._html += this._ole + str + this._ols;
		return this;
	};
	proto.nDown = function () {	// ネスト一つ下げ　
		this._html += this._ols;
		return this;
	};
	proto.nUp = function () {	// ネスト一つ上げ　
		this._html += this._ole;
		return this;
	};

	proto.name = function (str) {	// nameを変更する（radio等の先頭で指定）
		this._nameHtml = str ? 'name="' + this._pre + str + '" ' : '';
		this._name = str;
		return this;
	};
	proto.label = function (key, str, attribute) {	// ラベル要素 (prefix+keyで関連付けるformのid属性となる)
		this._html += '<label ' +
						(key ? 'for="' + this._pre + key + '" '　: '') +
						(attribute || '') + '>' +
						(str || '') +
						'<label>\n';
		return this;
	};
	proto.labeledForm = function (key, type, typedAttribute, 	// ラベル付された各種入力フォーム
								pLabel, sLabel, val, attribute, check) {
		this._html += '<label>' +
					(pLabel ? pLabel : '') +
					'<input type="' +　type + '" ' +
						(typedAttribute || '') + 
						this._nameHtml +
						'id="' + this._pre + key + '" '　+		// idがユニークになるようkeyにprefixを付与
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
	proto.number = function (key, pLabel, sLabel, val, attribute) {	// テキストボックス要素で、文字列を設定
		proto.labeledForm.call(this, key, "number", "", 
								pLabel, sLabel, val, attribute);
		return this;
	};
	proto.text = function (key, pLabel, sLabel, val, attribute) {	// テキストボックス要素で、数値を設定
		proto.labeledForm.call(this, key, "text", "", 
								pLabel, sLabel, val, attribute);
		return this;
	};
	proto.radio = function (key, pLabel, sLabel, check, attribute) {	// ラジオボタン要素で、選択肢の一つを設定
		proto.labeledForm.call(this, key, "radio", (check ? 'checked="checked;"' : ''),
								pLabel, sLabel, "", attribute, check);
		return this;
	};

	/* new */
	return Config;
}());

HJN.util.FileReader = (function() {
	"use strict";
	/** static member */
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
		var v = function(key, fieldId) {	// fieldIdの値を返却値とする(デフォルト： key + ".v")
					var _keyConf = proto.__keyConfig[key] = {};
					_keyConf.value = key;			// getValueByKeyの返却値（デフォルト：keyと同じ文字列）
					_keyConf.getValue = function () {
							return HJN.util.Config("m").getValueByKey(fieldId || key + ".v");
						};
					return key;
				};

				
		// 名称と挙動の定義
		this._config = HJN.util.Config("m")	// config設定画面定義
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
				.number("TIME_POS", "Positon(byte): from", null, "1", 'style="width:40px;"')
				.number("TIME_LEN", "length", null, null, 'style="width:40px;"').n()
			.name("TIME_FORM").label(null,"Format:")
				.radio("TIME_FORM_YMD", null, null, true)
					.text("TIME_YMD", null, null, null, 'size="23" placeholder="YYYYMMDD hh.mm.ss.ppp"').n()
				.nDown()
				.radio("TIME_FORM_TEXT", "(num)", "text")
				.radio("TIME_FORM_LONG", null, "long").n()

				.name("TIME_UNIT").label(null, "Units of numbers:")
					.radio(def("TIME_UNIT_MS", 1), null, "msec")
					.radio(def("TIME_UNIT_SEC", 1000), null, "sec", true)
				.nUp()
			.n("<br>")
			.name("TAT").label(null,"[Tturnaround time(TAT) field]").n()
			.number("TAT_COL", "", "th column of CSV", "2", 'style="width:40px;"').n()
			.name("TAT_POS")
				.number("TAT_POS", "Positon(byte): from", null, "1", 'style="width:40px;"')
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
	}

	/* class method */
	/* private */
	/* public */
	proto.getGetterOfLine = function() {	//　「ファイルから次の1レコードを取得するutil」　を取得する
		var func = (function() { 
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
				/* public */
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
				return GetterOfLine;
			}());
		return func;
	};
	proto.getGetterOfDateAndValue = function() {	//　　「１レコードからx:時刻（数値：ミリ秒）,y:Tat(数値：秒)を取得するutil」　を取得する
		var func = (function() { 
				function GetterOfDateAndValue(){ /* constructor */
						if(!(this instanceof GetterOfDateAndValue)) return new GetterOfDateAndValue();
	
						var c = HJN.chart.fileReader;
						this.confSEP = c.getValue("SEP");	// セパレータ
						
						this.confTIME_COL = c.getValue("TIME_COL") - 1 || 0;	// 時刻(X)のカラム位置
						this.confTIME_POS = (c.getValue("TIME_POS") || 1) - 1;	// 時刻(X)の先頭バイト位置
						this.confTIME_LEN = (c.getValue("TIME_LEN") || 0);		// 時刻(X)のバイト長
						this.confTIME_FORM = c.getValue("TIME_FORM");			// 時刻(X)の文字フォーマット指定
						this.confTIME_YMD = (c.getValue("TIME_YMD") || "YYYYMMDD hh.mm.ss.ppp");	// 時刻(X)の YMDフォーマット
						this.paseDateConf = {  // YYYYMMDD hh:mm:dd.ss.ppp
								YYYY: this.confTIME_YMD.indexOf("YYYY"),
								MM: this.confTIME_YMD.indexOf("MM"),
								DD: this.confTIME_YMD.indexOf("DD"),
								hh: this.confTIME_YMD.indexOf("hh"),
								mm: this.confTIME_YMD.indexOf("mm"),
								ss: this.confTIME_YMD.indexOf("ss"),
								ppp: this.confTIME_YMD.indexOf("p"),};
						this.isYMD = (this.confTIME_FORM === "TIME_FORM_YMD");
						// 時刻(X)の数値単位(1or1000,YMDのとき1)
						this.confTIME_UNIT = this.isYMD　? 1 : (c.getValue("TIME_UNIT") || 1);
						
						
						this.confTAT_COL = c.getValue("TAT_COL") - 1 || 1;		// 時間(Y)のカラム位置
						this.confTAT_POS = (c.getValue("TAT_POS") || 1) - 1;	// 時間(Y)の先頭バイト位置
						this.confTAT_LEN = (c.getValue("TAT_LEN") || 0);		// 時間(Y)のバイト長
						this.confTAT_FORM = c.getValue("TAT_FORM");				// 時間(Y)のフォーマット指定
						this.confTAT_UNIT = c.getValue("TAT_UNIT") || 1;		// 時間(Y)の数値単位(1/1000)
						this.confENDIAN =  c.getValue("ENDIAN"); // little endian: true、 big endian: false
						this.isLittle = (function(){
								var buf = new ArrayBuffer(4);				// long用に4バイト取得する
								new DataView(buf).setUint32(0, 1, true);	// true: bufに、リトルエンディアン指定で1を書き込む
								return (new Uint32Array(buf)[0] === 1);		// プラットフォームのエンディアンを使用するUint32Array　と比較する
							}());
						
						this.dateAndValue = {date: 0, value: 0, isError: false };
				}
				
				/* class method */
				// 日時をでパースして数値（ミリ秒）を取得する
				GetterOfDateAndValue.parseDate = function (str, conf){
					if(!str) {console.log("GetterOfDateAndValue.parseDate:no data cannot parse"); return 0; }
					conf = conf || {YYYY: 0, MM: 4, DD: 6, hh: 9, mm: 12, ss: 15, ppp: 18};  // YYYYMMDD hh:mm:dd.ss.ppp
					var y   = conf.YYYY < 0 ? 1970 : parseInt( str.substr( conf.YYYY, 4), 10),	// デフォルト1970年
						m   = conf.MM   < 0 ? 0 : parseInt( str.substr( conf.MM, 2), 10) - 1,	// デフォルト1月
						d   = conf.DD   < 0 ? 2				// 1970/1/1 だと時差でマイナスになることがあるのでデフォルトは2日 
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
				// 数字をパースして数値（ミリ秒）を取得する
				GetterOfDateAndValue.parseNumber = function (){ // str, unit, startPos, length
					var str = arguments[0],
						unit = arguments[1];
					if(!str) {console.log("data parse error"); return 0; }
					return +str * (unit || 1);
				};
				/* private */
				// Long(4バイトバイナリ）数字をパースして数値（ミリ秒）を取得する
				GetterOfDateAndValue.prototype._parseLong = function (arr){
					if (4 <= arr.length ) {	// Long(4byte)以上のときLongとして処理する
						// bufの先頭4byteを、指定バイトオーダ(endian)で、符号無32bit int(unsigned long)として参照する
						return (new DataView(arr.buffer, 0 , 4)).getUint32(0, this.confENDIAN);
					} else {	// Long(4バイト）より短いとき、Byte単位に処理する
						if (this.confENDIAN) {	// little endianのとき
							return arr.reduceRight(function(a, b){ return a*256 + b; });
						} else {	// big endianのとき
							return arr.reduce(function(a, b){ return a*256 + b; });
						}
					}
				};

				/* public */
				GetterOfDateAndValue.prototype.parse = function (line) {	// レコードからXとYを取得する
					// セパレータでカラム分割する
					var // err = {x: null, y: null, isError: true},
						// posMin = Math.min(this.confTIME_COL, this.confTAT_COL),
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
								x = GetterOfDateAndValue.parseDate(strX, this.paseDateConf);
							} else if (this.confTIME_FORM === "TIME_FORM_TEXT"){	// テキスト数字のユリウス経過時間のとき
								strX = String.fromCharCode.apply(null,arrX);
								x = GetterOfDateAndValue.parseNumber(strX);
							} else{	// this.confTIME_FORM === "TIME_FORM_LONG"	// longのユリウス経過時間のとき
								x = this._parseLong(arrX);
							}
							//　単位を補正する
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
								y = GetterOfDateAndValue.parseNumber(strY);
							} else{	// TAT_FORM_TEXT === "TAT_FORM_LONG"	// longのユリウス経過時間のとき
								y = this._parseLong(arrY);
							}
							//　単位を補正する
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
				
				return GetterOfDateAndValue;
			}());
		return func;
	};
	
	proto.getObjctById = function(id) {		// configに登録されているid(=prefix+key)の設定値を取得する
		return this._config.getObjctById(id);
	};
	proto.getValueByKey = function(key) {	// configに登録されているkey(prefix補填)の設定値を取得する
		return this._config.getValueByKey(key);
	};
	proto.getConfig = function() {	//　設定値を保有するオブジェクトを返却する
		return this._config._config;
	};
	proto.getConfigHtml = function() {	// HTML（config設定用）テキストを返却する
		return this._config.getHtml();
	};
	proto.getFunction = function(key) {	// keyの値に指定された関数（なければ何もしない関数）を返却する
		var cKey = this._config.getValueByKey(key);
		if(!this.__keyConfig[cKey] || !this.__keyConfig[cKey].func){
			return function(){};	// funcが定義されていないとき、何もしない関数を返却する
		}else{
			return this.__keyConfig[cKey].func;	// keyの設定値のfuncが定義されているとき
		}
	};
	proto.getValue = function(key) {	// keyの値に指定されたvalue（なければkey値）を返却する
		var cKey = this._config.getValueByKey(key);
		if(!this.__keyConfig[cKey] || this.__keyConfig[cKey].value === undefined){
			return cKey;	// valueが定義されていないとき、keyの設定値を返却
		}else{
			return this.__keyConfig[cKey].getValue();	// keyの設定値のvalueが定義されているとき
		}
	};

	
	/* new */
	return FileReader;
}());
