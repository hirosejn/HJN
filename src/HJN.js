/** *****1*********2*********3*********4*********5*********6*********7****** **/
/* ************************************ 
 * HJN
 * ************************************ */
"use strict";
/* クラス変数 */
HJN.ver = "v0.3.26";

HJN.util　= {};	//　utils登録変数
HJN.chart = HJN.chartD = null;
HJN.chartName = "chart";

HJN.detailDateTime = new Date();	// 下段表示時刻
HJN.detailDateTimeRange = 1.0;		// 下段表示範囲（秒）

HJN.files;
HJN.filesIdx = 0;
HJN.filesArrayBuffer = [];

HJN.CONC = 	{ key: 'conc', name:'多重度（詳細）',　label:'conc:%N',
		N:　0, scale:　0, color: 'rgba(  0,  0,127, 0.3)', renderer: 'area',
		tpsN: 1};	// #7							// mulitのとき area はseries内で１系列だけ
HJN.CTPS = 	{ key: 'cTps', name:'多重度（秒間最大）', label:'conc(max):%N',
		N:　1, scale:　0, color: 'rgba(  0,  0,127, 0.1)', renderer: 'scatterplot',
		detailN: 0};							// bar / scatterplot
HJN.STAT = 	{ key: 'sTat', name:'[Y2軸] start time',　label:'start:%Nms',
		N:　2, scale:　1, color: 'rgba(127, 127, 0, 0.3)', renderer: 'scatterplot' };
HJN.ETAT = 	{ key: 'eTat', name:'[Y2軸] end time',　label:'end:%Nms', 
		N:　3, scale:　1, color: 'rgba(127,  0,  0, 0.3)', renderer: 'scatterplot' };
HJN.ETPS = 	{ key: 'eTps', name:'[Y2軸] end trans / sec',　label:'end:%Ntps', 
		N:　4, scale:　1, color: 'rgba(  0, 127, 127, 0.3)', renderer: 'line' };


HJN.seriesConfig = [HJN.CONC, HJN.CTPS,	HJN.STAT, HJN.ETAT, HJN.ETPS];

HJN.hoverXY = { series: null, x: null, y: null };	// マウスクリック時の値取得用
HJN.hoverDetail = { dots: [{n:1,x:null,y:null}], args: null };
HJN.plots = []; //{	label:"", ckBox:true, radio:true, n:4, x:0, y:0, range:1};

HJN.timer = {};

HJN.logText = [];
HJN.timestamp = new Date();
HJN.logtime = new Date();

/* コンストラクタ */
function HJN(chartIdName, config, globalName) {
	/* メンバ変数 */
	this.seriesSet = [];
	this.chartIdName = chartIdName;		// arg0 "chart","chartDetail"
	if(!config) {						// arg1
		var CONC = { process: false, visiblity: true, renderer: 'area' },
			CTPS = { process: true,  visiblity: false,renderer: 'scatterplot' },　// bar,scatterplot
			STAT = { process: false, visiblity: true, renderer: 'scatterplot' },
			ETAT = { process: false, visiblity: true, renderer: 'scatterplot' },
			ETPS = { process: true,  visiblity: true, renderer: 'line' },
			config = { SERIESES: [CONC, CTPS, STAT, ETAT, ETPS],
						height: 0.35, isVisiblity: true };
	}
	this.globalName = globalName || "HJN.chartD";	// arg2

	// FileReaderを設定する
	this.fileReader = HJN.util.FileReader(); // #24

	// グラフ定義領域の宣言
	this.chartId = document.getElementById(this.chartIdName);
	this.logdata = document.getElementById("logdata");
	this.dyData = [];
	this.dySeries = {};

	this.scale　= [null, null];
	this.graph = null;

	// グラフの設定(処理対象データの設定のみ this.SERIESES[] に取り込む）
	this.SERIESES = [];
	this.labels = ['Date'];
	for (var i = 0, j = 0; i < config.SERIESES.length; i++){
		if (config.SERIESES[i].process === true) {
			this.SERIESES[j] = 
				{ key:'', name:'',　visiblity:false,
				  renderer:'', order:0, scale:0, color:'' };
			// 定数(HJN.seriesConfig)指定項目を設定する
			for (var attr in HJN.seriesConfig[i]){
				this.SERIESES[j][attr]= HJN.seriesConfig[i][attr];
			}
			// 引数(config)指定項目を設定する
			this.SERIESES[j]["visiblity"] = config.SERIESES[i].visiblity;

			var renderer = config.SERIESES[i].renderer;
			if (renderer === 'scatterplot' ) {
				this.dySeries[this.SERIESES[j].key] = {
						strokeWidth: 0.0,
						drawPoints: true };
			} else if (renderer === 'line' ) {
				this.dySeries[this.SERIESES[j].key] = {
						strokeWidth: 2.0,
						connectSeparatedPoints: true,
						stepPlot: true };
			} else if (renderer === 'area' ) {
				this.dySeries[this.SERIESES[j].key] = {
						strokeWidth: 0.0,
						stepPlot: true,
						fillGraph: true	};
			} else { // if (renderer === 'bar' ) {
				this.dySeries[this.SERIESES[j].key] = {
						strokeWidth: 0.0,
						connectSeparatedPoints: true,
						stepPlot: true,
						fillGraph: true };
			}
			this.dySeries[this.SERIESES[j].key]["color"] = this.SERIESES[j].color;

			
			if (this.SERIESES[j].scale === 1 ) {
				this.dySeries[this.SERIESES[j].key]["axis"] = 'y2';
			}			

			this.labels.push(this.SERIESES[j].key);
			j++;
		}
	}

	this.height   = config.height;
	this.isVisiblity = config.isVisiblity;
}

/* メソッド */

//第一引数： ETAT	
//戻り値：　	描画用時系列データ配列[CONC,　CTPS, STAT, ETAT, ETPS]
//
//4ETAT　終了時刻のTAT（応答時間）時系列データ	 
//	[{x:変化時刻(ms)	,y:レスポンス(sec), fileIdx:ファイル配列位置,
// 		 pos:レコード位置, len:レコード長, sTatIdx: sTatの配列位置　}]
//5ETPS　秒間終了件数の時系列データ
//	[{x:秒毎時刻(ms),	y:秒内終了件数 }]
//3STAT　開始時刻のTAT（応答時間）時系列データ
//	[{x:開始時刻(ms)	,y:レスポンス(sec), eTatIdx: eTatの配列位置　}]
//1CONC　多重度の時系列データ
//	[{x:変化時刻(ms)	,y:多重度数, sTatIdx:sTatの配列位置, eTatIdx: eTatの配列位置　}]
//2CTPS　秒間最大多重度の時系列データ
//	[{x:秒毎時刻(ms),	y:秒内最大多重度数, concFromIdx:該当concの先頭配列位置（末尾は次のcTpsから取得） ] 
/**  
 * eTat(終了時刻のTAT時系列データ)から、描画用時系列データ配列を作成する
 * @parm {array.<number,number,Uint8array>} eTat 終了時刻(ms),処理時間(sec),（任意）ログレコード等
 * @return {array} this.seriesSet グラフ用データ構造体
 */
HJN.prototype.createSeries =　function(eTat){
	// 時系列データを初期化する
	var cycle = 1000.0; // 処理件数を計測する間隔（ミリ秒）
	var conc = [], cTps = [], sTat = [], eTps = [];
	var seriesSet = [conc, cTps, sTat, eTat, eTps];	// 注）this.SERIESES と同じ順番にすること 
	// 集計対象データがないとき
	if(eTat.length === 0) return seriesSet;

	/** eTatをソートする **/
	// 開始時刻でソートする
	eTat.sort( function(a, b){ return a.x - b.x; } );
	HJN.ShowLogText("[1:eTat sorten ] " + eTat.length + " plots","calc");

	/** eTPS(時間あたり処理件数)時系列データを作成する **/
	var dFrom = Math.floor(eTat[0].x / cycle) * cycle,
		dTo = dFrom + cycle,
		num = 1;
	eTat.forEach (function(e, i, a) {
		if (e.x < dTo){
			num += 1;
		} else{
			eTps.push( { x: dFrom, y: num } );
			dFrom = Math.floor(e.x / cycle) * cycle;
			dTo = dFrom + cycle;
			num = 1;
		}
	});
	eTps.push( { x: dFrom, y: num } );
	HJN.ShowLogText("[3:eTps created] " + eTps.length + " plots","calc");

	
	/** sTat（開始時間）時系列データを作成する,同時に入力eTatを補正する **/
	// eTatからsTatを登録する
	eTat.forEach( function(e, i){
		// 処理時間=0 のとき、1マイクロ秒とみなす(有効桁0.2マイクロ秒に切上される）
		if(e.y === 0){ e.y = 0.001; e.x += e.y; }	// ミリ秒
		// sTatにeTatデータを登録する
		sTat.push( {x: e.x-e.y, y: e.y, eTatIdx:i} );
	} );
	// 開始時刻でソートする
	sTat.sort( function(a, b){ return a.x - b.x; } );
	// eTatにsTatの位置を設定する
	sTat.forEach( function(s, i, sTat){
		eTat[s.eTatIdx].sTatIdx = i;
	});
	HJN.ShowLogText("[2:sTat created] " + sTat.length + " plots","calc");
	
	
	/** CONC(多重度)時系列データを作成する **/
	// eTatから、多重度が変化した時刻の一覧を作成する
	eTat.map(function(e, i){
		// 開始時刻にカウントアップ情報を追加する
		conc.push( {x: e.x-e.y, y:  1, sTatIdx: e.sTatIdx ,eTatIdx: i} );
		// 終了時刻をカウントダウン情報を追加する
		conc.push( {x: e.x,     y: -1, sTatIdx: e.sTatIdx ,eTatIdx: i} );
	});
	// concを変化した時刻（開始or終了）でソートする
	conc.sort( function(a, b){ return a.x - b.x; } );
	HJN.ShowLogText("[4-1:conc/created&sorten ] "+ conc.length + " plots","calc");
	// concに同時取引数を設定する
	var concNum = 0;
	conc.forEach( function(c){
		concNum += c.y;		// 同時取引数を集計する(c.y に、開始なら1、終了なら(-1)が設定されている)
		c.y= concNum;
	} );
	HJN.ShowLogText("[4-2:conc/sum&set] "+ concNum + " ","calc");
	
	
	/** cTPS秒間同時処理件数（concurrent transactions/sec）時系列データを作成する #18　**/
	var	XSec =  floorTime(conc[0].x, cycle),	// ミリ秒
		YMax = conc[0].y,
		YNext = conc[0].y;
	conc.forEach( function(c, i, conc) {
		if( floorTime(c.x, cycle) === XSec ){	// c.xは ミリ秒
			YMax = Math.max(YMax, c.y);
		}else{
			cTps.push( {x: XSec, y: Math.max(YMax,YNext)} );
			for (var t = XSec + cycle; t < floorTime(c.x, cycle); t += cycle) { // c.xは ミリ秒
				cTps.push( {x: t, y: YNext} );
				if (YNext === 0) break;
			}
			XSec = floorTime(c.x, cycle);
			YMax = Math.max(YNext,　c.y);
		}
		YNext = c.y;
	} );
	cTps.push( { x: XSec, y: YMax} );
	cTps.push( { x: XSec + cycle, y: YNext} );

	HJN.ShowLogText("[5-1:cTps created] " + cTps.length + " plots","calc");

	// cTpsのxからindexを引くMapを作成する　#18
//	cTps.xMap = new HJN.util.MappedArray(cTps, "x");
	eTat.tatMap = new HJN.util.MappedETat(eTat);
	HJN.ShowLogText("[5-2:cTpsMap created] ","calc");

	// 集計結果を設定する
	this.seriesSet = seriesSet;
	return this.seriesSet; 
	
	// 時刻を指定ミリ秒間隔で切り捨てる（内部関数）
	function floorTime(t, cycle){
		return Math.floor(Math.floor(t / cycle) * cycle);
	}
}


//グラフを初期表示する
HJN.prototype.init =　function(seriesSet){
	seriesSet = seriesSet || this.seriesSet;
	
	// メニューを作成する
	this.addMenu();
	
	// 凡例を作成する
	if (this.isVisiblity) this.addLegend();

	// 既にグラフがあるときは削除する
	if (this.graph) this.graph.destroy();

	// 指定データを取り込む
	this.seriesSet = seriesSet;
	// データを表示する
	this.update(this.seriesSet);

	//ウィンドウ枠に合わせて描画領域をリサイズするイベントを登録し、リサイズする
	window.addEventListener("resize" , this.resize.bind(this) );
}


// ウィンドウ枠に合わせて描画領域をリサイズする（dygraphは幅は自動だが、高さは指定なので）
HJN.prototype.resize = function() {
	var height = Math.floor(window.innerHeight * this.height);
	this.chartId.setAttribute("style", "height:" + height + "px");
	return height;
}


// データを変更し描画する
HJN.prototype.update =　function(seriesSet){
	// 指定データがあるとき取り込む
	if(seriesSet) this.seriesSet　= seriesSet;
	// dygraph用表示データを作成する
	var xy = [],
		idx = [],
		x = [],
		row = [],
		minX = 0;
	// xy[] に処理対象seriesを指定する
	for (var i = 0; i < this.SERIESES.length; i++){
		xy[i] = this.seriesSet[this.SERIESES[i].N];
		idx[i] = 0;
	}
	// dygraph表示時間帯を設定する（上段グラフは全期間が処理対象）
	var xRangeMin = Number.MIN_VALUE,
		xRangeMax = Number.MAX_VALUE;
	if (HJN.chartD === this) {　// 詳細（下段グラフ）のとき画面で指定された期間を設定する	// ミリ秒
		xRangeMin = +HJN.detailDateTime - HJN.detailDateTimeRange * 1000,
		xRangeMax = +HJN.detailDateTime + ( HJN.detailDateTimeRange + 1.0 ) * 1000;
	}	
	
	// dygraph用arrayに表示データを登録する
	this.dyData = [];
	while ( xy.some(function(e, i){ return (idx[i] < e.length); }) ) {
		row = [];
		xy.forEach(function(e, i){
				x[i] = (idx[i] < e.length) ? e[idx[i]].x : Number.MAX_VALUE; });

		minX = x[0];	// minX = Math.min.apply(null, x);
		for (var i = 1; i < x.length; i++) {
			if (x[i] < minX) minX = x[i];
		}
		
		row.push(minX);	// ミリ秒
		xy.forEach(function(e, i, a){
			if (e.length <= idx[i]) {
				row.push(null);
			} else if (e[idx[i]].x === minX) {
				row.push(e[idx[i]].y);
				idx[i]++;
			} else {
				row.push(null);
			}
		});
		if (xRangeMin <= minX && minX <= xRangeMax) {
			this.dyData.push(row);
		}
	}
	HJN.ShowLogText("[7:dygraph data created] " + this.dyData.length + " rows","calc");

	// グラフの設定
	var visibility = [];
	if (this.isVisiblity) {
		// visiblity指定できるとき画面の表示指定を取り込む
		var	inputs =  document[this.chartIdName + "_LegendForm"];
		for (var i = 0; i < this.SERIESES.length; i++) {
			visibility.push(inputs[this.SERIESES[i].key].checked);
		}
	} else {
		// visiblity指定できないとき、デフォルト設定を取り込む
		for (var i = 0; i < this.SERIESES.length; i++) {
			visibility.push(this.SERIESES[i].visiblity);
		}
	}
	
	// グラフの作成
	if (this.graph){
		// 既にグラフがあるときはデータのみ変更する（注：ここでdestroy()すると下段のpointClickCallback時にエラー）
		this.graph.updateOptions({
			file: this.dyData 
		});
	}else{
		//　グラフが無いときは新規作成する
		this.graph = new Dygraph(
			this.chartId,
			this.dyData,
			{
				height: this.resize(),
				labels: this.labels,
				legend: 'always', //'follow', // 
				showLabelsOnHighlight: false,	// 効果不明
				labelsDiv: document.getElementById(HJN.chartName + 'Labels'),
				labelsSeparateLines: false,
				legendFormatter: this.legendFormatter,
				axes: {
					x: {axisLabelFormatter: axisLabelFormatter,
						axisLabelWidth: 100 },
					y: {axisLabelWidth: 30,
						logscale: false	},
					y2:{drawGrid: true,
						logscale: false,
						independentTicks: true,
						gridLinePattern: [1,2]	}
				},
				includeZero: true,
//				axisLabelFontSize: 10,
				axisLineColor: 'rgba(0, 0, 0, 0.2)',
				gridLineColor: 'rgba(0, 0, 0, 0.2)',
				strokeWidth: 2,
				pointSize: 3,
				// ylabel: 'Primary y-axis',
				y2label: this === HJN.chart ? '' : 'ms',
				// rollPeriod: 7,
				// errorBars: true,
				// showRangeSelector: true
				// drawPointCallback: drawPointCallback,
				drawHighlightPointCallback: drawHighlightPointCallback,
				highlightCircleSize: 3,
				highlightCallback: highlightCallback,
				pointClickCallback: pointClickCallback,
				annotationClickHandler: annotationClickHandler,
				annotationDblClickHandler: annotationDblClickHandler,
				// clickCallback: clickCallback,
				highlightSeriesOpts: {
					//	strokeWidth: 3,
					//	strokeBorderWidth: 1,
				//	highlightCircleSize: 5
				},
				series: this.dySeries,
				labelsKMB: true,
				visibility: visibility,
				connectSeparatedPoints: true
			}
		);
		this.graph.HJN = this;	// dygraphイベント処理でHJJを取れるように（注：循環参照）
	}

	// 初期表示の不活性グラフを設定
	function axisLabelFormatter(d, gran, opts) {
        return Dygraph.dateAxisLabelFormatter(new Date(d), gran, opts);
    }
	HJN.ShowLogText("[8:dygraph showen] ","calc");
	
	// 再描画する
	this.showBalloon();
	HJN.ShowLogText("[9:balloon showen] ","calc");
		
	
	/** updateメソッド内部関数宣言 **/
	// 点がハイライトになったときの描画処理（内部関数宣言）
	function　drawHighlightPointCallback(g, name, ctx, cx, cy, color, r, idx) {
		// file dropのとき、新グラフデータに更新後に、旧グラフのidx値が引き渡されたとき　処理しない #12
		if (!g.rawData_ || g.rawData_.length - 1 < idx) return;
		var	g = this,	// {dygraph} HJN.chartD.graph
			x = g.rawData_[idx][0],	// クリックした 点(CONC)のx　の値
			eTat = this.HJN.seriesSet[HJN.ETAT.N];

		// ETAT,STATのときlogレコードを表示する #28
		if (name === HJN.STAT.key || name === HJN.ETAT.key ) {
			// 終了時刻(eTatX)を求める
			if (name === HJN.STAT.key){	// STATのとき 終了時刻＝x:開始時刻＋y:処理時間
				var sTatColNo = this.layout_.setNames.findIndex(
						function(e,i){return e === HJN.STAT.key}) + 1,
					eTatX = x + g.rawData_[idx][sTatColNo];
			} else {					// ETATのときx:終了時刻
				var eTatX = x;
			}
			// 終了時刻(eTatX)からeTatの配列位置(n)を検索する
			var n = HJN.util.binarySearch(eTatX, eTat, 
						function(e){ return e.x; },	0, eTat.length - 1, true);
			// ログデータを表示する
			if(0 <= n){
				var e = eTat[n],
					logHtml = "";
				if(typeof e.pos === "undefined"){	// 生成データのとき
					// 生成データをCSVのログデータとして編集する
					logHtml =  HJN.D2S(e.x, "yyyy/MM/dd hh:mm:ss.ppp") + ",　" + e.y;
				}else{	// ファイル読込のとき
					// ファイルの該当行を Uint8Arrayに登録する
					var buff = new Uint8Array(e.len + 2),
						file = HJN.filesArrayBuffer[HJN.filesIdx];
					buff.set(new Uint8Array(file, e.pos,
						Math.min(e.len + 2, file.byteLength - e.pos)));
					// ログデータを編集する 
					logHtml = String.fromCharCode.apply(null, buff);
				}
				// ログデータを表示する
				logdata.innerHTML = logHtml;
			}
		}
		
		// CONCのとき同時処理の線を引く
		if (name === HJN.CONC.key ){	// #17
			// 指定時刻に動いているeTatの一覧(trans)を得る
			var trans = eTat.tatMap.search(x, x, 1000);	// #18
			// 以前に選択した線を消す
			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
			// 同時処理の線を引く
			var	tXs = 0,
				tXe = 0,
				tY  = 0;
			if ( 0 <= i && 0 < trans.length){
				// TRANS分の線を引く
				trans.forEach(function(e){
					tXs = g.toDomXCoord(e.x - e.y);	// ミリ秒
					tXe = g.toDomXCoord(e.x);	// ミリ秒
					tY  = g.toDomYCoord(e.y, 1);	//　第二軸:1
					drawLine(ctx, [{x: tXs, y: tY}, {x: tXe, y: tY}], r, HJN.CONC.color);
					drawPoint(ctx, tXs, tY, r, HJN.STAT.color);
					drawPoint(ctx, tXe, tY, r, HJN.ETAT.color);
				});
			}
			ctx.stroke();
		}

		// 選択点の点と数値を表示する
		var val = ( 0 <= idx && name ) ? g.rawData_[idx][g.setIndexByName_[name]] : '';
		drawPoint(ctx, cx, cy, r, color, val);
		// 縦線を引く
		drawLine(ctx, [{x: cx, y: 0}, {x: cx, y: ctx.canvas.height}],
					1, "rgba(127,127,127,0.5)", [1,2]);
		
		/** drawHighlightPointCallback 内部関数宣言 **/
		// 線を表示する（内部関数）
		function drawLine(ctx, plots, r, color, lineDashSegments) {
			ctx.beginPath();
			ctx.lineWidth = r;
			ctx.lineCap = "round";
			ctx.strokeStyle = color;
			if (lineDashSegments) ctx.setLineDash(lineDashSegments); // lineDashは[num]
			ctx.moveTo(plots[0].x, plots[0].y);
			plots.forEach(function(p,i){
				ctx.lineTo(p.x, p.y);
			});
			ctx.stroke();
		}

		// 点を表示する（内部関数）
		function drawPoint(ctx, cx, cy, r, color, text) {
			ctx.beginPath();
			ctx.strokeStyle = color;
			ctx.fillStyle = color;
			ctx.arc(cx, cy, r, 0, 2 * Math.PI, false);
			ctx.fill();
			ctx.stroke();
			if(text){
				text = Math.round(text * 10) / 10;
				ctx.beginPath();
				ctx.fillStyle = "rgba(0,0,0,1)";
				ctx.textAlign = "center";
				ctx.fillText(text, cx, cy - 12);
				ctx.stroke();
			}
		}
	}
	
	// 点がハイライトになったときの処理（内部関数宣言）
	function highlightCallback(e, x, pts, row, seriesName) {
		/** マウスクリック用に座標をHJN.hoverXYに退避する **/
		HJN.hoverXY = { x: x, pts:pts, row:row, seriesName: seriesName };
	}

	// 点をクリックしたときの処理(内部関数宣言）
	function pointClickCallback(event, p) {
		if (!p.annotation) HJN.PointClickCallback(p);
	}

	// アノテーション（グラフ中の吹出し）をクリックしたときの処理(内部関数宣言）
	function annotationClickHandler(annotation, p, dygraph, event){
		HJN.PointClickCallback(p);
	}

	// アノテーション（グラフ中の吹出し）をダブルクリックしたときの処理(内部関数宣言）
	function annotationDblClickHandler(annotation, p, dygraph, event){
		// 指定ポイントを削除する
		HJN.PointDblClickCallback(p);
	}

	// グラフをクリックしたときの処理(内部関数宣言）
	// function clickCallback(e, x, pts) {}
}


/** ************************************ 
 * Plots,Balloon,Legend関連機能
 * ************************************ */
// Balloonを再描画する
HJN.prototype.showBalloon =　function(){
	if (this.seriesSet[HJN.CTPS.N].length === 0) return;	// ctpsが空の時何もしない

	var ann = {	series: "", xval: 0, shortText: "", text: "" },
		anns = [];
	// 表示時間帯を求める
	var	ctps = this.seriesSet[HJN.CTPS.N],
		minX = ctps[0].x,
		maxX = ctps[ctps.length - 1].x;
	// アノテーションをdygparhに追加する
	HJN.plots.forEach(function(e, i){
		if(minX <= e.x && e.x <= maxX){
			ann = {	series: HJN.seriesConfig[e.n].key,
					xval: e.x,	// ミリ秒
					shortText: e.y, 
					text: e.label };
			anns.push(ann);
			// 詳細Plot＆詳細グラフデータが無いとき、詳細Plot内のTPS Plotを追加する	#7
			if("tpsPlot" in e){		// 詳細plotのとき
				if(this.SERIESES.findIndex(function(s,i){return s.N === e.n; }) < 0){	// 詳細グラフデータが無いとき
					ann = {	series: HJN.seriesConfig[e.tpsPlot.n].key,
							xval: e.tpsPlot.x,	// ミリ秒
							shortText: e.tpsPlot.y, 
							text: e.tpsPlot.label };
					anns.push(ann);
				}
			}
		}
	}, this);
	// dygraphの残描画処理が完了してからアノテーションをセットする
	this.graph.ready(function(){
		this.setAnnotations(anns);	
	});
}

//legendの表示指定をグラフに反映する
HJN.prototype.setVisibility =　function(i){
	var formName = this.chartIdName + "_LegendForm",
		ck = document[formName].elements[i].checked;
	this.graph.setVisibility(i, ck);
}


// legendを追加する
HJN.prototype.addLegend =　function(){
	var	divLegend =  document.getElementById(this.chartIdName + "_legend"),
		formName = this.chartIdName + "_LegendForm",
		htmlText = '<form name="' + formName + '">';
	for (var i = 0; i < this.SERIESES.length; i++) {
		var ckBox = this.SERIESES[i].visiblity ? 'checked="checked"' : '';
		htmlText +=	'<label class="legend" style="background:' + this.SERIESES[i].color + ';">' +
					'<input type="checkbox" ' +
					'name="' + this.SERIESES[i].key  + '"' +
					'onclick="' + this.globalName + '.setVisibility('+ i + ');" ' +
					ckBox + '>' +
					this.SERIESES[i].name + '</label><BR>';
	}
	htmlText += '</form>';
	divLegend.innerHTML = htmlText;
}
// legendの編集処理(dygraph登録処理用関数） 
HJN.prototype.legendFormatter　= function(data) {
	// legend: 'always'指定のとき、マウスがグラフ外にあると dataに値が設定されていなことを考慮
	var html = (typeof data.x === "undefined") 
				? ''
				: HJN.DateToString(new Date(data.xHTML), "yyyy/MM/dd hh:mm:ss.ppp");
	html = '<label class="datetime">' + html + '</label>';
	data.series.forEach(function(series) {
		if (!series.isVisible) return;
		var val = (typeof series.yHTML === "undefined") ? "" : series.yHTML,
			text = '<label ' + getStyle(series.label) + '">' +
				"&nbsp;" + series.labelHTML + ':' +
				('####' + val.replace(/\.[0-9]*/, "")).slice(-4).replace(/#/g, "&nbsp;") +
				'</label>';
		html += series.isHighlighted ? '<b>' + text + '</b>' : text;
		html += '&nbsp;';
	});
	return html;
	// keyに設定された色指定するstyle文字列を取得する（legendFormatter内部関数宣言）
	function getStyle(key){
		var i = HJN.seriesConfig.findIndex(function(e){	return (e.key === key);	});
		return 'style="background:' + HJN.seriesConfig[i].color + ';';
	}
}

/** ************************************ 
 * メニュー関連機能
 * ************************************ */
// メニューを追加する
HJN.prototype.addMenu =　function(){
	// メニュー用のエレメントを取得する
	var divMenuId = this.chartIdName + "_menu";
	var divMenu = document.getElementById(divMenuId);
	// menu用divがないとき、chartの直前に追加する　 #13
	if (!divMenu){
		var div = document.createElement('div');
		div.id = divMenuId;
		div.className = "menuBar";
	    divMenu = this.chartId.parentNode.insertBefore(div, this.chartId);
	}
	// メニューを追加する
	var	g = this.globalName,
		menuOpenCsv = {	// getInputTag
				menuLabel: 	"Open csv data file",
				funcName:	g + ".menuOpenCsv",
				menuId:		divMenuId + "_OpenCsv " },
		menuSaveConfig = {	// getATag
				menuLabel: 	"save config(.json)",
				funcName:	g + ".menuSaveConfig",
				menuId:		divMenuId + "_SaveCongig",
				fileName:	"hjnconfig.json" },
		menuLoadConfig = {	// getATag
				menuLabel: 	"load config(.json)",
				funcName:	g + ".menuLoadConfig",
				menuId:		divMenuId + "_LoadCongig",
				fileName:	"hjnconfig.json" },
		menuDownloadImg = {	// getATag
				menuLabel: 	"download graph image(.png)",
				funcName:	g + ".menuDownloadImg",
				menuId:		divMenuId + "_DownloadImg",
				fileName:	"graph.png" },
		menuDownloadCsv = {	// getATag
				menuLabel: 	"download graph data(.csv)", 
				funcName:	g + ".menuDownloadCsv",
				menuId:		divMenuId + "_DownloadCsv",
				fileName:	"graph.csv" },
		menuDownloadLog = {	// getATag
				menuLabel: 	"download graph log rows(.csv)",
				funcName:	g + ".menuDownloadLog",
				menuId:		divMenuId + "_DownloadLog",
				fileName:	"tatlog.csv" },
		menuDownloadConc = {	// getATag
				menuLabel: 	"download conc log rows(.csv)",
				funcName:	g + ".menuDownloadConc",
				menuId:		divMenuId + "_DownloadConc",
				fileName:	"conclog.csv" },
		menuHelpAbout = {	// getAlertTag
				menuLabel: 	"about TAT log diver",
				menuId:		divMenuId + "_HelpAbout",
				strFuncName:"HJN.Copyright()" };

	
	var accordion = document.createElement('div'),		// 要素の作成
		isAccordion = true,	// true:アコーディオン型  false:折りたたみ型 　#21
		typeStr = isAccordion 	? ' type="checkbox" name="accordion" '
								: ' type="radio" name="accordion" ',
		checkedStr = ' checked="checked" ';
	
	if (HJN.chart.chartId === this.chartId){	//　上段グラフ用機能のメニュー追加
		accordion.innerHTML =
			// File Menu
			'<li class="menu_lv1">' +
				'<label for="ac-' + this.chartIdName + '0">File</label>' +
				'<input id="ac-' + this.chartIdName + '0"' + typeStr + '>' +
				'<ul class="menu_lv2">' +
					'<li>' + getInputTag(menuOpenCsv) + '</li>' +
					'<li>' + getATag(menuSaveConfig) + '</li>' +
					'<li>' + getATag(menuLoadConfig) + '</li>' +
					this.fileReader.getConfigHtml() +	// #24
				'</ul>' +
			'</li>' +
			// Help Menu
			'<li class="menu_lv1">' +
				'<label for="ac-' + this.chartIdName + '3">Help</label>' +
				'<input id="ac-' + this.chartIdName + '3"' + typeStr + '>' +
				'<ul class="menu_lv2" style="width: 100%;">' +
				'<li>' + getAlertTag(menuHelpAbout) + '</li>' +
				'<li><a href="#">Child Menu</a></li>' +
				'</ul>' +
			'</li>' +
			// Download Menu
			'<li class="menu_lv1">' +
				'<label for="ac-' + this.chartIdName + '1">Download upper chart</label>' +
				'<input id="ac-' + this.chartIdName + '1"' + typeStr + '>' +
				'<ul class="menu_lv2">' +
					'<li>' + getATag(menuDownloadImg) + '</li>' +
					'<li>' + getATag(menuDownloadCsv) + '</li>' +
					'<li>' + getATag(menuDownloadLog) + '</li>' +
					'<li>' + getATag(menuDownloadConc) + '</li>' +
				'</ul>' +
			'</li>' +
			// View Menu
			'<li class="menu_lv1">' +
				'<label for="ac-' + this.chartIdName + '2">View ' + this.chartIdName + '</label>' +
				'<input id="ac-' + this.chartIdName + '2"' + typeStr + checkedStr + '>' +
				'<ul class="menu_lv2" style="background: rgba(255,255,255,0.5);">' +
					'<li><div id="' + this.chartIdName + '_legend"></div></li>' +
				'</ul>' +
			'</li>' ;
		divMenu.appendChild(accordion);

		// File Open用 イベントリスナー登録
		document.getElementById(menuOpenCsv.menuId)
				.addEventListener('change', this.menuOpenCsv.bind(this), false);
	}else{									// 下段用グラフ機能のメニュー追加
		accordion.innerHTML =
			// Download Menu
			'<li class="menu_lv1">' +
			'<label for="ac-' + this.chartIdName + '1">Download ' + this.chartIdName + '</label>' +
				'<input id="ac-' + this.chartIdName + '1"' + typeStr + '">' +
				'<ul class="menu_lv2">' +
					'<li>' + getATag(menuDownloadImg) + '</li>' +
					'<li>' + getATag(menuDownloadCsv) + '</li>' +
					'<li>' + getATag(menuDownloadLog) + '</li>' +
					'<li>' + getATag(menuDownloadConc) + '</li>' +
				'</ul>' +
			'</li>' +
			// View Menu
			'<li class="menu_lv1">' +
				'<label for="ac-' + this.chartIdName + '2">View ' + this.chartIdName + '</label>' +
				'<input id="ac-' + this.chartIdName + '2"' + typeStr + checkedStr + '">' +
				'<ul class="menu_lv2" style="background: rgba(255,255,255,0.5);">' +
					'<li><div id="' + this.chartIdName + '_legend"></div></li>' +
				'</ul>' +
			'</li>';
		divMenu.appendChild(accordion);
	}
	// File Open用<input>タグ編集（内部関数宣言）
	function getInputTag(arg){
		// '<a><label>Child Menu<input type="file" id="xxx" multiple /></label></a>
		return '' +
		'<a><label>' + arg.menuLabel +
		'<input type="file" id="'+ arg.menuId + '"  multiple />' + 
			'</label></a>';
	}
	
	// ダウンロード用<A>タグ編集（内部関数宣言）
	function getATag(arg){
		// '<a id="xxx" href="#">Child Menu</a>'
		return '' + 
		'<a id="' + arg.menuId + '" href="#" ' + //class="menuBar" ' + 
			'download="' + arg.fileName + '" ' +
			'onclick="' + arg.funcName + '(' + "'" + arg.menuId + "', '" +
													 arg.fileName + "'" +')" ' +
			'>' + arg.menuLabel + '</a>';
	}

	// Alert用<A>タグ編集（内部関数宣言）
	function getAlertTag(arg){
		// '<a id="xxx" onclick=Alert("xxx")>Child Menu</a>'
		return '' + 
		'<a id="' + arg.menuId + '"' +
			' onclick="alert(' + arg.strFuncName + ")" + '"' + '>'+
			'<label>' + arg.menuLabel + '</label></a>';
	}

}

//メニュー機能：CSVデータファイルを開く
HJN.prototype.menuOpenCsv =　function(evt){
	var file_list = evt.target.files;
    // 指定されたファイルを処理する
    HJN.FileReader(file_list);
}
//メニュー機能：画面設定をJSON形式のセーブファイルとしてダウンロードする
HJN.prototype.menuSaveConfig =　function(menuId, fileName){
	// plotsをjsonに変換する
	var json = JSON.stringify(HJN.plots);
	// ダウンロードする
	this.menuDownloadBlob(this.menuBuffToBlob(json), menuId, fileName);
}
//メニュー機能：JSON形式の画面設定ファイルをロードし画面表示に反映する
HJN.prototype.menuLoadConfig =　function(menuId, fileName){
	/** 未実装ここから **/
	var msg = "この機能は未実装です\r\画面の一部のHTMLがダウンロードされます" 
		alert(msg);
	// ファイルからjsonを読み込む
	var json = JSON.stringify(HJN.plots); // document.getElementById(textareaId).value
	/** 未実装ここまで **/
	// jsonテキストからHJN.plotsを作成する
	var plots = [],
		obj = JSON.parse(json);
	if( isSameType( [], obj) ){
		obj.forEach(function(e,i,a){
			if( isSameType( 0, e.x) ) plots.push(e);
		})
	}
	if( 0 < plots.length) HJN.plots = plots;
	HJN.PlotRender();
	// グラフ内の吹き出しを再表示する
	HJN.PlotShowBalloon();
	// 型判定
	function isSameType(sample, obj) {
	    var clas0 = Object.prototype.toString.call(sample),
	    	clas1 = Object.prototype.toString.call(obj);
	    return clas0 === clas1;
	}
}


//　メニュー機能：canvas画像をファイルとしてダウンロードする
HJN.prototype.menuDownloadImg =　function(menuId, fileName){
	var type = 'image/png';	
	// canvas から DataURL で画像を出力
	var canvas = this.chartId.getElementsByTagName('canvas')[0],
		dataurl = canvas.toDataURL(type);
	// DataURL のデータ部分を抜き出し、Base64からバイナリに変換
	var bin = atob(dataurl.split(',')[1]);
	// Uint8Array ビューに 1 バイトずつ値を埋める
	var buffer = new Uint8Array(bin.length);
	for (var i = 0; i < bin.length; i++) {
	  buffer[i] = bin.charCodeAt(i);
	}
	// Uint8Array ビューのバッファーを抜き出し、それを元に Blob を作る
	var blob = new Blob([buffer.buffer], {type: type});
	var url = window.URL.createObjectURL(blob);

	// ダウンロードする
	this.menuDownloadBlob(blob, menuId, fileName);
}

// メニュー機能：グラフ全データをCSVファイルとしてダウンロードする
HJN.prototype.menuDownloadCsv =　function(menuId, fileName){
	var bom = new Uint8Array([0xEF, 0xBB, 0xBF]),	// Excel対応UTF8のBOMコード指定
		csv = this.labels.join(',');					// csvヘッダ行の作成
	this.dyData.forEach(function(e){ csv += "\r\n" + e.join(',');	});	// csvデータ展開
    var blob = new Blob([ bom, csv ], { "type" : "text/csv" });　// blob変換
	// ダウンロードする
	this.menuDownloadBlob(blob, menuId, fileName);
}

//メニュー機能：グラフ全データの編集元に該当するTATログの該当行をCSVファイルとしてダウンロードする
HJN.prototype.menuDownloadLog =　function(menuId, fileName){
	var eTat = this.seriesSet[HJN.ETAT.N];
	if(0 < eTat.length){	// 出力対象データがあるとき
		if(typeof eTat[0].pos === "undefined"){	// 生成データのとき
			// 生成データをCSVに編集する
			var eTatCsv = "";
			eTat.forEach(function(e){
				eTatCsv +=  HJN.D2S(e.x, "yyyy/MM/dd hh:mm:ss.ppp") +
							"," + e.y + "\r\n"; 
			});
			// ダウンロードする
			this.menuDownloadBlob(this.menuBuffToBlob(eTatCsv), menuId, fileName);
		}else{	// ファイル読込のとき
			// 最大作業領域として元ファイルサイズ分のメモリを確保する
			var buff = new Uint8Array(HJN.filesArrayBuffer[HJN.filesIdx].byteLength),
				offset = 0;
			// ファイルの該当行を Uint8Arrayに登録する
			eTat.forEach(function(e){
				buff.set(new Uint8Array(HJN.filesArrayBuffer[HJN.filesIdx], e.pos,
					Math.min(e.len + 2, HJN.filesArrayBuffer[HJN.filesIdx].byteLength - e.pos)),
					offset);
				offset += (e.len + 2);
			});
			// 未使用作業領域を削除する
			var buff2 = new Uint8Array(buff.slice(0, offset)); 
			// ダウンロードする
			this.menuDownloadBlob(this.menuBuffToBlob(buff2), menuId, fileName);
		}
	}else{	// 出力対象データがないとき
		var str = "No log in the time.";
		// ダウンロードする
		this.menuDownloadBlob(this.menuBuffToBlob(str), menuId, fileName);
	}
}

//メニュー機能：plotsでconcが選択されているとき、同時処理に該当するTATログの該当行をCSVファイルとしてダウンロードする
HJN.prototype.menuDownloadConc =　function(menuId, fileName){
	var plot = HJN.plots.find(function(e){return e.radio});
	if (plot.n === HJN.CONC.N || plot.n === HJN.STAT.N || plot.n === HJN.ETAT.N) {	// CONC|STAT|ETATが選択されているとき
		var	conc = HJN.seriesSet[HJN.CONC.N];
		var trans = this.seriesSet[HJN.ETAT.N].tatMap.search(plot.x);	// #18
		
		if ( 0 <= i && 0 < trans.length){	// 出力テキストを編集する
			if(typeof trans[0].pos === "undefined"){
				// 初期表示データのとき、CSVを編集する
				// 生成データをCSVに編集する
				var csv = "";
				trans.forEach(function(e){
					csv +=  HJN.D2S(e.x, "yyyy/MM/dd hh:mm:ss.ppp") +
								"," + e.y + "\r\n"; 
				});
				// ダウンロードする
				this.menuDownloadBlob(this.menuBuffToBlob(csv), menuId, fileName);
			}else{
				// ファイル読み込みの時、対象レコードを表示する
				// 最大作業領域として元ファイルサイズ分のメモリを確保する
				var buff = new Uint8Array(HJN.filesArrayBuffer[HJN.filesIdx].byteLength),
					offset = 0;
				// ファイルの該当行を Uint8Arrayに登録する
				trans.forEach(function(e){
					buff.set(new Uint8Array(HJN.filesArrayBuffer[HJN.filesIdx], e.pos,
									Math.min(e.len + 2,
											HJN.filesArrayBuffer[HJN.filesIdx].byteLength - e.pos)),
									offset);
					offset += (e.len + 2);
				});
				// 未使用作業領域を削除する
				var buff2 = new Uint8Array(buff.slice(0, offset));
				// ダウンロードする
				this.menuDownloadBlob(this.menuBuffToBlob(buff2), menuId, fileName);
			}
		}

		
	} else {	// CONCが選択されていないとき
		var msg = "抽出対象データがありません。空データがダウンロードされます\r\n" +
					"conc：多重度（詳細）の点を選択した状態で行ってください";
		alert(msg);
		this.menuDownloadBlob(this.menuBuffToBlob(msg), menuId, fileName);
	}
}


//メニュー共通機能：BinaryString, UintXXArray, ArrayBuffer をBlobに変換する
HJN.prototype.menuBuffToBlob =　function(arrayBuffer){
	return new Blob([arrayBuffer], {type: "application/octet-stream"});
}

// メニュー共通機能：指定blobをファイルとしてダウンロードする
HJN.prototype.menuDownloadBlob =　function(blob, menuId, fileName){
    if (window.navigator.msSaveBlob) {	// ie11以降のとき
        window.navigator.msSaveBlob(blob, fileName); 
        // msSaveOrOpenBlobの場合はファイルを保存せずに開ける
        window.navigator.msSaveOrOpenBlob(blob, fileName); 
    } else {	// Chrome, FireFoxのとき
        document.getElementById(menuId).href = window.URL.createObjectURL(blob);
    }
}