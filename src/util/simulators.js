"use strict";
import * as Util from './utils.js';

/**
 * @class
 * @classdesc 仮想システム(VirtualSystem)
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
export var VirtualSystem = (function() { // #53
    "use strict";
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
     * @memberof simulator.VirtualSystem
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
     * @memberof simulator.VirtualSystem
     * @param {Object}
     *            event 仮想クライアントもしくは仮想リソースのイベント
     */
    VirtualSystem.prototype.setEvent = function(event) {
        this._simulator.push(event);
    }

    /**
     * スケジューラからイベントを削除する
     * 
     * @memberof simulator.VirtualSystem
     * @param {Object}
     *            event 仮想クライアントもしくは仮想リソースのイベント
     */
    VirtualSystem.prototype.removeEvent = function(event) {
        this._simulator.del(event);
    }

    /**
     * シミュレーションを実行する
     * 
     * @memberof simulator.VirtualSystem
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
     * @memberof simulator.VirtualSystem
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
     * @memberof simulator.VirtualSystem
     * @return {Number} イベント時刻（UNIX時刻：ミリ秒）
     */
    VirtualSystem.prototype.getTime = function() {
        return this._now;
    };


    // Static Method
    /**
     * 取引モデルを取得する（ユーティリティ）
     * 
     * @memberof simulator.VirtualSystem
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


/**
 * @class
 * @classdesc 仮想アプリケーション(VirtualApp)
 * 
 * @param {String}
 *            [userName = "dafault"] ログに出力するユーザ名
 * @param {Array}
 *            [sequence = SQL３個のオン処理] 取引の処理シーケンスを格納した配列
 * @param {Number}
 *            [times = 2 回] 繰返し回数
 * @param {Number}
 *            [thinkTime = 300 ms] 繰返し時の次回処理開始までの平均時間(ミリ秒）
 */
export var VirtualApp = (function() { // #53
    "use strict";
    /** @constructor */
    function VirtualApp(userName, model){
        if(!(this instanceof VirtualApp)){
            return new VirtualApp(userName, model);
        }
        this._userName = userName || "default"; // ログ出力テキスト
        // 定数の設定
        // イベントシーケンスを取得する
        if (typeof(model) === "undefined") model = {}
        model.baseModel = model.baseModel || {"holds": []};
        this._sequence = model.sequence;
        // イベントシーケンスの繰り返し回数
        this._times = (typeof(model.times) !== "undefined") ? model.times : 1;
        // イベントシーケンス終了時に再実行する場合の平均再開時間
        this._thinkTime = Math.max(0,
                (typeof(model.thinkTime) !== "undefined") ? model.thinkTime : 500);
        // イベントシーケンス終了時に再実行する場合の最小再開時間
        this._thinkTimeMin = Math.max(0,
                (typeof(model.thinkTimeMin) !== "undefined") ? model.thinkTimeMin : 500);
        // メッセージ（ログ末尾に付与する文字列）
        this._baseMessage = model.message + "\n";
        this._message = "";
        this._history = []; // #62

        // 変数の設定
        this._startTime = Number.MIN_SAFE_INTEGER; // イベントシーケンス開始時刻（UNIX時刻：ミリ秒）
        this._sequenceTime = Number.MIN_SAFE_INTEGER; // シミュレータに登録したイベントの時刻（現在時刻）
        this._sequenceIdx = 0;    // シミュレータに登録したイベントシーケンスの位置
    }

    /** @private */
    //

    // public

    
    /**
     * シミュレータのログを出力する
     * 
     * @memberof simulator.VirtualApp
     * @param {Number}
     *            logLv ログレベル（isLog <= logLvのときログ出力する）<br>
     *            (0:なし, 1:エラー時のみ, 2:+ETAT, 3:+push/pop, 4:+HOLD/FREE)
     * @param {boolean}
     *            isLog ログ出力レベル
     * @param {Number}
     *            time 日時を表す数値（ミリ秒）
     * @param {Object}
     *            vApp 仮想アプリ
     * @param {Object}
     *            resource リソース
     * @param {String}
     *            text ログテキスト
     * @param {String}
     *            highText 強調表示テキスト
     */
    VirtualApp.prototype.logger = function(logLv, isLog, time, vApp, resource, text, highText) {
        // 0:なしの時
        if (!isLog) return;
        var errCode = 0;
        if (resource && (resource._holdHeap.size() !== resource._holdingQty)) {
            // エラー時★
            errCode = 1;
            highText = highText ? highText + "　unkown error!!" : "　unkown error!!";
        } else if (logLv > +isLog) {
            return; 
        }
        
        // エラーログ編集
        var user = vApp ? " " + vApp._userName : " ";
        var resourceText = resource ? (" [" + resource._name + " wait:"
                + resource._waitHeap.size() + "hold:"
                + resource._holdHeap.size() + "="
                + resource._holdingQty + " qty] ") : " ";
        text = text || "";
        var logText = Util.D2S(this.getTime(),"hh:mm:ss.ppp",true) 
                    + user +"(" + this._times + "-" + this._sequenceIdx + ")"
                    + resourceText 
                    + text;
        highText = highText || "";

        // エラー時の強制補正★
        var modify = "";
        if (errCode === 1) { // リソースヒープもしくはリソース量を強制補正する
            var deleted = undefined;
            if (resource._holdHeap.size() < resource._holdingQty) {
                deleted = resource._holdHeap.del(this);
            }
            if (deleted){
                modify = "FORCE★: holdHeap.del(" + deleted.userName + ")";
            } else {
                modify = "FORCE★: holdingQty modified"
                    resource._holdingQty = resource._holdHeap.size();
            }
        }
                
        // エラーログ出力
        if (highText || modify){
            console.log(logText + " %o", highText + " " + modify);
        } else {
            console.log(logText);
        }
    }

    /**
     * 取引を開始する
     * 
     * @memberof simulator.VirtualApp
     * @param {Number}
     *            startTime 開始時刻（UNIX時刻：ミリ秒）
     * @return {Object}仮想アプリケーション(this)
     */
    VirtualApp.prototype.start = function(startTime) {
        this._times--; // イベントシーケンスの繰り返し回数を1減らす
        this._sequenceIdx = 0;    // シミュレータに登録したイベントシーケンスの位置
        this._startTime = startTime;      // イベントシーケンス開始時刻（UNIX時刻：ミリ秒）
        this._sequenceTime = startTime;   // シミュレータに登録したイベントの時刻
        this._message = this._baseMessage; // ログ末尾に出力する文字列の初期化
        this._history = []; // ログ末尾に出力する状態遷移履歴情報の初期化 #62
        this.addHistory("start");
        return this;
    };

    /**
     * イベント時刻を返却する
     * 
     * @memberof simulator.VirtualApp
     * @return {Number} イベント時刻（UNIX時刻：ミリ秒）
     */
    VirtualApp.prototype.getTime = function() {
        return this._sequenceTime;
    };

    /**
     * リソース使用量を返却する
     * 
     * @memberof simulator.VirtualApp
     * @param {Object}
     *            [resource| 指定なしのとき1.0を返却する] リソース
     * @return {Number} リソース使用量
     */
    VirtualApp.prototype.getAmount = function(resource) {
        return 1.0;
    };

    /**
     * 次の状態に遷移する、シーケンス終了時TATログを出力する
     * 
     * @memberof simulator.VirtualApp
     * @param {Object}
     *            system VirtualSystem
     * @return {Array}再スケジュールするイベント（仮想アプリケーションorリソース）の配列、登録処理完了時はthisを含まない
     */
    VirtualApp.prototype.next = function(system) {
        this.logger(4, system._log, system.getTime(), this, undefined, 'NEXT', undefined);
        var events = []; // 戻り値
        var ret = {result: true, events: [this]};
        
        if (this._sequenceIdx < this._sequence.length) { // イベントシーケンス処理途中のとき
            var seq = this._sequence[this._sequenceIdx]; // 現在の処理シーケンス位置
            // holdリソースを取得する
            if (seq.hold && seq.hold !== "") {
                // holdリソースが指定されているとき、指定リソースを確保する（確保できたとき[this]が戻り値）
                ret = system.getResouce(seq.hold).hold(system, this); // #61
                events = ret.events;
            } else {
                // holdリソースが指定されていないとき、無条件に自身をスケジュール対象に加える
                events = [this];
            }
            // リソースを確保できたとき、該当シーケンスを完了させる
            if (0 < events.length && (0 <= this._times) && ret.result) { // #61
                // 完了した処理の処理時間を加える
                var tatAdd = Math.ceil(Util.Random().exponential(seq.tat - seq.tatMin));
                this.setSequenceTime(this._sequenceTime += seq.tatMin + tatAdd, seq.hold); // #61
                // シーケンスのfreeで指定されているリソースの解放
                if (seq.free) {
                    for (var i = 0; i < seq.free.length; i++) {
                        events = events.concat(system.getResouce(seq.free[i]).free(this));
                    }
                }
                // 次の処理を参照する（ シミュレータに登録したイベントシーケンスの位置）
                this._sequenceIdx++;
            }
            return events;
        }
        
        // イベントシーケンスを終えたときTATログを出力する(this._sequenceIdx >= this._sequence.length)
        var vApp = this._finish(system, "N_000");
        // シーケンスをstart状態に設定する
        // this._sequenceTime = system.getTime(); はfinishで更新されるので不可
        // this._startTime = this._sequenceTime; finishで設定する
        // 繰返し処理を継続する場合、自アプリケーションを再スケジュールする
        if (vApp) {
            events.push(this);
        }
        return events;
    };

    /**
     * Freeに伴い、次の状態に遷移する
     * 
     * @memberof simulator.VirtualApp
     * @param {Number}
     *            [time | 変更しない} イベント時刻（UNIX時刻：ミリ秒）
     * @param {String}
     *            status ログに追記する時刻設定理由文字列
     * @return {Object} 仮想アプリケーション(this)
     */
    VirtualApp.prototype.setSequenceTime = function(time, status) {
        status = status || ""; 
        // 解放された時刻をイベント時刻に設定する
        this._sequenceTime = time;
        // ログに状態遷移履歴を追記する
        return this.addHistory(status);
    };

    /**
     * ログにステータス変更履歴を追記する
     * 
     * @memberof simulator.VirtualApp
     * @param {String}
     *            status ログに追記する状態遷移の理由文字列
     * @param {Number}
     *            time 状態遷移時刻（ミリ秒）
     * @return {Object} 仮想アプリケーション(this)
     */
    VirtualApp.prototype.addHistory = function(status, time) {
// var timeStr = "";
// if (typeof(time) === "number") {
// timeStr = Util.D2S(time, "mm:ss.ppp", true) + " seq:"
// }
// this._message += " [" + this._sequenceIdx + ":" + status + "]" // #61
// + timeStr + Util.D2S(this._sequenceTime, "mm:ss.ppp", true);
        // 状態遷移履歴（ログ出力用）を追加する
        this._history.push({ // #62
            sequenceIdx : this._sequenceIdx,
            status : status,
            time : time,
            sequenceTime : this._sequenceTime
        });
        return this;
    };
    
    /**
     * アベンド処理（holdしている可能性のあるリソースを解放し、イベントシーケンスを強制終了する）
     * 
     * @memberof simulator.VirtualApp
     * @param {Object}
     *            system VirtualSystem
     * @param {Object}
     *            holdedResource アベンドさせたVirtualResource
     * @param {String}
     *            [logID="E_600"] ログID
     * @param {String}
     *            [logMesseage=""] ログメッセージ
     * @param {Boolean}
     *            [isHolding=true] リソース(holdedResource)をholdしているか否か<br>
     * @param {Number}
     *            [abendTime=sytem.getTime()] abend時刻
     * @return {Array}再スケジュールするイベント（仮想アプリケーションorリソース）の配列、登録処理完了時はthisを含まない
     */
    VirtualApp.prototype.abend = function(system, holdedResource, 
                                    logID, logMesseage, isHolding, abendTime) {
        logID = logID || "E_600";
        abendTime = abendTime || system.getTime();
        isHolding = (typeof(isHolding) === "boolean") ? isHolding : true; // #61
        var events = []; // 戻り値
        this.logger(3, system._log, this._sequenceTime, this, holdedResource, 'abend', undefined);
        var seq = this._sequence[this._sequenceIdx];
        // 現在のシーケンスでholdするリソースがあるとき、waitしている可能性があるため、waitから削除する
        if (seq && seq.hold) { // #61
            system._resources[seq.hold].release(this);
        }
        // holdingリソースを開放する
        var holdings;
        // シーケンスから、holdingリソース一覧を取得する #59
        if (seq) holdings = seq.holding;
        if (holdings) { // シーケンス上holdingリソースがあるとき(undefined対策） #61
            for (var i = holdings.length - 1; 0 <= i; i--) { // #61
                // holdedResourceは削除処理対象外（呼び出し元リソースは、呼び出し前に削除済なので）
                if (holdings[i] !== holdedResource._name || isHolding){ // #61
                    // holdingリソースを開放し、使用リソース減に伴って新たにスケジュールするvAppを取得 #59
                    events = events.concat(system._resources[holdings[i]].free(this));
                }
            }
        }
        // イベントシーケンスを強制終了する
        this.setSequenceTime(abendTime, logID); // #59
        var vApp = this._finish(system, logID, logMesseage);
        // 自vAppに継続処理があれば、自vAppをスケジュール対象に加える
        if (vApp && (0 <= this._times)) { // #61
            events = events.concat([vApp]);
        }
        return events;
    };
    
    /**
     * イベント終了時処理（ログ出力と、繰り返し判定）
     * 
     * @memberof simulator.VirtualApp
     * @param {Object}
     *            system VirtualSystem
     * @param {String}
     *            [logID="N_000"] ログID（ログメッセージの先頭文字）
     * @param {String}
     *            [logMesseage=""] ログメッセージ
     * @param {Number}
     *            [forceTime] 強制終了時刻を指定する（ミシュレーション停止後のeTat強制出力用）
     * @return {Object|undefined} 再スケジュールするときthis、再スケジュールしないときundefined
     */
    VirtualApp.prototype._finish = function(system, logID, logMesseage, forceTime) {
        logID = logID || "N__00";
        logMesseage = logMesseage || "";
        var events = []; // 戻り値
        var logText = logID + " " + this._userName + " " + logMesseage + " " + this._message;
        var now = this._sequenceTime;

        // 強制終了時（シミュレーション終了時刻到来時）、自APのシミュレーションを強制終了する
        if (typeof(forceTime) === "number") {
            // 起動済処理はTATログを出力する #59
            if (this._startTime <= forceTime) { 
                // TATログを出力する
                system.eTat.push( { x: forceTime, 
                                    y: Math.round(forceTime - this._startTime),
                                    sTatIdx: 0,
                                    message: logText,
                                    history: this._history} ); // #62
                this.logger(2, system._log, forceTime, this, undefined, 'finish() FORCE"', logText);
            }
            this._sequenceIdx = this._sequence.length; // #61 処理完了状態にする
            this._startTime = this._sequenceTime; // #61 念のため設定
            return undefined;
        }
        
        // 起動済処理はTATログを出力する #59
        if (this._startTime <= now ) { // || this._sequenceIdx ===
                                        // this._sequence.length) {
            system.eTat.push( { x: now,
                                y: Math.round(now - this._startTime),
                                sTatIdx: 0,
                                message: logText,
                                history: this._history} ); // #62
            this.logger(2, system._log, now, this, undefined, 'finish() "', logText);
        } else  {
            this.logger(0, system._log, now, this, undefined,
                    'finish() Unexpected error★ _startTime > _sequenceTime:'
                    + Util.D2S(this._startTime, "hh:mm:ss.ppp", true)
                            + " " + this._startTime + " > " + now
                            + " Idx:" + this._sequenceIdx 
                    , logText);
        }
        this._message = this._baseMessage; // ログ末尾に追加するメッセージの初期化
 
        // 継続判定
        if (0 < this._times) { // イベントシーケンスを繰り返すとき
            // イベント時刻にThink time（指数分布）を加える
            var nextTime = this.getTime() + this._thinkTimeMin;
            if (this._thinkTimeMin < this._thinkTime) {
                nextTime += Math.ceil(Math.abs( // #61
                        Util.Random().exponential(this._thinkTime - this._thinkTimeMin)));
            }
            // 処理の先頭に戻る
            return this.start(nextTime);
        }
        // イベントシーケンスを継続しない時(this._times < 0)
        this._times--;       // イベントシーケンスの繰り返し回数を1減らす
        this._sequenceIdx = this._sequence.length; // #61 処理完了状態にする
        this._startTime = this._sequenceTime; // #61
        return undefined;
    };

    /* new */
    return VirtualApp;
}());

/**
 * @class
 * @classdesc 仮想リソース(VirtualResource)
 * 
 * @param {Object}
 *            system 仮想システム（シミュレーション中の現在時刻取得等に用いる）
 * @param {String}
 *            [name = "unlimited"] リソース名（"unlimited"はリソース解放待ちを管理しない）
 * @param {Number}
 *            [holdCapacity = 1.0] 保有リソース総量（数）
 * @param {Number}
 *            [timeout = 10秒] 処理のタイムアウト時間（未使用）
 * @param {Number}
 *            [waitCapacity = Number.MAX_SAFE_INTEGER]
 *            リソース取得待ちキューの深さ（数）、キュー溢れ時は即時エラー終了しリソース処理しない
 * @param {Number}
 *            [queueWait = 10秒] 最大キュー滞留時間（リソース取得待ちタイムアウト時間）
 * @param {Boolean}
 *            [log=false] 詳細ログ出力有無
 */
export var VirtualResource = (function() { // #53
    "use strict";
    /** @constructor */
    function VirtualResource(system, name,
                        holdCapacity, timeout, waitCapacity, queueWait, log){
        if(!(this instanceof VirtualResource)){
            return new VirtualResource(system, name,
                        holdCapacity, timeout, waitCapacity, queueWait, log);
        }
        this._system = system;
        this._name = name || "unlimited";
        this._log = log ? +log : 0; // #59

        // 処理待ち管理用
        this._waitTimeout = (typeof(queueWait) !== "undefined")
                                ? queueWait : 10000;   // キュー滞留時間上限
        this._waitCapacity  = (typeof(waitCapacity) !== "undefined")
                                ? waitCapacity : Number.MAX_SAFE_INTEGER; // キューの深さ
        this._waitHeap = Util.Heap(    // リソース解放待ちキュー（登録時間順）
                function(obj){ return obj.getTime(); });
        
        // リソース管理用
        this._holdTimeout  = (typeof(timeout)  !== "undefined") 
                                ? timeout : 10000;   // 処理のタイムアウト時間
        this._holdCapacity = (typeof(holdCapacity) !== "undefined")
                                ? holdCapacity : 1.0;   // 保有リソース量（数）
        this._holdingQty = 0;   // 使用リソース量
        this._holdHeap = Util.Heap( // 処理のタイムアウト管理用ヒープ{obj:,val:} #59
                 function(node){ return node.val; }, // valはタイムアウト時刻
                 function(node){ return node.obj; }); // objはvApp
        
        // イベントスケジュール制御用
        this._sequenceTime = 0;   // シミュレータに登録したイベントの時刻（タイムアウトチェック用）
        this._isScheduled = false; // シミュレータにタイムアウトチェックイベントをスケジュールしたか
        if (0 < this._waitTimeout && 0 < this._holdTimeout){ // スケジュール間隔 #61
            this._interval = Math.min(this._waitTimeout, this._holdTimeout);
        } else if (0 < this._waitTimeout) {
            this._interval = this._waitTimeout;
        } else if (0 < this._holdTimeout) {
            this._interval = this._holdTimeout;
        } else {
            this._interval = 0;
        }
    }

    /** @private */
    //

    // public
    /**
     * リソースチェックイベント（タイムアウトチェック）を開始する
     * 
     * @memberof simulator.VirtualResource
     * @param {Number}
     *            startTime 開始時刻（UNIX時刻：ミリ秒）
     * @param {Object}
     *            system VirtualSystem
     * @return {Object} イベント(this)
     */
    VirtualResource.prototype.start = function(startTime, system) { // #59
        this._sequenceTime = startTime + this._interval; // シミュレータに登録するイベントの時刻
        system.setEvent(this);    // シミュレータにタイムアウトチェックイベントをスケジュールする
        this._isScheduled = true; // 「シミュレータにタイムアウトチェックイベントをスケジュールしたかフラグ」をON
        return this;
    };
    
    /**
     * イベント時刻を返却する
     * 
     * @memberof simulator.VirtualResource
     * @return {Number} イベント時刻（UNIX時刻：ミリ秒）
     */
    VirtualResource.prototype.getTime = function() {
        return this._sequenceTime;
    };
    
    /**
     * タイムアウトチェック用仮想イベント
     * 
     * @memberof simulator.VirtualResource
     * @param {Object}
     *            system VirtualSystem
     * @return {Array}再スケジュールするイベント（仮想アプリケーションorリソース）の配列、登録処理完了時はthisを含まない
     */
    VirtualResource.prototype.next = function(system) {
        var events = []; // 戻り値
        var now = this.getTime();
        // リソース解放待ち時間がタイムアウトしたappをタイムアウトさせる
        var queuedTime = Number.MIN_SAFE_INTEGER; 
        while (0 < this._waitHeap.size() && this._waitTimeout <= now - queuedTime) {
            queuedTime = this._waitHeap.top().getTime();
            if (this._waitTimeout <= now - queuedTime) { // キューイング取引がタイムアウトしているとき
                // リソース解放待ちHeapからfreeするappを取り出す
                var app = this._waitHeap.pop();
                // appをアベンドさせる(holdリソース解放なし）
                var apps = app.abend(system, this, "E_QTO", this._name + " queue timeout",
                        false, queuedTime + this._waitTimeout); // appにfree時刻をセットする
                // appsをスケジュールイベント登録対象に加える
                if (apps.length){
                    events = events.concat(apps);
                }
            }
        }
        // リソース使用時間がタイムアウトしたappをタイムアウトさせる #59
        var holdTimeoutTime = Number.MIN_SAFE_INTEGER;
        while (0 < this._holdHeap.size() && holdTimeoutTime <= now) {
            var top = this._holdHeap.top();
            holdTimeoutTime = top.val;
            if (holdTimeoutTime <= now) { // 処理中取引がタイムアウトしているとき #61
                var app = top.obj;
                // appがスケジュールされている場合削除する（スケジューラに登録されていない場合何も起きない）
                system.removeEvent(app);
                // appの使用時間がタイムアウトしたリソースを解放する（注：abendで解放させると永久ループする）
                events = events.concat(this.free(app));                
                // appをタイムアウト時刻にアベンドさせる(holdリソース解放を伴う）
                events = events.concat(app.abend(system, this,"E_HTO", 
                            this._name + " hold timeout", false, holdTimeoutTime));
            }
        }
        // 次回タイムアウトチェック時刻を設定する
        if ((0 < this._waitHeap.size()) || (0 < this._holdHeap.size())) {
            // タイムアウトの設定があるとき、 #61
            // リソース解放待ちvAppがあるとき、(タイムアウトしていない)最古vAppのタイムアウト時刻
            // リソース解放待ちvAppがないとき、現在からタイムアウト時刻後 にスケジュールする
            var nextWaitTimeout = Number.MAX_SAFE_INTEGER;
            if (0 < this._waitTimeout) {
                if ( 0 < this._waitHeap.size() 
                        && now <= this._waitTimeout + this._waitHeap.top().getTime()) {
                    nextWaitTimeout = this._waitHeap.top().getTime() + this._waitTimeout; 
                } else {
                    nextWaitTimeout = now + this._waitTimeout;
                }
            }            
            var nextHoldTimeout = Number.MAX_SAFE_INTEGER;
            if (0 < this._holdTimeout) {
                if(0 < this._holdHeap.size()) {
                    nextHoldTimeout = this._holdHeap.top().val;
                } else {
                    nextHoldTimeout = now + this._holdTimeout;
                }
            }
            this._sequenceTime = Math.min(nextWaitTimeout, nextHoldTimeout);
            if (this._sequenceTime < Number.MAX_SAFE_INTEGER) {
                events.push(this); // タイムアウトチェックイベントをケジュールイベント登録対象に加える
            } else {
                this._isScheduled = false;
            }
        } else { 
            // 以外のとき、シミュレータにタイムアウトチェックイベントを再スケジュールしない
            this._isScheduled = false;
        }
        return events;
    };

    /**
     * リソースを取得する
     * 
     * @memberof simulator.VirtualResource
     * @param {Object}
     *            system VirtualSystem
     * @param {Object}
     *            vApp リソースにhold要求する仮想AP
     * @return {Objcet} 処理結果{result:boolean, events:Array}<br>
     *         {boolean} result :
     *         true:正常（リソース取得、取得待ち、取得不要）、false:エラー（リソース枯渇E_QOF)）<br>
     *         {Array} :events リソース取得後、スケジューラに登録するイベントの配列<br>
     *         [vApp]： リソースを取得できたとき、もしくはリソース枯渇時でvApp再処理の場合、スケジュール対象の vApp
     *         が登録された配列[vApp]を返却<br>
     *         []： リソース待ちに登録されたとき、既にリソースが管理するスケジューラに登録さているので、空の配列[]を返却<br>
     *         もしくはリソース枯渇時で繰返し完了時、再スケジュールしないので[]を返却
     */
    VirtualResource.prototype.hold = function(system, vApp) {
        var ret = { result : true,
                    events : [vApp] }; // 戻り値 #61
        if (this._name === "unlimited") return ret; // [vApp] リソース解放待ちを管理しないとき
        vApp.logger(4, this._log, vApp._sequenceTime, vApp, this, 'HOLD' , undefined);
        // タイムアウトチェックイベントがスケジュールされていないとき、スケジュールする
        if (!this._isScheduled && (0 < this._interval)) {
            this.start(system.getTime(), system);
        }
        // リソースを取得できるとき、使用リソース量（数）を増やし、実行中処理管理ヒープに登録し、スケジュール対象とする
        var amount = vApp.getAmount(this); // 消費リソース量(デフォルト1.0）
        if (amount <= (this._holdCapacity - this._holdingQty)) {
            // 使用リソースを増やす
            this._holdingQty += amount;
            // タイムアウト管理対象リソースのとき、vAppをタイムアウト管理対象に加える #59
            if (0 < this._holdTimeout) {
                this._holdHeap.push({obj: vApp, val: system.getTime() + this._holdTimeout});
            }
            vApp.logger(3, this._log, system.getTime(), vApp, this, 'hold' , undefined);
            return ret; // [vApp]
        }

        // リソース解放待ちキューに空きがあるとき、vAppをリソース解放待ちに 登録する（スケジュールしない）
        if ((this._waitHeap.size() < this._waitCapacity) && (0 < this._waitTimeout)){
            // リソース解放待ちタイムアウト管理対象に加える
            this._waitHeap.push(vApp);
            vApp.addHistory("wait:" + this._name, system.getTime()); // #61
            vApp.logger(3, this._log, system.getTime(), vApp, this, 'wait' , undefined);
            return { result: true, events: [] };
        }
        
        // リソース解放待ちキューが溢れていた時、リソースを取得できずにアベンド（リソース解放なし、自AP継続の場合[vApp]をリターン） #61
        var apps = vApp.abend(system, this, "E_QOF",
                    "[" + this._name + "] over flow", false);
        vApp.logger(3, this._log, system.getTime(), vApp, this, 'over' , undefined);
        return { result: false, events: apps }; // #61
    };

    /**
     * 引数vAppが使用していたリソースを解放する
     * 
     * @memberof simulator.VirtualResource
     * @param {Object}
     *            vApp リソースにfree要求する仮想AP
     * @param {Boolean}
     *            [isHolding=true] 該当vAppが自リソースをholdしているか否か<br>
     *            false指定時、指定vAppはリソースをholdしていない前提で、hold vApp一覧からの削除処理を行わない
     * @return {Array} スケジューラに登録するイベントの配列([vApp] | [])
     */
    VirtualResource.prototype.free = function(vApp, isHolding) { // #59
        vApp.logger(4, this._log, this._system.getTime(), vApp, this, 'FREE' , undefined);
        isHolding = (typeof(isHolding) === "boolean") ? isHolding : true;
        if (this._name === "unlimited") return []; // リソース解放待ちを管理しないとき
        var vApps = []; // 戻り値
        // 自リソースを使用している可能性があるとき、使用リソースを解放する
        // 解放したvAppが使用していたリソース量(デフォルト1.0）を、使用リソース量（数）から減らす #59
        if (isHolding === true) { // #61
            this._holdingQty -= vApp.getAmount(this);
            // タイムアウト管理対象リソースのとき、vAppをタイムアウト管理対象から削除する #61
            if (0 < this._holdTimeout) { // #61
                var app = this._holdHeap.del(vApp);
            }
            vApp.addHistory("free:" + this._name, this._system.getTime());
            vApp.logger(3, this._log, this._system.getTime(), vApp, this, 'del' , undefined);
        }
        // リソース解放待ちキューから、空きリソースで処理できるようになったvAppを取り出しスケジュールする #61
        var marginQty = this._holdCapacity - this._holdingQty;
        var addQty = this._waitHeap.top()
                    ? this._waitHeap.top().getAmount(this) // 次のリソース解放待ちキューの使用量
                    : Number.MAX_SAFE_INTEGER;
        for (var i = this._waitHeap.size() && addQty <= marginQty; 0 < i; i--) {
            // リソース解放待ちキューからfreeするappを取り出す
            var app = this._waitHeap.pop();
            // appにfree時刻をセットし、スケジュールイベント登録対象に加える
            // (注：リソース取得はスケジュール後、E_HTOに伴う他のリソースの時刻は将来）
            app.setSequenceTime(this._system.getTime(), "release:" + this._name);
            vApps.push(app);
            // 次のappのリソース量を加える
            addQty += this._waitHeap.top() 
                    ? this._waitHeap.top().getAmount(this) // 次のリソース解放待ちキューの使用量
                    : Number.MAX_SAFE_INTEGER;
        }
        return vApps;
    };


    /**
     * 引数vAppをリソース開放待ちキューからリリースする
     * 
     * @memberof simulator.VirtualResource
     * @param {Object}
     *            vApp リリースする仮想AP
     * @return {Object | undefined} リリースした仮想AP
     */
    VirtualResource.prototype.release = function(vApp) { // #61
        var app = this._waitHeap.del(vApp);
        if (app) vApp.addHistory("release", this._system.getTime());
        return app;
    }

    
    
    /**
     * イベント終了時処理（リソースが管理しているvAppをfinishさせる（強制終了させ処理中vAppはTATログ出力する）
     * 
     * @memberof simulator.VirtualResource
     * @param {Object}
     *            system VirtualSystem
     * @param {String}
     *            [logID="N_000"] ログID（ログメッセージの先頭文字）
     * @param {String}
     *            [logMesseage=""] ログメッセージ
     * @param {Number}
     *            forceTime 強制終了時刻を指定する（ミシュレーション停止後のeTat強制出力用）
     * @return {null}
     */
    VirtualResource.prototype._finish = function(system, logID,
                                        logMesseage, forceTime) { // #59
        // シミュレーション終了後処理（処理中のvAppを強制終了する）
        logID = logID || "N_EoS";
        logMesseage = logMesseage || "";
        while(0 < this._waitHeap.size()){
            event = this._waitHeap.pop();
            if (event._finish) {
                event._finish(system, logID,
                        "[" + this._name + "] " + logMesseage , forceTime);
            }
        }
    }

    /* new */
    return VirtualResource;
}());


/**
 * @class
 * @classdesc 仮想システム生成ツール(virtualSystemByJson)
 *            <p>
 *            Util管理用クラス（スタティックメソッドのみ）のためコンストラクタは使用しない
 */
export var virtualSystemByJson = (function() { // #53
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
     * @memberof simulator.VirtualSystemByJson
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
     * @memberof simulator.VirtualSystemByJson
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
