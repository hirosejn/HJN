/**
 * @memberOf Util
 * @class setZeroTimeout
 * 非同期化
 * 
 * @param {function}
 *            global 非同期化して実行する関数
 *            <p>
 *            参考 {@link https://jsfiddle.net/kou/j73tLum4/8/}
 *            {@link https://gist.github.com/mathiasbynens/579895}
 *            {@link http://dbaron.org/log/20100309-faster-timeouts}
 */
export default (function(global) {
    "use strict";
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
        return function (fn) { timeouts.push(fn); global.postMessage(messageName, "*"); };
    } 
    else {
        return function (fn) { setTimeout(fn, 0); }; 
    }
}(window));