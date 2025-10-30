import Dialog from './Dialog.js';

class ThreedSettingsDialog {
    constructor(editor) {
        this.editor = editor;
        this.dialog = new Dialog('3D 设置', 520, 520);
        this.render();
    }

    render(){
        const t = this.editor.threeDSettings;
        this.dialog.setHTML(`
            <div class="form-row"><label>俯视角度</label><input id="viewAngleInput" type="range" min="0" max="90" value="${t.viewAngle}"></div>
            <div class="form-row"><label>旋转角度</label><input id="rotationAngleInput" type="range" min="0" max="360" value="${t.rotationAngle}"></div>
            <div class="form-row"><label>高度缩放</label><input id="heightScaleInput" type="range" min="0.1" max="3" step="0.1" value="${t.heightScale}"></div>
            <div class="form-row"><label>光照角度</label><input id="lightAngleInput" type="range" min="0" max="360" value="${t.lightAngle}"></div>
            <div class="form-row"><label>阴影强度</label><input id="shadowIntensityInput" type="range" min="0" max="1" step="0.05" value="${t.shadowIntensity}"></div>
            <div class="form-row"><label>默认高度</label><input id="defaultHeightInput" type="number" min="0" step="1" value="${t.defaultHeight}"></div>
            <div class="form-row"><label>墙面强度</label><input id="wallColorIntensityInput" type="range" min="0" max="2" step="0.05" value="${t.wallColorIntensity}"></div>
            <div class="form-row"><label>建筑默认色</label><input id="defaultBuildingColorInput" type="color" value="${this.toColor(t.defaultBuildingColor)}"></div>
            <div class="form-row"><label>显示3D标签</label><input id="show3DLabelsInput" type="checkbox" ${t.show3DLabels?'checked':''}></div>
            <div class="form-row"><label>显示地貌</label><input id="showLandscapeInput" type="checkbox" ${t.showLandscape?'checked':''}></div>
        `);
        const preview = () => this.preview();
        ['viewAngleInput','rotationAngleInput','heightScaleInput','lightAngleInput','shadowIntensityInput','defaultHeightInput','wallColorIntensityInput','defaultBuildingColorInput','show3DLabelsInput','showLandscapeInput'].forEach(id=>{
            this.dialog.query('#'+id).addEventListener('input', preview);
            this.dialog.query('#'+id).addEventListener('change', preview);
        });
        this.dialog.addButton('应用', () => { this.apply(); this.dialog.close(); });
        this.dialog.addButton('重置', () => { this.editor.threeDSettings.reset(); this.render(); this.editor.redraw(); });
        this.dialog.addButton('关闭', () => this.dialog.close());
    }

    toColor(hex){ if(/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex; return '#F0F0F0'; }

    preview(){
        const t = this.editor.threeDSettings;
        t.viewAngle = parseFloat(this.dialog.query('#viewAngleInput').value);
        t.rotationAngle = parseFloat(this.dialog.query('#rotationAngleInput').value);
        t.heightScale = parseFloat(this.dialog.query('#heightScaleInput').value);
        t.lightAngle = parseFloat(this.dialog.query('#lightAngleInput').value);
        t.shadowIntensity = parseFloat(this.dialog.query('#shadowIntensityInput').value);
        t.defaultHeight = parseFloat(this.dialog.query('#defaultHeightInput').value);
        t.wallColorIntensity = parseFloat(this.dialog.query('#wallColorIntensityInput').value);
        t.defaultBuildingColor = this.dialog.query('#defaultBuildingColorInput').value;
        t.show3DLabels = this.dialog.query('#show3DLabelsInput').checked;
        t.showLandscape = this.dialog.query('#showLandscapeInput').checked;
        const v = document.getElementById('viewAngleSlider'); if (v) v.value = t.viewAngle;
        const r = document.getElementById('rotationAngleSlider'); if (r) r.value = t.rotationAngle;
        const h = document.getElementById('heightScaleSlider'); if (h) h.value = t.heightScale;
        this.editor.redraw();
    }

    apply(){ this.preview(); }
}

export default ThreedSettingsDialog;
