/**
 * 指定されたelementIDのテキストをクリップボードにコピーする<br>
 * 一時的にdocument.bodyの下にコピー処理用要素を作成する<br>
 * スマフォ等で書き込み可能なtextareaにフォーカスが移らないよう一時的にreadonlyにする
 * 
 * @memberof Util
 * @param {String}
 *            elementID textareaのID名
 */
export default function copyToClipboard(elementId) { // #61
    // コピー元要素を取得する
    var el = document.getElementById(elementId);
    // ワーク領域を作成する
    var input = document.createElement('textarea');
    input.setAttribute('id', 'copyinput');
    document.body.appendChild(input);
    // クリップボードにコピーする
    input.value = (el.innerText === "") ? el.value : el.innerText;
    copy2Clipboard(input); // 内部関数
    // ワーク領域を削除する
    document.body.removeChild(input);
}

/**
 * textareaをクリップボードにコピーする<br>
 * iOSに対応したtextareaのselect機能 #78
 * {@link https://marmooo.blogspot.jp/2018/02/javascript.html}
 */
function copy2Clipboard(el){
    // handle iOS as a special case
    if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
        // save current contentEditable/readOnly status
        var editable = el.contentEditable;
        var readOnly = el.readOnly;
        // convert to editable with readonly to stop iOS keyboard opening
        el.contentEditable = true;
        el.readOnly = true;
        // create a selectable range
        var range = document.createRange();
        range.selectNodeContents(el);
        // select the range
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        el.setSelectionRange(0, 999999);
        // restore contentEditable/readOnly to original state
        el.contentEditable = editable;
        el.readOnly = readOnly;
    }
    else {
        el.select();
    }
    // execute copy command
    document.execCommand('copy');
}