/*
 TODO:	
		
済
	
*/
/** *****1*********2*********3*********4*********5*********6*********7****** **/


/* ************************************ 
 * HJN
 * ************************************ */
"use strict";
/* クラス変数 */
HJN.chart = HJN.chartD = null;
HJN.hoverXY = { x: null, pts:null, row:null, seriesName: null };	// マウスクリック時の値取得用

HJN.detailDateTime = new Date();	// 下段表示時刻
HJN.detailDateTimeRange = 1.0;		// 下段表示範囲（秒）

HJN.file;

HJN.ETPS = 	{ key: 'eTps', name:'end time, tps',　label:'end:%Ntps', 
	N:　0, scale:　0, color: 'rgba(127,127,  0, 0.1)', renderer: 'line' };
HJN.ETAT = 	{ key: 'eTat', name:'[Y2軸] end time, tat',　label:'%Nms', 
	N:　1, scale:　1, color: 'rgba(127,  0,  0, 0.3)', renderer: 'scatterplot' };
HJN.STAT = 	{ key: 'sTat', name:'[Y2軸] start time, tat',　label:'start:%Nms',
	N:　2, scale:　1, color: 'rgba(127, 127, 0, 0.3)', renderer: 'scatterplot' };
HJN.CONC = 	{ key: 'conc', name:'多重度（詳細）',　label:'conc:%N',
	N:　3, scale:　0, color: 'rgba(  0,  0,127, 0.3)', renderer: 'area' };
									// mulitのとき area はseries内で１系列だけ
HJN.CTPS = 	{ key: 'cTps', name:'多重度（秒間最大）', label:'conc(max):%N',
	N:　4, scale:　0, color: 'rgba(  0,  0,127, 0.1)', renderer: 'scatterplot' };	
									// bar / scatterplot

HJN.seriesConfig = [HJN.ETPS, 
					HJN.ETAT,
					HJN.STAT,
					HJN.CONC,
					HJN.CTPS];

HJN.hoverXY = { series: null, x: null, y: null };	// マウスクリック時の値取得用
HJN.hoverDetail = { dots: [{n:1,x:null,y:null}], args: null };
HJN.plots = []; //{	label:"", ckBox:true, radio:true, n:4, x:0, y:0, range:1};

HJN.logText = [];
HJN.timestamp = new Date();

/* コンストラクタ */
function HJN(chartIdName, config, globalName) {
	/* メンバ変数 */
	this.seriesSet = [];
	this.chartIdName = chartIdName;		// arg0
	if(!config) {						// arg1
		var ETPS = { process: true,  visiblity: true, renderer: 'line' },
			ETAT = { process: false, visiblity: true, renderer: 'scatterplot' },
			STAT = { process: false, visiblity: true, renderer: 'scatterplot' },
			CONC = { process: false, visiblity: true, renderer: 'area' },
			CTPS = { process: true,  visiblity: false,renderer: 'scatterplot' },	// bar,scatterplot
			config = { 	SERIESES : [ETPS, ETAT, STAT, CONC, CTPS], 
						height : 0.35, isLegend: true };
	}
	this.globalName = globalName || "HJN.chartD";	// arg2
	
	// グラフ定義領域の宣言
	this.chartId = document.getElementById(this.chartIdName);
	this.dyData = [];

	this.scale　= [null, null];
	this.graph = null; //this.y_ticks = this.axes =	this.slider = this.detail = null;
//	this.legend = this.highlighter = this.toggle = null;

	// グラフの設定(処理対象データの設定のみ this.SERIESES[] に取り込む）
	this.SERIESES = [];
	this.labels = ['Date'];
	this.dySeries = {};
	for (var i = 0, j = 0; i < config.SERIESES.length; i++){
		if (config.SERIESES[i].process === true) {
			this.SERIESES[j] = 
				{ key:'', name:'',　visiblity:false, renderer:'', order:0, scale:0, color:'' };
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
	this.isLegend = config.isLegend;
}

/* メソッド */

// グラフを初期表示する
HJN.prototype.init =　function(seriesSet){
	// 凡例を作成する
	if (this.isLegend) {
		var	divLegend =  document.getElementById(this.chartIdName + "_legend"),
			formName = this.chartIdName + "_LegendForm",
			htmlText = '<form name="' + formName + '">';
		for (var i = 0; i < this.SERIESES.length; i++) {
			var ckBox = this.SERIESES[i].visiblity ? 'checked="checked"' : '';
			htmlText += '<input type="checkbox" ' +
					'onclick="' + this.globalName + '.setVisibility('+ i + ');" ' +
					ckBox + '>' +
					'<label style="background:' + this.SERIESES[i].color + ';">' +
					this.SERIESES[i].name + '</label><BR>';
		}
		htmlText += '</form>';
		divLegend.innerHTML = htmlText;
	}

	// グラフを表示する
	this.update(seriesSet);
	
	//ウィンドウ枠に合わせて描画領域をリサイズするイベントを登録し、リサイズする
	window.addEventListener("resize" , this.resize.bind(this) );
}


//ウィンドウ枠に合わせて描画領域をリサイズする
HJN.prototype.resize = function() {
	var height = Math.floor(window.innerHeight * this.height);
	this.chartId.setAttribute("style", "height:" + height + "px");
	return height;
}


// データを変更し描画する
HJN.prototype.update =　function(){
	this.seriesSet = arguments[0];

	// dygraph用表示データを作成する
	var xy = [],
		idx = [],
		x = [],
		row = [],
		minX = 0;
	// xy[] に処理対象データ配列を指定する
	for (var i = 0; i < this.SERIESES.length; i++){
		xy[i] = this.seriesSet[this.SERIESES[i].N];
		idx[i] = 0;
	}
	// dygraph表示時間帯を設定する
	var xRangeMin = Number.MIN_VALUE,
		xRangeMax = Number.MAX_VALUE;
	if (HJN.chartD === this) {　// 詳細のとき	
		xRangeMin = +HJN.detailDateTime / 1000.0 - HJN.detailDateTimeRange,
		xRangeMax = +HJN.detailDateTime / 1000.0 + HJN.detailDateTimeRange + 1.0;
	}	
	
	// dygraph用arrayに表示データを登録する
	this.dyData = [];
	while ( xy.some(function(e, i){ return (idx[i] < e.length); }) ) {
		row = [];
		xy.forEach(function(e, i){
				x[i] = (idx[i] < e.length) ? e[idx[i]].x : Number.MAX_VALUE; });
		minX = Math.min.apply(null, x);
		row.push(minX * 1000.0);
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

	// グラフの設定
	var visibility = [];
	for (var i = 0; i < this.SERIESES.length; i++) {
			visibility.push(this.SERIESES[i].visiblity);
	}

	// グラフの作成
	if (this.graph) this.graph.destroy();
	this.graph = new Dygraph(
			this.chartId,
			this.dyData,
			{
				height: this.resize(),
				labels: this.labels,
				legend: 'always', //'follow', // 
				labelsDiv: document.getElementById('chart_labels'),
				labelsSeparateLines: false,
				legendFormatter: legendFormatter,
				axes: {
					x: {axisLabelFormatter: axisLabelFormatter,
						axisLabelWidth: 80 },
					y: {axisLabelWidth: 20 }
				},
				includeZero: true,
				axisLabelFontSize: 10,
				axisLineColor: 'rgba(0, 0, 0, 0.2)',
				gridLineColor: 'rgba(0, 0, 0, 0.2)',
				strokeWidth: 2,
				pointSize: 3,
				// ylabel: 'Primary y-axis',
				y2label: 'ms',
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
				visibility: visibility,
				connectSeparatedPoints: true
			}
		);

	// 初期表示の不活性グラフを設定
	function axisLabelFormatter(d, gran, opts) {
        return Dygraph.dateAxisLabelFormatter(new Date(d), gran, opts);
    }
	
	// 再描画する
	//this.resize();
	this.showBaloon();
		
	
	/** updateメソッド内部関数宣言 **/
	// legendの編集処理(内部関数宣言） 
	function legendFormatter(data) {
		// legend: 'always'指定のとき、マウスがグラフ外にあると dataに値が設定されていなことを考慮
		var html = (typeof data.x === "undefined") 
					? '&ensp;'.repeat(30)
					: HJN.DateToString(new Date(data.xHTML),
						"yyyy/MM/dd hh:mm:ss.sss") + '&emsp;';
		data.series.forEach(function(series) {
			if (!series.isVisible) return;
			var val = (typeof series.yHTML === "undefined") ? "" : series.yHTML,
				text = '<label ' + getStyle(series.label) + '">&thinsp;' +
					series.labelHTML + ':' +
					('#'.repeat(4) + val).slice(-4).replace(/#/g, "&nbsp;") +
					'&thinsp;</label>';
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

	
	//　x軸のラベル文字列編集処理（内部関数宣言）
	//
	
	// 点の描画処理（内部関数宣言）
	// function　drawPointCallback(g, name, ctx, cx, cy, color, radius) {}

	// 点がハイライトになったときの描画処理（内部関数宣言）
	function　drawHighlightPointCallback(g, name, ctx, cx, cy, color, r, idx) {
		// CONCのとき、TRANSの線を引く
		if (name === HJN.CONC.key ) {
			// 以前に選択した線を消す
			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);	// TODO:上段の点まで消えてしまう

			// 線を引く
			var	conc = HJN.chartD.seriesSet[HJN.CONC.N],
				g = this,	// chart
				i = conc.findIndex(function(e,i){	// 画像位置となるxをキーにconc配列位置を取得する
					return( 1e-9 > Math.abs(g.toDomXCoord(1000.0 * e.x) - cx))
					//	return( 1e-2 > Math.abs(e.x * 1000.0 - g.rawData_[i][g.setIndexByName_[HJN.CONC.key]]));
					  } ),
				trans = conc[i].trans,
				tXs = 0,
				tXe = 0,
				tY  = 0;
			if ( 0 <= i && 0 < trans.length){
				// TRANS分の線を引く
				trans.forEach(function(e){
					tXs = g.toDomXCoord(1000.0 * (e.x - e.y));
					tXe = g.toDomXCoord(1000.0 * e.x);
					tY  = g.toDomYCoord(e.y, 1);	//　第二軸:1
					drawLine(ctx, [{x: tXs, y: tY}, {x: tXe, y: tY}], r, color);
					drawPoint(ctx, tXs, tY, r, HJN.STAT.color);
					drawPoint(ctx, tXe, tY, r, HJN.ETAT.color);
				});
			}
			ctx.stroke();
		}
		// 選択点を表示する
		drawPoint(ctx, cx, cy, r, color, g.rawData_[idx][g.setIndexByName_[name]]);
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
			// ctx.fillStyle = color;
			// ctx.fillRect(tXs, tY-2, tXe-tXs, 4);
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


 

// Baloonを再描画する
HJN.prototype.showBaloon =　function(){
	var ann = {	series: "", xval: 0, shortText: "", text: "" },
		anns = [];
	
	var	ctps = this.seriesSet[HJN.CTPS.N],
		minX = ctps[0].x,
		maxX = ctps[ctps.length - 1].x;
	HJN.plots.forEach(function(e, i){
		if(minX <= e.x && e.x <= maxX){
			ann = {	series: HJN.seriesConfig[e.n].key,
					xval: e.x * 1000.0,
					shortText: e.y, 
					text: e.label };
			anns.push(ann);
		}
	});
	this.graph.setAnnotations(anns);
}

//legendの表示指定をグラフに反映する
HJN.prototype.setVisibility =　function(i){
	var formName = this.chartIdName + "_LegendForm",
		ck = document[formName].elements[i].checked;
	this.graph.setVisibility(i, ck);
}
