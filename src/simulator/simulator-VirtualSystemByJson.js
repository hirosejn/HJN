import VirtualSystem from './simulator-VirtualSystem.js';
import * as Util from '../util/util.js';
/**
 * @memberOf Simulator
 * @class virtualSystemByJson
 * @classdesc 仮想システム生成ツール(virtualSystemByJson)
 *            <p>
 *            Util管理用クラス（スタティックメソッドのみ）のためコンストラクタは使用しない
 */
export default (function() { // #53
    "use strict";
    /** @constructor */
    function virtualSystemByJson(){
        if(!(this instanceof virtualSystemByJson)){
            return new virtualSystemByJson();
        }
    }

    /** @private */
    //

    // public
    
    // static
    /**
     * 初期表示用サンプルデータ(ETAT)を自動生成する
     * 
     * @memberof Simulator.VirtualSystemByJson
     * @param {String}
     *            [jsonText] シミュレーション条件JSONテキスト
     * @return {ETAT} 終了時刻のTAT（応答時間）時系列データ [{x:終了時刻(UNIX時刻の経過時間(秒)),
     *         y:レスポンス(秒)}]
     */
    // CreateSampleTatLog
    virtualSystemByJson.Execute = function(jsonText){ // #53
        "use strict";
        var vSys = {};
        // parse
        var json = JSON.parse(jsonText)
        // virtual system と resources の設定
        var log = (json.log !== undefined) ? json.log : false; // #59
        var start = (json.start !== undefined) 
                    ? Util.S2D(json.start) : new Date(1970,1,2);
        var end = start + Util.S2N(json.end, "24*h");
        var resources = json.resources;
        for (var i = 0; i < resources.length; i++) {
            resources[i].timeout = Util.S2N(resources[i].timeout, "10*sec");
            resources[i].qWait = Util.S2N(resources[i].qWait, "10*sec");
        }
        vSys = VirtualSystem(start, end, json.resources, log);
        // model の取得
        var models = json.models;
        for (var i = 0; i < models.length; i++) {
            var model = models[i];
            var name = Object.keys(model)[0]; // モデルの名称
            var m = model[name]; // モデル
            var baseModel = m.baseModel; // baseModel
            for (var j = 0; j < m.sequence.length; j++) {
                // 時間指定文字列を、ミリ秒数値に変換する（例："3*sec"->3000)
                m.sequence[j].tatMin = Util.S2N(m.sequence[j].tatMin);
                m.sequence[j].tat = Util.S2N(m.sequence[j].tat);
            }
            // sequenceに、baseModelを展開し、未開放リソースの開放処理を登録する
            models[name] = VirtualSystem.getModel(
                        baseModel.holds, 
                        Util.S2N(baseModel.tatMin), Util.S2N(baseModel.tat),
                        m.sequence, 
                        (typeof(m.times) === "number") ? m.times : 1, // #61
                        Util.S2N(m.thinkTimeMin), Util.S2N(m.thinkTime)); 
        }
        // client の設定
        var clients = json.clients;
        for (var i = 0; i < clients.length; i++) {
            var c = clients[i];
            var cStart = start + Util.S2N(c.start, 0);
            var cEnd   = start + Util.S2N(c.end, 24*60*60*1000);
            vSys.setClients(c.user, c.message, c.num, cStart, cEnd, models[c.model]);
        }
        if (log) console.log(vSys); // #59
        return vSys.execute();
    }

    /**
     * シミュレーション条件JSONテキストを作成する
     * 
     * @memberof Simulator.VirtualSystemByJson
     * @param {Number}
     *            [n = 0] シナリオ番号
     * @return {String} シミュレーション条件JSONテキスト
     */
    // CreateSampleTatLogJson
    virtualSystemByJson.GetJsonConfig = function(n){ // #53
        "use strict";
        n = (typeof(n) !== "undefined") ? n : 0;
        var jsonText = "";
        if (n === 0) {
            jsonText =  '{\n'
                + '"log" : 1,\n'
                + '"start" : "2017/01/02 00:00:00.000",\n'
                + '"end"   : "17.0*h",\n'
                + '"resources" : [\n'
                + '  {"type" :"WEB", "thread":1024,"timeout":"300*sec", "q":1280, "qWait":0},\n'
                + '  {"type" :"AP",  "thread":20,  "timeout":"300*sec", "q":1280, "qWait":0},\n'
                + '  {"type" :"DB",  "thread":10,  "timeout": "10*sec", "q":10,  "qWait":"10*sec"}\n'
                + '],\n'
                + '\n'
                + '"models" : [\n' // 取引モデル一覧
                + '  { "ON-1" : {\n' // オンライン取引1
                + '    "times": 60, "thinkTimeMin":"3*sec", "thinkTime": "10*sec",\n'
                + '    "baseModel":  {"holds": ["WEB","AP","DB"], "tatMin": "2*ms", "tat":"5*ms"},\n'
                + '    "sequence": [\n'
                + '      {"tatMin":30, "tat":50, "note":"select A"},\n'
                + '      {"tatMin":50, "tat":50, "note":"updateB", "hold":"TBL_B"},\n'
                + '      {"tatMin":80, "tat":100,"note":"updateC", "hold":"TBL_C"}\n'
                + '    ]}},\n'
                + ' { "ON-2" : {\n' // オンライン取引2
                + '    "times": 60, "thinkTimeMin":"500*ms", "thinkTime": "1*sec",\n'
                + '    "baseModel":  {"holds": ["WEB","AP","DB"], "tatMin": "2*ms", "tat":"5*ms"},\n'
                + '    "sequence": [\n'
                + '      {"tatMin":"100*ms", "tat":"500*ms", "hold":""}\n'
                + '    ]}},\n'
                + ' { "BATCH-1" : {\n' // バッチ取引3
                + '    "baseModel":  {"holds": ["DB"], "tatMin": "2*ms", "tat":"5*ms"},\n'
                + '    "sequence": [\n'
                + '      {"tatMin":"2*sec","tat":"5*sec","note":"updateB","hold":"TBL_B"}\n'
                + '    ]}}\n'
                + '],\n'
                + '\n'
                + '"clients" : [\n' // ユーザ作成条件
                + '  {"num":100,"start":"16.0*h", "end":"17.0*h", "model":"ON-1",  "user" :"userU", "message":"select A update B,C"},\n'
                + '  {"num": 20,"start":"16.5*h", "end":"16.6*h", "model":"ON-1",  "user" :"userT", "message":"select A update B,C 【増】"},\n'
                + '  {"num":100,"start":"16.0*h", "end":"17.0*h", "model":"ON-2",  "user" :"userS", "message":"排他なし(WEBのみ)"},\n'
                + '  {"num": 20,"start":"16.0*h", "end":"17.0*h", "model":"BATCH-1","user":"userB", "message":"バッチ処理 update B＊＊＊＊＊"}\n'
                + ']\n'
                + '}\n';
        } else if (n === 1) {
            // test用
            jsonText =  '{\n'
                + '"//" : "log（任意、デフォルト3）:詳細ログ出力指定(0:なし, 1:エラー時のみ, 2:+ETAT, 3:+push/pop, 4:+HOLD/FREE)",\n'
                + '"//" : "start/end:シミュレーション開始時刻/終了時刻",\n'
                + '"log" : 1,\n'
                + '"start" : "1970/01/02 00:00:00.000",\n'
                + '"end"   : "30.0*sec",\n'
                + '\n'
                + '"//" : "resources:sequenceのhold/freeで指定するリソース名の定義",\n'
                + '"//" : "type:リソース名、thread:最大同時hold数、timeout：holdタイムアウト時間",\n'
                + '"//" : "　　　　　　　　　　　q:最大hold待ち数、qWait:最大hold待ち時間",\n'
                + '"resources" : [\n'
                + '  {"type" :"DB",  "thread":2,  "timeout": "5*sec", "q":1,  "qWait":"2*sec"}\n'
                + '],\n'
                + '\n'
                + '"//" : "models:clientsで指定するモデル名(model)の定義、以下modelsで指定できる項目",\n'
                + '"//" : "baseModel:複数リソースのsequenceをまとめて宣言できる、sequenceに展開した後処理される、任意指定",\n'
                + '"//" : "sequence:指定された順にリソースを取得する、配列内に複数指定可、sequenceも複数指定可",\n'
                + '"//" : "hold：リソース名、holds(baseModelのみ指定可）：リソース一覧、各々にtat/tatMinが適用される",\n'
                + '"//" : "tat/tatMin：リソースの取得に要する平均/最小時間、tatMinのデフォルトはtat",\n'
                + '"//" : "　　　　　　★注：tatはリソースの使用時間ではない、リソース使用時間を指定す場合はfreeで指定",\n'
                + '"//" : "数値はミリ秒単位、*ms,*sec,*min,*h,*day 指定可",\n'
                + '"//" : "times：繰返し回数",\n'
                + '"//" : "thinkTime/thinkTimeMin：繰返し時の間隔の平均/最小時間、thinkTimeMinのデフォルトはthinkTime",\n'
                + '"//" : "free：[リソース名の配列]、指定リソースを開放する、free指定の無いリソースはシーケンスの最後にfreeされる",\n'
                + '"models" : [\n' // 取引モデル一覧
                + ' { "TEST-AB" : {\n' // テスト取引
                + '    "baseModel":  {"holds": ["DB"], "tatMin": "2*ms", "tat":"2*ms"},\n'
                + '    "sequence": [{"hold":"TBL_A", "tatMin":"1*sec", "tat":"1*sec"}],\n'
                + '    "sequence": [{"hold":"TBL_B", "tatMin":"3*sec", "tat":"3*sec"}],\n'
                + '    "times": 2, "thinkTimeMin":"1*sec", "thinkTime": "1*sec"}},\n'
                + ' { "TEST-BA" : {\n' // テスト取引
                + '    "baseModel":  {"holds": ["DB"], "tatMin": "2*ms", "tat":"2*ms"},\n'
                + '    "sequence": [{"hold":"TBL_B", "tatMin":"1*sec", "tat":"1*sec"}],\n'
                + '    "sequence": [{"hold":"TBL_A", "tatMin":"3*sec", "tat":"3*sec"}],\n'
                + '    "times": 2, "thinkTimeMin":"1*sec", "thinkTime": "1*sec"}}\n'
                + '    ],\n'
                + '\n'
                + '"//" : "clients：仮想アプリケーションの起動クライアントの定義",\n'
                + '"//" : "num:作成クライアント数、start～endの間で、ランダム（指数分布）に指定回数起動する",\n'
                + '"//" : "start/end:仮想クライアント作成/終了時刻、先頭で宣言したstartからの相対時刻",\n'
                + '"//" : "model:modelsで宣言したモデル名",\n'
                + '"//" : "user:user+通番 のユーザ名で仮想クライアントが作成される",\n'
                + '"clients" : [\n' // ユーザ作成条件
                + '  {"num": 1,"start":"0*sec", "end":"0*sec", "model":"TEST-AB","user" :"testAB1"},\n'
                + '  {"num": 1,"start":"1*sec", "end":"1*sec", "model":"TEST-AB","user" :"testAB2"},\n'
                + '  {"num": 1,"start":"3*sec", "end":"3*sec", "model":"TEST-BA","user" :"testBA3"},\n'
                + '  {"num": 1,"start":"4*sec", "end":"4*sec", "model":"TEST-BA","user" :"testBA4"}\n'
                + ' ]\n'
                + '}\n';
        }

        return jsonText; 
    }

    /* new */
    return virtualSystemByJson;
}());