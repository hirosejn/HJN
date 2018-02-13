import * as Util from '../util/util.js';
/**
 * @memberOf Simulator
 * @class VirtualResource
 * @classdesc 仮想リソース
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
export default (function() { // #53
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
     * @memberof Simulator.VirtualResource
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
     * @memberof Simulator.VirtualResource
     * @return {Number} イベント時刻（UNIX時刻：ミリ秒）
     */
    VirtualResource.prototype.getTime = function() {
        return this._sequenceTime;
    };
    
    /**
     * タイムアウトチェック用仮想イベント
     * 
     * @memberof Simulator.VirtualResource
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
     * @memberof Simulator.VirtualResource
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
     * @memberof Simulator.VirtualResource
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
     * @memberof Simulator.VirtualResource
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
     * @memberof Simulator.VirtualResource
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