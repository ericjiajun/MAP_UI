/**
 * 导出坐标对话框
 * 导出选中多边形的坐标点为米制/经纬度格式
 */
class ExportCoordinatesDialog {
    constructor(editor) {
        console.log('ExportCoordinatesDialog 构造函数被调用');
        console.log('editor:', editor);
        
        this.editor = editor;
        this.selectedWayId = null;
        this.nodes = [];
        
        // 获取选中的路径
        if (editor.selectedWay) {
            this.selectedWayId = editor.selectedWay;
            console.log('使用 selectedWay:', this.selectedWayId);
        } else if (editor.selectedWays.size === 1) {
            this.selectedWayId = Array.from(editor.selectedWays)[0];
            console.log('使用 selectedWays (单个):', this.selectedWayId);
        } else if (editor.selectedWays.size > 1) {
            console.log('选中了多个多边形:', editor.selectedWays.size);
            alert('请只选择一个多边形进行导出');
            return;
        } else {
            console.log('没有选中任何多边形');
            alert('请先选择要导出坐标的多边形');
            return;
        }

        // 获取节点数据
        const way = editor.ways.get(this.selectedWayId);
        if (!way) {
            console.error('未找到 way:', this.selectedWayId);
            alert('未找到选中的路径');
            return;
        }
        
        console.log('找到 way:', way);

        this.nodes = way.nodes.map(nodeId => {
            const node = editor.nodes.get(nodeId);
            return node ? { id: nodeId, lon: node.lon, lat: node.lat } : null;
        }).filter(n => n !== null);

        console.log('提取的节点数:', this.nodes.length);

        if (this.nodes.length === 0) {
            alert('该路径没有有效节点');
            return;
        }

        console.log('开始创建对话框...');
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

        // 计算数据边界
        const lons = this.nodes.map(n => n.lon);
        const lats = this.nodes.map(n => n.lat);
        const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;

        dialog.innerHTML = `
            <div class="dialog-header">
                <h3>导出坐标点</h3>
                <button class="close-btn" onclick="this.closest('.dialog-overlay').remove()">×</button>
            </div>
            <div class="dialog-body" style="overflow-y: auto; max-height: calc(80vh - 120px);">
                <div style="margin-bottom: 15px; padding: 10px; background: #e3f2fd; border-radius: 4px;">
                    <strong>选中的多边形信息：</strong>
                    <div style="margin-top: 5px; font-size: 13px;">
                        <div>节点数量: ${this.nodes.length} 个</div>
                        <div>中心位置: (${centerLon.toFixed(6)}, ${centerLat.toFixed(6)})</div>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">导出格式：</label>
                    <select id="exportCoordType" style="width: 100%; padding: 5px;">
                        <option value="meter">米制坐标 (X, Y) - 相对于参考点</option>
                        <option value="lonlat">经纬度 (经度, 纬度)</option>
                    </select>
                </div>

                <div id="exportRefPoint" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">参考点（米制坐标原点）：</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 5px;">
                        <div>
                            <label style="font-size: 12px;">经度:</label>
                            <input type="number" id="exportRefLon" step="0.000001" value="${centerLon.toFixed(6)}" style="width: 100%;">
                        </div>
                        <div>
                            <label style="font-size: 12px;">纬度:</label>
                            <input type="number" id="exportRefLat" step="0.000001" value="${centerLat.toFixed(6)}" style="width: 100%;">
                        </div>
                    </div>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <button onclick="document.getElementById('exportRefLon').value = ${centerLon.toFixed(6)}; document.getElementById('exportRefLat').value = ${centerLat.toFixed(6)}; window.currentExportDialog.updatePreview();" 
                                style="font-size: 11px; padding: 3px 8px;">用中心点</button>
                        <button onclick="document.getElementById('exportRefLon').value = ${this.nodes[0].lon.toFixed(6)}; document.getElementById('exportRefLat').value = ${this.nodes[0].lat.toFixed(6)}; window.currentExportDialog.updatePreview();" 
                                style="font-size: 11px; padding: 3px 8px;">用第一个点</button>
                        <button onclick="document.getElementById('exportRefLon').value = 0; document.getElementById('exportRefLat').value = 0; window.currentExportDialog.updatePreview();" 
                                style="font-size: 11px; padding: 3px 8px;">用原点(0,0)</button>
                    </div>
                    <small style="color: #666; display: block; margin-top: 5px;">
                        米制坐标将相对于此参考点计算，向东为+X，向北为+Y
                    </small>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">输出格式：</label>
                    <select id="exportFormat" style="width: 100%; padding: 5px;">
                        <option value="csv">CSV格式 (x, y)</option>
                        <option value="json">JSON数组 [[x, y], ...]</option>
                        <option value="space">空格分隔 (x y)</option>
                        <option value="table">表格格式（带序号）</option>
                    </select>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">
                        <input type="checkbox" id="exportSkipLast" checked>
                        跳过最后一个点（如果首尾相同，即闭合多边形）
                    </label>
                    <label style="display: block; margin-bottom: 5px;">
                        <input type="checkbox" id="exportHighPrecision">
                        高精度输出（8位小数，否则2位）
                    </label>
                </div>

                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <strong>预览：</strong>
                        <button id="updatePreviewBtn" class="secondary-btn" style="font-size: 12px; padding: 3px 8px;">刷新预览</button>
                    </div>
                    <textarea id="exportPreview" readonly 
                              style="width: 100%; height: 250px; font-family: monospace; font-size: 12px; 
                                     background: #f5f5f5; border: 1px solid #ccc; padding: 8px; border-radius: 4px;"></textarea>
                </div>
            </div>
            <div class="dialog-footer">
                <button onclick="this.closest('.dialog-overlay').remove()" class="secondary-btn">取消</button>
                <button id="copyToClipboardBtn" class="secondary-btn">复制到剪贴板</button>
                <button id="downloadBtn" class="primary-btn">下载文件</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        this.overlay = overlay;
        this.bindEvents();
        this.updatePreview();

        // 临时保存引用
        window.currentExportDialog = this;
    }

    bindEvents() {
        document.getElementById('exportCoordType').onchange = () => {
            const type = document.getElementById('exportCoordType').value;
            document.getElementById('exportRefPoint').style.display = 
                (type === 'meter') ? 'block' : 'none';
            this.updatePreview();
        };

        document.getElementById('exportFormat').onchange = () => this.updatePreview();
        document.getElementById('exportSkipLast').onchange = () => this.updatePreview();
        document.getElementById('exportHighPrecision').onchange = () => this.updatePreview();
        document.getElementById('updatePreviewBtn').onclick = () => this.updatePreview();
        document.getElementById('copyToClipboardBtn').onclick = () => this.copyToClipboard();
        document.getElementById('downloadBtn').onclick = () => this.downloadFile();
    }

    convertCoordinates() {
        const coordType = document.getElementById('exportCoordType').value;
        const skipLast = document.getElementById('exportSkipLast').checked;
        const highPrecision = document.getElementById('exportHighPrecision').checked;
        const decimals = highPrecision ? 8 : 2;

        let nodes = [...this.nodes];

        // 检查是否闭合多边形
        if (skipLast && nodes.length >= 2) {
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            if (first.lon === last.lon && first.lat === last.lat) {
                nodes = nodes.slice(0, -1);
            }
        }

        if (coordType === 'meter') {
            // 转换为米制坐标
            const refLon = parseFloat(document.getElementById('exportRefLon').value);
            const refLat = parseFloat(document.getElementById('exportRefLat').value);

            if (isNaN(refLon) || isNaN(refLat)) {
                throw new Error('参考点坐标无效');
            }

            const metersPerDegreeLat = 111320;
            const metersPerDegreeLon = metersPerDegreeLat * Math.cos(refLat * Math.PI / 180);

            return nodes.map(node => {
                const x = (node.lon - refLon) * metersPerDegreeLon;
                const y = (node.lat - refLat) * metersPerDegreeLat;
                return [parseFloat(x.toFixed(decimals)), parseFloat(y.toFixed(decimals))];
            });
        } else {
            // 返回经纬度
            return nodes.map(node => [
                parseFloat(node.lon.toFixed(decimals)),
                parseFloat(node.lat.toFixed(decimals))
            ]);
        }
    }

    formatCoordinates(coords) {
        const format = document.getElementById('exportFormat').value;

        switch (format) {
            case 'csv':
                return coords.map(c => `${c[0]}, ${c[1]}`).join('\n');

            case 'json':
                return JSON.stringify(coords, null, 2);

            case 'space':
                return coords.map(c => `${c[0]} ${c[1]}`).join('\n');

            case 'table':
                let result = '序号\tX/经度\tY/纬度\n';
                result += '----\t-------\t-------\n';
                coords.forEach((c, i) => {
                    result += `${i + 1}\t${c[0]}\t${c[1]}\n`;
                });
                return result;

            default:
                return coords.map(c => `${c[0]}, ${c[1]}`).join('\n');
        }
    }

    updatePreview() {
        try {
            const coords = this.convertCoordinates();
            const formatted = this.formatCoordinates(coords);
            document.getElementById('exportPreview').value = formatted;
        } catch (e) {
            document.getElementById('exportPreview').value = '错误: ' + e.message;
        }
    }

    copyToClipboard() {
        const textarea = document.getElementById('exportPreview');
        textarea.select();
        document.execCommand('copy');
        
        const btn = document.getElementById('copyToClipboardBtn');
        const originalText = btn.textContent;
        btn.textContent = '已复制！';
        btn.style.background = '#4caf50';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }

    downloadFile() {
        const content = document.getElementById('exportPreview').value;
        const coordType = document.getElementById('exportCoordType').value;
        const format = document.getElementById('exportFormat').value;
        
        // 确定文件扩展名
        let ext = 'txt';
        if (format === 'json') ext = 'json';
        else if (format === 'csv') ext = 'csv';

        // 确定文件名
        const typeLabel = coordType === 'meter' ? 'meters' : 'lonlat';
        const filename = `coordinates_${typeLabel}_${Date.now()}.${ext}`;

        // 创建下载
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert(`文件已下载: ${filename}`);
    }

    close() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.remove();
        }
        delete window.currentExportDialog;
    }
}

export default ExportCoordinatesDialog;
