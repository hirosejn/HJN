/**
 * @memberOf tatLogDiver
 * @class Copyright
 * @classdesc コピーライト定義と表示用メソッド
 * @prop {String} name - 名称："TAT log diver"
 * @prop {String} Version - バージョン
 * @prop {String} text - コピーライト表示文字列
 * @prop {String} url - GitHubリンク："https://github.com/hirosejn/"
 */

export var Copyright = {
    name : "TAT log diver",
    Version : "b19.06.23",
    text : "&copy; 2017-" + (new Date()).getFullYear() + " Junichiroh Hirose",
    url : "https://github.com/hirosejn/",
};


/**
 * about tat Log Diver として表示する説明文をHTMLで取得する
 * 
 * @memberof tatLogDiver.Copyright
 * @return {String}表示用HTML
 */
Copyright.getAboutText = function(){
    return Copyright.name + " (" + Copyright.Version + ")<br>"
        + Copyright.text + " <br> "
        + Copyright.getGitHubHTML() + " <br> "
        + Copyright.getJSDocHTML() + " <br> "
        + Copyright.getHtmlHTML();  // #84
}

/**
 * GitHubリンク(HTML)を取得する
 * 
 * @memberof tatLogDiver.Copyright
 * @param {String}
 *            [text=Copyright.url] HTMLの表示文字列
 * @return {String} GitHubリンク(HTML)文字列
 */
Copyright.getGitHubHTML = function(text){
    text = text || Copyright.url;
    return '<a class="hjnLabel4Input" href="' + Copyright.url+ '"'
        + ' target=”_hirosejnGit”>' + text + '</a>'
}

/**
 * JSDOCリンク(HTML)を取得する
 * 
 * @memberof tatLogDiver.Copyright
 * @param {String}
 *            [name="JSDoc"] HTMLの表示文字列
 * @return {String} JSDOCリンク(HTML)文字列
 */
Copyright.getJSDocHTML = function(name){
    name = name || "JSDoc";
    return '<a class="hjnLabel4Input" href="../jsdoc/index.html"'
        +  'target=”_hirosejnJSDoc3”>' + name +'</a><BR>'
}

/**
 * HTMLページのリンク(HTML)を取得する
 * 
 * @memberof tatLogDiver.Copyright
 * @param {String}
 *            [name="HTML : " + Copyright.url] HTMLの表示文字列
 * @return {String} HTMLページのリンク(HTML)文字列
 */
Copyright.getHtmlHTML = function(name){ // #84
    var url = "https://hirosejn.github.io/HJN/";
    name = name || "HTML : " + url;
    return '<a class="hjnLabel4Input" href="' + url + '"'
        +  'target=”_hirosejnHTML”>' + name +'</a><BR>'
}
