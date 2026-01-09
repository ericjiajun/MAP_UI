/**
 * 坐标导入对话框
 * 支持导入室内建筑坐标点，自动创建多边形
 */
class CoordinateImportDialog {
    constructor(editor) {
        this.editor = editor;
        this.createDialog();
    }

    createDialog() {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.onclick = () => this.close();

        const dialog = document.createElement('div');
        dialog.className = 'dialog';
        dialog.style.width = '600px';
        dialog.style.maxHeight = '80vh';
        dialog.onclick = (e) => e.stopPropagation();

        dialog.innerHTML = `
            <div class="dialog-header">
                <h3>导入坐标点</h3>
                <button class="close-btn" onclick="this.closest('.dialog-overlay').remove()">×</button>
            </div>
            <div class="dialog-body" style="overflow-y: auto; max-height: calc(80vh - 120px);">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">坐标系统类型：</label>
                    <select id="coordTypeSelect" style="width: 100%; padding: 5px;">
                        <option value="lonlat">经纬度 (lon, lat) - WGS84</option>
                        <option value="meter">米制坐标 (x, y) - 相对于参考点</option>
                        <option value="scene">场景坐标 (x, y) - 使用当前场景原点</option>
                    </select>
                    <small style="color: #666; display: block; margin-top: 3px;">
                        米制坐标将转换为经纬度（需设置参考点）
                    </small>
                </div>

                <div id="referencePointDiv" style="margin-bottom: 15px; display: none;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">参考点（米制坐标原点）：</label>
                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1;">
                            <label>经度:</label>
                            <input type="number" id="refLon" step="0.000001" placeholder="116.404" style="width: 100%;">
                        </div>
                        <div style="flex: 1;">
                            <label>纬度:</label>
                            <input type="number" id="refLat" step="0.000001" placeholder="39.915" style="width: 100%;">
                        </div>
                        <button onclick="document.getElementById('refLon').value = ${this.editor.centerX.toFixed(6)}; document.getElementById('refLat').value = ${this.editor.centerY.toFixed(6)};" style="white-space: nowrap;">用当前中心</button>
                    </div>
                    <small style="color: #666; display: block; margin-top: 3px;">
                        米制坐标将以此点为原点，向东为+X，向北为+Y
                    </small>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">输入格式：</label>
                    <select id="formatSelect" style="width: 100%; padding: 5px;">
                        <option value="csv">CSV格式 (x, y 每行一对)</option>
                        <option value="json">JSON数组 [[x,y], [x,y], ...]</option>
                        <option value="space">空格分隔 (x y 每行一对)</option>
                    </select>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">坐标数据：</label>
                    <textarea id="coordInput" rows="12" style="width: 100%; font-family: monospace; font-size: 12px;" placeholder="示例 (CSV格式):
0.00, 0.00
10.50, 0.00
10.50, 8.30
0.00, 8.30

或 JSON格式:
[[0, 0], [10.5, 0], [10.5, 8.3], [0, 8.3]]"></textarea>
                    <small style="color: #666;">
                        提示：输入室内建筑各角点坐标，将自动闭合成多边形
                    </small>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">
                        <input type="checkbox" id="autoCloseCheck" checked>
                        自动闭合多边形（首尾相连）
                    </label>
                    <label style="display: block; margin-bottom: 5px;">
                        <input type="checkbox" id="clearExistingCheck">
                        导入前清除现有数据
                    </label>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">标签（可选）：</label>
                    <input type="text" id="tagBuildingInput" placeholder="building" value="yes" style="width: 48%; margin-right: 2%;">
                    <input type="text" id="tagNameInput" placeholder="名称（可选）" style="width: 48%;">
                </div>

                <div id="previewDiv" style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px; display: none;">
                    <strong>预览：</strong>
                    <div id="previewContent" style="margin-top: 5px; font-size: 12px; max-height: 100px; overflow-y: auto;"></div>
                </div>
            </div>
            <div class="dialog-footer">
                <button onclick="this.closest('.dialog-overlay').remove()" class="secondary-btn">取消</button>
                <button id="previewBtn" class="secondary-btn">预览</button>
                <button id="importBtn" class="primary-btn">导入</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // 绑定事件
        document.getElementById('coordTypeSelect').onchange = () => {
            const type = document.getElementById('coordTypeSelect').value;
            document.getElementById('referencePointDiv').style.display = 
                (type === 'meter') ? 'block' : 'none';
        };

        document.getElementById('previewBtn').onclick = () => this.preview();
        document.getElementById('importBtn').onclick = () => this.import();

        this.overlay = overlay;
    }

    preview() {
        try {
            const coords = this.parseCoordinates();
            const previewDiv = document.getElementById('previewDiv');
            const previewContent = document.getElementById('previewContent');
            
            if (coords.length === 0) {
                alert('未识别到有效坐标点');
                return;
            }

            let html = `<div>共 ${coords.length} 个点：</div>`;
            coords.slice(0, 10).forEach((c, i) => {
                html += `<div>${i + 1}: (${c[0].toFixed(6)}, ${c[1].toFixed(6)})</div>`;
            });
            if (coords.length > 10) {
                html += `<div>... 还有 ${coords.length - 10} 个点</div>`;
            }

            previewContent.innerHTML = html;
            previewDiv.style.display = 'block';
        } catch (e) {
            alert('解析错误: ' + e.message);
        }
    }

    parseCoordinates() {
        const input = document.getElementById('coordInput').value.trim();
        const format = document.getElementById('formatSelect').value;
        const coordType = document.getElementById('coordTypeSelect').value;
        
        if (!input) return [];

        let coords = [];

        // 解析输入
        if (format === 'json') {
            try {
                coords = JSON.parse(input);
                if (!Array.isArray(coords)) throw new Error('JSON必须是数组');
            } catch (e) {
                throw new Error('JSON格式错误: ' + e.message);
            }
        } else {
            // CSV 或空格分隔
            const lines = input.split('\n').filter(l => l.trim());
            const separator = format === 'csv' ? ',' : /\s+/;
            
            for (const line of lines) {
                const parts = line.trim().split(separator).map(p => p.trim()).filter(p => p);
                if (parts.length >= 2) {
                    const x = parseFloat(parts[0]);
                    const y = parseFloat(parts[1]);
                    if (!isNaN(x) && !isNaN(y)) {
                        coords.push([x, y]);
                    }
                }
            }
        }

        // 坐标系转换
        if (coordType === 'meter') {
            const refLon = parseFloat(document.getElementById('refLon').value);
            const refLat = parseFloat(document.getElementById('refLat').value);
            if (isNaN(refLon) || isNaN(refLat)) {
                throw new Error('请设置有效的参考点经纬度');
            }
            coords = coords.map(([x, y]) => this.metersToLonLat(x, y, refLon, refLat));
        } else if (coordType === 'scene') {
            const refLon = this.editor.coordSystem.sceneOriginLon;
            const refLat = this.editor.coordSystem.sceneOriginLat;
            coords = coords.map(([x, y]) => this.metersToLonLat(x, y, refLon, refLat));
        }
        // lonlat 类型无需转换

        return coords;
    }

    metersToLonLat(dx, dy, refLon, refLat) {
        // 简化的米制到经纬度转换
        // 纬度方向：1度 ≈ 111320米
        const metersPerDegreeLat = 111320;
        // 经度方向：随纬度变化
        const metersPerDegreeLon = metersPerDegreeLat * Math.cos(refLat * Math.PI / 180);
        
        const lon = refLon + dx / metersPerDegreeLon;
        const lat = refLat + dy / metersPerDegreeLat;
        
        return [lon, lat];
    }

    import() {
        try {
            const coords = this.parseCoordinates();
            
            if (coords.length < 2) {
                alert('至少需要2个坐标点');
                return;
            }

            // 清除现有数据
            if (document.getElementById('clearExistingCheck').checked) {
                this.editor.nodes.clear();
                this.editor.ways.clear();
                this.editor.selectedNode = null;
                this.editor.selectedWay = null;
                this.editor.selectedWays.clear();
            }

            // 创建节点
            const nodeIds = [];
            for (const [lon, lat] of coords) {
                const nid = this.editor.nodes.size > 0 ? Math.max(...this.editor.nodes.keys()) + 1 : 1;
                this.editor.nodes.set(nid, { lat, lon, tags: {} });
                nodeIds.push(nid);
            }

            // 自动闭合
            if (document.getElementById('autoCloseCheck').checked && nodeIds.length >= 3) {
                if (nodeIds[0] !== nodeIds[nodeIds.length - 1]) {
                    nodeIds.push(nodeIds[0]);
                }
            }

            // 创建路径
            const wid = this.editor.ways.size > 0 ? Math.max(...this.editor.ways.keys()) + 1 : 1;
            const tags = {};
            
            const buildingTag = document.getElementById('tagBuildingInput').value.trim();
            if (buildingTag) tags.building = buildingTag;
            
            const nameTag = document.getElementById('tagNameInput').value.trim();
            if (nameTag) tags.name = nameTag;

            // 如果是闭合的，添加 area 标签
            if (nodeIds.length >= 4 && nodeIds[0] === nodeIds[nodeIds.length - 1]) {
                tags.area = 'yes';
            }

            this.editor.ways.set(wid, { nodes: nodeIds, tags });

            // 适应窗口并重绘
            this.editor.fitToWindow();
            this.editor.redraw();

            // 清空撤销栈（因为是批量导入）
            this.editor.undoStack = [];
            this.editor.redoStack = [];
            this.editor.updateUndoRedoButtons();

            alert(`成功导入 ${coords.length} 个坐标点，创建了 ${nodeIds.length - 1} 边形`);
            this.close();

        } catch (e) {
            alert('导入失败: ' + e.message);
            console.error(e);
        }
    }

    close() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.remove();
        }
    }
}

export default CoordinateImportDialog;
