/**
 * 网格设置类
 * 管理网格显示和对齐相关的配置
 */
class GridSettings {
    constructor() {
        // 网格原点坐标
        this.originX = 0.0;
        this.originY = 0.0;
        
        // 网格大小(米)
        this.gridSizeMeters = 100;
        
        // 显示设置
        this.showGrid = true;
        this.gridColor = 'lightgray';
        this.axisColor = 'red';
        this.showCoordinates = true;
        
        // 对齐设置
        this.snapToGrid = false;
    }

    /**
     * 重置网格到原点
     */
    resetToOrigin() {
        this.originX = 0.0;
        this.originY = 0.0;
    }

    /**
     * 设置网格原点
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    setOrigin(x, y) {
        this.originX = x;
        this.originY = y;
    }

    /**
     * 获取网格状态描述
     * @returns {string}
     */
    getStatusDescription() {
        if (this.showGrid) {
            return `网格: ${this.gridSizeMeters}m, 对齐: ${this.snapToGrid ? '开' : '关'}`;
        }
        return '网格: 关闭';
    }
}

export default GridSettings;
