export var Copyright = {
    name : "TAT log diver",
    Version : "b19.06.23",
    text : "&copy; 2017-" + (new Date()).getFullYear() + " Junichiroh Hirose",
    url : "https://github.com/hirosejn/",
};



Copyright.getAboutText = function(){
    return Copyright.name + " (" + Copyright.Version + ")<br>"
        + Copyright.text + " <br> "
        + Copyright.getGitHubHTML() + " <br> "
        + Copyright.getJSDocHTML() + " <br> "
        + Copyright.getHtmlHTML();  // #84
}

// GitHubリンク
Copyright.getGitHubHTML = function(text){
    text = text || Copyright.url;
    return '<a class="hjnLabel4Input" href="' + Copyright.url+ '"'
        + ' target=”_hirosejnGit”>' + text + '</a>'
}

// JSDocリンク
Copyright.getJSDocHTML = function(name){
    name = name || "JSDoc";
    return '<a class="hjnLabel4Input" href="../jsdoc/index.html"'
        +  'target=”_hirosejnJSDoc3”>' + name +'</a><BR>'
}

// HTMLリンク #84
Copyright.getHtmlHTML = function(name){
    var url = "https://hirosejn.github.io/HJN/";
    name = name || "HTML : " + url;
    return '<a class="hjnLabel4Input" href="' + url + '"'
        +  'target=”_hirosejnHTML”>' + name +'</a><BR>'
}
