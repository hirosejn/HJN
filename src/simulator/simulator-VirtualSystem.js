import {VirtualResource} from './simulator.js';
import {VirtualApp} from './simulator.js';
import * as Util from '../util/util.js';
/**
 * @memberOf Simulator
 * @class VirtualSystem
 * @classdesc 仮想システム
 *            <p>
 *            Web3層(Web-AP-DB)をシミュレートしたWebのTATログ生成する
 *            <p>
 *            Webサーバ<br>
 *            最大スレッド数： Apache 2.4 [MaxClients = 1024]<br>
 *            JBossトランザクションタイムアウト [default-timeout = 300 秒]<br>
 *            キュー長 ： Apache 2.4 ListenBackLog (511) + Linux
 *            tcp_max_syn_backlog(769=1024*0.75+1)、タイムアウトなし<br>
 *            APサーバ<br>
 *            最大スレッド数(maxThreads)<br>
 *            JBossトランザクションタイムアウト [default-timeout=300 秒]<br>
 *            DBサーバ 最大コネクション数(max_connections)
 * 
 * @param {Number}
 *            [start = 1970/01/02 00:00:00)] シミュレート開始時刻（UNIX日付（ミリ秒））
 * @param {Number}
 *            [end = startの24時間後] シミュレート終了時刻（UNIX日付（ミリ秒））
 * @param {String}
 *            [resourcesJson] リソース指定JSONテキスト
 * @param {Boolean}
 *            [log=false] 詳細ログ出力有無
 * @example sim = simulator.VirtualSystem()
 */
export default (function() { // #53　
    /** @constructor */
    function VirtualSystem(start, end, resourcesJson, log){
        if(!(this instanceof VirtualSystem)){
            return new VirtualSystem(start, end, resourcesJson, log);
        }
        if (!resourcesJson) {
            var jsonText =  '['
                +   '{"type" :"WEB","thread":1024,"timeout":300000, "q":1280, "qWait":0},'
                +   '{"type" :"AP", "thread":20,  "timeout":300000, "q":1280, "qWait":0},'
                +   '{"type" :"DB", "thread":2,   "timeout": 10000, "q":1000, "qWait":10000}'
                + ']';
            resourcesJson = JSON.parse(jsonText);
        }
        this.eTat = []; // シミュレートにより生成するTATログ出力先
        var _resources = resourcesJson;
        this._log = log ? log : false; // #53
        this._start = +start || new Date(1970, 1, 2);   // シミュレート開始時刻
        this._end = end || this._start + 24*60*60*1000; // シミュレート終了時刻（デフォルト：24時間後)
        this._simulator = Util.Heap(                // イベント予約スケジュール（ヒープ）
                function(obj){ return obj.getTime(); }, // プライオリティの判定
                function(obj){ return obj; });  // 削除対象の判定 #61
        this._now = 0; // シミュレーション時の現在時刻
        // リソースを設定する
        this._resources = {}
        for (var i = 0; i < _resources.length; i++) {
            var e = _resources[i];
            e.log = e.log ? e.log : this._log; // #53
            this._resources[e.type] = VirtualResource(this, // #61
                    e.type, e.thread, e.timeout, e.q, e.qWait, e.log);
        };
        VirtualSystem.debug = this; // ★
    }

    /** @private */
    //

    // public
    /**
     * 仮想クライアントをスケジューラに登録する
     * 
     * @memberof Simulator.VirtualSystem
     * @param {String}
     *            [userName = "Default_"] ログに出力するユーザ名
     * @param {String}
     *            [message = ""] ログの末尾に出力するデータ
     * @param {Number}
     *            [num = 3] 期間内に生成する仮想クライアントの数
     * @param {Number}
     *            [start = Util.S2D("1970/01/02 00:00:00")]
     *            仮想クライアント生成開始時刻（UNIX時刻の数値、ミリ秒）
     * @param {Number}
     *            [end = startの0.1秒後] 仮想アプリケーション強制終了時刻（UNIX時刻の数値、ミリ秒）
     * @param {Object}
     *            model 仮想クライアントが実行する取引モデル
     */
    VirtualSystem.prototype.setClients = function(userName, message, num, start, end, model) {
        userName = userName || "Default_";
        message = message || "";
        num = (typeof(num) === "number") ? num : 1; // #61
        start = +start || Util.S2D("1970/01/02 00:00:00");
        end = +end || start + 100;
        // baseModelが指定されているとき、modelに展開する
        if (model.baseModel){
            model = VirtualSystem.getModel(
                model.baseModel.holds, model.baseModel.tatMin, model.baseModel.tat,
                model.sequence, model.times, model.thinkTimeMin, model.thinkTime);
        }
        // modelにmessageを設定する
        if (typeof(model.message) === "string") {
            model.message += message;
        } else {
            model.message = message;
        }
        // 仮想APを登録する
        var checkStart = start;
        var r = Util.Random((end - start) / num);
        var t = start;
        for (var i = 0; i < num; i++) {
            // 仮想APを作成する
            var vApp = VirtualApp(userName + i, model);
            // 仮想APに開始時刻（指数分布）を設定し、登録する
            t += Math.round(r.exponential());
            this.setEvent(vApp.start(t));
        }
    };
    
    /**
     * イベントをスケジューラに登録する
     * 
     * @memberof Simulator.VirtualSystem
     * @param {Object}
     *            event 仮想クライアントもしくは仮想リソースのイベント
     */
    VirtualSystem.prototype.setEvent = function(event) {
        this._simulator.push(event);
    }

    /**
     * スケジューラからイベントを削除する
     * 
     * @memberof Simulator.VirtualSystem
     * @param {Object}
     *            event 仮想クライアントもしくは仮想リソースのイベント
     */
    VirtualSystem.prototype.removeEvent = function(event) {
        this._simulator.del(event);
    }

    /**
     * シミュレーションを実行する
     * 
     * @memberof Simulator.VirtualSystem
     * @return {eTat} シミュレート実行結果のログ（this.eTat）
     */
    VirtualSystem.prototype.execute = function() {
        var event, events;
        // 処理対象がなくなるか、シミュレート終了時刻になるまでシミュレートする
        while(0 < this._simulator.size() &&
                this._simulator.top().getTime() <= this._end ) {
            // 次にイベントを迎える仮想APを取り出し、「次の処理」をシミュレートする
            event = this._simulator.pop();
            this._now = event.getTime(); // #59
            events = event.next(this);
            // 「次の処理」のシミュレートに伴い発生したイベントを、スケジュールする
            while (events.length) {
                this._simulator.push(events.pop());
            }
        }
        // シミュレーション終了後処理（処理中のvAppを強制終了する） #59
        while(0 < this._simulator.size()){
            event = this._simulator.pop();
            if (event._finish) {
                event._finish(this, "N_EoS", "", this._end);
            }
        }
        // シミュレーション終了後処理（リソース開放待ちのvAppを強制終了する） #59
        for (var key in this._resources){
            this._resources[key]._finish(this, "N_EoS", "", this._end);
        }
        
        return this.eTat;
    };

    /**
     * リソースを取得する
     * 
     * @memberof Simulator.VirtualSystem
     * @param {String}
     *            [name = "unlimited"] 仮想リソース名
     * @return {Object} 仮想リソース（登録されていないときは、新たにholdCapacity=1の仮想リソースを登録）
     */
    VirtualSystem.prototype.getResouce = function(name) {
        if (typeof(this._resources[name]) === "undefined") {
            this._resources[name] = VirtualResource(this, name);
        }
        return this._resources[name];
    };

    /**
     * シミュレーション現在時刻（処理中のイベントの時刻）を返却する
     * 
     * @memberof Simulator.VirtualSystem
     * @return {Number} イベント時刻（UNIX時刻：ミリ秒）
     */
    VirtualSystem.prototype.getTime = function() {
        return this._now;
    };


    // Static Method
    /**
     * 取引モデルを取得する（ユーティリティ）
     * 
     * @memberof Simulator.VirtualSystem
     * @param {Array}
     *            [baseModel = []] 使用リソースの一覧["WEB","AP","DB"]
     * @param {Number}
     *            [tat = 5] 使用リソースの平均取得時間＆平均開放時間
     * @param {Number}
     *            [tatMin = 2] 使用リソースの最小取得時間＆最小開放時間
     * @param {Array}
     *            [sequence = []] イベントシーケンス
     * @param {Number}
     *            [times = undefined] イベントシーケンスの繰り返し回数（未指定時:1)
     * @param {Number}
     *            [thinkTime= undefined] イベントシーケンス終了時に再実行する場合の平均再開時間（未指定時:500)
     * @param {Number}
     *            [thinkTimeMin = undefined]
     *            イベントシーケンス終了時に再実行する場合の最小再開時間（未指定時:thinkTimeと同じ）
     * @param {String}
     *            [message = ""] 自動生成ログの末尾に追加する文字列
     * @return {Object} 取引モデル
     */
    VirtualSystem.getModel = function(baseModel, tatMin, tat, sequence, times, thinkTimeMin, thinkTime, message) {
        baseModel = baseModel || [];
        tatMin = tatMin || 2;
        tat = tat || 5;
        message = message || "";
        sequence = sequence || [
                {tatMin:6,   tat:15,  note:"Req",     hold:"DB",    free:[]},
                {tatMin:70,  tat:100, note:"selectA", hold:"TBL_A", free:["TBL_A"]},
                {tatMin:150, tat:200, note:"updateB", hold:"TBL_B", free:[]},
                {tatMin:30,   tat:50,  note:"Res",     hold:"",      free:["TBL_B","DB"]}
            ];
        var model = {sequence :[], message : message}; // 戻り値
        if (typeof(times) === "number") model.times = times;
        if (typeof(thinkTimeMin) === "number") model.thinkTimeMin = thinkTimeMin;
        if (typeof(thinkTime) === "number") model.thinkTime = thinkTime;
        
        // baseModelを返却用シーケンスに展開する
        baseModel.forEach( function(e) {
            model.sequence.push({hold:e, tatMin:tatMin, tat:tat, free:[]});
        });
        // 指定シーケンスを返却用シーケンスに追加する
        model.sequence = model.sequence.concat(sequence);

        // 返却用シーケンスに、holdingを追加するとともにシーケンス終了時未開放リソースを取得する
        var resources = []; // #61
        var holding = []; // #59
        model.sequence.forEach( function(tran) { // #61
            // tatMinがtatより大きいとき、tatをtatMin一定とする #59
            if (tran.tat < tran.tatMin) tran.tat = tran.tatMin;
            // 処理開始時にholdしているリソース一覧をholdingに登録する #59
            tran.holding = [];
            resources.forEach(function(r) {tran.holding.push(r)});
            // 未開放リソース一覧を更新する
            if (typeof(tran.hold) !== "undefined" && tran.hold !== "") {
                resources.push(tran.hold);                
            }
            if (tran.free) {
                tran.free.forEach( function(free){
                    resources.some( function(r, i){
                        if (r == free) {
                            resources.splice(i,1);
                            return true;
                        }
                    })    
                })
            }
        }, this);
        // シーケンス終了時未開放リソースが残っているとき、返却用シーケンスにリソース開放処理を追加する
        if (0 < resources.length){
            model.sequence = model.sequence.concat(
                    [{hold: "", tatMin: tatMin * baseModel.length, tat: tat * baseModel.length,
                        free: resources.reverse()}]);
        }
        return model;
    };
    
    /* new */
    return VirtualSystem;
}());
