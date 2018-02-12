import Tat from "./timeSeries-Tat.js";
import ETat from "./timeSeries-ETat.js";
import FileParser from "./timeSeries-FileParser.js";
import MenuConfigFile from "./timeSeries-MenuConfigFile.js";
import MenuConfigFilter from "./timeSeries-MenuConfigFilter.js";

/** @namespace TimeSeries */
export {
    Tat,
    ETat,
    FileParser,
    MenuConfigFile,
    MenuConfigFilter
};

/**
 * seriesSet: dygraph用時系列データ配列
 * 
 * @typedef {array.<CONC, CTPS, ETPS, STAT, ETAT, EMPS, EAPS>} seriesSet
 */

/**
 * CONC:多重度の時系列データ<br>
 * [{x:変化時刻(ms) ,y:多重度数 }]
 * 
 * @typedef {array.<xMs, yInt>} CONC
 */

/**
 * CTPS: 秒間最大多重度の時系列データ<br>
 * [{x:秒毎時刻(ms), y:秒内最大多重度数 }]
 * 
 * @typedef {array.<xMs, index>} CTPS
 */

/**
 * ETPS: 秒間終了件数の時系列データ<br>
 * [{x:秒毎時刻(ms), y:秒内終了件数 }]
 * 
 * @typedef {array.<xMs, yInt>} ETPS
 */

/**
 * STAT: 開始時刻のTAT（応答時間）時系列データ<br>
 * [{x:開始時刻(ms) ,y:レスポンス(sec), eTatIdx: eTatの配列位置 }]
 * 
 * @typedef {array.<xMs, ySec, index>} STAT
 */

/**
 * ETAT: 終了時刻のTAT（応答時間）時系列データ<br>
 * [{x:変化時刻(ms) ,y:レスポンス(sec), fileIdx:ファイル配列位置, pos:レコード位置, len:レコード長, sTatIdx:
 * sTatの配列位置 }]
 * 
 * @typedef {array.<xMs, ySec, index, index, number, index>} ETAT
 */

/**
 * EMPS: 秒間最大TAT（応答時間）時系列データ（終了時刻ベース）<br>
 * [{x:秒毎時刻(ms), y:秒内最大レスポンス(sec) }]
 * 
 * @typedef {array.<xMs, ySec>} EMPS
 */

/**
 * EAPS: 秒間平均TAT（応答時間）時系列データ（終了時刻ベース）<br>
 * [{x:秒毎時刻(ms), y:秒内平均レスポンス(sec) }]
 * 
 * @typedef {array.<xMs, ySec>} EAPS
 */



/**
 * xMs: x軸に用いる時刻(ms)
 * 
 * @typedef {number} xMs
 */
/**
 * ySec: y軸に用いる秒単位の時間（応答時間など）
 * 
 * @typedef {number} ySec
 */



/**
 * yInt: y軸に用いる整数（個数など）
 * 
 * @typedef {number} yInt
 */
/**
 * index: 配列の位置（インデックス）に用いる整数
 * 
 * @typedef {number} index
 */