import * as Util from '../util/util.js';
import {CreateSampleTatLogAndChartShow} from '../tatLogDiver/tatLogDiver-Init.js';

/**
 * @memberOf Simulator
 * @class MenuConfig
 * @classdesc シミュレータ用メニューHTML定義
 * 
 */
export default function() { // #74
    // Simulator Config用関数定義(radio用） #53
    var env = "Simulator"
    var func_S_SIMU_000 = function(){ CreateSampleTatLogAndChartShow(0); };
    var func_S_SIMU_001 = function(){ CreateSampleTatLogAndChartShow(1); };
    // Simulator Config設定画面定義 #53
    // this["_config_" + env] = Util.Config(env) // #53
    HJN.Config[env] = Util.Config(env)
         .n("<br>")
         .label(null," If you change the scenario below,").n()
         .label(null,"JSON is initialized and re-simulated.").n()
         .n("<br>")
         .name("S_SIMU")
             .radio("S_SIMU_000", null, 
                       "1 hour with table(B) lock.<br>"
                     + "- online[100-500ms 2-5tps]<br>" 
                     + "- batch[2-5sec evry3min]",
                     true ,null, func_S_SIMU_000).n()
             .radio("S_SIMU_001", null, "for test", 
                     false ,null, func_S_SIMU_001).n()
     ;
}