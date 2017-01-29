/*
 TODO:	
		種類で色分け（concの積み上げ？）
		秒最大値を選択したときに、0秒でなく、最大値のmsを選択する
		GITHUBで作業する
		初期ロードの進捗を表示する（集計処理の分割＆非同期化）
		上段を分単位にし、幅の初期値を±９０secにする
		
済
	2016/12/25 040	複数グラフ対応：コンストラクタで使用機能を指定する
	2017/ 1/ 1 040	fileInfoのiHtml化、HTMLレイアウト整形
	2017/ 1/ 3 040	上下段グラフ対応
	2017/ 1/ 7 041n2cTpsの高速化（下段表示を初期集計しない、下段処理を非同期化）
					下段表示元データ(eTat)コピー機能
					日時フォーマット指定機能
	2017/ 1/11 042	機能追加用レイアウト作成（クリックでplots表示、copy/loadボタン、copy transボタン）
	2017/ 1/20 042	クリックでplots表示、copy/loadボタン　実装
	2017/ 1/21 042	copy transボタン、ie11 対応(input date, findindex)
	2017/ 1/23 042	クリックでHover表示機能
	2017/ 1/24 042	legendのY値表示バグ改修、hoverDetailのHJN退避処理追加（tat線 表示機能追加用）
	2017/ 1/25 042	CONCにhoverしたときsTAT,eTATを強調表示する（前提：legendのsTat,eTatを選択）
	2017/ 1/28 042	CONCにhoverしたときsTAT,eTATを線で結ぶ、1/25の前提不要
*/
/** *****1*********2*********3*********4*********5*********6*********7****** **/


/* ************************************ 
 * HJN
 * ************************************ */
"use strict";
/* クラス変数 */
HJN.seriesSet = HJN.seriesSetDetail = [];
HJN.chart = HJN.chartD = null;
HJN.detailDateTime = new Date();
HJN.file;

HJN.ETPS = 	{ name:'end time, tps',　label:'end:%Nms', 
	renderer: 'line',
	N:　0, scale:　0, color: 'rgba(127,127,  0, 0.1)', disabled: true };
HJN.ETAT = 	{ name:'[Y2軸] end time, tat',　label:'%Ntps', 
	renderer: 'scatterplot',
	N:　1, scale:　1, color: 'rgba(127,  0,  0, 0.3)', disabled: true };
HJN.STAT = 	{ name:'[Y2軸] start time, tat',　label:'start:%Nms',
	renderer: 'scatterplot',
	N:　2, scale:　1, color: 'rgba(127, 127, 0, 0.3)', disabled: true };
HJN.CONC = 	{ name:'多重度（詳細）',　label:'conc:%N',
	renderer: 'area',		// mulitのとき area はseries内で１系列だけ
	N:　3, scale:　0, color: 'rgba(  0,  0,127, 0.3)', disabled: true };
HJN.CTPS = 	{ name:'多重度（秒間最大）', label:'conc(max):%N',
	renderer: 'scatterplot',	// bar / scatterplot
	N:　4, scale:　0, color: 'rgba(  0,  0,127, 0.1)', disabled: false };

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
function HJN(chartIdName, config) {
	/* メンバ変数 */
	this.seriesSet = [];
	this.chartIdName = chartIdName;		// arg0
	if(!config) {						// arg1
		var ETPS = { disabled: true, renderer: 'line' },
			ETAT = { disabled: true, renderer: 'scatterplot' },
			STAT = { disabled: true, renderer: 'scatterplot' },
			CONC = { disabled: true, renderer: 'area' },
			CTPS = { disabled: false,renderer: 'scatterplot' };	// bar,scatterplot
		config = { 	SERIESES : [ETPS, ETAT, STAT, CONC, CTPS], height : 0.35,
					isSlider: true, isLegend: true,
					isHover : true, isHoverDetail: true }
	}

	// グラフ定義領域の宣言
	this.dropFiles = [];	// ファイルドロップ用
	this.chartId = d3.select("#"+chartIdName+"_graph");	// SVG、縦横軸などの設定
	this.scale　= [null, null];
	this.graph = this.y_ticks = this.axes =	this.slider = this.detail = null;
	this.legend = this.highlighter = this.toggle = null;

	// グラフの設定
	this.SERIESES = [];
	for (var i = 0; i < HJN.seriesConfig.length; i++){
		this.SERIESES[i] = 
				{ name:'',　renderer:'',	order:0, scale:0, color:'', disabled:false};
		for (var attr in HJN.seriesConfig[i]){
			this.SERIESES[i][attr]= HJN.seriesConfig[i][attr];
		}
		this.SERIESES[i]["disabled"] = config.SERIESES[i].disabled;
		this.SERIESES[i]["renderer"] = config.SERIESES[i].renderer;
	}
	this.isYAxis  = true;
	this.isXAxis  = true;
	this.height   = config.height;
	this.isSlider = config.isSlider;
	this.isLegend = config.isLegend;
	this.isHover  = config.isHover;
	this.isHoverDetail = config.isHoverDetail;
}

/* メソッド */

// グラフを初期表示する
HJN.prototype.init =　function(){
	var seriesSet = arguments[0];
	this.update(seriesSet);
	
	//ウィンドウ枠に合わせて描画領域をリサイズするイベントを登録し、リサイズする
	window.addEventListener("resize" , this.resize.bind(this) );
}


//ウィンドウ枠に合わせて描画領域をリサイズする
HJN.prototype.resize = function() {
	this.graph.configure({
		width: window.innerWidth * 1.0 - 250,
		height: window.innerHeight * this.height　
	});
	this.showBaloon();
	this.graph.render();
}


// データを変更し描画する
HJN.prototype.update =　function(){
	this.seriesSet = arguments[0];
	
	// 再描画のとき、legendの設定を退避する（初期設定にしない）
	if(this.legend){
		for (var i = 0; i < this.SERIESES.length; i++)
			this.SERIESES[i].disabled = 
					this.graph.series[this.SERIESES[i].N].disabled;
	}
	
	// 
	d3.select("#"+this.chartIdName+"_y0").selectAll('*').remove();
	d3.select("#"+this.chartIdName+"_y1").selectAll('*').remove();
	d3.select("#"+this.chartIdName+"_x").selectAll('*').remove();
	d3.select("#"+this.chartIdName+"_slider").selectAll('*').remove();
	d3.select("#"+this.chartIdName+"_legend").selectAll('*').remove();
	this.chartId.selectAll('*').remove();

	// Y軸のスケールの設定
	this.scale = [];
	this.scale.push(
		d3.scale.linear().domain(
			[0, d3.max(this.seriesSet[HJN.CONC.N], function(d){return d.y;})]
		).nice() );
	this.scale.push(
		d3.scale.linear().domain(
			[0, d3.max(this.seriesSet[HJN.ETAT.N], function(d){return d.y;})]
		).nice() );

	// 表示用データ補正（CTPSがbarの時、line用末尾データおよび詳細時に1秒を網羅しない先頭&末尾データを削除）
	var ctpsOrg = [], ctps = this.seriesSet[HJN.CTPS.N];
	if(this.SERIESES[HJN.CTPS.N].renderer == "bar"){
		if(ctps.length){
			this.seriesSet[HJN.CTPS.N] = ctps.slice(1,ctps.length -2);
		}
	}


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

	// グラフの作成
	if(this.graph){	// HoverDetail getBoundingClientRect　error 対策
		var graph = document.getElementById(this.chartIdName+"_graph");
		while (graph.firstChild) graph.removeChild(graph.firstChild);
		var newGraph = graph.cloneNode(true);
		graph.parentNode.replaceChild(newGraph, graph);
	}
	this.graph = new Rickshaw.Graph( {
		element: document.getElementById(this.chartIdName+"_graph"),
		renderer: 'multi',
		interpolation: 'step-after', // linear/step-after/cardinal/basis（全Lineの形状を指定）
		series: new Rickshaw.Series( series ),
		stack: false // set false for not allowing multiple series with different numbers of points
	} );

	// 初期表示の不活性グラフを設定
	for (var i = 0; i < this.SERIESES.length; i++)
		this.graph.series[this.SERIESES[i].N].disabled = 
				this.SERIESES[i].disabled;
	
	// Y軸の作成
	if (this.isYAxis) {
		this.y_ticks = new Rickshaw.Graph.Axis.Y.Scaled( {
			graph: this.graph,
			orientation: 'right',
			tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
			element: document.getElementById(this.chartIdName+'_y0'),
			scale: this.scale[0]
		} );
		this.y_ticks1 = new Rickshaw.Graph.Axis.Y.Scaled( {
			graph: this.graph,
			orientation: 'left',
			tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
			element: document.getElementById(this.chartIdName+'_y1'),
			scale: this.scale[1]
		} );
	}
		
	// X軸の作成
	if (this.isXAxis) {
		// var time = new Rickshaw.Fixtures.Time();
		this.axes = new Rickshaw.Graph.Axis.Time( {
			graph: this.graph,
			timeFixture: new Rickshaw.Fixtures.Time.Local()
			// , timeUnit: time.unit('second')
		} );
	}
	
	// スライダー（Ｘ軸表示範囲）の作成
	if (this.isSlider) {
		this.slider = new Rickshaw.Graph.RangeSlider.Preview({
			graph: this.graph,
			element: document.querySelector('#'+this.chartIdName+'_slider')
		});	
	}

	// 凡例の作成
	if (this.isLegend) {
		this.legend = new Rickshaw.Graph.Legend({
			graph: this.graph,
			element: document.querySelector('#'+this.chartIdName+'_legend')
		});
		this.highlighter = new Rickshaw.Graph.Behavior.Series.Highlight({
		    graph: this.graph,
		    legend: this.legend,
		    disabledColor: function() { return 'rgba(0, 0, 0, 0.2)' }
		});	
		this.toggle = new Rickshaw.Graph.Behavior.Series.Toggle({
		    graph: this.graph,
		    legend: this.legend
		});
	}
	
	
	/** 再描画する **/
	this.graph.update();
	this.resize();
	this.showBaloon();
		
	// マウスオーバの作成　吹き出しの編集
	if (this.isHover) {
		// フォーマッタ（マウスオーバー時の表示情報）の定義
		var xFormatter = function(x ) {
			return HJN.D2S(x, "yyyy-MM-dd hh:mm:ss.sss");
		}
		var formatter = function(series, x, y, xx, yy ) {
			// console.log("x %o, y %o, xx %o, yy %o,series %o", x, y, xx, yy,series )	
			
			// マウスオーバー時の表示情報を編集しリターンする
			var swatch = '<span class="item" ' +
								'style="background-color: ' + series.color + '">' +
						 '</span>';

			var content = swatch
					+ " " + HJN.N2S(y)	// 表示誤差補正
					+ " "+ series.name
					+ '<BR> ' + HJN.D2S(x, "hh:mm:ss.sss")
					+ '<BR>' + tranList(series, x, y);	// 内部関数 
			/** マウスクリック用に座標を退避する **/
			HJN.hoverXY = { series: series, x: x, y: y };

			return content;
		}
		// Hover　Detailを設定する
		this.detail = new Rickshaw.Graph.HoverDetail({
				graph: this.graph,
				xFormatter: xFormatter,
				formatter: formatter
		})
		
		// 内部関数　「多重度（詳細）」グラフのときグローバルデータから、多重度の内訳リストを編集する
		var tranList = function(series, x, y){
			var text = "";
			/*
			if (series.n == HJN.CONC.N){
				var conc = HJN.seriesSet[HJN.CONC.N];
				// 時刻(x)からconcの配列位置を取得する
				var i = conc.findIndex(function(e){ return(e.x == x) } );
				// 出力テキストを編集する
				if ( 0 <= i ){
					var trans = HJN.seriesSet[HJN.CONC.N][i].trans;
					trans.forEach(function(obj, i, conc){
						text += "<BR>" + HJN.D2S(obj.x-obj.y, "hh:mm:ss.sss") +
								" - "  + HJN.D2S(obj.x, "hh:mm:ss.sss") +
								" : "  + HJN.N2S(　obj.y ) + " ms" ; 
					});
				}
			}
			*/
			return text;
		}
	}
	
	if (this.isHoverDetail) {
		// マウスオーバの作成　X座標をHTMLに書き出す
		var legend = document.getElementById(this.chartIdName+'_HoverValue');
		var Hover = Rickshaw.Class.create(Rickshaw.Graph.HoverDetail, {
			render: function(args) {
				/** マウスクリック用に詳細情報を退避する **/
				HJN.hoverDetail.dots = [];
				// dots[{n: d.series.n, x: d.value.x, y: d.value.y}] 
				HJN.hoverDetail.args = args;
				/* args{ detail[	表示している点の詳細情報,
				 * 		{	active: ture,	選択されている時にactive要素が追加
				 * 			distance: マウスからの距離（近接ポイント判定用）
				 * 			formattedXValue:	ＸをＧＭＴベース文字列（Ｘはvalue.x　のほうが使いやすい）
				 * 			formattedYValue:	Ｙの値（Ｙの値はこれしか情報がないので、HJN.hoverXY.y の方が使いやすい）
				 * 			name:	seriesの名前
				 * 			order: legendの表示順（先頭が1）
				 * 			series: Object	seriesへの参照
				 * 			value: {x,	選択している点に該当するＸの値
				 * 					y,	選択している点に該当するＹの位置（全体を0～1としたときの比率？）
				 * 					y0,	グラフ表示位置補正値（未使用：いつも0)
				 * 					concRef/trans...}	x,y,y0 以外でのseries上の点が持っているオブジェクトへの参照
				 * 		} ]
				 *   domainX: マウス位置に相当するＸの値（小数）,
				 *   formattedXValue:	Ｘ（日時）の文字列表現（ＧＭＴベース）,
				 *   mouseX: マウスのX座標（整数）,
				 *   mouseY: マウスのＹ座標（整数）,
				 *   points[　detailと同じ　]
				 * }   */
				
				// 内部関数定義：指定seriesのdetailへの参照を取得する
				var GetDetail = function(args, name){
					var detailIdx = args.detail.findIndex(
							function(e){ return(e.name === name) });
					return args.detail[detailIdx];
				}
				var	graph = this.graph,
					element = this.element,
					concD = GetDetail(args, HJN.CONC.name),
					conc = HJN.seriesSet[HJN.CONC.N],
					i = -1;
				// 時刻(x)からconcの配列位置を取得する
				if (concD) i = conc.findIndex(function(e){ return(e.x === concD.value.x); });
				// conc tranのstatとetatのdotを強調表示する
				if ( 0 <= i ){
					var trans = HJN.seriesSet[HJN.CONC.N][i].trans;
					function graphY(graph, y){
						return graph.y(HJN.chartD.scale[HJN.ETAT.scale](y));
					}
					trans.forEach(function(obj, i, conc){
						// sTatのdotを強調表示する
						var dotS = document.createElement('div');
						dotS.className = 'dot active';
						dotS.style.left = graph.x(obj.x - obj.y) - graph.x(args.domainX) + 'px';
						dotS.style.top  = graphY(graph, obj.y) + 'px';
						dotS.style.borderColor = HJN.STAT.color;
						element.appendChild(dotS);
						// eTatのdotを強調表示する
						var dotE = document.createElement('div');
						dotE.className = 'dot active';
						dotE.style.left = graph.x(obj.x) - graph.x(args.domainX) + 'px';
						dotE.style.top  = graphY(graph, obj.y) + 'px';
						dotE.style.borderColor = HJN.ETAT.color;
						element.appendChild(dotE);
						// sTat-eTat間の線を引く
						var line = document.createElement('div');
						line.className = 'tatLine';
						line.style.left = graph.x(obj.x - obj.y) - graph.x(args.domainX) + 'px';
						line.style.top  = graphY(graph, obj.y) + 'px';
						line.style.width = graph.x(obj.x) - graph.x(obj.x - obj.y) + 'px';
						element.appendChild(line);
					});
				}
				
				
				// legend に マウス値表示を追加する
				// legend.innerHTML = HJN.D2S(args.domainX, "hh:mm:ss.sss");

				args.detail.sort(function(a, b) { return b.order - a.order }).forEach( function(d) {
					// マウスクリック用に詳細情報を退避する 
					HJN.hoverDetail.dots.push( {n: d.series.n, x: d.value.x, 
							y: HJN.N2S(d.series.scale.invert(d.value.y))} );
					/*
					// グラフ上のdot
					var dot = document.createElement('div');
					dot.className = 'dot';
					dot.style.top = this.graph.y(d.value.y0 + d.value.y) + 'px';
					dot.style.borderColor = d.series.color;
					this.element.appendChild(dot);
					dot.className = 'dot active';
					*/
					/*	
					// legend表示	
					var line = document.createElement('div');
					line.className = 'line';
					// legendのX（日時）編集
					var label = document.createElement('div');
					label.className = 'label';
					label.innerHTML = HJN.D2S(d.value.x , "hh:mm:ss.sss");
					line.appendChild(label);
					// legendのアイコン編集
					var swatch = document.createElement('div');
					swatch.className = 'swatch';
					swatch.style.backgroundColor = d.series.color;
					line.appendChild(swatch);
					// legendのY編集
					var label_1 = document.createElement('div');
					label_1.className = 'label';
					label_1.innerHTML = HJN.N2S(d.series.scale.invert(d.value.y)); //forme　Y
					line.appendChild(label_1);
					// 編集したlegendを登録する
					legend.appendChild(line); 
*/
					this.show();
					
				}, this );
				
	        }
		});
		// HoverDetailを設定する
		this.hoverDetail = new Hover({
			graph: this.graph,
		});
	}

	
	/** グラフをマウスクリックしたときの処理を登録する **/
	var domChart = document.getElementById(this.chartIdName+"_graph");
	domChart.addEventListener("click" ,(function(x) {
		return function() {
			var hover = HJN.hoverXY;
			// グラフの日時で、詳細グラフを再作成する
			HJN.SetSliderRange(Math.floor(hover.x));	// 秒単位に丸める
			HJN.seriesSetDetail = HJN.CreateSeries( HJN.GetSliderRangedEtat() );
			HJN.chartD.update(HJN.seriesSetDetail);	// 下段データを登録描画する

			// Hover表示しているplotを、HJN.plotsに登録し、plotsアイコンを再描画する
			HJN.PlotAdd(hover.series.n, hover.x, hover.y);
			
			// Baloonを再描画する
			HJN.PlotShowBaloon();
			
			// concのとき指定時刻の処理中ログを、concData エリアに出力する
			HJN.SetConcTransToText(hover.series.n, hover.x);
		}
	})(1), false);
}


/** Baloonを再描画する **/
HJN.prototype.showBaloon =　function(){
	var div = this.chartId,
		domChart = document.getElementById(this.chartIdName+"_graph"),
		h = domChart.getElementsByTagName("svg")[0].clientHeight,
		graph = this.graph,
		ctps = this.seriesSet[HJN.CTPS.N],
		minX = ctps[0].x,
		maxX = ctps[ctps.length - 1].x,
		plots = [];
	// グラフ表示対象（表示期間）のplotsを得る
	HJN.plots.forEach(function(e,i,a){
			if(minX <= e.x && e.x <= maxX) plots.push(e);
		});
	// domChart直下の<div id="baloons"></div>を削除する
	var d = domChart.children;
	for(var i = d.length - 1; 0 <= i ; i--){
		if(d[i].id === "baloons") domChart.removeChild(d[i]);
	}
	// domChartに、<div class="textInfo Y" id="baloons">...</div>を追加する
	var divBaloons = document.createElement('div');	// 追加用divの入れ物の作成
	divBaloons.setAttribute("class", "textInfo Y");
	divBaloons.setAttribute("id", "baloons");
	var html = '';
	plots.forEach(function(d,i){
		var cls = 'baloon ';
		if(d.ckBox) cls += 'checked '; 
		if(d.radio) cls += 'selected ';
		html += '<div class="detail" style="left: ' + graph.x(d.x) + 'px;">' +
					'<div class="' + cls + '" ' +
					'style="top: ' + (23 + (12 * i) % (h - 23 * 2)) + 'px;">' +
					d.label + '</div>' +
				'</div>';
	});
	divBaloons.innerHTML = html;
	domChart.appendChild(divBaloons);	// divを追加
}
