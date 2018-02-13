// htmlの取込とDOMへ反映
import app_html from './app.html';
document.body.innerHTML = app_html;
//cssの取り込み
import css from './app.css';
//画像（ファイル）の取込とDOMへ反映
import png from './image.png';
var imgPng = document.createElement('img');
imgPng.src = png;
document.getElementById('box').appendChild(imgPng);
//JSの取込、JSのみネスト可
import {hello} from "./sub.js";
window.addEventListener("DOMContentLoaded",function(eve){
    hello();      //　先頭JS関数を呼ぶ、htmlの表示よりJS(hello())が先に処理される
});