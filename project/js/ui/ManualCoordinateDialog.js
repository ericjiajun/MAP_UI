/**
 * 手动输入坐标对话框
 * 逐点输入精确坐标来创建多边形
 */
class ManualCoordinateDialog {
    constructor(editor) {
        this.editor = editor;
        this.points = []; // 存储已输入的点
        this.createDialog();
    }

    createDialog() {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.onclick = () => this.close();

        const dialog = document.createElement('div');
        dialog.className = 'dialog';
        dialog.style.width = '500px';
        dialog.style.maxHeight = '80vh';
        dialog.onclick = (e) => e.stopPropagation();

        dialog.innerHTML = `
            <div class="dialog-header">
                <h3>手动输入坐标点</h3>
                <button class="close-btn" onclick="this.closest('.dialog-overlay').remove()">×</button>
            </div>
            <div class="dialog-body" style="overflow-y: auto; max-height: calc(80vh - 120px);">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">坐标类型：</label>
                    <select id="manualCoordType" style="width: 100%; padding: 5px;">
                        <option value="lonlat">经纬度 (lon, lat)</option>
                        <option value="meter">米制坐标 (x, y)</option>
                    </select>
                </div>

                <div id="manualRefPoint" style="margin-bottom: 15px; display: none;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">参考点（米制原点）：</label>
                    <div style="display: flex; gap: 10px; margin-bottom: 5px;">
                        <input type="number" id="manualRefLon" step="0.000001" placeholder="经度" style="flex: 1;" value="${this.editor.centerX.toFixed(6)}">
                        <input type="number" id="manualRefLat" step="0.000001" placeholder="纬度" style="flex: 1;" value="${this.editor.centerY.toFixed(6)}">
                    </div>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <button onclick="document.getElementById('manualRefLon').value = ${this.editor.centerX.toFixed(6)}; document.getElementById('manualRefLat').value = ${this.editor.centerY.toFixed(6)};" style="font-size: 11px; padding: 3px 8px;">用当前中心</button>
                        <button onclick="document.getElementById('manualRefLon').value = 0; document.getElementById('manualRefLat').value = 0;" style="font-size: 11px; padding: 3px 8px;">用临时原点(0,0)</button>
                    </div>
                    <small style="color: #666; display: block; margin-top: 5px;">
                        💡 <strong>提示</strong>：可先用临时参考点(0,0)绘制，完成后通过"平移到真实坐标"功能统一调整
                    </small>
                </div>

                <div style="margin-bottom: 15px; padding: 10px; background: #f0f0f0; border-radius: 4px;">
                    <strong>添加新点：</strong>
                    <div style="display: flex; gap: 10px; margin-top: 8px; align-items: center;">
                        <input type="number" id="inputX" step="0.01" placeholder="X 或 经度" style="flex: 1;">
                        <input type="number" id="inputY" step="0.01" placeholder="Y 或 纬度" style="flex: 1;">
                        <button id="addPointBtn" class="primary-btn" style="white-space: nowrap;">添加点</button>
                    </div>
                    <small style="color: #666; display: block; margin-top: 5px;">
                        提示：输入精确坐标后点击"添加点"，或按Enter键快速添加
                    </small>
                </div>

                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <strong>已添加的点（共 <span id="pointCount">0</span> 个）：</strong>
                        <div>
                            <button id="undoPointBtn" class="secondary-btn" style="font-size: 12px; padding: 3px 8px;" disabled>撤销</button>
                            <button id="clearPointsBtn" class="secondary-btn" style="font-size: 12px; padding: 3px 8px;" disabled>清空</button>
                        </div>
                    </div>
                    <div id="pointsList" style="max-height: 200px; overflow-y: auto; border: 1px solid #ccc; padding: 8px; background: white; border-radius: 4px; font-family: monospace; font-size: 12px;">
                        <div style="color: #999;">暂无坐标点</div>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">
                        <input type="checkbox" id="manualAutoClose" checked>
                        自动闭合多边形（至少需要3个点）
                    </label>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">建筑标签：</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="manualBuildingTag" placeholder="building" value="yes" style="flex: 1;">
                        <input type="text" id="manualNameTag" placeholder="名称（可选）" style="flex: 1;">
                    </div>
                </div>

                <div id="manualPreview" style="margin-top: 15px; padding: 10px; background: #e8f5e9; border-radius: 4px; display: none;">
                    <strong style="color: #2e7d32;">✓ 准备就绪</strong>
                    <div id="manualPreviewText" style="margin-top: 5px; font-size: 12px;"></div>
                </div>
            </div>
            <div class="dialog-footer">
                <button onclick="this.closest('.dialog-overlay').remove()" class="secondary-btn">取消</button>
                <button id="createWayBtn" class="primary-btn" disabled>创建路径/多边形</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        this.overlay = overlay;
        this.bindEvents();
        this.updatePointsList();
    }

    bindEvents() {
        // 坐标类型切换
        document.getElementById('manualCoordType').onchange = () => {
            const type = document.getElementById('manualCoordType').value;
            document.getElementById('manualRefPoint').style.display = 
                (type === 'meter') ? 'block' : 'none';
            this.updatePointsList();
        };

        // 添加点
        const addBtn = document.getElementById('addPointBtn');
        const inputX = document.getElementById('inputX');
        const inputY = document.getElementById('inputY');

        const addPoint = () => {
            const x = parseFloat(inputX.value);
            const y = parseFloat(inputY.value);

            if (isNaN(x) || isNaN(y)) {
                alert('请输入有效的坐标值');
                return;
            }

            this.points.push([x, y]);
            inputX.value = '';
            inputY.value = '';
            inputX.focus();
            
            this.updatePointsList();
            this.updatePreview();
        };

        addBtn.onclick = addPoint;

        // Enter键快速添加
        inputX.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                inputY.focus();
            }
        });

        inputY.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addPoint();
            }
        });

        // 撤销最后一个点
        document.getElementById('undoPointBtn').onclick = () => {
            if (this.points.length > 0) {
                this.points.pop();
                this.updatePointsList();
                this.updatePreview();
            }
        };

        // 清空所有点
        document.getElementById('clearPointsBtn').onclick = () => {
            if (confirm('确定要清空所有已输入的点吗？')) {
                this.points = [];
                this.updatePointsList();
                this.updatePreview();
            }
        };

        // 创建路径
        document.getElementById('createWayBtn').onclick = () => this.createWay();

        // 自动闭合复选框变化
        document.getElementById('manualAutoClose').onchange = () => this.updatePreview();
    }

    updatePointsList() {
        const listDiv = document.getElementById('pointsList');
        const countSpan = document.getElementById('pointCount');
        const undoBtn = document.getElementById('undoPointBtn');
        const clearBtn = document.getElementById('clearPointsBtn');
        const createBtn = document.getElementById('createWayBtn');

        countSpan.textContent = this.points.length;

        if (this.points.length === 0) {
            listDiv.innerHTML = '<div style="color: #999;">暂无坐标点</div>';
            undoBtn.disabled = true;
            clearBtn.disabled = true;
            createBtn.disabled = true;
        } else {
            const coordType = document.getElementById('manualCoordType').value;
            const label = coordType === 'meter' ? ['X(m)', 'Y(m)'] : ['经度', '纬度'];

            let html = '<table style="width: 100%; border-collapse: collapse;">';
            html += `<tr style="background: #f5f5f5; font-weight: bold;">
                <td style="padding: 4px; width: 30px;">#</td>
                <td style="padding: 4px;">${label[0]}</td>
                <td style="padding: 4px;">${label[1]}</td>
                <td style="padding: 4px; width: 60px;">操作</td>
            </tr>`;

            this.points.forEach((p, i) => {
                html += `<tr style="border-top: 1px solid #eee;">
                    <td style="padding: 4px;">${i + 1}</td>
                    <td style="padding: 4px;">${p[0].toFixed(6)}</td>
                    <td style="padding: 4px;">${p[1].toFixed(6)}</td>
                    <td style="padding: 4px;">
                        <button onclick="window.currentManualDialog.removePoint(${i})" 
                                style="font-size: 11px; padding: 2px 6px;">删除</button>
                    </td>
                </tr>`;
            });

            html += '</table>';
            listDiv.innerHTML = html;

            undoBtn.disabled = false;
            clearBtn.disabled = false;
            createBtn.disabled = this.points.length < 2;
        }

        // 临时保存引用以便删除按钮调用
        window.currentManualDialog = this;
    }

    removePoint(index) {
        this.points.splice(index, 1);
        this.updatePointsList();
        this.updatePreview();
    }

    updatePreview() {
        const previewDiv = document.getElementById('manualPreview');
        const previewText = document.getElementById('manualPreviewText');

        if (this.points.length < 2) {
            previewDiv.style.display = 'none';
            return;
        }

        const autoClose = document.getElementById('manualAutoClose').checked;
        const isPolygon = autoClose && this.points.length >= 3;

        let text = `将创建包含 ${this.points.length} 个节点的`;
        text += isPolygon ? '闭合多边形' : '路径';

        if (isPolygon) {
            // 计算周长
            let perimeter = 0;
            const coords = this.convertToLonLat();
            for (let i = 0; i < coords.length; i++) {
                const p1 = coords[i];
                const p2 = coords[(i + 1) % coords.length];
                perimeter += this.calculateDistance(p1, p2);
            }
            text += `<br>周长约: ${perimeter < 1000 ? perimeter.toFixed(2) + 'm' : (perimeter / 1000).toFixed(3) + 'km'}`;
        } else {
            // 计算总长度
            let length = 0;
            const coords = this.convertToLonLat();
            for (let i = 0; i < coords.length - 1; i++) {
                length += this.calculateDistance(coords[i], coords[i + 1]);
            }
            text += `<br>总长度约: ${length < 1000 ? length.toFixed(2) + 'm' : (length / 1000).toFixed(3) + 'km'}`;
        }

        previewText.innerHTML = text;
        previewDiv.style.display = 'block';
    }

    calculateDistance(p1, p2) {
        const [lon1, lat1] = p1;
        const [lon2, lat2] = p2;
        const metersPerDegreeLat = 111320;
        const mpd = metersPerDegreeLat * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
        const dx = (lon2 - lon1) * mpd;
        const dy = (lat2 - lat1) * metersPerDegreeLat;
        return Math.hypot(dx, dy);
    }

    convertToLonLat() {
        const coordType = document.getElementById('manualCoordType').value;

        if (coordType === 'lonlat') {
            return this.points;
        } else {
            // 米制转经纬度
            const refLon = parseFloat(document.getElementById('manualRefLon').value);
            const refLat = parseFloat(document.getElementById('manualRefLat').value);

            if (isNaN(refLon) || isNaN(refLat)) {
                throw new Error('参考点经纬度无效');
            }

            const metersPerDegreeLat = 111320;
            const metersPerDegreeLon = metersPerDegreeLat * Math.cos(refLat * Math.PI / 180);

            return this.points.map(([x, y]) => [
                refLon + x / metersPerDegreeLon,
                refLat + y / metersPerDegreeLat
            ]);
        }
    }

    createWay() {
        try {
            if (this.points.length < 2) {
                alert('至少需要2个点');
                return;
            }

            const coords = this.convertToLonLat();
            const autoClose = document.getElementById('manualAutoClose').checked;

            // 创建节点
            const nodeIds = [];
            for (const [lon, lat] of coords) {
                const nid = this.editor.nodes.size > 0 ? Math.max(...this.editor.nodes.keys()) + 1 : 1;
                this.editor.nodes.set(nid, { lat, lon, tags: {} });
                nodeIds.push(nid);
            }

            // 自动闭合
            if (autoClose && nodeIds.length >= 3) {
                if (nodeIds[0] !== nodeIds[nodeIds.length - 1]) {
                    nodeIds.push(nodeIds[0]);
                }
            }

            // 创建路径
            const wid = this.editor.ways.size > 0 ? Math.max(...this.editor.ways.keys()) + 1 : 1;
            const tags = {};

            const buildingTag = document.getElementById('manualBuildingTag').value.trim();
            if (buildingTag) tags.building = buildingTag;

            const nameTag = document.getElementById('manualNameTag').value.trim();
            if (nameTag) tags.name = nameTag;

            // 闭合多边形添加area标签
            if (nodeIds.length >= 4 && nodeIds[0] === nodeIds[nodeIds.length - 1]) {
                tags.area = 'yes';
            }

            this.editor.ways.set(wid, { nodes: nodeIds, tags });

            // 适应窗口并重绘
            this.editor.fitToWindow();
            this.editor.redraw();

            // 选中新创建的路径
            this.editor.selectedWay = wid;
            this.editor.selectedWays.clear();
            this.editor.selectedWays.add(wid);
            this.editor.updateSelectionInfo();
            this.editor.updateMultiselectInfo();

            alert(`成功创建${autoClose && this.points.length >= 3 ? '多边形' : '路径'}！包含 ${this.points.length} 个点`);
            this.close();

        } catch (e) {
            alert('创建失败: ' + e.message);
            console.error(e);
        }
    }

    close() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.remove();
        }
        delete window.currentManualDialog;
    }
}

export default ManualCoordinateDialog;
