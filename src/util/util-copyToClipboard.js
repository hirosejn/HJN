/**
 * 指定されたtextareaを使って、クリップボードにコピーする
 * 
 * @memberof Util
 * @param {Object}
 *            elementID textareaのID名
 */
export default function(elementId) { // #61
    "usestrict";
    // textareaをクリップボードにコピーする
    var area = document.getElementById(elementId);
    area.select();
    document.execCommand("copy");
}