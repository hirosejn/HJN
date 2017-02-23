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
	// 第一引数：	生成データ数（デフォルト:100、50*100*100)
	var num = num || 10*100; //50*100*100;
	// 第二引数：　 応答時間振れ幅（秒）（デフォルト:1.0秒)
	var response = response || 0.2;
	// 第三引数:　データ発生頻度の目安（tps)(デオフォルト:20tps)
	var freq = freq || 5;
	// 戻り値：	終了時刻のTAT（応答時間）時系列データ
	//			[{x:終了時刻(JulianDayからの経過時間(秒)), y:レスポンス(秒)}]
	var eTat = [];

	var x = new Date(),
		d　= Math.floor(x.getTime() / 1000),
		y = 0.0;
	for (var i = 0; i < num; i++) {		// jsはミリ秒,RickShawは秒なので1000で割る
		d += Math.round( Math.random() * 1000 / (2 * freq)
							* (1 + (0.5 * Math.cos(2 * Math.PI * i / num)))
						) / 1000;	// 次の電文発生時刻を求める
		y  = Math.round( Math.random()*response*1000 
							* (1 + (1.0 * Math.sin(2 * Math.PI * (i / num - 0.25)))) 
						) / 1000;
		eTat.push( { x: d , y: y} );
	}
	HJN.ShowLogText("get     " + eTat.length + " plots [tat/endT]");
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
	var ETPS = { process: true,  visiblity: true,  renderer: 'line' },
		ETAT = { process: false, visiblity: false, renderer: 'scatterplot' },
		STAT = { process: false, visiblity: false, renderer: 'scatterplot' },
		CONC = { process: false, visiblity: false, renderer: 'area' },
		CTPS = { process: true,  visiblity: true,  renderer: 'scatterplot' },	// bar,scatterplot
		config = { SERIESES : [ETPS, ETAT, STAT, CONC, CTPS], 
						height : 0.35, isLegend: false };
	HJN.chart = new HJN(chartName, config, "HJN.chart");
	
	var ETPS_D = { process: true, visiblity: false, renderer: 'line' },
		ETAT_D = { process: true, visiblity: true,  renderer: 'scatterplot' },
		STAT_D = { process: true, visiblity: true,  renderer: 'scatterplot' },
		CONC_D = { process: true, visiblity: true,  renderer: 'area' },
		CTPS_D = { process: true, visiblity: true,  renderer: 'bar' },	// bar,scatterplot
		config_D = { SERIESES : [ETPS_D, ETAT_D, STAT_D, CONC_D, CTPS_D],
						height : 0.4, isLegend: true };
	HJN.chartD = new HJN("chartDetail", config_D, "HJN.chartD");
	
	HJN.DropField(dropFieldName);	// ドロップフィールドに、処理を登録する
	
	// グラフを初期表示する
	// 上段
	HJN.chart.init(seriesSet);
	// 下段(非同期）
	HJN.setZeroTimeout( function(){
		HJN.chartD.init( HJN.ChartRegistDetail( seriesSet[HJN.CTPS.N] ));
		HJN.chart.showBaloon();	// 上段のBaloonを描画する
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
	element.addEventListener("drop" , function (e){
		var data_transfer = e.dataTransfer;		// DataTransfer オブジェクトを取得する
		var type_list = data_transfer.types;	// コンテンツタイプのリストを取得する
		var file_list = data_transfer.files;	// ファイルのリストを取得する
		if(!type_list) return;
	
		var num = type_list.length;
		for(var i=0; i < num; i++){	// データを順番に取得する
			try{
				// ファイルを取得する
				HJN.file = file_list[i];
				// ログ出力用にファイル名（サイズ）を編集する
				var textArray =	HJN.file.name + " ["+ HJN.file.size + "byte]<BR>";
				// ファイルの読み込みに成功したら、その内容をドロップエリアに追記して表示する
				var reader = new FileReader();
				reader.onloadend = function(evt) {
			        if (evt.target.readyState === FileReader.DONE) { // DONE == 2
			        	/** ファイルの先頭2行をログ表示する **/
			        	HJN.file = evt.target.result;
			        	textArray += HJN.DropField.topLines(HJN.file, 2);
		        		HJN.ShowLogTextInit();		// 情報表示　:　初期化
		        		HJN.ShowLogText(textArray);	// 情報表示　：　ドロップファイル情報
		        		/** 上段用データの展開とグラフ描画 **/
		        		// CSVファイルを上段用eTatに展開する[{x:, y:,pos:,len:},...]
		        		var tatESeries = HJN.DropField.getTatLogArray(HJN.file);
		        		// eTatから上段用 時系列分析データ(seriesSet)を展開する
		        		HJN.seriesSet = HJN.CreateSeries(tatESeries);
		        		// 上段グラフを描画する
		        		HJN.chart.update(HJN.seriesSet);
		        		/** 下段用データの展開とグラフ描画（非同期処理） **/
		        		HJN.plots = [];
		        		HJN.setZeroTimeout(function(){
			        		// 下段用 時系列分析データ(seriesSet)を展開する
			        		var seriesSetDetail = HJN.ChartRegistDetail(
		        									HJN.seriesSet[HJN.CTPS.N] );
			        		// 下段グラフを描画する
		        			HJN.chartD.update(seriesSetDetail);
		        			// 上段のBaloonを描画する(上段update時にはplots登録されていないので）
			        		HJN.chart.showBaloon();
		        			HJN.ShowLogText("render graphs");	// 情報表示
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
		e.preventDefault();		// デフォルトのドロップ機能を無効化
	});
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
	var array2D = [];
	var separator = /,|\t/;		// 区切り文字（カンマ、タブ）を正規表現で指定
	
	var parser = document.getElementById("dateParser").value;
	if(parser.length === 0) parser = "%Y%m%d %H:%M:%S.%L";
	var parseDate = d3.time.format(parser).parse;		// 時間のフォーマット

	var buf = new Uint8Array(file);
	var cols;

	var from　= 0,
		to = buf.indexOf(13, from),
		len = to - from,
		line = "",
		d = 0;
	while (to > 0) {
		try {
			line = String.fromCharCode.apply(null, new Uint8Array(file, from, len));
			cols = line.split(separator);
			d = +parseDate(cols[0]) / 1000;
			if(0 < d){
				array2D.push( { x: d, y: parseFloat(cols[1]), pos: from, len: line.length} );
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
		d = +parseDate(cols[0]) / 1000;
		if(0 < d){
			array2D.push( { x: d, y: parseFloat(cols[1]), pos: from, len: line.length } );
		}
	} catch (e) { /* 改行だけのレコードをスキップする */ }

	return array2D;
}


/** ************************************ 
 * 終了時刻のTAT時系列データから、描画用時系列データ配列を作成する
 * ************************************ */
HJN.CreateSeries = function(){
	// 第一引数： ETAT	
	// 戻り値：　	描画用時系列データ配列[ETPS, ETAT, STAT, CONC,　CTPS]
	//
	//	ETPS = [{x:時刻(秒),		y:終了件数	}]
	//			秒間終了件数の時系列データ
	//	ETAT = [{x:終了時刻(秒), y:レスポンス(秒), pos:レコード位置,　len:レコード長}]
	//			終了時刻のTAT（応答時間）時系列データ
	//	STAT = [{x:開始時刻(秒),	y:レスポンス　	}]
	//			 開始時刻のTAT（応答時間）時系列データ
	//	CONC = [{x:多重度変化時刻(秒),	y:多重度数,　trans:[実行中のeTAT(マージ未）]　}]
	//			CONC(多重度)時系列データ
	//	CTPS = [{x:時刻(秒),		y:多重処理数（最大値） }]
	//			CONC(多重度)時系列データ
	//  時刻（秒）は、JulianDayからの経過秒数
	var eTat = arguments[0];	// [{x:終了時刻(秒),　y:レスポンス（秒）	}]
	
	// 時系列データを初期化する
	var sTat = [], conc = [], eTps = [], cTps = [];
	var seriesSet = [eTps, eTat, sTat, conc, cTps];	// 注）this.SERIESES と同じ順番にすること 
	// 集計対象データがないとき
	if(eTat.length === 0) return seriesSet;
	
	/** sTat（開始時間）時系列データを作成する,同時に入力eTatを補正する **/
	if(typeof eTat[0].pos === "undefined"){
		eTat.forEach( function(e, i, eTat){
			// 処理時間=0 のとき、1マイクロ秒とみなす(有効桁0.2マイクロ秒に切上される）
			if(e.y === 0){ e.y = 0.000001; e.x += e.y; }
			sTat.push( {x: e.x-e.y, y: e.y} );
		} );	// sTatにeTatデータを登録する
	}else{
		eTat.forEach( function(e, i, eTat){
			if(e.y === 0){ e.y = 0.000001; e.x += e.y; }
			sTat.push( {x: e.x-e.y, y: e.y, pos: e.pos, len: e.len} );
		} );		
	}
	// 開始時刻でソートする
	eTat.sort( function(a, b){ return (a.x > b.x ? 1 : -1); } );
	sTat.sort( function(a, b){ return (a.x > b.x ? 1 : -1); } );
	HJN.ShowLogText("[tat/startT] " + sTat.length + " plots");

	
	/** eTPS(時間あたり処理件数)時系列データを作成する **/  
	var cycle = 1; // 処理件数を計測する間隔（秒）
	var e = eTat[0],
		dFrom = Math.floor(　Math.floor(e.x) / cycle) * cycle,
		dTo = dFrom + cycle, num = 1;
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
	HJN.ShowLogText("[end tran/s] " + eTps.length + " plots");

	
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
	concTmp.sort( function(a, b){ return (a.x > b.x ? 1 : -1); } );
	HJN.ShowLogText("[conc/T0] "+ conc.length + " plots");
	var concNum = 0, tList = [], cc = {x: 0, y: 0, trans: []};
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
	HJN.ShowLogText("[conc/T] "+ conc.length + " plots");
	
	
	/** cTPS秒間同時処理件数（concurrent transactions/sec）時系列データを作成する **/
	// 同時に時刻指定slice用from-toを取得する
	var concRef = [];
	var XSec =  Math.floor(conc[0].x), YMax = YNext = conc[0].y;
	conc.forEach( function(c, i, conc) {
		if( Math.floor(c.x) === XSec ){
			if(0 < c.trans.length) concRef.push(c.trans); 
			YMax = Math.max(YMax, c.y);
		}else{
			cTps.push( { x: XSec, y: Math.max(YMax,YNext), concRef: concRef } );
			for (var t = XSec + 1; t < Math.floor(c.x); t++) {
				cTps.push( { x: t, y: YNext, concRef: concRef } );
				if (YNext === 0) break;
			}
			XSec = Math.floor(c.x);
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
	cTps.push( { x: XSec+1, y: YNext, concRef: concRef } );
	HJN.ShowLogText("[conc/s] " + cTps.length + " plots");
	
	return seriesSet;
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
/** 日時(秒：Ｘ軸用）から、指定フォーマットの文字列を得る **/
HJN.D2S = function(ds, str){ // arg0: 日時(秒)の数値
	return HJN.DateToString(new Date(ds　*　1000), str);
}
/** 数値(Ｙ軸用）から、誤差のない表示用文字列（数）を得る **/
HJN.N2S = function(y){ // arg0: Y軸の値
	return Intl.NumberFormat('en-IN').format(y);
}

/** ************************************ 
 * 詳細グラフ用　HJN.seriesSetDetail　設定関連機能
 * ************************************ */
/**  指定日時をFORMのslider Rangeに、設定する **/
HJN.SetSliderRange　=　function(date) {	// arg0: 日時（秒単位）
	var t = new Date(date * 1000);
	HJN.detailDateTime = new Date(t);
	var dt = new Date(t);
	document.getElementById("DetailDateTime").value =
			HJN.DateToString(dt, "yyyy-MM-ddThh:mm:ss.sss");
}

/** 表示対象期間のcTpsから、eTps範囲を取得し、詳細Seriesを生成する **/
HJN.ChartRegistDetail = function(cTps){
	// CTPSの最大値となるplotを取得する
	var maxY = Math.max.apply(null, cTps.map(function(o){return o.y}));
	var maxYIndex = cTps.findIndex(function(o){return o.y == maxY;});
	// slider rangeに、下段の表示時刻を設定する
	HJN.SetSliderRange(cTps[maxYIndex].x);
	// eTpsの範囲を取得し、詳細用seriesSetを設定する
	HJN.seriesSetDetail = HJN.CreateSeries( HJN.GetSliderRangedEtat() );
	// plotsアイコン用 HJN.plotsに、下段表示したplotを登録する
	HJN.PlotAdd(HJN.CTPS.N, cTps[maxYIndex].x, cTps[maxYIndex].y);

	return HJN.seriesSetDetail;
}
/** sliderRangeで指定された範囲のeTatを返却する **/
HJN.GetSliderRangedEtat = function() {
	HJN.detailDateTimeRange　= +document.getElementById("DetailTimeRange").value;	// 幅
	var dt = HJN.detailDateTime / 1000,		// 中央時刻
		range =  HJN.detailDateTimeRange,	// 幅
		cTps = HJN.seriesSet[HJN.CTPS.N];
		eTat = HJN.seriesSet[HJN.ETAT.N];
	// 指定時刻(from to)からcTpsの範囲を抽出するインデックス(from to)を得る
	var fromI = Math.max(0,
				cTps.findIndex(function(e){ return dt - range <= e.x; })),
		toI   = cTps.findIndex(function(e){ return dt + range <= e.x; });
	if(toI === -1) toI = cTps.length - 1;
	// 抽出したfromからtoの間の両端のcTpsに含まれるconcRefを一つのアレイにコンカチする
	var concFrom = [],	concTo = [];
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
	
	// eTatの範囲を抽出する時刻(from to)を得る
	var	eFromTime　= Math.min.apply(null, concFrom.map(
					function(c){ return c.x - c.y; })),
		eToTime   = Math.max.apply(null, concTo.map(
					function(c){ return c.x; }));
	// eTatをsliceするインデックス(from to)を得る
	var eFrom = eTat.findIndex(
					function(e){ return e.x - e.y == eFromTime; }),
		eTo   = eFrom + 1 + eTat.slice(eFrom).findIndex(
					function(e){ return e.x == eToTime; });
//	console.log("fromI %o,toI %o,eFromTime %o,eToTime %o,eFrom %o,eTo %o,eTat %o",
//		fromI,toI,eFromTime,eToTime,eFrom,eTo,HJN.seriesSet[HJN.ETAT.N].slice(eFrom,eTo));
	var eTatDetail = HJN.seriesSet[HJN.ETAT.N].slice(eFrom,eTo); 

	// 詳細表示対象の元データ(eTat)をコピー用領域にテキストで出力する
	var eTatCsv = "";
	if(0 < eTatDetail.length){
		if(typeof eTatDetail[0].pos === "undefined"){
			eTatDetail.forEach(function(e){
				eTatCsv +=  HJN.D2S(e.x, "yyyy/MM/dd hh:mm:ss.sss") +
							"," + e.y + "\n"; 
			});		
		}else{
			eTatDetail.forEach(function(e){
				eTatCsv += String.fromCharCode.apply(null,
							new Uint8Array(HJN.file, e.pos, e.len)) + "\n";
			})
		}
	}else{
		eTatCsv += "No log in the time."
	}
	document.getElementById("sliderData").value = eTatCsv;
	
	return eTatDetail;	// 詳細グラフ用eTatを返却する
}


/** ************************************ 
 * HJN.plotsアイコン用　HJN.Plot設定関連機能
 * ************************************ */
/**  plotsクリック時の処理 **/
HJN.PointClickCallback = function(p) {
	var hover = HJN.hoverXY, // { x: , pts:, row:, seriesName: };
		n = HJN.seriesConfig.findIndex(function(e){	return e.key === p.name; }),
		x = p.xval / 1000.0,
		y = p.yval;
	// グラフの日時で、詳細グラフを再作成する
	HJN.SetSliderRange(Math.floor(x));	// 秒単位に丸める
	HJN.seriesSetDetail = HJN.CreateSeries( HJN.GetSliderRangedEtat() );
	HJN.chartD.update(HJN.seriesSetDetail);	// 下段データを登録描画する
	
	// Hover表示しているplotを、HJN.plotsに登録し、plotsアイコンを再描画する
	HJN.PlotAdd(n, x, y);
	
	// Baloonを再描画する
	HJN.PlotShowBaloon();
	
	// concのとき指定時刻の処理中ログを、concData エリアに出力する
	HJN.SetConcTransToText(n, x);
}

/**  plotsダブルクリック時の処理（削除する） **/
HJN.PointDblClickCallback = function(p) {
	var n = HJN.seriesConfig.findIndex(function(e){	return e.key === p.name; }),
		x = p.xval / 1000.0,
		plots = [];

	// 指定plotを削除する
	for (var i = 0; i < HJN.plots.length; i++) {
		var e = HJN.plots[i];
		if( e.n !== n || e.x !== (p.xval / 1000.0)) plots.push(e);
	}
	HJN.plots = plots;
	HJN.PlotRender();
	// グラフ内の吹き出しを再表示する
	HJN.PlotShowBaloon();
}

/**  クリック時のHoverからHJN.plotsを設定する **/
HJN.PlotAdd　=　function(n, x, y) { // arg: HJN.hoverXY マウスクリック時の値
	var format = "hh:mm:ss.sss";
	HJN.plots.forEach(function(e,i,a){e.radio = false;});
	if (n === HJN.ETPS.N || n === HJN.CTPS.N) format = "hh:mm:ss";
	var label = HJN.D2S(x, format) + " " +  
				HJN.seriesConfig[n].label.replace("%N",HJN.N2S(y)),
		range = document.getElementById("DetailTimeRange").value;

	var i = HJN.plots.findIndex(
				function(p){ return (p.n === n && p.x === x); });
	if(i < 0){
		HJN.plots.push(	{label: label, ckBox:false, 
						 radio:true, n: n, x: x, y: y, range: range });
		HJN.plots.sort(
				function(a, b) { return a.x - b.x });
		i = HJN.plots.findIndex(
				function(p){ return(p.n === n && p.x === x); });
	}else{
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
	while (divCheckedPlots.firstChild){
		divCheckedPlots.removeChild(divCheckedPlots.firstChild);
	}
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
	// Baloonを再描画する
	HJN.PlotShowBaloon();
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
	// Baloonを再描画する
	HJN.PlotShowBaloon();
	// concのとき指定時刻の処理中ログを、concData エリアに出力する
	HJN.SetConcTransToText( HJN.plots[i].n, HJN.plots[i].x);
}

/**  HJN.plotsをjsonテキストに変換する **/
HJN.PlotCopy = function(textareaId) {
	var json = "",
		plots = [];
	// checkboxにチェックのないplotを削除する
	HJN.plots.forEach( function(p){
			if(p.ckBox || p.radio) plots.push(p);
		});
	HJN.plots = plots;
	HJN.PlotRender();
	// グラフ内の吹き出しを再表示する
	HJN.PlotShowBaloon();
	// plotsをjsonに変換し、copyエリアに貼り付ける
	json = 	JSON.stringify(HJN.plots);
	document.getElementById(textareaId).value = json;
	// copyエリアの文字列をクリップボードにコピーする
	HJN.CopyToClipboard(textareaId);
}
/**  jsonテキストからHJN.plotsを作成する **/
HJN.PlotLoad = function(textareaId) {
	var plots = [];
	var obj = JSON.parse(document.getElementById(textareaId).value);
	if( isSameType( [], obj) ){
		obj.forEach(function(e,i,a){
			if( isSameType( 0, e.x) ) plots.push(e);
		})
	}
	if( 0 < plots.length) HJN.plots = plots;
	HJN.PlotRender();
	// グラフ内の吹き出しを再表示する
	HJN.PlotShowBaloon();
	// 型判定
	function isSameType(sample, obj) {
	    var clas0 = Object.prototype.toString.call(sample),
	    	clas1 = Object.prototype.toString.call(obj);
	    return clas0 === clas1;
	}
}

/** ************************************
　* Baloonを再描画する *
　* ************************************ */
HJN.PlotShowBaloon =　function(){
	HJN.chart.showBaloon();
	HJN.chartD.showBaloon();
}



/** ************************************ 
 * Concの指定時刻に処理しているログをテキストエリア(concData)に出力する
 * ************************************ */
HJN.SetConcTransToText = function(n, x) {
	var text = "";
	if(n === HJN.CONC.N){
		var	conc = HJN.seriesSet[HJN.CONC.N],
			i = conc.findIndex(				// xをキーにconc配列位置を取得する
					function(e){ return(e.x == x) } ),
			trans = HJN.seriesSet[HJN.CONC.N][i].trans;
		if ( 0 <= i && 0 < trans.length){	// 出力テキストを編集する
			if(typeof trans[0].pos === "undefined"){
				// 初期表示データのとき、CSVを編集する
				trans.forEach(function(e){
					text +=  HJN.D2S(e.x, "yyyy/MM/dd hh:mm:ss.sss")
							+ "," + e.y + "\n"; 
				});	
			}else{
				// ログファイル読み込みの時、対象レコードを表示すう
				trans.forEach(function(e){
					text += String.fromCharCode.apply(null,
							new Uint8Array(HJN.file, e.pos, e.len)) + "\n";
				})
			}
		}
	}
	document.getElementById("concData").value = text;
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
        if (event.source == global && event.data == messageName) {
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
/** ログテキストを初期化する **/
HJN.ShowLogTextInit　=　function() {
	HJN.timestamp = new Date();
	HJN.logText = [];
}
/** ログテキストをテキストアレイに追記し、表示する **/
HJN.ShowLogText　=　function(text, isHideElaps) {
	var lastTimestamp = HJN.timestamp;
	HJN.timestamp = new Date();
	if (!isHideElaps) {
		text = (Math.round( this.timestamp - lastTimestamp ) / 1000.0) +
				"s " + text;
	}
	HJN.logText.push([ text ]);
	HJN.ShowText(HJN.logText);
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

/** ************************************ 
 * 指定されたtextareaを使って、クリップボードにコピーする
 * ************************************ */
HJN.CopyToClipboard　= function　(elementId)　{	// arg0:textareaのID名
	var area = document.getElementById(elementId);
    area.select();
    document.execCommand("copy");
} 
