import Dialog from './Dialog.js';

class GridControlPanelDialog {
    constructor(editor) {
        this.editor = editor;
        this.dialog = new Dialog('网格控制面板', 420, 380);
        this.render();
    }

    render() {
        const gs = this.editor.gridSettings;
        this.dialog.setHTML(`
            <div class="form-row"><label>原点经度</label><input id="gridOriginX" type="number" step="0.000001" value="${gs.originX}"></div>
            <div class="form-row"><label>原点纬度</label><input id="gridOriginY" type="number" step="0.000001" value="${gs.originY}"></div>
            <div class="form-row"><label>网格大小(m)</label><input id="gridSizeMeters" type="number" step="1" min="1" value="${gs.gridSizeMeters}"></div>
            <div class="form-row"><label>显示网格</label><input id="gridShow" type="checkbox" ${gs.showGrid?'checked':''}></div>
            <div class="form-row"><label>显示坐标</label><input id="gridShowCoords" type="checkbox" ${gs.showCoordinates?'checked':''}></div>
            <div class="form-row"><label>吸附到网格</label><input id="gridSnap" type="checkbox" ${gs.snapToGrid?'checked':''}></div>
            <div class="form-row"><label>网格颜色</label><input id="gridColor" type="text" value="${gs.gridColor}"></div>
            <div class="form-row"><label>坐标轴颜色</label><input id="axisColor" type="text" value="${gs.axisColor}"></div>
        `);
        this.dialog.addButton('重置到原点', () => { this.editor.gridSettings.resetToOrigin(); this.updateFromSettings(); this.apply(true); });
        this.dialog.addButton('重置到数据中心', () => { this.editor.resetGridToDataCenter(); this.updateFromSettings(); this.apply(true); });
        this.dialog.addButton('应用', () => this.apply());
        this.dialog.addButton('关闭', () => this.dialog.close());
    }

    updateFromSettings(){
        const gs=this.editor.gridSettings;
        this.dialog.query('#gridOriginX').value = gs.originX;
        this.dialog.query('#gridOriginY').value = gs.originY;
        this.dialog.query('#gridSizeMeters').value = gs.gridSizeMeters;
        this.dialog.query('#gridShow').checked = gs.showGrid;
        this.dialog.query('#gridShowCoords').checked = gs.showCoordinates;
        this.dialog.query('#gridSnap').checked = gs.snapToGrid;
        this.dialog.query('#gridColor').value = gs.gridColor;
        this.dialog.query('#axisColor').value = gs.axisColor;
    }

    apply(silent=false) {
        const gs = this.editor.gridSettings;
        gs.originX = parseFloat(this.dialog.query('#gridOriginX').value) || gs.originX;
        gs.originY = parseFloat(this.dialog.query('#gridOriginY').value) || gs.originY;
        gs.gridSizeMeters = Math.max(1, parseFloat(this.dialog.query('#gridSizeMeters').value) || gs.gridSizeMeters);
        gs.showGrid = this.dialog.query('#gridShow').checked;
        gs.showCoordinates = this.dialog.query('#gridShowCoords').checked;
        gs.snapToGrid = this.dialog.query('#gridSnap').checked;
        gs.gridColor = this.dialog.query('#gridColor').value || gs.gridColor;
        gs.axisColor = this.dialog.query('#axisColor').value || gs.axisColor;
        this.editor.updateGridStatus();
        this.editor.redraw();
        if (!silent) alert('网格设置已应用！');
    }
}

export default GridControlPanelDialog;
