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
	
	// htmlを作成する #52
	var html_chart = document.getElementById("hjn_" + chartName) || document.body;
	html_chart.innerHTML = ''
	    + '<div id="' + chartName + '"></div>'
        + '<div id="' + chartName + 'Detail"></div>'
        + '<fieldset>'
            + '<div id="lineViewer">logdata</div>'
        + '</fieldset>';
	// 手前にメニュ－用htmlを作成する #52
	var html_nav = document.createElement('nav');
	html_nav.innerHTML = ''
	    + '<header>'
        + '    <div class="statusbar">'
        + '        <iframe id="fileInfo"></iframe>'
        + '    </div>'
        + '    <div class="hjnBurgerTray">'
        + '        <input id="hjnBoxBuger" type="checkbox" class="hjnBurger hjnResize"'
        + '            checked="checked" /> <label for="hjnBoxBuger" class="hjnCtrlBox"><span></span></label>'
        + '        <div class="hjnBurgerTitle">'
        + '            <input id="hjnBoxPlaceOn" type="checkbox"'
        + '                class="hjnBoxSwitch hjnResize" /> <label for="hjnBoxPlaceOn"'
        + '                class="hjnCtrlBox"><span></span></label>'
        + '            <p>'
        + '                <a class="hjnLabel4Input" href="../jsdoc/index.html" target=”_hirosejnJSDoc3”>TAT log diver</a><BR>'
        + '                <a class="hjnLabel4Input" href="https://github.com/hirosejn/" target=”_hirosejnGit”>&copy;2017 Junichiroh Hirose</a>'
        + '            </p>'
        + '        </div>'
        + '        <div class="hjnBurgerWrap">'
        + '            <div class="hjnAccordion">'
        + '                <div id="' + chartName + '_menu"></div>'
        + '                <div id="' + chartName + 'Detail_menu"></div>'
        + '                <div id="' + chartName + 'Labels"></div>'
        + '            </div>'
        + '        </div>'
        + '    </div>'
        + '</header>';
	html_chart.parentNode.insertBefore(html_nav, html_chart);
	
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
	HJN.chart.eTatOriginal = HJN.init.CreateSampleTatLog();	// arg0：生成データ数
	// データを表示する
	HJN.init.ChartShow(HJN.chart.eTatOriginal);
}


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
    for (var i = 0; i < num; i++) {     // jsはミリ秒単位
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
 * HJN.init.ChartShow: 終了時刻とtatの配列をグラフ表示する
 * 
 * @param {ETAT}
 *            HJN.chart.eTatOriginal 終了時刻とtatを含む配列
 */
HJN.init.ChartShow = function(eTatOriginal){
    // フィルタしたeTatを取得する #34
    var eTat = HJN.chart.fileReader.createFilter().filter(eTatOriginal);
    
    // グラフを初期表示する
    // 上段
    HJN.chart.update(HJN.chart.createSeries(eTat));
    HJN.util.Logger.ShowLogText("上段表示", "elaps");       // 処理時間ログ出力

    // 下段(非同期）
    HJN.util.setZeroTimeout( function(){
        HJN.chartD.update(HJN.init.ChartRegistDetail(HJN.chart.cTps));
        HJN.chart.showBalloon();    // 上段のBalloonを描画する
        HJN.util.Logger.ShowLogText("下段表示", "elaps");
        HJN.util.Logger.ShowLogText("<mark>サンプルを表示しました</mark>", "msg");
        // #49 上下段のマウス操作同期設定
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
	        		HJN.chart.eTatOriginal = getTatLogArray(HJN.filesArrayBuffer[HJN.filesIdx] );
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
		if(HJN.chart.cTpsUnit.unit >= 1000){
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
 * @return {ETAT} 詳細グラフ用eTat
 */
HJN.init.GetSliderRangedEtat = function() {
	"use strict";
	// 指定時刻（ｄｔ ± range）を取得する
	var rangeTagPlus  = document.getElementById("DetailRangePlus"),
		rangeTagMinus = document.getElementById("DetailRangeMinus"),
        rangeTagUnit  = document.getElementById("DetailRangeUnit"), // #48
		rangeCycle = HJN.chart.cTpsUnit.unit / 1000;					// #38
	// HJNグローバル変数に退避する
	HJN.detailRangePlus  = rangeTagPlus  ? +rangeTagPlus.value  : 1 + rangeCycle; // 幅（秒）
	HJN.detailRangeMinus = rangeTagMinus ? +rangeTagMinus.value : rangeCycle; 	  // 幅（秒）
    HJN.detailRangeUnit  = rangeTagUnit  ? +rangeTagUnit.value  : 1000; // #48
	var rangeUnit = HJN.detailRangeUnit, // #48
	    dt = Math.floor(HJN.detailDateTime * rangeUnit) / rangeUnit, // 中央時刻(ミリ秒)
		rangePlus  = HJN.detailRangePlus  * rangeUnit,  // 幅（ミリ秒）
		rangeMinus = HJN.detailRangeMinus * rangeUnit,  // #48
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
            HJN.Plot.List[i].rangeUnit  = document.getElementById("DetailRangeUnit").value; // #48
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
	    rangeUnitTag  =  document.getElementById("DetailRangeUnit"), // #48
        rangeUnit  = rangeUnitTag  ? +rangeUnitTag.value : 1000,
	    rangePlus  = rangePlusTag  ? +rangePlusTag.value  : 1,	// 幅
		rangeMinus = rangeMinusTag ? +rangeMinusTag.value : 1;
	// ETAT,STATのとき、TATが幅に含まれるよう、幅(range)を拡大する #30 #48 TODO
	if (n === HJN.ETAT.N){
		rangeMinus = Math.max(rangeMinus, 
		        Math.floor(x / rangeUnit) - Math.floor((x - y) / rangeUnit)); // #48
		document.getElementById("DetailRangeMinus").value = rangeMinus; 
	}else if (n === HJN.STAT.N){
		rangePlus = Math.max(rangePlus,
				Math.floor((x + y) / rangeUnit)) - Math.floor(x / rangeUnit) ; // #48
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
	    plot.rangeUnit  = rangeUnit; // #48
	}else{		// 既存に無いときPlotを追加する
		plot = {label: label, ckBox:false,
				 radio:true, n: n, x: x, y: y, 
				 rangePlus: rangePlus, rangeMinus: rangeMinus, rangeUnit: rangeUnit };
		if (n === HJN.CTPS.N){			// CTPSのとき秒内最大CONCとして登録する
			adjustMaxPlot(HJN.chartD.conc, x, x + HJN.chart.cTpsUnit.unit, y, HJN.CONC.N, plot, rangePlus, rangeMinus, rangeUnit);
		}else if (n === HJN.EMPS.N){	// EMPSのとき秒内最大ETATとして登録する
			adjustMaxPlot(HJN.chartD.eTat, x, x + HJN.chart.cycle, y, HJN.ETAT.N, plot, rangePlus, rangeMinus, rangeUnit);
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
	function adjustMaxPlot(conc, x, toX, y, n, plot, rangePlus, rangeMinus, rangeUnit){
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
				 rangePlus: rangePlus , rangeMinus: rangeMinus, rangeUnit: rangeUnit,
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
	document.getElementById("DetailRangeUnit").value = HJN.Plot.List[i].rangeUnit; // #48
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
		var v = function(key, fieldId) { // fieldIdの値を返却値とする(デフォルト： key+".v")
					var _keyConf = proto.__keyConfig[key] = {};
					_keyConf.value = key;			// getValueByKeyの返却値（デフォルト：keyと同じ文字列）
					_keyConf.getValue = function () {
							return HJN.util.Config("m").getValueByKey(fieldId || key + ".v");
						};
					return key;
				};

				
		// 名称と挙動の定義
		this._configFileFormat = HJN.util.Config("m")	
		    // File Format Config設定画面定義 #51
			.n("<br>")
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
		var func_F_SYNC_UPPER = function(){ HJN.Graph.DrawCallback(HJN.chart.graph); },
		    func_F_SYNC_DETAIL = function(){ HJN.Graph.DrawCallback(HJN.chartD.graph); };
		// Filter Config設定画面定義 #51
		this._configFilter = HJN.util.Config("m")
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
     * eTatのフィルター
     * 
     * @function
     * @memberof HJN.util.FileReader
     */
    proto.createFilter = function() { // #34
       /**
         * フィルターを取得する
         * 
         * @class
         * @name Filter
         * @memberof HJN.util.FileReader
         * @classdesc ファクトリのFileReaderが保持するフィルタ条件を用いるフィルターを取得する
         */
        function Filter(){ /* constructor */
                if(!(this instanceof Filter)) return new Filter();

                var c = HJN.chart.fileReader;
                
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
                
                this.confF_IS = (this.confF_TIME === true || this.confF_TAT === true || this.confF_TEXT != null)
                              ? true : false; // フィルタ指定の有無
                this.confF_SEP = c.getValue("SEP").charCodeAt(0);
        }
        
        // class method
        // private
        /**
         * フィルター条件で判定する
         * 
         * @function
         * @memberof HJN.util.FileReader.Filter
         */
        Filter.prototype._isIn = function (e) {
            // フィルタ指定が無いときフィルタしない（最速判定）
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
            if (this.confF_TEXT === null || e.pos === undefined) {
                return true; // フィルタ指定なし or テキスト読み込みでないとき（自動生成データのとき）
            } else {
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
                var text = col.slice(this.confF_TEXT_POS, this.confF_TEXT_POS + this.confF_TEXT_LEN);
                // 指定正規表現に合致するか判定し、Include/Exclude指定に応じてリターンする
                return this.confF_TEXT === this.confF_TEXT_REG.test(String.fromCharCode.apply(null, text));
            }
            return true;
        };
        
        // public
        /**
         * eTatをフィルターする
         * 
         * @function
         * @memberof HJN.util.FileReader.Filter
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
				this.confTIME_YMD = (c.getValue("TIME_YMD") || "YYYY/MM/DD hh.mm.ss.ppp");	// 時刻(X)のYMDフォーマット
                                                                                            // #42
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
						x = HJN.util.S2D(strX, this.paseDateConf);
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
					if (this.confTAT_FORM === "TAT_FORM_TEXT"){
					    // テキスト数字によるユリウス経過時間のとき
						var strY = String.fromCharCode.apply(null,arrY);
						y = GetterOfXY.parseNumber(strY);
					} else{
					    // TAT_FORM_TEXT === "TAT_FORM_LONG" 数値によるユリウス経過時間のとき
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
HJN.init.HowToUse=function(){
    "use strict";
    var str =   "Sorry. Under construction _(..)_";
    return str;
};
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
