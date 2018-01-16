import css from './HJN.css';
import css from '../libs/dygraph.css';
import {HJN_init_ChartRegist} from "./HJN.graph.init.js";   // JSの取込、JSのみネスト可
window.addEventListener("DOMContentLoaded",function(eve){
    HJN_init_ChartRegist("chart");      // チャートを作成する
});