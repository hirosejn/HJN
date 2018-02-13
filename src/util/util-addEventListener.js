/**
 * @memberOf Util
 * @class addEventListener
 * 
 * 1つのイベントターゲットにイベントリスナーを1つ登録する
 * 
 * @param {dom}
 *            element DOM要素、document.getElementById("xx");などで取得
 * @param {string}
 *            [type="click"] イベントの種類
 *            {@link https://developer.mozilla.org/en-US/docs/Web/Events}
 * @param {function}
 *            func 実行する関数
 */
export default function(element, type, func) { // #74
    type = type || "click";
    if (element.addEventListener) {
        element.addEventListener(type, func, false);
    } else if (element.attachEvent) {
        element.attachEvent("on" + type, func); 
    } else {
        console.log("unable addEventListner %o", element);
    }
};
