import Dialog from './Dialog.js';

class MapCalibrationDialog {
    constructor(editor){
        this.editor = editor;
        this.dialog = new Dialog('地图校正', 480, 340);
        this.render();
    }

    render(){
        const cs = this.editor.coordSystem;
        this.dialog.setHTML(`
            <div class="form-row"><label>场景原点经度</label><input id="calLon" type="number" step="0.000001" value="${cs.sceneOriginLon}"></div>
            <div class="form-row"><label>场景原点纬度</label><input id="calLat" type="number" step="0.000001" value="${cs.sceneOriginLat}"></div>
            <div class="form-row"><button id="loadFromNode">从选中节点填入</button></div>
            <div class="form-row">提示: 选择一个OSM节点后点击上面的按钮可快速设置为原点</div>
        `);
        this.dialog.query('#loadFromNode').addEventListener('click', ()=>{
            if (!this.editor.selectedNode){ alert('请先选择一个节点'); return; }
            const nd = this.editor.nodes.get(this.editor.selectedNode);
            if (!nd){ alert('所选节点不存在'); return; }
            this.dialog.query('#calLon').value = nd.lon.toFixed(6);
            this.dialog.query('#calLat').value = nd.lat.toFixed(6);
        });
        this.dialog.addButton('应用', ()=>this.apply());
        this.dialog.addButton('关闭', ()=>this.dialog.close());
    }

    apply(){
        const lon = parseFloat(this.dialog.query('#calLon').value);
        const lat = parseFloat(this.dialog.query('#calLat').value);
        if (isNaN(lon) || isNaN(lat)){ alert('请输入有效的经纬度'); return; }
        this.editor.coordSystem.setSceneOrigin(lon, lat);
        this.editor.redraw();
        this.dialog.close();
        alert('场景原点已设置');
    }
}

export default MapCalibrationDialog;
