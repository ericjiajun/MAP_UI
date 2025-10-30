/**
 * 坐标系统类
 * 管理地理坐标和场景坐标之间的转换
 */
class CoordinateSystem {
    constructor() {
        // 坐标系类型: "geographic" 或 "scene"
        this.coordType = "geographic";
        
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
}

export default CoordinateSystem;
