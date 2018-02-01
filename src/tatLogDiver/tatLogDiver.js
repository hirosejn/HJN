import css from '../../libs/dygraph.css';
import css from './tatLogDiver.css';
import Init from "./tatLogDiver-init.js";
import {HJN} from "./tatLogDiver-hjn.js";
import Graph from "./tatLogDiver-graph.js";

window.addEventListener("DOMContentLoaded",function(eve){
    Init("chart");      // チャートを作成する
});