import TouchPanel         from './util-TouchPanel.js';
import {DateToString, S2D, D2S, N2S, S2N} from './util-string.js';
import Random             from './util-Random.js';
import addEventListener   from './util-addEventListener.js';
import setZeroTimeout     from './util-setZeroTimeout.js';
import Logger             from './util-Logger.js';
import copyToClipboard    from './util-copyToClipboard.js';
import binarySearch       from './util-binarySearch.js';
import Heap               from './util-Heap.js';
import Element            from './util-Element.js';
import {Config}           from './config/config.js';
import {Encoding}         from './util-Encoding.js'; // #82
import SubWindow          from './util-SubWindow.js'; // #95
import Menu               from './util-Menu.js'; // #95

export {
    TouchPanel,
    S2D,
    DateToString,
    D2S,
    N2S,
    S2N,
    Random,
    addEventListener,
    setZeroTimeout,
    Logger,
    copyToClipboard,
    binarySearch,
    Heap,
    Element,
    Config,
    Encoding,  // #82
    SubWindow, // #95
    Menu       // #95
};


/** ie11 互換用 * */
if(!Number.MAX_SAFE_INTEGER) Number.MAX_SAFE_INTEGER = 9007199254740991; // #59
if(!Number.MIN_SAFE_INTEGER) Number.MIN_SAFE_INTEGER = -9007199254740991;

if(!Uint8Array.prototype.indexOf){
    Uint8Array.prototype.indexOf = function(target,index){
        index = (index === undefined) ? 0 : index;  // #29
        for(var i = index, last = index + 4096; i < last; i++){ // 暫定：1レコード4KBまでチェック
            if(this[i] === target) return i;
        }
        return -1;
    };
}
if (!Uint8Array.prototype.slice) {  // #29
    Uint8Array.prototype.slice = function(begin, end) {
        return this.subarray(begin, end);
    };
}
// https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function(predicate) {
      if (this === null) throw new TypeError('Array.prototype.findIndex called on null or undefined');
      if (typeof predicate !== 'function') throw new TypeError('predicate must be a function');
      var list = Object(this), length = list.length >>> 0, thisArg = arguments[1], value;
      for (var i = 0; i < length; i++) {
        value = list[i];
        if (predicate.call(thisArg, value, i, list)) return i;
      }
      return -1;
    };
  }
// https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/find
if (!Array.prototype.find) {
    Array.prototype.find = function(predicate) {
      if (this === null) throw new TypeError('Array.prototype.find called on null or undefined');
      if (typeof predicate !== 'function')  throw new TypeError('predicate must be a function');
      var list = Object(this), length = list.length >>> 0, thisArg = arguments[1], value;
      for (var i = 0; i < length; i++) {
        value = list[i];
        if (predicate.call(thisArg, value, i, list))  return value;
      }
      return undefined;
    };
  }