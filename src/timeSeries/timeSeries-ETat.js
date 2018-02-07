import MappedETat from './timeSeries-MappedETat.js';
import Cash from './timeSeries-Cash.js';

/**
 * @memberOf TimeSeries
 * @class ETat
 * @extends Array
 * @classdesc eTat管理クラス、Arrayのメソッドを継承
 * @param {Array}
 *            [that] ETAT構造の配列
 */
export default function ETat(that) {
    /** @private */
    // cTpsのxからindexを引くMapを作成する #18
    that.tatMap = new MappedETat(that);
    // キャッシュを作成する
    that.cash = Cash();

    /**
     * 指定期間のeTatを取得する<br>
     * 性能対策としてキャッシュを持っている
     * 
     * @memberof TimeSeries.ETat
     * @param {Number}
     *            [detailDateTime] 期間の基準時刻(ミリ秒)
     * @param {Number}
     *            [detailRangeMinus] 抽出開始時刻を求める基準時刻から引く時間(ミリ秒)
     * @param {Number}
     *            [detailRangePlus] 抽出終了時刻を求める基準時刻に足す時間(ミリ秒)
     * @param {Number}
     *            [detailRangeUnit] 抽出開始終了時刻を丸める時間の単位(ミリ秒)
     * @return {ETAT} 指定期間のETAT配列
     */
    that.sliceByRangeUnit = function (detailDateTime, detailRangeMinus, detailRangePlus, detailRangeUnit){
        var rangeUnit = detailRangeUnit || TimeSeries.Tat.CYCLE;
        var dt = Math.floor(detailDateTime / rangeUnit) * rangeUnit; // 中央時刻(ミリ秒)
        var from = dt - detailRangeMinus * rangeUnit;  // #48
        var to = dt + detailRangePlus  * rangeUnit;  // 幅（ミリ秒）
        var eTatDetail = [{x: 0, y: 0.001, sTatIdx: 0}];    // tatMapが無い場合の返却値
        if (this.tatMap){ // #18
            // eTatDetailがレンジキャッシュにあるか確認する #30
            eTatDetail = this.cash.getRangedCash(from, to);
            if(eTatDetail === undefined){
                // キャッシュヒットしないとき、eTatDetailを抽出し、キャッシュにセットする
                eTatDetail = this.tatMap.search(from,to);
                this.cash.setRangedCash(eTatDetail, from, to);
            }
        }
        return eTatDetail;
    }

    return that
}