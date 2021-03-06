import {Logger} from './util.js';

/**
 * @memberOf Util
 * @class TouchPanel
 * @classdesc タッチパネル用ツール
 *            <p>
 *            参考 {@link https://code.i-harness.com/ja/q/4f2389}
 * 
 * @param {Number}
 *            [average=0.5] 平均値
 * @example var r = HJN_util.TouchPanel(10), val = r.exponential();
 */
export default (function() { // #56
    /** @constructor */
    function TouchPanel(average){
        if(!(this instanceof TouchPanel)) return new TouchPanel(average);
        this._average = average || 0.5;
    }
    /** @private */

    // public
    /**
     * タッチデバイスか判定する
     * <p>
     * クラスロード後、touchstart と mouosemove の初回のイベントがどちらが先に発生したかにより判定する 参考
     * {@link https://lab.syncer.jp/Web/JavaScript/Snippet/44/}
     * 
     * @memberof TouchPanel
     * @return {String} 先に検出したイベントがマウス移動のとき false、以外のときtrue
     * 
     */
    TouchPanel.isTouchableDevice = function() {
        Logger.ShowText([TouchPanel._deviceType]);
        return  (TouchPanel._deviceType === "MOUSE") ? false : true; // #78
    }

    // タッチデバイスか判定する（クラス定数）
    TouchPanel._deviceType = "SHIMULATED_TOUCH";
    function detectDeviceType(event) {
        TouchPanel._deviceType = event.changedTouches ? "TOUCH" : "MOUSE" ;
        document.removeEventListener("touchstart", detectDeviceType) ;
        document.removeEventListener("mousemove", detectDeviceType) ;
    }
    document.addEventListener("touchstart", detectDeviceType) ;
    document.addEventListener("mousemove", detectDeviceType) ;

    /**
     * タッチパネル操作をマウス操作に転送する
     * <p>
     * 参考 {@link https://code.i-harness.com/ja/q/4f2389}
     * 
     * @memberof Util.TouchPanel
     * @param {Object}
     *            element 対象dom要素
     * @param {Boolean}
     *            [isStopTouch=false] 元のタッチのデフォルトイベントを消すか（個別に登録されているリスナーには無関係）
     * 
     * @example HJN_util.DispatchEventTouchToMouse();
     */
    TouchPanel.DispatchEventTouchToMouse = function(element, isStopTouch) { // #22
        element.addEventListener("touchstart", touchHandler, true);
        element.addEventListener("touchmove", touchHandler, true);
        element.addEventListener("touchend", touchHandler, true);
        element.addEventListener("touchcancel", touchHandler, true);
        return;

        function touchHandler(ev) {
            var bIgnoreChilds = false;
            if( !window.__TOUCH_TYPES ) {
                window.__TOUCH_TYPES  = { touchstart:'mousedown', touchmove:'mousemove', touchend:'mouseup' };
                window.__TOUCH_INPUTS = { INPUT: 1, TEXTAREA: 1, SELECT: 1, OPTION: 1,
                                         'input':1,'textarea':1,'select':1,'option':1 };
            }
            var bSame = (ev.target == this);
            if (bIgnoreChilds && !bSame) { return; }
            // Get if object is already tested or input type
            var b = (!bSame && ev.target.__ajqmeclk);
            // allow multi-touch gestures to work
            if (b === true || !ev.touches || ev.touches.length > 1 || !window.__TOUCH_TYPES[ev.type]) { return; }

            var oEv = (!bSame && typeof b != 'boolean') ? ev.target.getAttribute('events') : false;
            var b = (!bSame)
                  ? (ev.target.__ajqmeclk = oEv
                      ? (oEv['click'] || oEv['mousedown'] || oEv['mouseup'] || oEv['mousemove']) 
                      : false )
                  :false;
            // allow default clicks to work (and on inputs)
            if (b || window.__TOUCH_INPUTS[ev.target.tagName]) { return; } 

            var touch = ev.changedTouches[0];
            var tmpClientX = touch.clientX;
            var tmpClientY = touch.clientY;
            // クリックに変換するタップ誤差範囲
            var CLICK_MARGIN = 20; // px
            var CLICK_DELAY = 1000; // ms

            // 前回touchstart時の座標と時刻が一定範囲内の時、dygraphがクリックと判定するよう補正する
            if ((ev.type === "touchstart" || ev.type === "touchend") &&
                    this.startTouch &&
                    Math.abs(this.startTouch.x - touch.clientX) < CLICK_MARGIN && // タッチ補正幅(px)
                    Math.abs(this.startTouch.y - touch.clientY) < CLICK_MARGIN &&
                    +new Date() - this.startTouch.t < CLICK_DELAY) { // タッチ時間(ms)
                // 位置補正
                tmpClientX = this.startTouch.x;
                tmpClientY = this.startTouch.y;
            } else if (ev.type === "touchstart"){
                // touchstart時の座標と時刻を退避する
                this.startTouch = {x: touch.clientX, y: touch.clientY, t: +new Date()};
            } else if (ev.type === "touchend") {  
                // touchstart時の座標と時刻を初期化する
                this.startTouch = {};
            }
            // マウスイベントを発生させる
            var newEvent = document.createEvent("MouseEvent");
            newEvent.initMouseEvent(
                window.__TOUCH_TYPES[ev.type],    // type
                true,             // bubbles
                true,             // cancelable
                window,           // view
                1,                // detail
                touch.screenX,    // screenX スクリーンサイズ
                touch.screenY,    // screenY
                tmpClientX,       // clientX タッチ座標
                tmpClientY,       // clientY
                false,            // ctrlKey
                false,            // altKey
                false,            // shiftKey
                false,            // metaKey
                0,                // button
                null              // relatedTarget
              );
            touch.target.dispatchEvent(newEvent);

            // タッチイベントを止める #22
            if(isStopTouch) {
                ev.stopImmediatePropagation();
                ev.stopPropagation();
                ev.preventDefault();
                return false;
            }
        }
    };

    /* new */
    return TouchPanel;
}());