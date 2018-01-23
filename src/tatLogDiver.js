import css from './tatLogDiver.css';
import css from '../libs/dygraph.css';
import {HJN_init_ChartRegist} from "./tatLogDiver-init.js";
window.addEventListener("DOMContentLoaded",function(eve){
    HJN_init_ChartRegist("chart");      // チャートを作成する
});