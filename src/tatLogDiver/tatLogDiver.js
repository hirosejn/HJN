import cssDygraph from '../../libs/dygraph.css';
import cssTatLogDiver from './tatLogDiver.css';
import Init from "./tatLogDiver-Init.js";
import {HJN} from "./tatLogDiver-HJN.js";
import Graph from "./tatLogDiver-Graph.js";

window.addEventListener("DOMContentLoaded",function(eve){
    Init("chart");      // チャートを作成する
});