/*
 TODO:	
		
済
	
*/
/** *****1*********2*********3*********4*********5*********6*********7****** **/


/* ************************************ 
 * HJNdy
 * ************************************ */
"use strict";
/* クラス変数 */
HJNdy.chart = HJNdy.chartD = null;
HJNdy.hoverXY = { x: null, pts:null, row:null, seriesName: null };	// マウスクリック時の値取得用

/* コンストラクタ */
function HJNdy(chartIdName, config) {
	/* メンバ変数 */
	this.seriesSet = [];
	this.chartIdName = chartIdName;		// arg0
	if(!config) {						// arg1
		var ETPS = { process: true,  disabled: true, renderer: 'line' },
			ETAT = { process: false, disabled: true, renderer: 'scatterplot' },
			STAT = { process: false, disabled: true, renderer: 'scatterplot' },
			CONC = { process: false, disabled: true, renderer: 'area' },
			CTPS = { process: true,  disabled: false,renderer: 'scatterplot' };	// bar,scatterplot
		config = { 	SERIESES : [ETPS, ETAT, STAT, CONC, CTPS], height : 0.35,
					isSlider: true, isLegend: true,
					isHover : true, isHoverDetail: true }
	}
	
	// グラフ定義領域の宣言
	this.chartId = document.getElementById(this.chartIdName);
	this.dyData = [];

	this.scale　= [null, null];
	this.graph = null; //this.y_ticks = this.axes =	this.slider = this.detail = null;
//	this.legend = this.highlighter = this.toggle = null;

	// グラフの設定(処理対象データの設定のみ this.SERIESES[] に取り込む）
	this.SERIESES = [];
	this.labels = ['Date'];
	this.series = {};
	for (var i = 0, j = 0; i < config.SERIESES.length; i++){
		if (config.SERIESES[i].process === true) {
			this.SERIESES[j] = 
				{ key:'', name:'',　renderer:'',	order:0, scale:0, color:'' };
			for (var attr in HJN.seriesConfig[i]){
				this.SERIESES[j][attr]= HJN.seriesConfig[i][attr];
			}
			this.SERIESES[j]["disabled"] = config.SERIESES[i].disabled;

			var renderer = config.SERIESES[i].renderer;
			if (renderer === 'scatterplot' ) {
				this.series[this.SERIESES[j].key] = {
						strokeWidth: 0.0,
						drawPoints: true };
			} else if (renderer === 'line' ) {
				this.series[this.SERIESES[j].key] = {
						strokeWidth: 2.0,
						connectSeparatedPoints: true,
						stepPlot: true };
			} else if (renderer === 'area' ) {
				this.series[this.SERIESES[j].key] = {
						strokeWidth: 0.0,
						stepPlot: true,
						fillGraph: true	};
			} else { // if (renderer === 'bar' ) {
				this.series[this.SERIESES[j].key] = {
						strokeWidth: 0.0,
						connectSeparatedPoints: true,
						stepPlot: true,
						fillGraph: true };
			}
			this.series[this.SERIESES[j].key]["color"] = this.SERIESES[j].color;

			
			if (this.SERIESES[j].scale === 1 ) {
				this.series[this.SERIESES[j].key]["axis"] = 'y2';
			}			

			this.labels.push(this.SERIESES[j].key);
			j++;
		}
	}

//	this.isYAxis  = true;
//	this.isXAxis  = true;
	this.height   = config.height;
	this.isSlider = config.isSlider;
	this.isLegend = config.isLegend;
	this.isHover  = config.isHover;
	this.isHoverDetail = config.isHoverDetail;
}

/* メソッド */

// グラフを初期表示する
HJNdy.prototype.init =　function(seriesSet){
	this.update(seriesSet);
}


//ウィンドウ枠に合わせて描画領域をリサイズする
HJNdy.prototype.resize = function() {}


// データを変更し描画する
HJNdy.prototype.update =　function(){
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
	// dygraph用arrayに表示データを登録する
	this.dyData = [];
	while ( xy.some(function(e, i){ return (idx[i] < e.length); }) ) {
		row = [];
		xy.forEach(function(e, i){
				x[i] = (idx[i] < e.length) ? e[idx[i]].x : Number.MAX_VALUE; });
		minX = Math.min.apply(null, x);
		row.push(new Date(minX * 1000));
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
		this.dyData.push(row);
	}

	
	// Y軸のスケールの設定


	// グラフの設定
	var series = [];
	var c =  this.SERIESES[0];
	for (var i = 0; i < this.SERIESES.length; i++) {
		c = this.SERIESES[i];
		series.push( {
			n: c.N,
			name: c.name,
			scale: this.scale[c.scale],
			renderer: c.renderer,
			color: c.color,
			data: this.seriesSet[c.N],
		} );
	} ;


	// 凡例の作成
	if (this.isLegend) {
		// Dygraphに登録するlegendの編集関数(内部関数） 
		var legendFormatter = function (data) {
			if (data.x == null) {
				// This happens when there's no selection and {legend: 'always'} is set.
				return '<br>' + data.series.map(function(series)
			    		{ return series.dashHTML + ' ' + series.labelHTML }).join('<br>');
			}
			
			var html = data.xHTML;
			data.series.forEach(function(series) {
				if (!series.isVisible) return;
				var labeledData = series.labelHTML + ': ' + series.yHTML;
				if (series.isHighlighted) {
					labeledData = '<b>' + labeledData + '</b>';
				}
				html += '<br>' + series.dashHTML + ' ' + labeledData;
			});
			return html;
		};
	}
	
	// グラフの作成
	if (this.graph) this.graph.destroy();
	this.graph = new Dygraph(
					this.chartId,
					this.dyData,
					{
						labels: this.labels,
						// legend: 'follow',
						labelsSeparateLines: true,
						labelsDiv: document.getElementById('chart_legend'),
						legendFormatter: legendFormatter,
						axisLabelFontSize: 10,
						axisLineColor: 'rgba(0, 0, 0, 0.2)',
						gridLineColor: 'rgba(0, 0, 0, 0.2)',
						strokeWidth: 2,
						pointSize: 3,
						// ylabel: 'Primary y-axis',
						// y2label: 'Secondary y-axis',
						// rollPeriod: 7,
						// errorBars: true,
						// showRangeSelector: true,
						highlightCircleSize: 4,
						highlightCallback: highlightCallback,
						highlightSeriesOpts: {
							//	strokeWidth: 3,
							//	strokeBorderWidth: 1,
							highlightCircleSize: 5
						},
						series: this.series,
						clickCallback: clickCallback
					}
				);

	// 初期表示の不活性グラフを設定
	
	// Y軸の作成
		
	// X軸の作成
	
	// スライダー（Ｘ軸表示範囲）の作成
	if (this.isSlider) {}

	/** 再描画する **/
	this.resize();
	this.showBaloon();
		
	// マウスオーバの作成　吹き出しの編集
	if (this.isHover) {}

	// マウスオーバの作成　X座標をHTMLに書き出す
	if (this.isHoverDetail) {}
	// ハイライトになった点を マウスクリック処理用にHJN.hoverXYに退避する処理宣言（内部関数）
	function highlightCallback(e, x, pts, row, seriesName) {
		/** マウスクリック用に座標を退避する **/
		HJNdy.hoverXY = { x: x, pts:pts, row:row, seriesName: seriesName };
	}
	
	// マウスクリック処理宣言（内部関数）
	/** グラフをマウスクリックしたときの処理を登録する **/
	function clickCallback(e, x, pts) {
			if (HJNdy.hoverXY.seriesName === null) return;
			var hover = HJNdy.hoverXY, // { x: , pts:, row:, seriesName: };
				n = HJN.seriesConfig.findIndex(function(e){
								return e.key == hover.seriesName; }),
				x = hover.x / 1000.0,
				y = hover.pts[hover.pts.findIndex(function(e){
								return e.name == hover.seriesName; })].yval;
			// グラフの日時で、詳細グラフを再作成する
			HJN.SetSliderRange(Math.floor(x));	// 秒単位に丸める
			HJN.seriesSetDetail = HJN.CreateSeries( HJN.GetSliderRangedEtat() );
			HJN.chartD.update(HJN.seriesSetDetail);	// 下段データを登録描画する
			HJNdy.chartD.update(HJN.seriesSetDetail);	// 下段データを登録描画する

			// Hover表示しているplotを、HJN.plotsに登録し、plotsアイコンを再描画する
			HJN.PlotAdd(n, x, y);
			
			// Baloonを再描画する
			HJN.PlotShowBaloon();
			
			// concのとき指定時刻の処理中ログを、concData エリアに出力する
			HJN.SetConcTransToText(n, x);
	}
}


/** Baloonを再描画する **/
HJNdy.prototype.showBaloon =　function(){
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
