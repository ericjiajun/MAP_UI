/**
 * 坐标平移对话框
 * 用于将基于临时参考点绘制的图形平移到真实坐标位置
 */
class TranslateCoordinatesDialog {
    constructor(editor) {
        this.editor = editor;
        this.createDialog();
    }

    createDialog() {
        // 计算当前数据的边界
        const bounds = this.calculateBounds();
        
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.onclick = () => this.close();

        const dialog = document.createElement('div');
        dialog.className = 'dialog';
        dialog.style.width = '550px';
        dialog.onclick = (e) => e.stopPropagation();

        dialog.innerHTML = `
            <div class="dialog-header">
                <h3>平移到真实坐标</h3>
                <button class="close-btn" onclick="this.closest('.dialog-overlay').remove()">×</button>
            </div>
            <div class="dialog-body">
                <div style="margin-bottom: 20px; padding: 12px; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
                    <strong style="color: #1976d2;">💡 使用场景</strong>
                    <p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.6;">
                        如果你之前使用临时参考点（如0,0）绘制了建筑平面图，现在得到了真实的GPS坐标，
                        可以使用此功能将整个图形平移到正确位置，无需重新绘制。
                    </p>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">当前数据范围：</label>
                    <div style="padding: 10px; background: #f5f5f5; border-radius: 4px; font-family: monospace; font-size: 12px;">
                        ${bounds ? `
                            <div>节点数: ${this.editor.nodes.size} 个</div>
                            <div>路径数: ${this.editor.ways.size} 个</div>
                            <div>经度范围: ${bounds.minLon.toFixed(6)} ~ ${bounds.maxLon.toFixed(6)}</div>
                            <div>纬度范围: ${bounds.minLat.toFixed(6)} ~ ${bounds.maxLat.toFixed(6)}</div>
                            <div>中心点: (${bounds.centerLon.toFixed(6)}, ${bounds.centerLat.toFixed(6)})</div>
                        ` : '<div style="color: #999;">暂无数据</div>'}
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">选择平移方式：</label>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <label style="flex: 1; padding: 10px; border: 2px solid #ddd; border-radius: 4px; cursor: pointer; transition: all 0.2s;"
                               onmouseover="this.style.borderColor='#2196f3'; this.style.background='#f0f7ff';"
                               onmouseout="if(!this.querySelector('input').checked) {this.style.borderColor='#ddd'; this.style.background='white';}">
                            <input type="radio" name="translateMode" value="offset" id="modeOffset" checked
                                   onchange="document.getElementById('offsetInputs').style.display='block'; document.getElementById('absoluteInputs').style.display='none'; this.closest('label').style.borderColor='#2196f3'; this.closest('label').style.background='#f0f7ff';">
                            <strong style="display: block; margin-bottom: 3px;">偏移量平移</strong>
                            <small style="color: #666;">指定向东/北移动的米数</small>
                        </label>
                        <label style="flex: 1; padding: 10px; border: 2px solid #ddd; border-radius: 4px; cursor: pointer; transition: all 0.2s;"
                               onmouseover="this.style.borderColor='#2196f3'; this.style.background='#f0f7ff';"
                               onmouseout="if(!this.querySelector('input').checked) {this.style.borderColor='#ddd'; this.style.background='white';}">
                            <input type="radio" name="translateMode" value="absolute" id="modeAbsolute"
                                   onchange="document.getElementById('offsetInputs').style.display='none'; document.getElementById('absoluteInputs').style.display='block'; this.closest('label').style.borderColor='#2196f3'; this.closest('label').style.background='#f0f7ff';">
                            <strong style="display: block; margin-bottom: 3px;">绝对位置平移</strong>
                            <small style="color: #666;">指定参考点的真实坐标</small>
                        </label>
                    </div>
                </div>

                <div id="offsetInputs" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">平移偏移量（米）：</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="font-size: 12px; color: #666;">向东偏移(+东/-西):</label>
                            <input type="number" id="offsetEast" step="0.01" placeholder="例如: 100.50" style="width: 100%; margin-top: 3px;">
                        </div>
                        <div>
                            <label style="font-size: 12px; color: #666;">向北偏移(+北/-南):</label>
                            <input type="number" id="offsetNorth" step="0.01" placeholder="例如: 50.25" style="width: 100%; margin-top: 3px;">
                        </div>
                    </div>
                    <small style="color: #666; display: block; margin-top: 5px;">
                        示例：向东100米，向北50米 → 输入 100, 50
                    </small>
                </div>

                <div id="absoluteInputs" style="margin-bottom: 15px; display: none;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">原参考点和新参考点：</label>
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 12px; color: #666;">原参考点（临时坐标系原点）:</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 3px;">
                            <input type="number" id="oldRefLon" step="0.000001" placeholder="原经度" value="0">
                            <input type="number" id="oldRefLat" step="0.000001" placeholder="原纬度" value="0">
                        </div>
                    </div>
                    <div>
                        <label style="font-size: 12px; color: #666;">新参考点（真实GPS坐标）:</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 3px;">
                            <input type="number" id="newRefLon" step="0.000001" placeholder="真实经度" value="${this.editor.centerX.toFixed(6)}">
                            <input type="number" id="newRefLat" step="0.000001" placeholder="真实纬度" value="${this.editor.centerY.toFixed(6)}">
                        </div>
                        <button onclick="document.getElementById('newRefLon').value = ${this.editor.centerX.toFixed(6)}; document.getElementById('newRefLat').value = ${this.editor.centerY.toFixed(6)};" 
                                style="margin-top: 5px; font-size: 11px; padding: 3px 8px;">使用当前视图中心</button>
                    </div>
                    <small style="color: #666; display: block; margin-top: 8px;">
                        示例：如果原先以(0,0)为临时原点，现在得知该点实际在(116.404, 39.915)
                    </small>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">
                        <input type="checkbox" id="keepOriginal">
                        保留原数据（创建副本而不是移动）
                    </label>
                </div>

                <div id="translatePreview" style="margin-top: 15px; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; display: none;">
                    <strong style="color: #856404;">⚠ 预览</strong>
                    <div id="translatePreviewText" style="margin-top: 5px; font-size: 12px;"></div>
                </div>
            </div>
            <div class="dialog-footer">
                <button onclick="this.closest('.dialog-overlay').remove()" class="secondary-btn">取消</button>
                <button id="previewTranslateBtn" class="secondary-btn">预览</button>
                <button id="applyTranslateBtn" class="primary-btn">应用平移</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        this.overlay = overlay;
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('previewTranslateBtn').onclick = () => this.previewTranslate();
        document.getElementById('applyTranslateBtn').onclick = () => this.applyTranslate();
    }

    calculateBounds() {
        if (this.editor.nodes.size === 0) return null;

        const lons = Array.from(this.editor.nodes.values()).map(n => n.lon);
        const lats = Array.from(this.editor.nodes.values()).map(n => n.lat);

        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);

        return {
            minLon, maxLon, minLat, maxLat,
            centerLon: (minLon + maxLon) / 2,
            centerLat: (minLat + maxLat) / 2
        };
    }

    calculateOffset() {
        const mode = document.querySelector('input[name="translateMode"]:checked').value;

        if (mode === 'offset') {
            // 直接偏移模式
            const east = parseFloat(document.getElementById('offsetEast').value) || 0;
            const north = parseFloat(document.getElementById('offsetNorth').value) || 0;

            if (east === 0 && north === 0) {
                throw new Error('请输入有效的偏移量');
            }

            // 在当前中心点位置计算偏移
            const refLat = this.editor.centerY;
            const metersPerDegreeLat = 111320;
            const metersPerDegreeLon = metersPerDegreeLat * Math.cos(refLat * Math.PI / 180);

            return {
                deltaLon: east / metersPerDegreeLon,
                deltaLat: north / metersPerDegreeLat,
                distanceMeters: Math.hypot(east, north)
            };

        } else {
            // 绝对位置模式
            const oldLon = parseFloat(document.getElementById('oldRefLon').value);
            const oldLat = parseFloat(document.getElementById('oldRefLat').value);
            const newLon = parseFloat(document.getElementById('newRefLon').value);
            const newLat = parseFloat(document.getElementById('newRefLat').value);

            if (isNaN(oldLon) || isNaN(oldLat) || isNaN(newLon) || isNaN(newLat)) {
                throw new Error('请输入有效的参考点坐标');
            }

            const deltaLon = newLon - oldLon;
            const deltaLat = newLat - oldLat;

            // 计算平移距离（米）
            const avgLat = (oldLat + newLat) / 2;
            const metersPerDegreeLat = 111320;
            const metersPerDegreeLon = metersPerDegreeLat * Math.cos(avgLat * Math.PI / 180);
            const distanceMeters = Math.hypot(deltaLon * metersPerDegreeLon, deltaLat * metersPerDegreeLat);

            return { deltaLon, deltaLat, distanceMeters };
        }
    }

    previewTranslate() {
        try {
            const offset = this.calculateOffset();
            const previewDiv = document.getElementById('translatePreview');
            const previewText = document.getElementById('translatePreviewText');

            const bounds = this.calculateBounds();
            const newCenterLon = bounds.centerLon + offset.deltaLon;
            const newCenterLat = bounds.centerLat + offset.deltaLat;

            let html = `<div>将平移 ${this.editor.nodes.size} 个节点</div>`;
            html += `<div>平移距离: ${offset.distanceMeters < 1000 ? 
                offset.distanceMeters.toFixed(2) + 'm' : 
                (offset.distanceMeters / 1000).toFixed(3) + 'km'}</div>`;
            html += `<div>新中心位置: (${newCenterLon.toFixed(6)}, ${newCenterLat.toFixed(6)})</div>`;

            previewText.innerHTML = html;
            previewDiv.style.display = 'block';

        } catch (e) {
            alert('预览失败: ' + e.message);
        }
    }

    applyTranslate() {
        try {
            if (this.editor.nodes.size === 0) {
                alert('没有可平移的数据');
                return;
            }

            const offset = this.calculateOffset();
            const keepOriginal = document.getElementById('keepOriginal').checked;

            if (!confirm(`确定要平移${keepOriginal ? '（创建副本）' : ''}所有数据吗？\n` +
                        `平移距离: ${offset.distanceMeters.toFixed(2)}米`)) {
                return;
            }

            // 创建副本或直接修改
            let nodeIdMap = new Map(); // 旧ID -> 新ID

            if (keepOriginal) {
                // 复制所有节点
                const newNodes = new Map();
                for (const [oldId, nodeData] of this.editor.nodes) {
                    const newId = Math.max(...this.editor.nodes.keys(), ...newNodes.keys()) + 1;
                    nodeIdMap.set(oldId, newId);
                    newNodes.set(newId, {
                        lat: nodeData.lat + offset.deltaLat,
                        lon: nodeData.lon + offset.deltaLon,
                        tags: { ...nodeData.tags }
                    });
                }

                // 复制所有路径
                const newWays = new Map();
                for (const [oldWayId, wayData] of this.editor.ways) {
                    const newWayId = Math.max(...this.editor.ways.keys(), ...newWays.keys()) + 1;
                    newWays.set(newWayId, {
                        nodes: wayData.nodes.map(nid => nodeIdMap.get(nid)),
                        tags: { ...wayData.tags }
                    });
                }

                // 合并到原数据
                for (const [id, data] of newNodes) {
                    this.editor.nodes.set(id, data);
                }
                for (const [id, data] of newWays) {
                    this.editor.ways.set(id, data);
                }

            } else {
                // 直接平移现有数据
                for (const [id, nodeData] of this.editor.nodes) {
                    nodeData.lat += offset.deltaLat;
                    nodeData.lon += offset.deltaLon;
                }
            }

            // 重置视图并重绘
            this.editor.fitToWindow();
            this.editor.redraw();

            // 清空撤销栈
            this.editor.undoStack = [];
            this.editor.redoStack = [];
            this.editor.updateUndoRedoButtons();

            alert(`平移完成！\n${keepOriginal ? '已创建副本并' : '已'}移动 ${this.editor.nodes.size} 个节点`);
            this.close();

        } catch (e) {
            alert('平移失败: ' + e.message);
            console.error(e);
        }
    }

    close() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.remove();
        }
    }
}

export default TranslateCoordinatesDialog;
