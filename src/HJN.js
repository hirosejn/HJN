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

HJN.CONC = 	{ key: 'conc', name:'多重度（詳細）',　label:'conc:%N',
		N:　0, scale:　0, color: 'rgba(  0,  0,127, 0.3)', renderer: 'area' };
										// mulitのとき area はseries内で１系列だけ
HJN.CTPS = 	{ key: 'cTps', name:'多重度（秒間最大）', label:'conc(max):%N',
		N:　1, scale:　0, color: 'rgba(  0,  0,127, 0.1)', renderer: 'scatterplot' };	
										// bar / scatterplot
HJN.STAT = 	{ key: 'sTat', name:'[Y2軸] start time, tat',　label:'start:%Nms',
		N:　2, scale:　1, color: 'rgba(127, 127, 0, 0.3)', renderer: 'scatterplot' };
HJN.ETAT = 	{ key: 'eTat', name:'[Y2軸] end time, tat',　label:'%Nms', 
		N:　3, scale:　1, color: 'rgba(127,  0,  0, 0.3)', renderer: 'scatterplot' };
HJN.ETPS = 	{ key: 'eTps', name:'[Y2軸] end time, tps',　label:'end:%Ntps', 
		N:　4, scale:　1, color: 'rgba(127,127,  0, 0.3)', renderer: 'line' };


HJN.seriesConfig = [HJN.CONC, HJN.CTPS,	HJN.STAT, HJN.ETAT, HJN.ETPS];

HJN.hoverXY = { series: null, x: null, y: null };	// マウスクリック時の値取得用
HJN.hoverDetail = { dots: [{n:1,x:null,y:null}], args: null };
HJN.plots = []; //{	label:"", ckBox:true, radio:true, n:4, x:0, y:0, range:1};

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
	
	// グラフ定義領域の宣言
	this.chartId = document.getElementById(this.chartIdName);
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
	this.isVisiblity = config.isVisiblity;
}

/* メソッド */

// グラフを初期表示する
HJN.prototype.init =　function(seriesSet){
	// メニューを作成する
	this.addMenu();
	
	// 凡例を作成する
	if (this.isVisiblity) this.addLegend();

	// 既にグラフがあるときは削除する
	if (this.graph) this.graph.destroy();
	// グラフを表示する
	this.update(seriesSet);
	
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
HJN.prototype.update =　function(){
	this.seriesSet = arguments[0];

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
		//　グラフがないときは新規作成する
		this.graph = new Dygraph(
			this.chartId,
			this.dyData,
			{
				height: this.resize(),
				labels: this.labels,
				legend: 'always', //'follow', // 
				labelsDiv: document.getElementById('chart_labels'),
				labelsSeparateLines: false,
				legendFormatter: this.legendFormatter,
				axes: {
					x: {axisLabelFormatter: axisLabelFormatter,
						axisLabelWidth: 80 },
					y: {axisLabelWidth: 30},
					y2:{drawGrid: true,
						independentTicks: true,
						gridLinePattern: [1,2]	}
				},
				includeZero: true,
				axisLabelFontSize: 10,
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
				visibility: visibility,
				connectSeparatedPoints: true
			}
		);
	}

	// 初期表示の不活性グラフを設定
	function axisLabelFormatter(d, gran, opts) {
        return Dygraph.dateAxisLabelFormatter(new Date(d), gran, opts);
    }
	HJN.ShowLogText("[8:dygraph showen] ","calc");
	
	// 再描画する
	this.showBalloon();
	HJN.ShowLogText("[9:baloon showen] ","calc");
		
	
	/** updateメソッド内部関数宣言 **/
	// 点がハイライトになったときの描画処理（内部関数宣言）
	function　drawHighlightPointCallback(g, name, ctx, cx, cy, color, r, idx) {
		// file dropのとき、新グラフデータに更新後に、旧グラフのidx値が引き渡されたとき　処理しない #12
		if (g.rawData_.length - 1 < idx) return;

		// CONCのとき、TRANSの線を引く
		if (name === HJN.CONC.key ) {
			// 以前に選択した線を消す
			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

			// 線を引く
			var	conc = HJN.chartD.seriesSet[HJN.CONC.N],
				g = this,	// chart
				// 画像位置となるxをキーにconc配列位置を取得する
				i = conc.findIndex(function(e,i){ return( e.x === g.rawData_[idx][0]); }),
				trans = conc[i].trans,
				tXs = 0,
				tXe = 0,
				tY  = 0;
			if ( 0 <= i && 0 < trans.length){
				// TRANS分の線を引く
				trans.forEach(function(e){
					tXs = g.toDomXCoord(e.x - e.y);	// ミリ秒
					tXe = g.toDomXCoord(e.x);	// ミリ秒
					tY  = g.toDomYCoord(e.y, 1);	//　第二軸:1
					drawLine(ctx, [{x: tXs, y: tY}, {x: tXe, y: tY}], r, color);
					drawPoint(ctx, tXs, tY, r, HJN.STAT.color);
					drawPoint(ctx, tXe, tY, r, HJN.ETAT.color);
				});
			}
			ctx.stroke();
		}
		// 選択点を表示する
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


/** ************************************ 
 * Plots,Balloon,Legend関連機能
 * ************************************ */
// Balloonを再描画する
HJN.prototype.showBalloon =　function(){
	var ann = {	series: "", xval: 0, shortText: "", text: "" },
		anns = [];
	
	var	ctps = this.seriesSet[HJN.CTPS.N],
		minX = ctps[0].x,
		maxX = ctps[ctps.length - 1].x;
	HJN.plots.forEach(function(e, i){
		if(minX <= e.x && e.x <= maxX){
			ann = {	series: HJN.seriesConfig[e.n].key,
					xval: e.x,	// ミリ秒
					shortText: e.y, 
					text: e.label };
			anns.push(ann);
		}
	});
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
				: HJN.DateToString(new Date(data.xHTML), "yyyy/MM/dd hh:mm:ss.sss");
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

	
	var ul = document.createElement('ul');		// 要素の作成
	ul.className = "menu";
	ul.innerHTML =
			'<li class="menu_lv1">' +
				'<a href="#" class="init-bottom">File</a>' +
				'<ul class="menu_lv2">' +
					'<li>' + getInputTag(menuOpenCsv) + '</li>' +
					'<li>' + getATag(menuSaveConfig) + '</li>' +
					'<li>' + getATag(menuLoadConfig) + '</li>' +
					'<li>' + getATag(menuDownloadImg) + '</li>' +
					'<li>' + getATag(menuDownloadCsv) + '</li>' +
					'<li>' + getATag(menuDownloadLog) + '</li>' +
					'<li>' + getATag(menuDownloadConc) + '</li>' +
				'</ul>' +
			'</li>' +
			'<li class="menu_lv1">' +
				'<a href="#" class="init-bottom">View</a>' +
				'<ul class="menu_lv2" style="background: rgba(255,255,255,0.5);">' +
					'<li><div id="' + this.chartIdName + '_legend"></div></li>' +
				'</ul>' +
			'</li>' +
			'<li class="menu_lv1"></li>' +
			'<li class="menu_lv1"></li>' +
			'<li class="menu_lv1">' +
				'<a href="#" class="init-bottom">Help</a>' +
				'<ul class="menu_lv2" style="width: 100%;">' +
				'<li>' + getAlertTag(menuHelpAbout) + '</li>' +
				'<li><a href="#">Child Menu</a></li>' +
				'</ul>' +
			'</li>' ;
	divMenu.appendChild(ul);

	// File Open用 イベントリスナー登録
	document.getElementById(menuOpenCsv.menuId)
			.addEventListener('change', this.menuOpenCsv.bind(this), false);
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
			'onclick="' + arg.funcName + '(' + "'" + arg.menuId + "', '" + arg.fileName + "'" +')" ' +
			'>' + arg.menuLabel + '</a>';
	}

	// Alert用<A>タグ編集（内部関数宣言）
	function getAlertTag(arg){
		// '<a id="xxx" onclick=Alert("xxx")>Child Menu</a>'
		return '' + 
		'<a id="' + arg.menuId + '"' +
			' onclick="alert(' + arg.strFuncName + ")" + '"' + '><label>' + arg.menuLabel + '</label></a>';
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
				eTatCsv +=  HJN.D2S(e.x, "yyyy/MM/dd hh:mm:ss.sss") +
							"," + e.y + "\r\n"; 
			});
			// ダウンロードする
			this.menuDownloadBlob(this.menuBuffToBlob(eTatCsv), menuId, fileName);
		}else{	// ファイル読込のとき
			// 最大作業領域として元ファイルサイズ分のメモリを確保する
			var buff = new Uint8Array(HJN.file.byteLength),
				offset = 0;
			// ファイルの該当行を Uint8Arrayに登録する
			eTat.forEach(function(e){
				buff.set(new Uint8Array(HJN.file, e.pos,
								Math.min(e.len + 2, HJN.file.byteLength - e.pos)), offset);
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
	if (plot.n === HJN.CONC.N) {	// CONCが選択されているとき
		var	conc = HJN.seriesSet[HJN.CONC.N],
			i = conc.findIndex(				// xをキーにconc配列位置を取得する
					function(e){ return(e.x === plot.x) } ),
			trans = HJN.seriesSet[HJN.CONC.N][i].trans;
		if ( 0 <= i && 0 < trans.length){	// 出力テキストを編集する
			if(typeof trans[0].pos === "undefined"){
				// 初期表示データのとき、CSVを編集する
				// 生成データをCSVに編集する
				var csv = "";
				trans.forEach(function(e){
					csv +=  HJN.D2S(e.x, "yyyy/MM/dd hh:mm:ss.sss") +
								"," + e.y + "\r\n"; 
				});
				// ダウンロードする
				this.menuDownloadBlob(this.menuBuffToBlob(csv), menuId, fileName);
			}else{
				// ファイル読み込みの時、対象レコードを表示する
				// 最大作業領域として元ファイルサイズ分のメモリを確保する
				var buff = new Uint8Array(HJN.file.byteLength),
					offset = 0;
				// ファイルの該当行を Uint8Arrayに登録する
				trans.forEach(function(e){
					buff.set(new Uint8Array(HJN.file, e.pos,
									Math.min(e.len + 2, HJN.file.byteLength - e.pos)), offset);
					offset += (e.len + 2);
				});
				// 未使用作業領域を削除する
				var buff2 = new Uint8Array(buff.slice(0, offset));
				// ダウンロードする
				this.menuDownloadBlob(this.menuBuffToBlob(buff2), menuId, fileName);
			}
		}

		
	} else {	// CONCが選択されていないとき
		var msg = "抽出対象データがありません。空データがダウンロードされます\r\nconc：多重度（詳細）の点を選択した状態で行ってください" 
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