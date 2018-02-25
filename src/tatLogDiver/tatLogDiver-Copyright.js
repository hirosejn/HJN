export var Copyright = {
    name : "TAT log diver",
    Version : "b18.02.25",
    text : "&copy; 2017-" + (new Date()).getFullYear() + " Junichiroh Hirose",
    url : "https://github.com/hirosejn/",
};



Copyright.getAboutText = function(){
    return Copyright.name + " (" + Copyright.Version + ")<br>"
        + Copyright.text + " <br> "
        + Copyright.getGitHubHTML() + " <br> "
        + Copyright.getJSDocHTML();
}
// JSDocリンク
Copyright.getJSDocHTML = function(name){
    name = name || "JSDoc";
    return '<a class="hjnLabel4Input" href="../jsdoc/index.html"'
        +  'target=”_hirosejnJSDoc3”>' + name +'</a><BR>'
}
// GitHubリンク
Copyright.getGitHubHTML = function(text){
    text = text || Copyright.url;
    return '<a class="hjnLabel4Input" href="' + Copyright.url+ '"'
        + ' target=”_hirosejnGit”>' + text + '</a>'
}