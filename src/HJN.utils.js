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
	var num = num || 10*100; //50*100*100;
	// 第二引数：　 応答時間振れ幅（秒）（デフォルト:200ミリ秒)
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
		eTat.push( { x: d , y: y} );
	}
	HJN.ShowLogText("got     " + eTat.length + " plots [tat/endT]","calc");
	return eTat;
}


/** ************************************ 
 * HJN.ChartRegis	seriesSetからチャートを作成する
 * ************************************ */
HJN.ChartRegist = function(){
	var dropFieldName = arguments[0];	// 上段グラフエリアにファイルをドロップ
	var chartName = arguments[0];			// "chart"
	var seriesSet = HJN.seriesSet = arguments[1];
	
	// グラフのインスタンスを作成する
	var CONC = { process: false, visiblity: false, renderer: 'area' },
		CTPS = { process: true,  visiblity: true,  renderer: 'scatterplot' },	// bar,scatterplot	
		STAT = { process: false, visiblity: false, renderer: 'scatterplot' },
		ETAT = { process: false, visiblity: false, renderer: 'scatterplot' },
		ETPS = { process: true,  visiblity: true,  renderer: 'line' },
		config = { SERIESES : [CONC, CTPS, STAT, ETAT, ETPS], 
						height : 0.40, isVisiblity: true };
	HJN.chart = new HJN(chartName, config, "HJN.chart");
	
	var CONC_D = { process: true, visiblity: true,  renderer: 'area' },
		CTPS_D = { process: true, visiblity: true,  renderer: 'bar' },	// bar,scatterplot
		STAT_D = { process: true, visiblity: true,  renderer: 'scatterplot' },
		ETAT_D = { process: true, visiblity: true,  renderer: 'scatterplot' },
		ETPS_D = { process: true, visiblity: false, renderer: 'line' },
		config_D = { SERIESES : [CONC_D, CTPS_D, STAT_D, ETAT_D, ETPS_D],
						height : 0.40, isVisiblity: true };
	HJN.chartD = new HJN(chartName + "Detail", config_D, "HJN.chartD");
	// ドロップフィールドに、処理を登録する(注：dygraphはイベントリスナーを登録しないとクリック時にエラーが出る）
	HJN.DropField(dropFieldName);
	HJN.DropField(dropFieldName+ "Detail");
	// グラフを初期表示する
	// 上段
	HJN.chart.init(seriesSet);
	// 下段(非同期）
	HJN.setZeroTimeout( function(){
		HJN.chartD.init( HJN.ChartRegistDetail( seriesSet[HJN.CTPS.N] ));
		HJN.chart.showBalloon();	// 上段のBalloonを描画する
		HJN.ShowLogText("下段表示", "elaps");
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
			var file_list = data_transfer.files;	// ファイルのリストを取得する
			HJN.FileReader(file_list);
			e.preventDefault();		// デフォルトのドロップ機能を無効化
	});
}
/**  イベントで指定されたファイルを処理する  #15 **/
HJN.FileReader = function (file_list){
	var num = file_list.length;
	for(var i=0; i < num; i++){	// データを順番に取得する
		try{
			// ファイルを取得する
			HJN.file = file_list[i];
			// ログ出力用にファイル名（サイズ）を編集する
			var textArray =	"<BR><mark><b>" + HJN.file.name + "</b></mark> " +
							"["+ HJN.file.size + "byte] " + 
							HJN.file.lastModifiedDate.toLocaleString() +"<BR>";
			// ファイルの読み込みに成功したら、その内容をドロップエリアに追記して表示する
			var reader = new FileReader();
			reader.onloadend = function(evt) {
		        if (evt.target.readyState === FileReader.DONE) { // DONE == 2
		        	/** ファイルの先頭2行をログ表示する **/
		        	HJN.file = evt.target.result;
		        	textArray += HJN.DropField.topLines(HJN.file, 2);
	        		HJN.ShowLogTextInit();		// 情報表示　:　初期化
	        		HJN.ShowLogText(textArray, "msg");	// 情報表示　：　ドロップファイル情報
	        		/** 上段用データの展開とグラフ描画 **/
	        		// CSVファイルを上段用eTatに展開する[{x:, y:,pos:,len:},...]
	        		var tatESeries = HJN.DropField.getTatLogArray(HJN.file);
	        		// eTatから上段用 時系列分析データ(seriesSet)を展開する
	        		HJN.seriesSet = HJN.CreateSeries(tatESeries);
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
	        			// 上段のBalloonを描画する(上段update時にはplots登録されていないので）
		        		HJN.chart.showBalloon();
		    			HJN.ShowLogText("下段表示", "elaps");
	        		});
		        }
		    };
			// ファイルにArrayBufferで参照を取得する（loadイベントを起こす）
		    reader.readAsArrayBuffer(HJN.file);
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
				eTat.push( { x: d, y: parseFloat(cols[1]) * tatUnit,
								pos: from, len: line.length} );
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
			eTat.push( { x: d, y: parseFloat(cols[1]) * tatUnit,
							pos: from, len: line.length } );
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
 * 終了時刻のTAT時系列データから、描画用時系列データ配列を作成する
 * ************************************ */
//第一引数： ETAT	
//戻り値：　	描画用時系列データ配列[CONC,　CTPS, STAT, ETAT, ETPS]
//
// CONC　多重度の時系列データ
//	[{x:多重度変化時刻(ミリ秒),y:多重度数,　trans:[実行中のeTAT(マージ未）]　}]
// CTPS　秒間多重度の時系列データ
//	[{x:時刻(ミリ秒),		y:多重処理数（最大値）, concRef:[実行中のeTAT(マージ未）] }]
//　STAT　開始時刻のTAT（応答時間）時系列データ
//	[{x:開始時刻(ミリ秒),	y:レスポンス（ミリ秒）　	}]
//　ETAT　終了時刻のTAT（応答時間）時系列データ	 
//	[{x:終了時刻(ミリ秒),	y:レスポンス(ミリ秒), pos:レコード位置,　len:レコード長}]
//　ETPS　秒間終了件数の時系列データ
//	[{x:時刻(ミリ秒),		y:終了件数	}]
//			
//時刻（秒）は、JulianDayからの経過秒数
HJN.CreateSeries = function(){
	// 時系列データを初期化する
	var cycle = 1000.0; // 処理件数を計測する間隔（ミリ秒）
	var conc = [], cTps = [], sTat = [], eTat = arguments[0], eTps = [];
	var seriesSet = [conc, cTps, sTat, eTat, eTps];	// 注）this.SERIESES と同じ順番にすること 
	// 集計対象データがないとき
	if(eTat.length === 0) return seriesSet;

	/** eTatをソートする **/
	// 開始時刻でソートする
	eTat.sort( function(a, b){ return a.x - b.x; } );
	HJN.ShowLogText("[1:eTat sorten ] " + eTat.length + " plots","calc");

	
	/** sTat（開始時間）時系列データを作成する,同時に入力eTatを補正する **/
	if(typeof eTat[0].pos === "undefined"){	// 自動生成データのとき
		eTat.forEach( function(e, i, eTat){
			// 処理時間=0 のとき、1マイクロ秒とみなす(有効桁0.2マイクロ秒に切上される）
			if(e.y === 0){ e.y = 0.001; e.x += e.y; }	// ミリ秒
			sTat.push( {x: e.x-e.y, y: e.y} );
		} );	// sTatにeTatデータを登録する
	}else{									// File読み込みのとき
		eTat.forEach( function(e, i, eTat){
			if(e.y === 0){ e.y = 0.001; e.x += e.y; }	// ミリ秒
			sTat.push( {x: e.x-e.y, y: e.y, pos: e.pos, len: e.len} );
		} );		
	}
	// 開始時刻でソートする
	sTat.sort( function(a, b){ return a.x - b.x; } );
	HJN.ShowLogText("[2:sTat created] " + sTat.length + " plots","calc");

	
	/** eTPS(時間あたり処理件数)時系列データを作成する **/
	var e = eTat[0],
		dFrom = Math.floor(e.x / cycle) * cycle,
		dTo = dFrom + cycle,
		num = 1;
	for (var i = 0; i < eTat.length; i++) {
		e = eTat[i];
		if (e.x < dTo){
			num += 1;
		} else{
			eTps.push( { x: dFrom, y: num } );
			dFrom = Math.floor(e.x / cycle) * cycle;
			dTo = dFrom + cycle;
			num = 1;
		}
	}
	eTps.push( { x: dFrom, y: num } );
	HJN.ShowLogText("[3:eTps created] " + eTps.length + " plots","calc");

	
	/** CONC(多重度)時系列データを作成する **/
	var concTmp = [];
	// eTatから、多重度が変化した時刻の一覧を作成する
	eTat.map(function(c, i, eTat){
		// 開始時刻にカウントアップ情報を追加する
		concTmp.push( {x: c.x-c.y, y:  1, trans: [c]} );
		// 終了時刻をカウントダウン情報を追加する
		concTmp.push( {x: c.x,     y: -1, trans: [c]} );  
	});
	// 変化した時刻（開始or終了）でソートする
	concTmp.sort( function(a, b){ return a.x - b.x; } );
	HJN.ShowLogText("[4-1:concTmp sorten ] "+ concTmp.length + " plots","calc");
	
	var concNum = 0,
		tList = [], 
		cc = {x: 0, y: 0, trans: []};
	concTmp.forEach( function(c, i, concTmp){
		// 取引一覧を更新する(1なら追加、else(-1)なら削除)
		if(c.y === 1){
			tList.push(c.trans[0]);
		}else{
			tList.splice(tList.indexOf(c.trans[0]), 1);
		}
		// concに実行中取引一覧(eList)を登録する
		if( 0 < i && conc[conc.length -1].x === c.x) {
			// 同一時刻のときconcの末尾にマージする
			cc = conc[conc.length -1]
			tList.map( function(t){
				if( cc.trans.indexOf(t) === -1 )　cc.trans.push(t); 
			});
			cc.y = cc.trans.length;
		}else{
			// i==0 もしくは 時刻が異なるとき、実行中取引一覧をそのまま登録する
			conc.push( {x: c.x,	y: tList.length, trans:[] } );
			cc = conc[conc.length -1];
			tList.map( function(t){ cc.trans.push(t) });
		}

	} );
	HJN.ShowLogText("[4-2:conc/sum & set trans] "+ conc.length + " plots","calc");
	
	
	/** cTPS秒間同時処理件数（concurrent transactions/sec）時系列データを作成する **/
	// 同時に時刻指定slice用from-toを取得する
	var concRef = [];
	var XSec =  floorTime(conc[0].x, cycle),	// ミリ秒
		YMax = YNext = conc[0].y;
	conc.forEach( function(c, i, conc) {
		if( floorTime(c.x, cycle) === XSec ){	// c.xは ミリ秒
			if(0 < c.trans.length) concRef.push(c.trans); 
			YMax = Math.max(YMax, c.y);
		}else{
			cTps.push( { x: XSec, y: Math.max(YMax,YNext), concRef: concRef } );
			for (var t = XSec + cycle; t < floorTime(c.x, cycle); t += cycle) { // c.xは ミリ秒
				cTps.push( { x: t, y: YNext, concRef: concRef } );
				if (YNext === 0) break;
			}
			XSec = floorTime(c.x, cycle);
			concRef = [];
			if(0 < c.trans.length) concRef.push(c.trans);
			YMax = Math.max(YNext,　c.y);
		}
		YNext = c.y;
	} );
	cTps.push( { x: XSec, y: YMax, concRef: concRef } );
	concRef = [];
	if(0 < conc[conc.length-1].trans.length){
		concRef.push(conc[conc.length-1].trans);
	}
	cTps.push( { x: XSec + cycle, y: YNext, concRef: concRef } );
	HJN.ShowLogText("[5:cTps created] " + cTps.length + " plots","calc");
	
	return seriesSet;
	
	// 時刻を指定ミリ秒間隔で切り捨てる（内部関数）
	function floorTime(t, cycle){
		return Math.floor(Math.floor(t / cycle) * cycle);
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
	var t = new Date(date);	// ミリ秒
	HJN.detailDateTime = new Date(t);
//	var dt = new Date(t);
//	document.getElementById("DetailDateTime").value =
//			HJN.DateToString(dt, "yyyy-MM-ddThh:mm:ss.sss");
}

/** 表示対象期間のcTpsから、eTps範囲を取得し、詳細Seriesを生成する **/
HJN.ChartRegistDetail = function(cTps){
	// CTPSの最大値となるplotを取得する
	var maxY = Math.max.apply(null, cTps.map(function(o){return o.y}));
	var maxYIndex = cTps.findIndex(function(o){return o.y === maxY;});
	// slider rangeに、下段の表示時刻を設定する
	HJN.SetSliderRange(cTps[maxYIndex].x);
	// eTpsの範囲を取得し、詳細用seriesSetを設定する
	HJN.seriesSetDetail = HJN.CreateSeries( HJN.GetSliderRangedEtat() );
	// plotsアイコン用 HJN.plotsに、下段表示したplotを登録する
	HJN.PlotAdd(HJN.CTPS.N, cTps[maxYIndex].x, cTps[maxYIndex].y);
	HJN.ShowLogText("[6:Plot added] " + HJN.plots.length + " plots","calc");

	return HJN.seriesSetDetail;
}
/** sliderRangeで指定された範囲のeTatを返却する **/
HJN.GetSliderRangedEtat = function() {
	var tagInput =  document.getElementById("DetailTimeRange");
	HJN.detailDateTimeRange　= tagInput ? +tagInput.value : 1;	// 幅
	var dt = +HJN.detailDateTime,		// 中央時刻	// ミリ秒
		range =  HJN.detailDateTimeRange * 1000,	// 幅
		cTps = HJN.seriesSet[HJN.CTPS.N];
		eTat = HJN.seriesSet[HJN.ETAT.N];
	// 指定時刻(from to)からcTpsの範囲を抽出するインデックス(from to)を得る
	var fromI = Math.max(0,
				cTps.findIndex(function(e){ return (dt - range) <= e.x; })),
		toI   = cTps.findIndex(function(e){ return (dt + range) <= e.x; });
	if(toI === -1) toI = cTps.length - 1;
	// 抽出したfromからtoの間の両端のcTpsに含まれるconcRefを一つのアレイにコンカチする
	var concFrom = [],
		concTo = [];
	for(var i = fromI; i <= toI; i++){
		cTps[i].concRef.forEach(
				function(c){ Array.prototype.push.apply(concFrom, c); });
		if (concFrom.length) break;
	}
	for(var i = toI; fromI <= i; i--){
		cTps[i].concRef.forEach(
				function(c){ Array.prototype.push.apply(concTo, c); });
		if (concTo.length) break;
	}
	
	// eTatの範囲を抽出する時刻(eFromTime eToTime)を得る
	var	t = 0, e = {},
		eFromTime = Number.MAX_VALUE,
		eToTime = Number.MIN_VALUE;
	// concFromのうち 開始時刻(x-y)が最小となる、時刻(eFromTime)を求める
	for (var i = 0, l = concFrom.length; i < l; i++) {
		e = concFrom[i];
		t = e.x - e.y;
		if (eFromTime > t ) eFromTime = t;
	}
	// concToのうち 終了時刻(x)が最大となる、時刻(eToTime)を求める
	for (var i = 0, l = concTo.length; i < l; i++) {
		t = concTo[i].x;
		if (eToTime < t ) eToTime = t;
	}
	
	// eTatをsliceするインデックス(from to)を得る
	var eFrom = eTat.findIndex(
					function(e){ return e.x - e.y === eFromTime; }),
		eTo   = eFrom + 1000 + eTat.slice(eFrom).findIndex(	// ミリ秒
					function(e){ return e.x === eToTime; });
//	console.log("fromI %o,toI %o,eFromTime %o,eToTime %o,eFrom %o,eTo %o,eTat %o",
//		fromI,toI,eFromTime,eToTime,eFrom,eTo,HJN.seriesSet[HJN.ETAT.N].slice(eFrom,eTo));
	var eTatDetail = HJN.seriesSet[HJN.ETAT.N].slice(eFrom,eTo); 
	HJN.ShowLogText("[0:HJN.GetSliderRangedEtat] From:" + eFrom + " To:" + eTo,"calc");
	
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
		y = p.yval;
	// グラフの日時で、詳細グラフを再作成する
	HJN.SetSliderRange(Math.floor(x * 1000) / 1000);	// 秒単位に丸める　//　ミリ秒
	HJN.ShowLogText("[0:PointClickCallback](n,x,y)=("+ n + "," + x + "," + y + ")","calc");
	HJN.seriesSetDetail = HJN.CreateSeries( HJN.GetSliderRangedEtat() );
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
	HJN.plots.forEach(function(e,i,a){e.radio = false;});
	var format = (n === HJN.ETPS.N || n === HJN.CTPS.N) ? "hh:mm:ss" : "hh:mm:ss.sss";
		label = HJN.D2S(x, format) + " " +
				HJN.seriesConfig[n].label.replace("%N",HJN.N2S(y)),
		tagInput =  document.getElementById("DetailTimeRange"),
		range　= tagInput ? +tagInput.value : 1,	// 幅
		i = HJN.plots.findIndex(
				function(p){ return (p.n === n && p.x === x); });
	if(i < 0){ // 既存に無いとき追加する
		HJN.plots.push(	{label: label, ckBox:false,
						 radio:true, n: n, x: x, y: y, range: range });
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
}
/**  HJN.plotsを再表示する **/
HJN.PlotRender = function() {
	var divCheckedPlots =  document.getElementById("CheckedPlots");
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
	HJN.SetSliderRange(Math.floor(HJN.plots[i].x));	// 秒単位に丸め、中心時刻に設定する
	document.getElementById("DetailTimeRange").value = HJN.plots[i].range;	// 幅を設定する
	HJN.seriesSetDetail = HJN.CreateSeries( HJN.GetSliderRangedEtat() );
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


/** ************************************
　* Balloonを再描画する *
　* ************************************ */
HJN.PlotShowBalloon =　function(){
	HJN.chart.showBalloon();
	HJN.chartD.showBalloon();
}


/** ************************************ 
 * slider range変更時に、Detailを再描画する
 * ************************************ */
var timer;
HJN.setDetailRange = function(){
	clearTimeout(timer);
	timer = setTimeout(function(){
		// 下段データを登録する
		HJN.seriesSetDetail = HJN.CreateSeries( HJN.GetSliderRangedEtat() );
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
//	if (mode === "calc") return;	// 性能検証用
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