VirtualResource.prototype.next = function(system) {
    var holdTimeoutTime = Number.MIN_SAFE_INTEGER;
    while (0 < this._holdHeap.size() && holdTimeoutTime <= now) {
        var top = this._holdHeap.top();
        holdTimeoutTime = top.val;
        if (holdTimeoutTime <= now) { // 処理中取引がタイムアウトしているとき #61
            var app = top.obj;
            // appがスケジュールされている場合削除する（スケジューラに登録されていない場合何も起きない）
            system.removeEvent(app);
            // appが使用しているリソースを解放する
            events = events.concat(this.free(app)); 
            //------------------>
            VirtualResource.prototype.free = function(vApp, isHolding) { // #59
                var vApps = []; // 戻り値
                // 自リソースを使用している可能性があるとき、使用リソースを解放する
                // 解放したvAppが使用していたリソース量(デフォルト1.0）を、使用リソース量（数）から減らす #59
                if (isHolding === true) { // #61
                    this._holdingQty -= vApp.getAmount(this);
                    // タイムアウト管理対象リソースのとき、vAppをタイムアウト管理対象から削除する #61
                    if (0 < this._holdTimeout) { // #61
                        var app = this._holdHeap.del(vApp);
                    }
                }
                // リソース解放待ちキューから、空きリソースで処理できるようになったvAppを取り出しスケジュールする #61
                var marginQty = this._holdCapacity - this._holdingQty;
                var addQty = this._waitHeap.top()
                            ? this._waitHeap.top().getAmount(this) // 次のリソース解放待ちキューの使用量
                            : Number.MAX_SAFE_INTEGER;
                for (var i = this._waitHeap.size() && addQty <= marginQty; 0 < i; i--) {
                    // リソース解放待ちキューからfreeするappを取り出す
                    var app = this._waitHeap.pop();
                    this._waitingQty--; // #61
                    // appにfree時刻をセットし、スケジュールイベント登録対象に加える(注：リソース消費はスケジュール後、E_HTOに伴う他のリソースの時刻は将来）
                    app.setSequenceTime(this._system.getTime(), "hold:" + this._name);
                    vApps.push(app);
                    // 次のappのリソース量を加える
                    addQty += this._waitHeap.top() 
                            ? this._waitHeap.top().getAmount(this) // 次のリソース解放待ちキューの使用量
                            : Number.MAX_SAFE_INTEGER;
                }
                return vApps;
            };
            //<------------------

            // appをタイムアウト時刻にアベンドさせる(holdリソース解放を伴う）
            events = events.concat(app.abend(system, this,"E_HTO", 
                        this._name + " hold timeout", true, holdTimeoutTime));
            //------------------>
            VirtualApp.prototype.abend = function(system, holdedResource, logID, logMesseage, isHolding, abendTime) {
                logID = logID || "E_600";
                abendTime = abendTime || system.getTime();
                isHolding = (typeof(isHolding) === "boolean") ? isHolding : true; // #61
                var events = []; // 戻り値
                this.logger(3, system._log, this._sequenceTime, this, holdedResource, 'abend', undefined);

                // holdingリソースを開放する
                var holdings;
                // シーケンスから、holdingリソース一覧を取得する #59
                if(this._sequence[this._sequenceIdx]){
                    holdings = this._sequence[this._sequenceIdx].holding;
                }
                if (holdings) { // シーケンス上holdingリソースがあるとき(undefined対策） #61
                    for (var i = holdings.length - 1; 0 <= i; i--) { // #61
                        // holdedResourceは削除処理対象外（呼び出し元リソースは、呼び出し前に削除済なので）
                        if (holdings[i] !== holdedResource._name || isHolding){ // #61
                            // holdingリソースを開放し、使用リソース減に伴って新たにスケジュールするvAppを取得 #59
                            events = events.concat(system._resources[holdings[i]].free(this));
                            //------------------>
                            VirtualResource.prototype.free = function(vApp, isHolding) { // #59
                                vApp.logger(4, this._log, vApp._sequenceTime, vApp, this, 'FREE' , undefined);
                                isHolding = (typeof(isHolding) === "boolean") ? isHolding : true;
                                var vApps = []; // 戻り値
                                // 自リソースを使用している可能性があるとき、使用リソースを解放する
                                // 解放したvAppが使用していたリソース量(デフォルト1.0）を、使用リソース量（数）から減らす #59
                                if (isHolding === true) { // #61
                                    this._holdingQty -= vApp.getAmount(this);
                                    // タイムアウト管理対象リソースのとき、vAppをタイムアウト管理対象から削除する #61
                                    if (0 < this._holdTimeout) { // #61
                                        var app = this._holdHeap.del(vApp);
                                    }
                                }
                                // リソース解放待ちキューから、空きリソースで処理できるようになったvAppを取り出しスケジュールする #61
                                var marginQty = this._holdCapacity - this._holdingQty;
                                var addQty = this._waitHeap.top()
                                            ? this._waitHeap.top().getAmount(this) // 次のリソース解放待ちキューの使用量
                                            : Number.MAX_SAFE_INTEGER;
                                for (var i = this._waitHeap.size() && addQty <= marginQty; 0 < i; i--) {
                                    // リソース解放待ちキューからfreeするappを取り出す
                                    var app = this._waitHeap.pop();
                                    this._waitingQty--; // #61
                                    // appにfree時刻をセットし、スケジュールイベント登録対象に加える(注：リソース消費はスケジュール後）
                                    app.setSequenceTime(this.getTime(), "wait:" + this._name);
                                    vApps.push(app);
                                    // 次のappのリソース量を加える
                                    addQty += this._waitHeap.top() 
                                            ? this._waitHeap.top().getAmount(this) // 次のリソース解放待ちキューの使用量
                                            : Number.MAX_SAFE_INTEGER;
                                }
                                return vApps;
                            };
                            //<------------------

                        
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
            //<------------------
            
            
            
        }
    }
}