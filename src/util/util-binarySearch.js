/**
 * @memberOf Util
 * @class binarySearch
 * @classdesc 配列二分木検索
 * 
 * @param {Number}
 *            val 検索する値
 * @param {Array}
 *            arr 検索対象の配列
 * @param {Function}
 *            [func=function(val){return val.valueOf();}] 配列要素に対して、値を取得する関数
 * @param {Index}
 *            [low=0] 配列の検査範囲の下限
 * @param {Index}
 *            [high=arr.length-1] 配列の下限検査範囲の上限
 * @param {Boolean}
 *            [isEqual=false] 完全一致しないときのリターン値：trueのとき-1、falseのとき値との差が最も少ない位置
 * @example i=HJN_util.binarySearch(x,arrXY,function(e){return e.x;});
 */
export default function (val, arr, func, low, high, isEqual) {
    "use strict";
    func = func || function(val){ return val.valueOf(); };
    low = low || 0;
    if (!arr) return -1;
    high = high || arr.length - 1;
    isEqual = isEqual || false;
    var middle,
        valMiddle;
    while( low <= high ){
        middle = Math.floor(low + high) / 2 | 0;
        valMiddle = func(arr[middle]);
        if(valMiddle === val) return middle;
        else if(val < valMiddle) high = middle - 1;
        else low = middle + 1;
    }
    // 値が完全一致する要素がなかった場合の戻り値を編集する
    if (isEqual){
        return -1;  // 完全一致指定のとき(-1)をリターンする
    } else {        // 完全一致指定でないとき、値との差が最も少ない位置をリターンする #46
        // low,middle,high を補正する
        low = Math.min(Math.max(0, low), arr.length - 1);
        high = Math.max(0, Math.min(high, arr.length - 1));
        middle = Math.max(low, Math.min(middle, high));
        if(high < low){
            var tmp = high;
            high= low;
            low = tmp;
        }
        // low,middle,high のうち、値との差が最も少ない位置をリターンする
        if(func(arr[middle]) < val){
            if (val - func(arr[middle]) < func(arr[high]) - val) {
                return middle;
            } else {
                return high;
            }
        }else{
            if (func(arr[high]) <= val && val < func(arr[middle])){
                return high;
            } else if (val - func(arr[low]) < func(arr[middle]) - val){
                return low;
            } else {
                return middle;
            }
        }
        return -1;  // 指定範囲外
    }
};
