/**
 * 3D设置类
 * 管理3D渲染相关的所有参数
 */
class ThreeDSettings {
    constructor() {
        // 视角参数
        this.viewAngle = 45;           // 俯视角度 0-90度
        this.rotationAngle = 0;        // 水平旋转角度 0-360度
        this.heightScale = 1.0;        // 高度缩放比例
        
        // 光照参数
        this.lightAngle = 135;         // 光照角度
        this.shadowIntensity = 0.3;    // 阴影强度 0-1
        
        // 建筑参数
        this.defaultHeight = 10;       // 默认建筑高度(米)
        this.defaultBuildingColor = '#F0F0F0'; // 默认建筑颜色
        this.wallColorIntensity = 0.8; // 墙面颜色强度 0-1
        
        // 显示参数
        this.show3DLabels = true;      // 显示3D标签
        this.showLandscape = true;     // 显示地貌
    }

    /**
     * 重置为默认设置
     */
    reset() {
        this.viewAngle = 45;
        this.rotationAngle = 0;
        this.heightScale = 1.0;
        this.lightAngle = 135;
        this.shadowIntensity = 0.3;
        this.defaultHeight = 10;
        this.defaultBuildingColor = '#F0F0F0';
        this.wallColorIntensity = 0.8;
        this.show3DLabels = true;
        this.showLandscape = true;
    }

    /**
     * 从对象更新设置
     * @param {Object} settings - 包含设置值的对象
     */
    updateFrom(settings) {
        if (settings.viewAngle !== undefined) this.viewAngle = settings.viewAngle;
        if (settings.rotationAngle !== undefined) this.rotationAngle = settings.rotationAngle;
        if (settings.heightScale !== undefined) this.heightScale = settings.heightScale;
        if (settings.lightAngle !== undefined) this.lightAngle = settings.lightAngle;
        if (settings.shadowIntensity !== undefined) this.shadowIntensity = settings.shadowIntensity;
        if (settings.defaultHeight !== undefined) this.defaultHeight = settings.defaultHeight;
        if (settings.defaultBuildingColor !== undefined) this.defaultBuildingColor = settings.defaultBuildingColor;
        if (settings.wallColorIntensity !== undefined) this.wallColorIntensity = settings.wallColorIntensity;
        if (settings.show3DLabels !== undefined) this.show3DLabels = settings.show3DLabels;
        if (settings.showLandscape !== undefined) this.showLandscape = settings.showLandscape;
    }

    /**
     * 获取设置的副本
     * @returns {Object}
     */
    clone() {
        return {
            viewAngle: this.viewAngle,
            rotationAngle: this.rotationAngle,
            heightScale: this.heightScale,
            lightAngle: this.lightAngle,
            shadowIntensity: this.shadowIntensity,
            defaultHeight: this.defaultHeight,
            defaultBuildingColor: this.defaultBuildingColor,
            wallColorIntensity: this.wallColorIntensity,
            show3DLabels: this.show3DLabels,
            showLandscape: this.showLandscape
        };
    }
}

export default ThreeDSettings;
