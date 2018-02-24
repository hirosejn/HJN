import * as Util from '../util/util.js';
/**
 * @memberOf Simulator
 * @class VirtualApp
 * @classdesc 仮想アプリケーション
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
export default (function() { // #53
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
     * @memberof Simulator.VirtualApp
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
     * @memberof Simulator.VirtualApp
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
     * @memberof Simulator.VirtualApp
     * @return {Number} イベント時刻（UNIX時刻：ミリ秒）
     */
    VirtualApp.prototype.getTime = function() {
        return this._sequenceTime;
    };

    /**
     * リソース使用量を返却する
     * 
     * @memberof Simulator.VirtualApp
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
     * @memberof Simulator.VirtualApp
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
     * @memberof Simulator.VirtualApp
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
     * @memberof Simulator.VirtualApp
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
     * @memberof Simulator.VirtualApp
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
     * @memberof Simulator.VirtualApp
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