/**
 * 坐标系统类
 * 管理地理坐标和场景坐标之间的转换
 */
class CoordinateSystem {
    constructor() {
        // 坐标系类型: "geographic" 或 "scene"
        this.coordType = "geographic"; // 可选: geographic | scene | webmercator
        
        // 场景坐标系原点的地理坐标
        this.sceneOriginLon = 0.0;
        this.sceneOriginLat = 0.0;
        
        // 地理常数: 每度纬度对应的米数
        this.metersPerDegreeLat = 111320;
    }

    /**
     * 将地理坐标转换为场景坐标
     * @param {number} lon - 经度
     * @param {number} lat - 纬度
     * @returns {Array<number>} [x, y] 场景坐标(米)
     */
    geographicToScene(lon, lat) {
        const metersPerDegreeLon = this.metersPerDegreeLat * Math.cos(lat * Math.PI / 180);
        const x = (lon - this.sceneOriginLon) * metersPerDegreeLon;
        const y = (lat - this.sceneOriginLat) * this.metersPerDegreeLat;
        return [x, y];
    }

    /**
     * 将场景坐标转换为地理坐标
     * @param {number} x - 场景X坐标(米)
     * @param {number} y - 场景Y坐标(米)
     * @returns {Array<number>} [lon, lat] 地理坐标
     */
    sceneToGeographic(x, y) {
        const lat = this.sceneOriginLat + y / this.metersPerDegreeLat;
        const metersPerDegreeLon = this.metersPerDegreeLat * Math.cos(lat * Math.PI / 180);
        const lon = this.sceneOriginLon + x / metersPerDegreeLon;
        return [lon, lat];
    }

    /**
     * 设置场景原点
     * @param {number} lon - 原点经度
     * @param {number} lat - 原点纬度
     */
    setSceneOrigin(lon, lat) {
        this.sceneOriginLon = lon;
        this.sceneOriginLat = lat;
    }

    /**
     * 获取坐标系类型描述
     * @returns {string}
     */
    getTypeDescription() {
        return this.coordType === "geographic" ? "地理坐标" : "场景坐标";
    }

    /**
     * Web Mercator 投影: 地理坐标 -> 墨卡托米 (EPSG:3857)
     * @param {number} lon 经度
     * @param {number} lat 纬度
     * @returns {[number,number]} [mx,my] 单位:米
     */
    geographicToMercator(lon, lat) {
        const R = 6378137.0;
        const clampedLat = Math.max(Math.min(lat, 85.05112878), -85.05112878);
        const mx = R * (lon * Math.PI / 180);
        const my = R * Math.log(Math.tan(Math.PI / 4 + (clampedLat * Math.PI / 180) / 2));
        return [mx, my];
    }

    /**
     * Web Mercator 投影: 墨卡托米 -> 地理坐标
     * @param {number} mx 墨卡托X(米)
     * @param {number} my 墨卡托Y(米)
     * @returns {[number,number]} [lon,lat]
     */
    mercatorToGeographic(mx, my) {
        const R = 6378137.0;
        const lon = (mx / R) * 180 / Math.PI;
        const lat = (2 * Math.atan(Math.exp(my / R)) - Math.PI / 2) * 180 / Math.PI;
        return [lon, lat];
    }
}

export default CoordinateSystem;
