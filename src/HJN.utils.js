/** ie11 互換用  **/
if(!Uint8Array.prototype.indexOf){
	Uint8Array.prototype.indexOf = function(target,index){
        for(var i = index, last = index + 4096; i < last; i++){ // 暫定：1レコード4KBまでチェック
            if(this[i] === target) return i; 
        }
        return -1;
    }
}
// https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
if (!Array.prototype.findIndex) {
	Array.prototype.findIndex = function(predicate) {
		var list = Object(this), length = list.length >>> 0, thisArg = arguments[1], value;
		for (var i = 0; i < length; i++) {
			value = list[i];
			if (predicate.call(thisArg, value, i, list)) return i;
		}
		return -1;
	};
}
/** *****1*********2*********3*********4*********5*********6*********7****** **/


/** ************************************ 
 * HJN.utils
 * 	HNJのクラスメソッド群
 * ************************************ */

/** ************************************ 
 * 	初期表示用サンプルデータ(終了時刻のTAT（応答時間）時系列データ)を自動生成する
 * ************************************ */
HJN.CreateSampleTatLog = function(num, response, freq){
	HJN.ShowLogText("----- create data -----------------------------","calc");
	// 第一引数：	生成データ数（デフォルト:100、50*100*100)
	var num = num || 100*100; //50*100*100;
	// 第二引数：　 応答時間振れ幅（秒）（デフォルト:1500ミリ秒)
	var response = response || 200;
	// 第三引数:　データ発生頻度の目安（tps)(デオフォルト:20tps)
	var freq = freq || 5;
	// 戻り値：	終了時刻のTAT（応答時間）時系列データ
	//			[{x:終了時刻(JulianDayからの経過時間(秒)), y:レスポンス(秒)}]
	var eTat = [];

	var x = new Date(),
		d　= Math.floor(x.getTime()),
		y = 0.0;
	for (var i = 0; i < num; i++) {		// jsはミリ秒単位
		d += Math.round( Math.random() * 1000.0 / (2 * freq) *
							(1 + (0.5 * Math.cos(2 * Math.PI * i / num)))
						);	// 次の電文発生時刻を求める
		y  = Math.round( Math.random()*response * 1e+6 *
							(1 + (1.0 * Math.sin(2 * Math.PI * (i / num - 0.25))))
						) / 1e+6;
		eTat.push( {x: d , y: y, sTatIdx: 0} );
	}
	HJN.ShowLogText("got     " + eTat.length + " plots [tat/endT]","calc");
	return eTat;
}


/**  
 * HTMLから呼ばれるサンプル実装
 * @parm {string} chartName @default "chart"
 * 
 * @example 
 * window.addEventListener("DOMContentLoaded",function(eve){ HJN.ChartRegist("chart"); });
 */
HJN.ChartRegist = function(chartName){
	// 引数１　：デフォルトHJN.chartName("chart")
	HJN.chartName = chartName = chartName || HJN.chartName;
	var dropFieldName = chartName;	// ファイルドロップを受け付けるタグ名
	HJN.ShowLogTextInit();			// 処理時間計測の初期化

	// グラフの表示条件設定
	var CONC = { process: false, visiblity: false, renderer: 'area' },
		CTPS = { process: true,  visiblity: true,  renderer: 'scatterplot' },	// bar,scatterplot	
		STAT = { process: false, visiblity: false, renderer: 'scatterplot' },
		ETAT = { process: false, visiblity: false, renderer: 'scatterplot' },
		ETPS = { process: true,  visiblity: true,  renderer: 'line' },
		config = { SERIESES : [CONC, CTPS, STAT, ETAT, ETPS], 
						height : 0.40, isVisiblity: true };
	
	var CONC_D = { process: true, visiblity: true,  renderer: 'area' },
		CTPS_D = { process: true, visiblity: true,  renderer: 'bar' },	// bar,scatterplot
		STAT_D = { process: true, visiblity: true,  renderer: 'scatterplot' },
		ETAT_D = { process: true, visiblity: true,  renderer: 'scatterplot' },
		ETPS_D = { process: true, visiblity: false, renderer: 'line' },
		config_D = { SERIESES : [CONC_D, CTPS_D, STAT_D, ETAT_D, ETPS_D],
						height : 0.40, isVisiblity: true };

	// グラフのインスタンスを作成する
	HJN.chart = new HJN(chartName, config, "HJN.chart");
	HJN.chartD = new HJN(chartName + "Detail", config_D, "HJN.chartD");
	// ドロップフィールドに、処理を登録する(注：dygraphはイベントリスナーを登録しないとクリック時にエラーが出る）
	HJN.DropField(dropFieldName);
	HJN.DropField(dropFieldName+ "Detail");

	// 初期表示データを自動生成する
	var tatESeries = HJN.CreateSampleTatLog();	// arg0：生成データ数
	HJN.seriesSet　= HJN.chart.createSeries(tatESeries);

	// グラフを初期表示する
	// 上段
	HJN.chart.init();
	HJN.ShowLogText("上段表示", "elaps");		// 処理時間ログ出力

	// 下段(非同期）
	HJN.setZeroTimeout( function(){
		HJN.chartD.init( HJN.ChartRegistDetail( HJN.seriesSet[HJN.CTPS.N] ));
		HJN.chart.showBalloon();	// 上段のBalloonを描画する
		HJN.ShowLogText("下段表示", "elaps");
		HJN.ShowLogText("<mark>サンプルを表示しました</mark>", "msg");
	}　);
}


/** ************************************ 
 * HJN.DropField	CSVファイルのドロップ領域
 * ************************************ */
HJN.DropField = function (dropFieldName) {	// 第一引数　ファイルのドロップイベントを受けるフィールド名
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
}
/**  イベントで指定されたファイルを処理する  #15 **/
HJN.FileReader = function (files){
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
		        	textArray += HJN.DropField.topLines(HJN.filesArrayBuffer[HJN.filesIdx], 2);
	        		HJN.ShowLogTextInit();		// 情報表示　:　初期化
	        		HJN.ShowLogText(textArray, "msg");	// 情報表示　：　ドロップファイル情報
	        		/** 上段用データの展開とグラフ描画 **/
	        		// CSVファイルを上段用eTatに展開する[{x:, y:,pos:,len:},...]
	        		var tatESeries = HJN.DropField.getTatLogArray(HJN.filesArrayBuffer[HJN.filesIdx]);
	        		// eTatから上段用 時系列分析データ(seriesSet)を展開する
	        		HJN.seriesSet = HJN.chart.createSeries(tatESeries);
	        		// 上段グラフを描画する
	        		HJN.chart.update(HJN.seriesSet);
	    			HJN.ShowLogText("上段表示", "elaps");

	        		/** 下段用データの展開とグラフ描画（非同期処理） **/
	        		HJN.plots = [];
	        		HJN.setZeroTimeout(function(){
		        		// 下段用 時系列分析データ(seriesSet)を展開する
		        		var seriesSetDetail = HJN.ChartRegistDetail(
	        									HJN.seriesSet[HJN.CTPS.N] );
		        		// 下段グラフを描画する
	        			HJN.chartD.update(seriesSetDetail);
	        			// 上段のBalloonを描画する(上段update時にはplots登録されていないので、このタイミングで処理）
		        		HJN.chart.showBalloon();
		    			HJN.ShowLogText("下段表示", "elaps");
		    			HJN.ShowLogText("<BR><mark>"+ HJN.files[0].name +
		    					"["+ HJN.seriesSet[HJN.ETAT.N].length +
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
}

/**  指定ファイルの先頭ｎ行を、改行文字<BR>のテキストに変換してリターンする **/
HJN.DropField.topLines = function(data, n) {
	try{
		// 先頭から指定行数を取得（改行まで）
		var fileInfo = "";
		var buf = new Uint8Array(data);
		var top = last = 0;	// レコード先頭、末尾位置
		for (var i = 0; i < n; i++) {
			last = buf.indexOf(13, top);
			fileInfo += String.fromCharCode.apply(null,
					new Uint8Array(data, top, last - top)) + "<BR>";
			top = last + 1;
		}
	}catch (e) {
		alert("[HJN.DropField 改行コードの無いファイルは扱えません]");
		console.err(e);
	}
	return fileInfo;
}
/** CSVファイルを読み込み、TatLog用アレイ[{x:日時, y:値, pos:レコード開始位置, len:レコード長},...]に展開する **/
HJN.DropField.getTatLogArray　=　function(file) {	// arg0:csvﾌｧｲﾙのファイルﾊﾟｽ
	HJN.ShowLogText("----- read file -----------------------------","calc");
	var tatUnit = 1000.0;	// CSVのTATが秒単位のとき1000、ミリ秒単位の時1
	var eTat = [],
		separator = /,|\t/,		// 区切り文字（カンマ、タブ）を正規表現で指定
		buf = new Uint8Array(file),
		cols;
	// 先頭行の初期処理
	var	from　= 0,
		to = buf.indexOf(13, from),	// 改行コードまで
		len = to - from,
		line = "",
		d = 0,
		i = 0;	// timelog用
	// 以降最終行まで処理する
	while (to > 0) {
		try {	// 1024byteの範囲で日付、値を探す
			HJN.LogTime(i++, line);	// 一定時刻毎に進捗を出力する
			line = String.fromCharCode.apply(null, new Uint8Array(file, from, Math.min(len, 1024)));
			cols = line.split(separator);
			d = +parseDate(cols[0]);	// ミリ秒
			if(0 < d){ // CSVのTATの単位補正
				eTat.push( {x: d, y: parseFloat(cols[1]) * tatUnit,
					fileIdx: 0, pos: from, len: line.length, sTatIdx: 0} );
			}
		} catch (e) { /* 改行だけレコードをスキップ */ }
		from = to + 2;
		to = buf.indexOf(13, from);
		len = to - from;
	}
	// 最終行を処理する
	try {
		var line = String.fromCharCode.apply(null, 
						 new Uint8Array(file, from, buf.length - from));
		cols = line.split(separator);
		d = +parseDate(cols[0]);	// ミリ秒
		if(0 < d){ // CSVのTATの単位補正
			eTat.push( {x: d, y: parseFloat(cols[1]) * tatUnit,
				fileIdx: 0, pos: from, len: line.length, sTatIdx: 0} );
		}
	} catch (e) { /* 改行だけのレコードをスキップする */ }
	HJN.ShowLogText("[0:file readed & got eTat]---------------","calc");
	return eTat;
	
	// 文字列を時刻（ミリ秒）に変換（HJN.DropField.getTatLogArray内部関数）
	function parseDate(str){	// YYYYMMDD hh:mm:ss.ppp
		var y   = parseInt( str.substr( 0, 4), 10),
			m   = parseInt( str.substr( 4, 2), 10) - 1,
			d   = parseInt( str.substr( 6, 2), 10),
			h   = parseInt( str.substr( 9, 2), 10),
			min = parseInt( str.substr(12, 2), 10),
			sec = parseInt( str.substr(15, 2), 10),
			p   = ("0" + str.match(/\.[0-9]*/)[0]) * 1000.0,	// 秒以下のミリ秒
			dateNum = +(new Date( y, m, d, h, min, sec )) + p;	// #14
		return dateNum;
	}
}


/** ************************************ 
 * フォーマットした文字列を取得する 
 * ************************************ */
/** 日時(JS Date)から、指定フォーマットの文字列を得る **/
HJN.DateToString　=　function() {
	var dt = arguments[0],	// arg0: Date型（ミリ秒単位） 
		str = arguments[1];	// arg1: フォーマット ｙｙｙｙ-MM-dd hh:mm:ss.sss
	
	str = str.replace(/yyyy/, dt.getFullYear() );
	str = str.replace(/MM/, ('0' + (dt.getMonth() + 1) ).slice(-2) );
	str = str.replace(/dd/, ('0' + dt.getDate()).slice(-2) );
	str = str.replace(/hh/, ('0' + dt.getHours()).slice(-2) );
	str = str.replace(/mm/, ('0' + dt.getMinutes()).slice(-2) );
	str = str.replace(/sss/,('00' + Math.floor(dt % 1000)).slice(-3) );
	str = str.replace(/ss/, ('0' + dt.getSeconds()).slice(-2) );

	return str;
}
/** 日時(ミリ秒：Ｘ軸用）から、指定フォーマットの文字列を得る **/
HJN.D2S = function(ds, str){ // arg0: 日時(ミリ秒)の数値
	return HJN.DateToString(new Date(ds), str);
}
/** 数値(Ｙ軸用）から、誤差のない表示用文字列（数）を得る **/
HJN.N2S = function(y){ // arg0: Y軸の値
	return Intl.NumberFormat('en-IN').format(y);
}

/** ************************************ 
 * 詳細グラフ用　HJN.seriesSetDetail　設定関連機能
 * ************************************ */
/**  指定日時をFORMのslider Rangeに、設定する **/
HJN.SetSliderRange　=　function(date) {	// arg0: 日時（ミリ秒単位）
	HJN.detailDateTime = Math.floor(date / 1000) * 1000;	// 秒単位に丸める
}

/** 表示対象期間のcTpsから、eTps範囲を取得し、詳細Seriesを生成する **/
HJN.ChartRegistDetail = function(cTps){
	// CTPSの最大値となるplotを取得する
	var maxY =　Number.MIN_VALUE,
		maxYIdx = 0;
	cTps.forEach(function(c, i){
		if (maxY < c.y){
			maxY = c.y;
			maxYIdx = i;
		}
	});
	// slider rangeに、下段の表示時刻を設定する
	HJN.SetSliderRange(cTps[maxYIdx].x);
	// eTpsの範囲を取得し、詳細用seriesSetを設定する
	HJN.seriesSetDetail = HJN.chartD.createSeries( HJN.GetSliderRangedEtat() );
	// plotsアイコン用 HJN.plotsに、下段表示したplotを登録する
	HJN.PlotAdd(HJN.CTPS.N, cTps[maxYIdx].x, cTps[maxYIdx].y);
	HJN.ShowLogText("[6:Plot added] " + HJN.plots.length + " plots","calc");

	return HJN.seriesSetDetail;
}
/** sliderRangeで指定された範囲のeTatを返却する **/
HJN.GetSliderRangedEtat = function() {
	// 指定時刻（ｄｔ ±　range）を得る
	var tagInput =  document.getElementById("DetailTimeRange");
	HJN.detailDateTimeRange　= tagInput ? +tagInput.value : 1;	// 幅（秒）
	var dt = Math.floor(HJN.detailDateTime * 1000) / 1000,		// 中央時刻	// ミリ秒
		range =  HJN.detailDateTimeRange * 1000;	// 幅（ミリ秒）
	
	var eTatDetail = HJN.seriesSet[HJN.ETAT.N].tatMap.search(dt - range,　dt + 1000 * range);	// #18
	HJN.ShowLogText("[0:HJN.GetSliderRangedEtat] ","calc");
	
	return eTatDetail;	// 詳細グラフ用eTatを返却する
}


/** ************************************ 
 * HJN.plotsアイコン用　HJN.Plot設定関連機能
 * ************************************ */
/**  plotsクリック時の処理 **/
HJN.PointClickCallback = function(p) {
	HJN.ShowLogText("[0:PointClickCallback]start---------------","calc");
	var hover = HJN.hoverXY, // { x: , pts:, row:, seriesName: };
		n = HJN.seriesConfig.findIndex(function(e){	return e.key === p.name; }),
		x = p.xval,	// ミリ秒
		y = p.yval; // 秒
	// グラフの日時で、詳細グラフを再作成する
	HJN.SetSliderRange(x);
	HJN.ShowLogText("[0:PointClickCallback](n x y)=("+ n + " " + new Date(x) + " " + y + ")","calc");
	HJN.seriesSetDetail = HJN.chartD.createSeries( HJN.GetSliderRangedEtat() );
	//HJN.chartD.update(HJN.seriesSetDetail);	// 下段データを登録描画する
	HJN.chartD.graph.ready(function(){ HJN.chartD.update(HJN.seriesSetDetail); });
	// Hover表示しているplotを、HJN.plotsに登録し、plotsアイコンを再描画する
	HJN.PlotAdd(n, x, y);
	
	// Balloonを再描画する
	HJN.PlotShowBalloon();
}

/**  plotsダブルクリック時の処理（削除する） **/
HJN.PointDblClickCallback = function(p) {
	var n = HJN.seriesConfig.findIndex(function(e){	return e.key === p.name; }),
		x = p.xval,	// ミリ秒
		plots = [];

	// 指定plotを削除する
	for (var i = 0; i < HJN.plots.length; i++) {
		var e = HJN.plots[i];
		if( e.n !== n || e.x !== p.xval) plots.push(e);	// ミリ秒
	}
	HJN.plots = plots;
	HJN.PlotRender();
	// グラフ内の吹き出しを再表示する
	HJN.PlotShowBalloon();
}

/**  クリック時のHoverからHJN.plotsを設定する **/
HJN.PlotAdd　=　function(n, x, y) { // arg: HJN.hoverXY マウスクリック時の値
	// 各plotを非選択状態とする
	HJN.plots.forEach(function(e,i,a){e.radio = false;});
	// ラベルフォーマットの設定
	var format = (n === HJN.ETPS.N || n === HJN.CTPS.N) ? "hh:mm:ss" : "hh:mm:ss.sss";
	// plotを追加する
	var label = HJN.D2S(x, format) + " " +
				HJN.seriesConfig[n].label.replace("%N",HJN.N2S(y)),
		tagInput =  document.getElementById("DetailTimeRange"),
		range　= tagInput ? +tagInput.value : 1,	// 幅
		i = HJN.plots.findIndex(
				function(p){ return (p.n === n && p.x === x); });
	if(i < 0){ // 既存に無いとき追加する
		HJN.plots.push(	{label: label, ckBox:false,
						 radio:true, n: n, x: x, y: y, range: range });
		// CTPSのとき秒内最大CONCも追加する
		if (n === HJN.CTPS.N){
			var conc = HJN.chartD.seriesSet[HJN.CONC.N],	// PlotAddは下段集計後に呼ばれる
				i = binarySearch(x, conc, function(e){ return e.x; }),
				toX = x + 1000, // ミリ秒
				maxTime = 0,
				concMax = 0;
			for (; conc[i].x < toX; i++){
				if (concMax < conc[i].y){
					maxTime = conc[i].x;
					concMax = conc[i].y;
				}
			}
			if(x < maxTime){	// 補正すべき時刻が求まったときCONCを追加する
				n = HJN.CONC.N;
				x = maxTime;
				format = "hh:mm:ss.sss";
				label = HJN.D2S(x, format) + " " +
						HJN.seriesConfig[n].label.replace("%N",HJN.N2S(y)),
				HJN.plots.push(	{label: label, ckBox:false,
					 radio:true, n: n, x: x, y: y, range: range });
			}
		}

		HJN.plots.sort(
				function(a, b) { return a.x - b.x });
		i = HJN.plots.findIndex(
				function(p){ return(p.n === n && p.x === x); });
		
	}else{ // 既存Plotsにある時、選択状態とする
		var ckBox = HJN.plots[i].ckBox;
		HJN.plots.splice(i, 1,
				{label: label, ckBox: ckBox, 
				 radio:true, n: n, x: x, y: y, range: range });
	}
	HJN.PlotRender();
	return i;	//　plots内のplotの位置
	
	// 内部関数：配列二分木検索
	function binarySearch(val, arr, func, low, high) {
		func = func || function(val){ return val.valueOf(); };
		low = low || 0;
		high = high || arr.length - 1;
		var	middle;
		while( low <= high ){
			middle = Math.floor(low + high) / 2 | 0;
			valMiddle = func(arr[middle]);
			if(valMiddle === val) return middle;
			else if(val < valMiddle) high = middle - 1;
			else low = middle + 1;
		}
		return low; // 通常は-1だけど完全一致しない場合を想定
	}
}
/**  HJN.plotsを再表示する **/
HJN.PlotRender = function() {
	var divCheckedPlots =  document.getElementById(HJN.chartName + "Plots");
	// 既存のアイコンを削除する
	while (divCheckedPlots.firstChild){
		divCheckedPlots.removeChild(divCheckedPlots.firstChild);
	}

	var div = document.createElement('div');		// 要素の作成
	// 表示幅秒指定フィールドを追加する
	div.innerHTML = '±<input type="number" id="DetailTimeRange" min="0" step="1"' +
					'value="1" style="width:50px;　"  onchange="HJN.setDetailRange()">sec';

	// クリアボタンを追加する
	div.innerHTML +='<button id="clearButton" ' +
    				'onclick="HJN.PlotClear(' + "'baloonData'" + ')" ' +
    				'title="チェックもしは選択されていない時刻アイコンを削除します">clear</button>';
	divCheckedPlots.appendChild(div);
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
	HJN.plots[i].ckBox = document.getElementById("checkBox_"+i).checked
	// Balloonを再描画する
	HJN.PlotShowBalloon();
}
/**  radio選択時に下段グラフを更新する **/
HJN.PlotCheckRadio = function(i) {
	// HJN.plotsにradioの状態を反映する
	HJN.plots.forEach(function(e){ e.radio = false; });
	HJN.plots[i].radio = true;
	// グラフの日時で、詳細グラフを再作成する
	HJN.SetSliderRange(HJN.plots[i].x);	// 中心時刻に設定する
	document.getElementById("DetailTimeRange").value = HJN.plots[i].range;	// 幅を設定する
	HJN.seriesSetDetail = HJN.chartD.createSeries( HJN.GetSliderRangedEtat() );
	// 下段データを登録描画する
	HJN.chartD.update(HJN.seriesSetDetail);
	// Balloonを再描画する
	HJN.PlotShowBalloon();
}
/**  HJN.plotsをクリアし再表示する **/
HJN.PlotClear = function() {
	var plots = [];
	// checkboxにチェックのないplotを削除する
	HJN.plots.forEach( function(p){
			if(p.ckBox || p.radio) plots.push(p);
		});
	HJN.plots = plots;
	HJN.PlotRender();
	// グラフ内の吹き出しを再表示する
	HJN.PlotShowBalloon();
}
/** Balloonを再描画する **/
HJN.PlotShowBalloon =　function(){
	HJN.chart.showBalloon();
	HJN.chartD.showBalloon();
}


/** ************************************ 
 * slider range変更時に、Detailを再描画する
 * ************************************ */
HJN.setDetailRange = function(){
	clearTimeout(HJN.timer);
	HJN.timer = setTimeout(function(){
			// 下段データを登録する
			HJN.seriesSetDetail = HJN.chartD.createSeries( HJN.GetSliderRangedEtat() );
			// 下段グラフを描画する
			HJN.prototype.update.call(HJN.chartD, HJN.seriesSetDetail);
		}, 750);	// 750ms 値の変更がなかった時に、処理を開始する
}

/** ************************************ 
 * 非同期化 内部関数
	https://jsfiddle.net/kou/j73tLum4/8/
	https://gist.github.com/mathiasbynens/579895
	http://dbaron.org/log/20100309-faster-timeouts
 * ************************************ */
HJN.setZeroTimeout = (function(global) {
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
        return function (fn) { timeouts.push(fn); global.postMessage(messageName, "*"); }
    } 
    else {
    	return function () { setTimeout(fn, 0); } 
    }
}(window));


/** ************************************ 
 * テキスト領域関連
 * ************************************ */
/** 経過時間でログ出力する **/
HJN.LogTime　=　function(i, text) {
	var ts = new Date(),
		freq = 60000;	// 1分毎
	if (freq < ts - HJN.logtime){
		var t = HJN.DateToString(ts, "hh:mm:ss.sss");
		console.log(t + "[" + i + "]~~~~" + text);
		HJN.logtime = ts;
	}
}


/** ログテキストを初期化する **/
HJN.ShowLogTextInit　=　function() {
	HJN.timestamp = new Date();
	HJN.logText = [];
}
/** ログテキストをテキストアレイに追記し、表示する **/
HJN.ShowLogText　=　function(text, mode) {
	if (mode === "calc") return;	// 集計時評価用ログ出力抑止
	// "msg"指定のときは経過時間を取らずに、ログのみ出力する
	if (mode !== "msg"){
		// 処理時間情報を追加する
		var lastTimestamp = HJN.timestamp;
		HJN.timestamp = new Date();
		text = (Math.round( this.timestamp - lastTimestamp ) / 1000.0) + "s " + text;
		// 数値のカンマ編集（小数部もカンマが入る）
		text = text.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
		text = HJN.DateToString(HJN.timestamp, "hh:mm:ss.sss     ") + text;
	}
	HJN.logText.push(text);
	HJN.ShowText(HJN.logText);
	if(true) console.log(text);
}
/** 第一引数のテキストアレイの内容を#fileInfoのiframeに表示する **/
HJN.ShowText　=　function(textArray) {
	var iHtmlBody = "";
	for (var i = textArray.length - 1; 0 <= i; i--){
		iHtmlBody += textArray[i] + "<BR>" 
	}
	HJN.ShowIHtmlBody('fileInfo',　iHtmlBody);
}
/** 第一引数のID名のiframeに、第二引数のテキストを表示する **/
HJN.ShowIHtmlBody　=　function(elementId, iHtmlBody){
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
}

/** 第一引数のID名のiframeに、第二引数のテキストを表示する **/
HJN.Copyright　=　function(){
	str = 	"&copy; copyright 2017 Junichiroh Hirose\n" +
			"https://github.com/hirosejn/HJN"
	return str;
}

/** ************************************ 
 * 指定されたtextareaを使って、クリップボードにコピーする
 * ************************************ 
HJN.CopyToClipboard　= function(elementId)　{	// arg0:textareaのID名
	var area = document.getElementById(elementId);
    area.select();
    document.execCommand("copy");
} 
//詳細表示対象の元データ(eTat)をコピー用領域にテキストで出力する
HJN.GetSliderRangedEtatText = function(elementId) {
	// 開始メッセージを画面に設定する
	document.getElementById(elementId).value = "データの収集を開始しました しばらくお待ち下さい";
	// ブラウザに開始メッセージを描画させるために、集計処理は非同期でキックする
	HJN.setZeroTimeout(function(){
		// コピーデータを集計する
		var eTatDetail = HJN.seriesSetDetail[HJN.ETAT.N];
		var eTatCsv = "";
		if(0 < eTatDetail.length){
			if(typeof eTatDetail[0].pos === "undefined"){
				eTatDetail.forEach(function(e){
					eTatCsv +=  HJN.D2S(e.x, "yyyy/MM/dd hh:mm:ss.sss") +
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

/** ************************************ 
 * 期間指定eTat取得用Map　#18
 * @parm {array} eTat インデクスをつける対象の配列
 * @return {eTatMap} eTatMap 期間指定eTat取得用Map
 * ************************************ */
HJN.util.MappedETat = (function() {
	/* constructor */
	function MappedETat(eTat){
		if(!(this instanceof MappedETat)) return new MappedETat();
		// MappedArrayを作成する
		this._tatMap = new HJN.util.MappedArray(eTat, this._callback, true);
	}

	/* member */
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

	/* private */
	proto._row = function　(label, step) {　return label + step;　};

	/** MapKey取得関数 **/
	proto._callback = function　(e, i, arr) {		// MapedMap用Key配列関数
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
		for (i = e.step - 1; 0 < i; i--){
			proto._abscissa.push( {label: proto._row(e.label, i), ms: e.ms, i: i, 
									step: e.step, from: e.ms * i, to: e.ms * (i + 1)} );
		}
	}
	proto._abscissa.push( {label: proto._row(c[0].label, 0), ms: c[0].ms, i: 0,
							step: 0, from: 0, to: c[0].ms} );	//　先頭を末尾に追加

	
	/* public */

	// 指定期間に動いているeTatを検索する
	proto.search = function (from, to) {
		to = to || from;	// to省略時は時刻指定(from=to)
		var map = this._tatMap._map,
			eTat = this._tatMap._arr,
			abscissa = this._abscissa,
			eTatArr = [],
			start = end = 0;
		// 検索対象のBOX一覧を生成する
		abscissa.forEach(function(e){	// 存在しうる横軸のうち（tatが長時間の方から）
			if (map[e.label]){			// 横軸が存在するものについて
				var boxNum = e.i + (Math.ceil(to / e.ms) - 1) - Math.floor(from / e.ms),
					key = Math.floor(from / e.ms) * e.ms;
				for(var j = 0; j <= boxNum; j++){　	// 存在しうるKey値のうち（終了時間が早い方から）
					if (map[e.label][key]){			// Key値が存在し
//						console.log(e.label, e.i, key, map[e.label][key]);
						map[e.label][key].forEach(function(k,i){	// Keyが持っている要素(eTatへの参照:k)のうち
							start = eTat[k].x - eTat[k].y;
							end   = eTat[k].x;
							if((start <= to) && (from <= end)){		// from-toの期間に動いている要素(eTatのindex)を
//								console.log(i, k, eTat[k]);
								eTatArr = eTatArr.concat(eTat[k]);	// 戻り値の配列に追加する
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
	/* constructor */
	function MappedArray(arr, getKey, isMappedMap){
		if(!(this instanceof MappedArray)) return new MappedArray();
		this._arr = arr;
		// getKeyによりIndex作成関数を設定する
		if(!getKey || getKey === ""){
			// getKey指定がないとき、配列の値
			_callback = function(e){ return e.valueOf(); };
		}else if ( (toString.call(getKey) === toString.call("")) && (getKey !== "")){
			// getKeyが文字列のとき、配列内オブジェクトのgetKey要素の値
			_callback = function(e){ return e[getKey]; };
		}else if (toString.call(getKey) === toString.call(function(){}) ){
			// getKeyが関数のとき、配列内オブジェクトに関数を適用した戻り値
			_callback = getKey;
		}else{	// 以外のときエラーログを出力し、getKey指定なしと同様、配列の値
			console.err("MappedArrayの第二引数エラー：[ %o ]を無視します ",getKey);
			_callback = function(e){ return e.valueOf(); };
		}
		// MappedArrayを作成する
		if(!isMappedMap){
			this._createMappedArray();			
		}else{
			this._createMappedMappedArray();
		}
	}

	/* member */
	var proto = MappedArray.prototype = {
			_callback: undefined
		};

	/* private */
	proto._createMappedArray = function　() {
		var key = ""; 
		this._map = this._arr.reduce(function(m, a, i) {
			key = _callback.call(a, a, i, m);
			m[key] = (m[key] || []).concat(i);
			return m;
		}, {});
	};
	proto._createMappedMappedArray = function　() {
		var keys = [],
			key = "",
			mKey = "";
		this._map = this._arr.reduce(function(m, a, i) {
			keys = _callback.call(a, a, i, m);
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
