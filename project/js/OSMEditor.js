import GridSettings from './models/GridSettings.js';
import CoordinateSystem from './models/CoordinateSystem.js';
import ThreeDSettings from './models/ThreeDSettings.js';
import AddObjectCommand from './commands/AddObjectCommand.js';
import DeleteObjectCommand from './commands/DeleteObjectCommand.js';
import MoveNodeCommand from './commands/MoveNodeCommand.js';
import ModifyTagsCommand from './commands/ModifyTagsCommand.js';
// UI 对话框与编辑器工具
import TagEditorDialog from './ui/TagEditorDialog.js';
import GridControlPanelDialog from './ui/GridControlPanelDialog.js';
import ThreedSettingsDialog from './ui/ThreedSettingsDialog.js';
import { openHeightEditor, openColorEditor } from './ui/BuildingEditors.js';
import MapCalibrationDialog from './ui/MapCalibrationDialog.js';
import CoordinateImportDialog from './ui/CoordinateImportDialog.js';
import ManualCoordinateDialog from './ui/ManualCoordinateDialog.js';
import TranslateCoordinatesDialog from './ui/TranslateCoordinatesDialog.js';
import BasemapManager from './layers/BasemapManager.js';

class OSMEditor {
    constructor() {
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas.getContext('2d');

        // 数据存储
        this.nodes = new Map();
        this.ways = new Map();
        this.relations = new Map();

        // 撤销/重做系统
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoLevels = 50;

        // 视图参数
        this.scale = 100000;
        this.centerX = 0;
        this.centerY = 0;
        this.rotation = 0;

        // 交互状态
        this.selectedNode = null;
        this.selectedWay = null;
        this.selectedWays = new Set();
        this.dragStart = null;
        this.mode = 'select';
        this.creatingWay = [];
        this.draggingNode = false;
        this.nodeStartPos = null;
    this.panning = false;

        // 框选
        this.boxSelecting = false;
        this.boxStart = null;
        this.boxCurrent = null;

        // 测量
        this.measuring = false;
        this.measurePoints = [];
        this.measureDistances = [];

        // 渲染模式
        this.renderMode = 'geometry';
        this.showLabels = true;

        // 设置
        this.gridSettings = new GridSettings();
        this.coordSystem = new CoordinateSystem();
        this.threeDSettings = new ThreeDSettings();

        // 其他
        this.compassSize = 80;
        this.metersPerDegreeLat = 111320;

        // 统一的底图管理器
        this.basemap = new BasemapManager(this);

        this.setupCanvas();
        this.bindEvents();
        this.updateUndoRedoButtons();
        this.redraw();
    }

    // 基础设置
    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.redraw();
    }

    bindEvents() {
        // 鼠标
        this.canvas.addEventListener('mousedown', (e) => this.onClick(e));
        this.canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); this.onRightClick(e); });
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onRelease(e));
        this.canvas.addEventListener('wheel', (e) => this.onScroll(e));
        this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
        // 键盘
        document.addEventListener('keydown', (e) => this.onKey(e));
        // 聚焦
        this.canvas.tabIndex = 0;
        this.canvas.focus();

        // 瓦片控件
        const tileChk = document.getElementById('tileCheck');
        if (tileChk) tileChk.addEventListener('change', () => this.toggleTiles());
        const tileZoomInput = document.getElementById('tileZoomInput');
        if (tileZoomInput) tileZoomInput.addEventListener('input', () => this.onTileZoomChange());
    const satChk = document.getElementById('satCheck');
    if (satChk) satChk.addEventListener('change', () => this.toggleSatellite());
    }

    // 命令系统
    executeCommand(command) {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = [];
        if (this.undoStack.length > this.maxUndoLevels) this.undoStack.shift();
        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const command = this.undoStack.pop();
        command.undo();
        this.redoStack.push(command);
        this.updateUndoRedoButtons();
        this.redraw();
        this.updateSelectionInfo();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const command = this.redoStack.pop();
        command.execute();
        this.undoStack.push(command);
        this.updateUndoRedoButtons();
        this.redraw();
        this.updateSelectionInfo();
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        if (undoBtn) undoBtn.disabled = this.undoStack.length === 0;
        if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
    }

    // 模式 & 选项
    onModeChange() {
        this.mode = document.getElementById('modeSelect').value;
        const cursors = { select: 'default', add_node: 'crosshair', add_way: 'crosshair', add_polygon: 'crosshair', box_select: 'crosshair', measure: 'crosshair' };
        this.canvas.style.cursor = cursors[this.mode] || 'default';
        this.creatingWay = [];
        this.updateCreateStatus();
        if (this.mode !== 'measure' && this.measurePoints.length > 0) this.clearMeasurement();
    }

    onRenderModeChange() {
        this.renderMode = document.getElementById('renderSelect').value;
        const bar = document.getElementById('threedToolbar');
        if (bar) bar.style.display = this.renderMode === '3d' ? 'flex' : 'none';
        if (this.renderMode === '3d') this.update3DView();
        this.redraw();
    }

    onCoordSystemChange() { this.coordSystem.coordType = document.getElementById('coordSelect').value; this.redraw(); }
    // 调整: 切换到 webmercator 时重设合理的 scale
    onCoordSystemChange(){
        this.coordSystem.coordType = document.getElementById('coordSelect').value;
        if (this.coordSystem.coordType === 'webmercator'){
            // 若任一底图启用, 按当前缩放级别和纬度设置一个合适的像素/米比例
            const anyEnabled = (this.basemap && this.basemap.isAnyEnabled && this.basemap.isAnyEnabled());
            if (anyEnabled){
                const lat = this.centerY;
                const z = (this.basemap && this.basemap.getZoom) ? this.basemap.getZoom() : 16;
                this.scale = this.computeScaleForTileZoom(z, lat);
            } else {
                this.scale = 1; // 合理默认: 1px/m
            }
        } else if (this.coordSystem.coordType === 'geographic'){
            // 恢复到经纬度常用比例
            this.scale = 100000;
        }
        this.scale = this.clampScale();
        this.redraw();
    }
    toggleLabels() { this.showLabels = document.getElementById('labelsCheck').checked; this.redraw(); }
    toggleGrid() { this.gridSettings.showGrid = document.getElementById('gridCheck').checked; this.updateGridStatus(); this.redraw(); }
    toggleCompass() { this.redraw(); }
    toggle3DLabels() { this.threeDSettings.show3DLabels = document.getElementById('show3DLabelsCheck').checked; this.redraw(); }
    toggleLandscape() { this.threeDSettings.showLandscape = document.getElementById('showLandscapeCheck').checked; this.redraw(); }

    // 3D 视图
    update3DView() {
        if (this.renderMode !== '3d') return;
        const v = document.getElementById('viewAngleSlider');
        const r = document.getElementById('rotationAngleSlider');
        const h = document.getElementById('heightScaleSlider');
        if (v) this.threeDSettings.viewAngle = parseFloat(v.value);
        if (r) this.threeDSettings.rotationAngle = parseFloat(r.value);
        if (h) this.threeDSettings.heightScale = parseFloat(h.value);
        this.redraw();
    }

    resetCameraView() {
        const v = document.getElementById('viewAngleSlider');
        const r = document.getElementById('rotationAngleSlider');
        const h = document.getElementById('heightScaleSlider');
        if (v) v.value = 45;
        if (r) r.value = 0;
        if (h) h.value = 1;
        this.update3DView();
    }

    // 3D: 参数与颜色
    getBuildingHeight(tags) {
        if (tags.height) { const t = parseFloat(tags.height); if (!isNaN(t)) return t; }
        const lv = parseFloat(tags.levels || tags['building:levels']); if (!isNaN(lv)) return lv * 3;
        const bh = parseFloat(tags['building:height']); if (!isNaN(bh)) return bh;
        const defaults = { house: 6, residential: 15, commercial: 20, retail: 8, office: 25, industrial: 12, school: 10, university: 15, hospital: 18, apartment: 30, hotel: 25 };
        return defaults[tags.building] || this.threeDSettings.defaultHeight;
    }

    getBuildingColor(tags) {
        let color = tags['building:colour'] || tags['building:color'] || tags.colour || tags.color || null;
        return color ? this.ensureHexColor(color) : this.threeDSettings.defaultBuildingColor;
    }

    ensureHexColor(color) {
        if (!color || color === 'transparent') return this.threeDSettings.defaultBuildingColor;
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color;
        const names = { red: '#FF0000', green: '#00FF00', blue: '#0000FF', white: '#FFFFFF', black: '#000000', gray: '#808080', grey: '#808080', yellow: '#FFFF00', orange: '#FFA500', purple: '#800080' };
        const lc = String(color).toLowerCase();
        if (names[lc]) return names[lc];
        const m = lc.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (m) { const [r,g,b] = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])]; return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join(''); }
        return this.threeDSettings.defaultBuildingColor;
    }

    hexToRgb(hex) {
        if (!hex || typeof hex !== 'string') return null;
        hex = hex.replace('#','');
        if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
        if (hex.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(hex)) return null;
        return { r: parseInt(hex.substr(0,2),16), g: parseInt(hex.substr(2,2),16), b: parseInt(hex.substr(4,2),16) };
    }

    drawBuilding3D(points, tags, wayId) {
        if (points.length < 3) return;
        const height = this.getBuildingHeight(tags);
        const scaled = height * this.threeDSettings.heightScale;
        const color = this.getBuildingColor(tags);
        const v = this.threeDSettings.viewAngle * Math.PI/180;
        const rot = this.threeDSettings.rotationAngle * Math.PI/180;
        const hp = scaled * this.scale / this.metersPerDegreeLat;
        const offX = hp * Math.cos(v) * Math.cos(rot) * 0.6;
        const offY = -hp * Math.sin(v) * 0.6 + hp * Math.cos(v) * Math.sin(rot) * 0.3;
        const top = points.map(([x,y])=>[x+offX,y+offY]);
        const isSel = this.selectedWays.has(wayId);
        // 阴影/底面
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.beginPath(); this.ctx.moveTo(points[0][0],points[0][1]);
        for (let i=1;i<points.length;i++) this.ctx.lineTo(points[i][0],points[i][1]);
        this.ctx.closePath(); this.ctx.fill();
        // 侧面
        for (let i=0;i<points.length-1;i++) {
            const [x1,y1]=points[i], [x2,y2]=points[i+1];
            const [tx1,ty1]=top[i], [tx2,ty2]=top[i+1];
            const nx = -(y2-y1), ny = x2-x1; const len=Math.hypot(nx,ny)||1; const nX=nx/len, nY=ny/len;
            const la = this.threeDSettings.lightAngle*Math.PI/180; const lX=Math.cos(la), lY=Math.sin(la);
            const li = Math.max(0.3, Math.abs(nX*lX+nY*lY));
            let wall = color;
            if (!isSel) { const rgb=this.hexToRgb(color); if (rgb){ const r=Math.round(rgb.r*li*this.threeDSettings.wallColorIntensity); const g=Math.round(rgb.g*li*this.threeDSettings.wallColorIntensity); const b=Math.round(rgb.b*li*this.threeDSettings.wallColorIntensity); wall=`rgb(${r},${g},${b})`; } }
            if (isSel) wall = '#FFFF00';
            this.ctx.fillStyle = wall; this.ctx.strokeStyle = '#000'; this.ctx.lineWidth = 1;
            this.ctx.beginPath(); this.ctx.moveTo(x1,y1); this.ctx.lineTo(x2,y2); this.ctx.lineTo(tx2,ty2); this.ctx.lineTo(tx1,ty1); this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();
        }
        // 顶面
        let topColor = color; if (isSel) topColor='#FFFF00'; else { const rgb=this.hexToRgb(color); if (rgb){ const r=Math.min(255,Math.round(rgb.r*1.2)); const g=Math.min(255,Math.round(rgb.g*1.2)); const b=Math.min(255,Math.round(rgb.b*1.2)); topColor=`rgb(${r},${g},${b})`; } }
        this.ctx.fillStyle = topColor; this.ctx.strokeStyle = '#000'; this.ctx.lineWidth=2;
        this.ctx.beginPath(); this.ctx.moveTo(top[0][0],top[0][1]); for (let i=1;i<top.length;i++) this.ctx.lineTo(top[i][0],top[i][1]); this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();
        if (this.threeDSettings.show3DLabels) {
            const cx = top.reduce((s,p)=>s+p[0],0)/top.length; const cy = top.reduce((s,p)=>s+p[1],0)/top.length;
            const text = height<1000?`${height.toFixed(1)}m`:`${(height/1000).toFixed(2)}km`;
            this.ctx.fillStyle='white'; this.ctx.strokeStyle='black'; this.ctx.lineWidth=1; this.ctx.font='bold 9px Arial'; this.ctx.textAlign='center'; this.ctx.textBaseline='middle';
            const tw = this.ctx.measureText(text).width; this.ctx.fillRect(cx - tw/2 - 2, cy - 6, tw + 4, 12); this.ctx.strokeRect(cx - tw/2 - 2, cy - 6, tw + 4, 12);
            this.ctx.fillStyle='black'; this.ctx.fillText(text, cx, cy);
        }
    }

    drawWay3D(points, tags, isClosed, isSelected, isMultiSelected) {
        if (points.length < 2) return;
        const v = this.threeDSettings.viewAngle * Math.PI/180;
        const rot = this.threeDSettings.rotationAngle * Math.PI/180;
        const base = 2; const hp = base * this.scale / this.metersPerDegreeLat;
        const ox = hp * Math.cos(v) * Math.cos(rot) * 0.6; const oy = -hp * Math.sin(v) * 0.6 + hp * Math.cos(v) * Math.sin(rot) * 0.3;
        const style = this.getWayStyle(tags);
        const color = isSelected ? 'red' : (isMultiSelected ? 'yellow' : style.fill);
        const width = (isSelected || isMultiSelected) ? style.width + 2 : style.width;
        if (isClosed && points.length>=3) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.2)'; this.ctx.beginPath(); this.ctx.moveTo(points[0][0],points[0][1]); for (let i=1;i<points.length;i++) this.ctx.lineTo(points[i][0],points[i][1]); this.ctx.closePath(); this.ctx.fill();
            for (let i=0;i<points.length-1;i++) { const [x1,y1]=points[i], [x2,y2]=points[i+1]; const [tx1,ty1]=[x1+ox,y1+oy], [tx2,ty2]=[x2+ox,y2+oy]; this.ctx.fillStyle=color; this.ctx.strokeStyle='black'; this.ctx.lineWidth=1; this.ctx.beginPath(); this.ctx.moveTo(x1,y1); this.ctx.lineTo(x2,y2); this.ctx.lineTo(tx2,ty2); this.ctx.lineTo(tx1,ty1); this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke(); }
            this.ctx.fillStyle = color; this.ctx.strokeStyle='black'; this.ctx.lineWidth=width; this.ctx.beginPath(); this.ctx.moveTo(points[0][0]+ox,points[0][1]+oy); for (let i=1;i<points.length;i++) this.ctx.lineTo(points[i][0]+ox,points[i][1]+oy); this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();
        } else {
            this.ctx.strokeStyle='rgba(0,0,0,0.3)'; this.ctx.lineWidth=width+2; this.ctx.beginPath(); this.ctx.moveTo(points[0][0],points[0][1]); for (let i=1;i<points.length;i++) this.ctx.lineTo(points[i][0],points[i][1]); this.ctx.stroke();
            this.ctx.strokeStyle=color; this.ctx.lineWidth=width; this.ctx.beginPath(); this.ctx.moveTo(points[0][0]+ox,points[0][1]+oy); for (let i=1;i<points.length;i++) this.ctx.lineTo(points[i][0]+ox,points[i][1]+oy); this.ctx.stroke();
            for (let i=0;i<points.length;i++) { this.ctx.strokeStyle='rgba(0,0,0,0.5)'; this.ctx.lineWidth=1; this.ctx.beginPath(); this.ctx.moveTo(points[i][0],points[i][1]); this.ctx.lineTo(points[i][0]+ox,points[i][1]+oy); this.ctx.stroke(); }
        }
    }

    drawLandscape3D(points, tags, wayId) {
        if (!this.threeDSettings.showLandscape || points.length < 3) return;
        const landuse = tags.landuse; const natural = tags.natural; const leisure = tags.leisure;
        let color = null; let h = 0.5;
        if (landuse==='grass' || leisure==='park' || leisure==='garden') color = '#90EE90';
        else if (natural==='forest' || natural==='wood' || landuse==='forest') { color = '#228B22'; h = 8; }
        else if (landuse==='farmland' || landuse==='meadow') color = '#ADFF2F';
        else if (natural==='water' || landuse==='reservoir') { color = '#4169E1'; h = -0.5; }
        else if (landuse==='residential') color = '#FFE4B5';
        else if (landuse==='commercial') color = '#DDA0DD';
        else if (landuse==='industrial') color = '#D3D3D3';
        if (!color) return;
        const scaled = h * this.threeDSettings.heightScale; const v = this.threeDSettings.viewAngle*Math.PI/180; const rot = this.threeDSettings.rotationAngle*Math.PI/180; const hp = scaled * this.scale / this.metersPerDegreeLat;
        const ox = hp*Math.cos(v)*Math.cos(rot)*0.6; const oy = -hp*Math.sin(v)*0.6 + hp*Math.cos(v)*Math.sin(rot)*0.3;
        const top = points.map(([x,y])=>[x+ox,y+oy]); const isSel = this.selectedWays.has(wayId);
        this.ctx.fillStyle = isSel ? '#FFFF00' : color; this.ctx.strokeStyle = 'rgba(0,0,0,0.3)'; this.ctx.lineWidth=1; this.ctx.beginPath(); this.ctx.moveTo(points[0][0],points[0][1]); for (let i=1;i<points.length;i++) this.ctx.lineTo(points[i][0],points[i][1]); this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();
        if (h>0) { for (let i=0;i<points.length-1;i++){ const [x1,y1]=points[i]; const [x2,y2]=points[i+1]; const [tx1,ty1]=top[i]; const [tx2,ty2]=top[i+1]; this.ctx.fillStyle=color; this.ctx.strokeStyle='rgba(0,0,0,0.2)'; this.ctx.beginPath(); this.ctx.moveTo(x1,y1); this.ctx.lineTo(x2,y2); this.ctx.lineTo(tx2,ty2); this.ctx.lineTo(tx1,ty1); this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke(); } this.ctx.fillStyle=color; this.ctx.strokeStyle='rgba(0,0,0,0.4)'; this.ctx.lineWidth=1; this.ctx.beginPath(); this.ctx.moveTo(top[0][0],top[0][1]); for (let i=1;i<top.length;i++) this.ctx.lineTo(top[i][0],top[i][1]); this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke(); }
        if (this.threeDSettings.show3DLabels && tags.name) { const cx = top.reduce((s,p)=>s+p[0],0)/top.length; const cy = top.reduce((s,p)=>s+p[1],0)/top.length; this.ctx.fillStyle='black'; this.ctx.font='bold 10px Arial'; this.ctx.textAlign='center'; this.ctx.textBaseline='middle'; this.ctx.fillText(tags.name, cx, cy); }
    }

    // 坐标变换
    canvasToWorld(canvasX, canvasY) {
        const cx = this.canvas.width/2, cy = this.canvas.height/2;
        const relX = canvasX - cx, relY = canvasY - cy;
        const rad = -this.rotation*Math.PI/180; const c=Math.cos(rad), s=Math.sin(rad);
        const rx = relX*c - relY*s, ry = relX*s + relY*c; // 转回未旋转坐标
        const dx = rx/this.scale, dy = -ry/this.scale;    // 像素 -> 世界单位
        if (this.coordSystem.coordType === 'webmercator'){
            const [cmx, cmy] = this.coordSystem.geographicToMercator(this.centerX, this.centerY);
            const [lon, lat] = this.coordSystem.mercatorToGeographic(cmx + dx, cmy + dy);
            return [lon, lat];
        } else {
            const worldX = this.centerX + dx;
            const worldY = this.centerY + dy;
            return [worldX, worldY];
        }
    }

    worldToCanvas(worldX, worldY) {
        let dx, dy;
        if (this.coordSystem.coordType === 'webmercator'){
            const [mx,my] = this.coordSystem.geographicToMercator(worldX, worldY);
            const [cmx,cmy] = this.coordSystem.geographicToMercator(this.centerX, this.centerY);
            dx = (mx - cmx) * this.scale;
            dy = -(my - cmy) * this.scale;
        } else {
            dx = (worldX - this.centerX) * this.scale;
            dy = -(worldY - this.centerY) * this.scale;
        }
        const rad = this.rotation*Math.PI/180; const c=Math.cos(rad), s=Math.sin(rad);
        const rx = dx*c - dy*s, ry = dx*s + dy*c;
        const cx = this.canvas.width/2, cy = this.canvas.height/2; return [cx + rx, cy + ry];
    }

    snapToGrid(x,y){ const dx=x-this.gridSettings.originX, dy=y-this.gridSettings.originY; const mpd=this.metersPerDegreeLat*Math.cos(y*Math.PI/180); const dxm=dx*mpd, dym=dy*this.metersPerDegreeLat; const g=this.gridSettings.gridSizeMeters; const sdxm=Math.round(dxm/g)*g, sdym=Math.round(dym/g)*g; const sdx=sdxm/mpd, sdy=sdym/this.metersPerDegreeLat; return [this.gridSettings.originX+sdx, this.gridSettings.originY+sdy]; }

    // 状态更新
    updateCoordinateDisplay(worldX, worldY){
        let text;
        if (this.coordSystem.coordType==='geographic'){
            text = `经度: ${worldX.toFixed(6)}, 纬度: ${worldY.toFixed(6)}`;
        } else if (this.coordSystem.coordType==='scene'){
            const [sx,sy]=this.coordSystem.geographicToScene(worldX,worldY); text = `X: ${sx.toFixed(2)}m, Y: ${sy.toFixed(2)}m`;
        } else { // webmercator
            const [mx,my] = this.coordSystem.geographicToMercator(worldX,worldY); text = `MX: ${mx.toFixed(2)}m, MY: ${my.toFixed(2)}m`;
        }
        const label = document.getElementById('coordLabel'); if (label) label.textContent = text;
        let ratio;
        if (this.coordSystem.coordType==='webmercator'){
            // 在墨卡托中, world单位为米, scale 为 px/米, 简化显示 1:scale
            ratio = Math.max(1, Math.round(this.scale));
        } else {
            const mpd = this.metersPerDegreeLat*Math.cos(worldY*Math.PI/180); const mpp = mpd/this.scale; ratio = Math.max(1, Math.round(mpp));
        }
        const sl = document.getElementById('scaleLabel'); if (sl) sl.textContent = `1:${ratio}`;
    }

    updateCreateStatus(){
        let status = '无'; if (this.creatingWay.length>0){ status = this.mode==='add_way' ? `创建路径: ${this.creatingWay.length}个节点` : (this.mode==='add_polygon'?`创建多边形: ${this.creatingWay.length}个节点`:status); } else if (this.mode==='measure'){ status = this.measurePoints.length>0?`测量: ${this.measurePoints.length}个点`:'测量模式'; }
        const el = document.getElementById('createStatusLabel'); if (el) el.textContent = status;
    }

    updateGridStatus(){ const el=document.getElementById('gridStatusLabel'); if(!el) return; if(this.gridSettings.showGrid){ let s=`显示 ${this.gridSettings.gridSizeMeters}m`; if (this.gridSettings.snapToGrid) s+=' (吸附)'; el.textContent=s; el.style.color='green'; } else { el.textContent='隐藏'; el.style.color='gray'; } }

    updateMultiselectInfo(){ const el=document.getElementById('multiselectLabel'); if(!el) return; if(this.selectedWays.size>0){ el.textContent=`已选择 ${this.selectedWays.size} 个多边形`; el.style.color='green'; } else { el.textContent='未选择'; el.style.color='orange'; } }

    updateViewInfo(){ const k=this.scale/100000; let info=`缩放: ${k.toFixed(2)}<br>旋转: ${this.rotation}°`; if (this.coordSystem.coordType==='scene'){ info+=`<br>场景原点: (${this.coordSystem.sceneOriginLon.toFixed(3)}, ${this.coordSystem.sceneOriginLat.toFixed(3)})`; } if (this.renderMode==='3d'){ info+=`<br>3D俯视: ${this.threeDSettings.viewAngle}°`; info+=`<br>3D旋转: ${this.threeDSettings.rotationAngle}°`; info+=`<br>高度缩放: ${this.threeDSettings.heightScale}x`; }
        const vl=document.getElementById('viewLabel'); if (vl) vl.innerHTML = info; }

    // 绘制
    redraw(){ this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height); this.ctx.fillStyle='white'; this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height); this.basemap.draw(this.ctx); this.drawGrid(); this.drawOSMData(); this.drawCompass(); this.drawBoxSelect(); this.drawMeasurement(); this.updateViewInfo(); }

    // 瓦片地图
    toggleTiles(){ const enabled = document.getElementById('tileCheck')?.checked ?? false; this.basemap.setOSMEnabled(enabled); this.updateAttribution(); this.redraw(); }
    toggleSatellite(){ const enabled = document.getElementById('satCheck')?.checked ?? false; this.basemap.setSatelliteEnabled(enabled); this.updateAttribution(); this.redraw(); }

    updateAttribution(){
        const attr = document.getElementById('tileAttribution');
        if (!attr) return;
        const text = this.basemap.getAttribution();
        if (text && text.length>0){ attr.textContent = text; attr.style.display = 'block'; }
        else { attr.style.display = 'none'; }
    }
    onTileZoomChange(){ const el=document.getElementById('tileZoomInput'); if (!el) return; let z=parseInt(el.value); if (isNaN(z)) z=this.basemap.getZoom(); z = Math.max(0, Math.min(19, z)); this.basemap.setZoom(z); if (this.coordSystem.coordType==='webmercator') { const lat=this.centerY; this.scale = this.computeScaleForTileZoom(this.basemap.getZoom(), lat); this.scale = this.clampScale(); } this.redraw(); }

    // 依据瓦片缩放与纬度计算像素/米比例（WebMercator）
    computeScaleForTileZoom(z, lat){ const R = 156543.03392804097; const cos = Math.cos(lat * Math.PI/180) || 1e-6; const metersPerPixel = (R * cos) / Math.pow(2, z); const pxPerMeter = 1 / metersPerPixel; return pxPerMeter; }

    // 不同坐标系下的 scale 合理范围限制
    clampScale(){ 
        if (this.coordSystem.coordType==='webmercator'){ 
            // WebMercator: 像素/米
            // MIN: 0.00001 (1像素=100km) MAX: 10000 (10000像素=1米，厘米级精度)
            const MIN=0.00001, MAX=10000; 
            return Math.min(MAX, Math.max(MIN, this.scale)); 
        } else { 
            // Geographic: 像素/度
            // MIN: 10 (极小缩放) MAX: 100000000 (超高精度，支持毫米级)
            const MIN=10, MAX=100000000; 
            return Math.min(MAX, Math.max(MIN, this.scale)); 
        } 
    }

    // 瓦片工具方法已迁移至 BasemapManager

    applyWorldTransform(ctx){
        const cx=this.canvas.width/2, cy=this.canvas.height/2; const rad=this.rotation*Math.PI/180;
        ctx.translate(cx, cy);
        ctx.rotate(rad);
        ctx.scale(this.scale, -this.scale);
        if (this.coordSystem.coordType==='webmercator'){
            const [cmx,cmy] = this.coordSystem.geographicToMercator(this.centerX, this.centerY);
            ctx.translate(-cmx, -cmy);
        } else {
            ctx.translate(-this.centerX, -this.centerY);
        }
    }

    // 底图绘制已迁移至 BasemapManager

    // 卫星底图绘制已迁移至 BasemapManager

    drawGrid(){ if(!this.gridSettings.showGrid) return; const W=this.canvas.width, H=this.canvas.height; const [ox,oy]=this.worldToCanvas(this.gridSettings.originX,this.gridSettings.originY); const mpd=this.metersPerDegreeLat*Math.cos(this.centerY*Math.PI/180); const ppm=this.scale/mpd; let gs=this.gridSettings.gridSizeMeters*ppm; if (gs<10){ const mul=Math.max(1, Math.floor(20/gs)); gs*=mul; } else if (gs>300){ const div=Math.max(1, Math.floor(gs/100)); gs/=div; }
        this.ctx.strokeStyle=this.gridSettings.gridColor; this.ctx.lineWidth=1; let x=ox%gs, c=0; while(x<W && c<200){ this.ctx.beginPath(); this.ctx.moveTo(x,0); this.ctx.lineTo(x,H); this.ctx.stroke(); x+=gs; c++; } x=ox%gs - gs; c=0; while(x>=0 && c<200){ this.ctx.beginPath(); this.ctx.moveTo(x,0); this.ctx.lineTo(x,H); this.ctx.stroke(); x-=gs; c++; }
        let y=oy%gs; c=0; while(y<H && c<200){ this.ctx.beginPath(); this.ctx.moveTo(0,y); this.ctx.lineTo(W,y); this.ctx.stroke(); y+=gs; c++; } y=oy%gs - gs; c=0; while(y>=0 && c<200){ this.ctx.beginPath(); this.ctx.moveTo(0,y); this.ctx.lineTo(W,y); this.ctx.stroke(); y-=gs; c++; }
        this.ctx.strokeStyle=this.gridSettings.axisColor; this.ctx.lineWidth=2; if (0<=ox && ox<=W){ this.ctx.beginPath(); this.ctx.moveTo(ox,0); this.ctx.lineTo(ox,H); this.ctx.stroke(); } if (0<=oy && oy<=H){ this.ctx.beginPath(); this.ctx.moveTo(0,oy); this.ctx.lineTo(W,oy); this.ctx.stroke(); }
        if (0<=ox && ox<=W && 0<=oy && oy<=H){ this.ctx.fillStyle=this.gridSettings.axisColor; this.ctx.beginPath(); this.ctx.arc(ox,oy,5,0,2*Math.PI); this.ctx.fill(); if (this.gridSettings.showCoordinates){ let t; if (this.coordSystem.coordType==='geographic'){ t = `(${this.gridSettings.originX.toFixed(3)},${this.gridSettings.originY.toFixed(3)})`; } else { const [sx,sy]=this.coordSystem.geographicToScene(this.gridSettings.originX,this.gridSettings.originY); t = `(${sx.toFixed(1)}m,${sy.toFixed(1)}m)`; } this.ctx.fillStyle=this.gridSettings.axisColor; this.ctx.font='9px Arial'; this.ctx.fillText(t, ox+15, oy-15); } }
    }

    drawCompass(){ const chk=document.getElementById('compassCheck'); if (!chk || !chk.checked) return; const cx=this.canvas.width - this.compassSize - 20; const cy=20 + this.compassSize/2; const r=this.compassSize/2; this.ctx.strokeStyle='black'; this.ctx.lineWidth=2; this.ctx.fillStyle='white'; this.ctx.beginPath(); this.ctx.arc(cx,cy,r,0,2*Math.PI); this.ctx.fill(); this.ctx.stroke(); const dirs=[[0,'N'],[30,''],[60,''],[90,'E'],[120,''],[150,''],[180,'S'],[210,''],[240,''],[270,'W'],[300,''],[330,'']]; for (const [a,l] of dirs){ const ang=(a-90)*Math.PI/180; const x1=cx+(r-10)*Math.cos(ang), y1=cy+(r-10)*Math.sin(ang); const x2=cx+r*Math.cos(ang), y2=cy+r*Math.sin(ang); this.ctx.strokeStyle='black'; this.ctx.lineWidth=l?2:1; this.ctx.beginPath(); this.ctx.moveTo(x1,y1); this.ctx.lineTo(x2,y2); this.ctx.stroke(); if (l){ const tx=cx+(r+12)*Math.cos(ang), ty=cy+(r+12)*Math.sin(ang); this.ctx.fillStyle='black'; this.ctx.font='bold 10px Arial'; this.ctx.textAlign='center'; this.ctx.textBaseline='middle'; this.ctx.fillText(l,tx,ty); } } const na=(this.rotation-90)*Math.PI/180; const nx=cx+(r-5)*Math.cos(na), ny=cy+(r-5)*Math.sin(na); this.ctx.strokeStyle='red'; this.ctx.lineWidth=3; this.ctx.beginPath(); this.ctx.moveTo(cx,cy); this.ctx.lineTo(nx,ny); this.ctx.stroke(); const s=8, a1=na+Math.PI*5/6, a2=na+Math.PI*7/6; const ax1=nx+s*Math.cos(a1), ay1=ny+s*Math.sin(a1), ax2=nx+s*Math.cos(a2), ay2=ny+s*Math.sin(a2); this.ctx.fillStyle='red'; this.ctx.beginPath(); this.ctx.moveTo(nx,ny); this.ctx.lineTo(ax1,ay1); this.ctx.lineTo(ax2,ay2); this.ctx.closePath(); this.ctx.fill(); this.ctx.fillStyle='black'; this.ctx.beginPath(); this.ctx.arc(cx,cy,3,0,2*Math.PI); this.ctx.fill(); this.ctx.fillStyle='black'; this.ctx.font='9px Arial'; this.ctx.textAlign='center'; this.ctx.fillText(`旋转: ${Math.round(this.rotation)}°`, cx, cy + r + 20); this.ctx.fillStyle='red'; this.ctx.font='8px Arial'; this.ctx.fillText('红色箭头指向北', cx, cy + r + 35); }

    drawOSMData(){ const showGeom=this.renderMode==='geometry'||this.renderMode==='both'; const showRend=this.renderMode==='rendered'||this.renderMode==='both'; const show3D=this.renderMode==='3d';
        for (const [wayId, wayData] of this.ways){ const nodeIds=wayData.nodes; if (nodeIds.length<2) continue; const pts=[]; for (const nid of nodeIds){ const node=this.nodes.get(nid); if(!node) continue; const [x,y]=this.worldToCanvas(node.lon,node.lat); pts.push([x,y]); }
            if (pts.length>=2){ const tags=wayData.tags||{}; const isClosed = nodeIds.length>2 && nodeIds[0]===nodeIds[nodeIds.length-1]; const isSelected = wayId===this.selectedWay; const isMulti = this.selectedWays.has(wayId);
                if (show3D){ if (tags.building && isClosed) this.drawBuilding3D(pts,tags,wayId); else if (isClosed && (tags.landuse||tags.natural||tags.leisure)) this.drawLandscape3D(pts,tags,wayId); else this.drawWay3D(pts,tags,isClosed,isSelected,isMulti); }
                else { if (showRend && Object.keys(tags).length>0) this.drawRenderedWay(pts,tags,isClosed,isMulti); if (showGeom) this.drawGeometryWay(pts,isClosed,isSelected,isMulti); }
                if ((this.showLabels && !show3D) || (show3D && this.threeDSettings.show3DLabels)) { if (tags.name) this.drawWayLabel(pts,tags.name,wayId); }
            }
        }
        if (this.creatingWay.length>0){ const pts=[]; for (const nid of this.creatingWay){ const node=this.nodes.get(nid); if(!node) continue; const [x,y]=this.worldToCanvas(node.lon,node.lat); pts.push([x,y]); }
            if (pts.length>=2){ this.ctx.strokeStyle='orange'; this.ctx.lineWidth=3; this.ctx.setLineDash([5,5]); this.ctx.beginPath(); this.ctx.moveTo(pts[0][0],pts[0][1]); for (let i=1;i<pts.length;i++) this.ctx.lineTo(pts[i][0],pts[i][1]); this.ctx.stroke(); this.ctx.setLineDash([]); }
        }
        if (showGeom || !show3D){ for (const [nodeId, nodeData] of this.nodes){ const [x,y]=this.worldToCanvas(nodeData.lon,nodeData.lat); if (x<-10||x>this.canvas.width+10||y<-10||y>this.canvas.height+10) continue; const inCreate=this.creatingWay.includes(nodeId); const isSel=nodeId===this.selectedNode; const modified=nodeData.modified||false; let color,size; if (isSel){ color='red'; size=8; } else if (modified){ color='purple'; size=6; } else if (inCreate){ color='orange'; size=6; } else { color='blue'; size=4; } this.ctx.fillStyle=color; this.ctx.strokeStyle='white'; this.ctx.lineWidth=1; this.ctx.beginPath(); this.ctx.arc(x,y,size,0,2*Math.PI); this.ctx.fill(); this.ctx.stroke(); if (((this.showLabels && !show3D) || (show3D && this.threeDSettings.show3DLabels)) && nodeData.tags && nodeData.tags.name){ this.drawNodeLabel(x,y,nodeData.tags.name); } } }
    }

    drawRenderedWay(points, tags, isClosed, isMultiSelected){ if (isClosed){ const b=this.getBuildingStyle(tags); const l=this.getLandscapeStyle(tags); if (b){ this.ctx.fillStyle=isMultiSelected?'#FFFF00':b.fill; this.ctx.strokeStyle=b.outline; this.ctx.lineWidth=b.width; this.ctx.beginPath(); this.ctx.moveTo(points[0][0],points[0][1]); for (let i=1;i<points.length;i++) this.ctx.lineTo(points[i][0],points[i][1]); this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke(); } else if (l){ this.ctx.fillStyle=isMultiSelected?'#FFFF00':l.fill; this.ctx.strokeStyle=l.outline; this.ctx.lineWidth=l.width; this.ctx.beginPath(); this.ctx.moveTo(points[0][0],points[0][1]); for (let i=1;i<points.length;i++) this.ctx.lineTo(points[i][0],points[i][1]); this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke(); } else { const s=this.getWayStyle(tags); this.ctx.strokeStyle=isMultiSelected?'yellow':s.fill; this.ctx.lineWidth=s.width; this.ctx.fillStyle='transparent'; this.ctx.beginPath(); this.ctx.moveTo(points[0][0],points[0][1]); for (let i=1;i<points.length;i++) this.ctx.lineTo(points[i][0],points[i][1]); this.ctx.closePath(); this.ctx.stroke(); } } else { const s=this.getWayStyle(tags); this.ctx.strokeStyle=isMultiSelected?'yellow':s.fill; this.ctx.lineWidth=s.width; this.ctx.beginPath(); this.ctx.moveTo(points[0][0],points[0][1]); for (let i=1;i<points.length;i++) this.ctx.lineTo(points[i][0],points[i][1]); this.ctx.stroke(); } }

    drawGeometryWay(points, isClosed, isSelected, isMultiSelected){ const color=isSelected?'red':(isMultiSelected?'yellow':'black'); const w=(isSelected||isMultiSelected)?3:1; this.ctx.strokeStyle=color; this.ctx.lineWidth=w; this.ctx.fillStyle='transparent'; if (isClosed && points.length>=3){ this.ctx.beginPath(); this.ctx.moveTo(points[0][0],points[0][1]); for (let i=1;i<points.length;i++) this.ctx.lineTo(points[i][0],points[i][1]); this.ctx.closePath(); this.ctx.stroke(); } else { this.ctx.beginPath(); this.ctx.moveTo(points[0][0],points[0][1]); for (let i=1;i<points.length;i++) this.ctx.lineTo(points[i][0],points[i][1]); this.ctx.stroke(); } }

    drawWayLabel(points, name){ const lbl=this.getNameLabel(name); if (!lbl) return; let cx=0, cy=0; for (const [x,y] of points){ cx+=x; cy+=y; } cx/=points.length; cy/=points.length; this.ctx.fillStyle='darkblue'; this.ctx.font='bold 10px Arial'; this.ctx.textAlign='center'; this.ctx.textBaseline='middle'; this.ctx.fillText(lbl, cx, cy); }

    drawNodeLabel(x,y,name){ const lbl=this.getNameLabel(name); if (!lbl) return; this.ctx.fillStyle='darkgreen'; this.ctx.font='bold 9px Arial'; this.ctx.textAlign='left'; this.ctx.textBaseline='middle'; this.ctx.fillText(lbl, x+15, y-10); }

    getNameLabel(name){ if (!name) return null; let zh=''; for (const ch of name){ if (ch>='\u4e00' && ch<='\u9fff') zh+=ch; } return zh || name; }

    getBuildingStyle(tags){ if (!tags.building) return null; const c=this.getBuildingColor(tags); return { fill:c, outline:'#000000', width:2 }; }
    getLandscapeStyle(tags){ const u=tags.landuse, n=tags.natural, l=tags.leisure; if (u==='grass'||l==='park'||l==='garden') return { fill:'#90EE90', outline:'#228B22', width:1 }; else if (n==='forest'||n==='wood'||u==='forest') return { fill:'#228B22', outline:'#006400', width:1 }; else if (u==='farmland'||u==='meadow') return { fill:'#ADFF2F', outline:'#32CD32', width:1 }; else if (n==='water'||u==='reservoir') return { fill:'#4169E1', outline:'#000080', width:1 }; else if (u==='residential') return { fill:'#FFE4B5', outline:'#8B4513', width:1 }; else if (u==='commercial') return { fill:'#DDA0DD', outline:'#800080', width:1 }; else if (u==='industrial') return { fill:'#D3D3D3', outline:'#696969', width:1 }; return null; }
    getWayStyle(tags){ if (tags.highway){ const s={ motorway:{fill:'#FF6B6B',width:6}, trunk:{fill:'#FF6B6B',width:6}, primary:{fill:'#4ECDC4',width:4}, secondary:{fill:'#4ECDC4',width:4}, residential:{fill:'#45B7D1',width:2}, tertiary:{fill:'#45B7D1',width:2}, footway:{fill:'#96CEB4',width:1} }; return s[tags.highway] || { fill:'#333333', width:2 }; } else if (tags.waterway) return { fill:'#74C0FC', width:3 }; else if (tags.railway) return { fill:'#000000', width:2 }; return { fill:'#666666', width:1 }; }

    drawBoxSelect(){ if (this.boxSelecting && this.boxStart && this.boxCurrent){ this.ctx.strokeStyle='blue'; this.ctx.lineWidth=2; this.ctx.setLineDash([5,5]); this.ctx.beginPath(); this.ctx.rect(this.boxStart[0],this.boxStart[1], this.boxCurrent[0]-this.boxStart[0], this.boxCurrent[1]-this.boxStart[1]); this.ctx.stroke(); this.ctx.setLineDash([]); } }

    drawMeasurement(){ if (this.measurePoints.length<2) return; for (let i=0;i<this.measurePoints.length-1;i++){ const [x1,y1]=this.worldToCanvas(this.measurePoints[i][0],this.measurePoints[i][1]); const [x2,y2]=this.worldToCanvas(this.measurePoints[i+1][0],this.measurePoints[i+1][1]); this.ctx.strokeStyle='red'; this.ctx.lineWidth=3; this.ctx.beginPath(); this.ctx.moveTo(x1,y1); this.ctx.lineTo(x2,y2); this.ctx.stroke(); const mx=(x1+x2)/2, my=(y1+y2)/2; const d=this.measureDistances[i]; const t=d<1000?`${d.toFixed(1)}m`:`${(d/1000).toFixed(2)}km`; this.ctx.fillStyle='white'; this.ctx.strokeStyle='red'; this.ctx.lineWidth=1; this.ctx.beginPath(); this.ctx.rect(mx-25,my-8,50,16); this.ctx.fill(); this.ctx.stroke(); this.ctx.fillStyle='red'; this.ctx.font='bold 9px Arial'; this.ctx.textAlign='center'; this.ctx.textBaseline='middle'; this.ctx.fillText(t, mx, my); } for (let i=0;i<this.measurePoints.length;i++){ const [x,y]=this.worldToCanvas(this.measurePoints[i][0],this.measurePoints[i][1]); this.ctx.fillStyle='red'; this.ctx.strokeStyle='white'; this.ctx.lineWidth=2; this.ctx.beginPath(); this.ctx.arc(x,y,5,0,2*Math.PI); this.ctx.fill(); this.ctx.stroke(); this.ctx.fillStyle='red'; this.ctx.font='bold 10px Arial'; this.ctx.textAlign='center'; this.ctx.textBaseline='middle'; this.ctx.fillText((i+1).toString(), x, y-15); } }

    // 事件处理
    handleSelect(canvasX, canvasY, shift=false, ctrl=false){ let min=Infinity, cnode=null; for (const [id,nd] of this.nodes){ const [nx,ny]=this.worldToCanvas(nd.lon,nd.lat); const d=Math.hypot(canvasX-nx, canvasY-ny); if (d<15 && d<min){ min=d; cnode=id; } } let cway=null, mind=Infinity; for (const [wid,wd] of this.ways){ const ids=wd.nodes; if (ids.length>=2){ for (let i=0;i<ids.length-1;i++){ const n1=ids[i], n2=ids[i+1]; const a=this.nodes.get(n1), b=this.nodes.get(n2); if(!a||!b) continue; const [x1,y1]=this.worldToCanvas(a.lon,a.lat); const [x2,y2]=this.worldToCanvas(b.lon,b.lat); const d=this.pointToLineDistance(canvasX,canvasY,x1,y1,x2,y2); if (d<10 && d<mind){ mind=d; cway=wid; } } } }
        if (cnode && (!cway || min<mind)){ this.selectedNode=cnode; this.selectedWay=null; }
        else if (cway){ const wd=this.ways.get(cway); const ids=wd.nodes; const isPoly = ids.length>=4 && ids[0]===ids[ids.length-1]; if (isPoly){ if (shift) this.selectedWays.delete(cway); else if (ctrl) this.selectedWays.add(cway); else { this.selectedWay=cway; this.selectedWays.clear(); this.selectedWays.add(cway); } } else { this.selectedWay=cway; this.selectedWays.clear(); } this.selectedNode=null; }
        else { if (!shift && !ctrl){ this.selectedNode=null; this.selectedWay=null; this.selectedWays.clear(); } }
        this.updateSelectionInfo(); this.updateMultiselectInfo(); this.redraw(); }

    pointToLineDistance(px,py,x1,y1,x2,y2){ const A=px-x1, B=py-y1, C=x2-x1, D=y2-y1; const dot=A*C+B*D, len=C*C+D*D; if (len===0) return Math.hypot(A,B); const t=dot/len; let xx,yy; if (t<0){ xx=x1; yy=y1; } else if (t>1){ xx=x2; yy=y2; } else { xx=x1+t*C; yy=y1+t*D; } return Math.hypot(px-xx, py-yy); }

    startBoxSelect(x,y){ this.boxSelecting=true; this.boxStart=[x,y]; this.boxCurrent=[x,y]; }
    updateBoxSelect(x,y){ if (this.boxSelecting){ this.boxCurrent=[x,y]; this.redraw(); } }

    finishBoxSelect(x,y, shift=false, ctrl=false){ if (!this.boxSelecting) return; this.boxSelecting=false; const x1=this.boxStart[0], y1=this.boxStart[1], x2=x, y2=y; const minX=Math.min(x1,x2), maxX=Math.max(x1,x2), minY=Math.min(y1,y2), maxY=Math.max(y1,y2); const picked=new Set(); for (const [wid,wd] of this.ways){ const ids=wd.nodes; if (ids.length>=4 && ids[0]===ids[ids.length-1]){ let all=true; for (const nid of ids){ const nd=this.nodes.get(nid); if (!nd) continue; const [cx,cy]=this.worldToCanvas(nd.lon,nd.lat); if (!(minX<=cx && cx<=maxX && minY<=cy && cy<=maxY)) { all=false; break; } } if (all) picked.add(wid); } }
        if (shift) for (const id of picked) this.selectedWays.delete(id); else if (ctrl) for (const id of picked) this.selectedWays.add(id); else this.selectedWays=picked; this.updateMultiselectInfo(); this.redraw(); }

    addNode(worldX, worldY){ const id = this.nodes.size>0 ? Math.max(...this.nodes.keys())+1 : 1; const data={ lat:worldY, lon:worldX, tags:{} }; const cmd = new AddObjectCommand(this, 'node', id, data); this.executeCommand(cmd); this.redraw(); }

    handleWayCreation(canvasX, canvasY){ const cn=this.findClosestNode(canvasX,canvasY); if (cn){ if (!this.creatingWay.includes(cn)) this.creatingWay.push(cn); } else { let [wx,wy]=this.canvasToWorld(canvasX,canvasY); if (this.gridSettings.snapToGrid){ const [sx,sy]=this.snapToGrid(wx,wy); wx=sx; wy=sy; } const id=this.nodes.size>0?Math.max(...this.nodes.keys())+1:1; const data={ lat:wy, lon:wx, tags:{} }; const cmd=new AddObjectCommand(this,'node',id,data); this.executeCommand(cmd); this.creatingWay.push(id); } this.updateCreateStatus(); this.redraw(); }

    handlePolygonCreation(canvasX, canvasY){ this.handleWayCreation(canvasX,canvasY); }

    findClosestNode(canvasX, canvasY, maxDistance=15){ let min=Infinity, cn=null; for (const [id,nd] of this.nodes){ const [nx,ny]=this.worldToCanvas(nd.lon,nd.lat); const d=Math.hypot(canvasX-nx, canvasY-ny); if (d<maxDistance && d<min){ min=d; cn=id; } } return cn; }

    finishCreation(){ if (this.creatingWay.length<2) return; const id=this.ways.size>0?Math.max(...this.ways.keys())+1:1; let data; if (this.mode==='add_polygon' && this.creatingWay.length>=3){ if (this.creatingWay[0] !== this.creatingWay[this.creatingWay.length-1]) this.creatingWay.push(this.creatingWay[0]); data={ nodes:[...this.creatingWay], tags:{ area:'yes' } }; } else { data={ nodes:[...this.creatingWay], tags:{} }; } const cmd=new AddObjectCommand(this,'way',id,data); this.executeCommand(cmd); this.creatingWay=[]; this.updateCreateStatus(); this.redraw(); }

    cancelCreation(){ this.creatingWay=[]; this.updateCreateStatus(); this.redraw(); }

    moveSelectedNode(dx, dy){ if (!this.selectedNode) return; const nd=this.nodes.get(this.selectedNode); if (!nd) return; const old=[nd.lon, nd.lat]; nd.lon += dx; nd.lat += dy; const cmd=new MoveNodeCommand(this, this.selectedNode, old, [nd.lon, nd.lat]); // 立即执行已做,此处只压栈以便撤销
        this.undoStack.push(cmd); this.redoStack=[]; this.updateUndoRedoButtons(); this.redraw(); }

    calculateDistance(p1, p2){ const mpd=this.metersPerDegreeLat*Math.cos(((p1[1]+p2[1])/2)*Math.PI/180); const dx=(p2[0]-p1[0])*mpd; const dy=(p2[1]-p1[1])*this.metersPerDegreeLat; return Math.hypot(dx,dy); }

    addMeasurePoint(x,y){ this.measurePoints.push([x,y]); if (this.measurePoints.length>=2){ const n=this.measurePoints.length; const d=this.calculateDistance(this.measurePoints[n-2], this.measurePoints[n-1]); this.measureDistances.push(d); const total=this.measureDistances.reduce((s,v)=>s+v,0); const ml=document.getElementById('measureLabel'); if (ml) ml.textContent = `距离: ${total<1000?total.toFixed(1)+'m':(total/1000).toFixed(2)+'km'}`; } this.updateCreateStatus(); this.redraw(); }

    clearMeasurement(){ this.measurePoints=[]; this.measureDistances=[]; const ml=document.getElementById('measureLabel'); if (ml) ml.textContent = '距离: 0m'; this.redraw(); }

    // 选择 & 删除
    selectAllPolygons(){ this.selectedWays.clear(); for (const [id,wd] of this.ways){ const ids=wd.nodes; if (ids.length>=4 && ids[0]===ids[ids.length-1]) this.selectedWays.add(id); } this.updateMultiselectInfo(); this.redraw(); }

    clearSelection(){ this.selectedNode=null; this.selectedWay=null; this.selectedWays.clear(); this.updateSelectionInfo(); this.updateMultiselectInfo(); this.redraw(); }

    deleteSelected(){ if (this.selectedNode){ const nd=this.nodes.get(this.selectedNode); if (!nd) return; const affected={}; for (const [wid,wd] of this.ways){ if (wd.nodes.includes(this.selectedNode)) affected[wid]=structuredClone(wd); } const cmd=new DeleteObjectCommand(this,'node',this.selectedNode,nd,affected); this.executeCommand(cmd); this.selectedNode=null; }
        if (this.selectedWay){ const wd=this.ways.get(this.selectedWay); if (!wd) return; const cmd=new DeleteObjectCommand(this,'way',this.selectedWay,wd); this.executeCommand(cmd); this.selectedWay=null; }
        if (this.selectedWays.size>0){ for (const id of Array.from(this.selectedWays)){ const wd=this.ways.get(id); if (!wd) continue; const cmd=new DeleteObjectCommand(this,'way',id,wd); this.executeCommand(cmd); } this.selectedWays.clear(); }
        this.updateSelectionInfo(); this.updateMultiselectInfo(); this.redraw(); }

    updateSelectionInfo(){ const el=document.getElementById('selectionInfo'); if (!el) return; if (this.selectedNode){ const nd=this.nodes.get(this.selectedNode); el.value = `节点 #${this.selectedNode}\n经度: ${nd.lon.toFixed(6)}\n纬度: ${nd.lat.toFixed(6)}\n标签: ${JSON.stringify(nd.tags||{}, null, 2)}`; }
        else if (this.selectedWay){ const wd=this.ways.get(this.selectedWay); const isPoly=wd.nodes.length>=4 && wd.nodes[0]===wd.nodes[wd.nodes.length-1]; el.value = `路径 #${this.selectedWay} ${isPoly?'(多边形)':''}\n节点数: ${wd.nodes.length}\n标签: ${JSON.stringify(wd.tags||{}, null, 2)}`; }
        else if (this.selectedWays.size>0){ el.value = `多选 ${this.selectedWays.size} 个多边形`; }
        else el.value='未选择任何对象'; }

    // 视图
    resetView(){ this.scale=100000; this.centerX=0; this.centerY=0; this.rotation=0; this.redraw(); this.updateViewInfo(); }

    fitToWindow(){ 
        if (this.nodes.size===0) return; 
        const lons=Array.from(this.nodes.values()).map(n=>n.lon); 
        const lats=Array.from(this.nodes.values()).map(n=>n.lat); 
        const minLon=Math.min(...lons), maxLon=Math.max(...lons), minLat=Math.min(...lats), maxLat=Math.max(...lats); 
        this.centerX=(minLon+maxLon)/2; 
        this.centerY=(minLat+maxLat)/2; 
        const [x1,y1]=this.worldToCanvas(minLon,minLat); 
        const [x2,y2]=this.worldToCanvas(maxLon,maxLat); 
        const w=Math.abs(x2-x1), h=Math.abs(y2-y1); 
        const margin=40; 
        const sx=(this.canvas.width-margin)/Math.max(w,1); 
        const sy=(this.canvas.height-margin)/Math.max(h,1); 
        this.scale*=Math.min(sx,sy); 
        this.scale=this.clampScale(); // 应用缩放限制
        this.redraw(); 
    }

    rotateView(angle){ this.rotation=(this.rotation+angle+360)%360; this.redraw(); }

    // 坐标系统设置
    setSceneOrigin(){ const lon=prompt('输入原点经度(lon):', this.coordSystem.sceneOriginLon); const lat=prompt('输入原点纬度(lat):', this.coordSystem.sceneOriginLat); const L=parseFloat(lon), A=parseFloat(lat); if (!isNaN(L) && !isNaN(A)){ this.coordSystem.setSceneOrigin(L,A); this.redraw(); } }
    applySceneOrigin(){ /* 兼容旧接口保留 */ this.redraw(); }
    useCurrentCenterAsOrigin(){ this.coordSystem.setSceneOrigin(this.centerX, this.centerY); this.redraw(); }

    // 标签编辑(使用模块化对话框)
    editTags(){
        let type=null, id=null;
        if (this.selectedNode){ type='node'; id=this.selectedNode; }
        else if (this.selectedWay){ type='way'; id=this.selectedWay; }
        else { alert('请先选择节点或路径'); return; }
        new TagEditorDialog(this, type, id);
    }

    // 网格控制面板
    showGridControlPanel(){
        new GridControlPanelDialog(this);
    }
    updateGridSettings(){ /* 由高级面板设置时调用; 此处留空以兼容 */ this.updateGridStatus(); this.redraw(); }
    resetGridToOrigin(){ this.gridSettings.resetToOrigin(); this.updateGridStatus(); this.redraw(); }
    resetGridToDataCenter(){ if (this.nodes.size>0){ const lons=Array.from(this.nodes.values()).map(n=>n.lon); const lats=Array.from(this.nodes.values()).map(n=>n.lat); const cx=lons.reduce((s,v)=>s+v,0)/lons.length; const cy=lats.reduce((s,v)=>s+v,0)/lats.length; this.gridSettings.setOrigin(cx,cy); this.updateGridStatus(); this.redraw(); } }
    applyGridSettings(){ this.updateGridSettings(); alert('网格设置已应用！'); }

    // 3D 设置对话框
    show3DSettings(){
        new ThreedSettingsDialog(this);
    }

    // 建筑属性编辑
    editBuildingHeight(){ openHeightEditor(this); }
    editBuildingColor(){ openColorEditor(this); }

    // 地图校正（设置场景原点）
    showMapCalibration(){
        new MapCalibrationDialog(this);
    }

    // 坐标导入对话框
    showCoordinateImport(){
        new CoordinateImportDialog(this);
    }

    // 手动输入坐标对话框
    showManualCoordinate(){
        new ManualCoordinateDialog(this);
    }

    // 平移坐标对话框
    showTranslateCoordinates(){
        new TranslateCoordinatesDialog(this);
    }

    // 文件操作
    importOSM(){ const input=document.createElement('input'); input.type='file'; input.accept='.osm,.xml'; input.onchange=(e)=>{ const file=e.target.files[0]; if (!file) return; const reader=new FileReader(); reader.onload=(ev)=>{ try { this.loadOSMData(ev.target.result); this.fitToWindow(); this.undoStack=[]; this.redoStack=[]; this.updateUndoRedoButtons(); alert('OSM文件导入成功！'); } catch(err){ alert(`导入失败: ${err.message}`); } }; reader.readAsText(file); }; input.click(); }

    loadOSMData(xmlText){ const parser=new DOMParser(); const xml=parser.parseFromString(xmlText,'text/xml'); this.nodes.clear(); this.ways.clear(); this.relations.clear(); const ns=xml.querySelectorAll('node'); ns.forEach(n=>{ const id=parseInt(n.getAttribute('id')); const lat=parseFloat(n.getAttribute('lat')); const lon=parseFloat(n.getAttribute('lon')); const tags={}; n.querySelectorAll('tag').forEach(t=>{ tags[t.getAttribute('k')]=t.getAttribute('v'); }); this.nodes.set(id,{lat,lon,tags}); }); const ws=xml.querySelectorAll('way'); ws.forEach(w=>{ const id=parseInt(w.getAttribute('id')); const nodes=[]; const tags={}; w.querySelectorAll('nd').forEach(nd=>{ const ref=parseInt(nd.getAttribute('ref')); if (this.nodes.has(ref)) nodes.push(ref); }); w.querySelectorAll('tag').forEach(t=>{ tags[t.getAttribute('k')]=t.getAttribute('v'); }); if (nodes.length>0) this.ways.set(id,{nodes,tags}); }); this.redraw(); }

    exportOSM(){ if (this.nodes.size===0){ alert('没有数据可导出！'); return; } const xml=this.generateOSMXML(); const blob=new Blob([xml],{type:'text/xml'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='export.osm'; a.click(); URL.revokeObjectURL(url); alert('OSM文件导出成功！'); }

    generateOSMXML(){ let xml='<?xml version="1.0" encoding="UTF-8"?>\n'; xml+='<osm version="0.6" generator="OSM Editor Refactored">\n'; for (const [id,nd] of this.nodes){ xml += `  <node id="${id}" lat="${nd.lat.toFixed(7)}" lon="${nd.lon.toFixed(7)}">\n`; const tags=nd.tags||{}; for (const [k,v] of Object.entries(tags)){ if (k!=='modified') xml+=`    <tag k="${k}" v="${v}"/>\n`; } xml+='  </node>\n'; } for (const [id,wd] of this.ways){ xml+=`  <way id="${id}">\n`; for (const nid of wd.nodes) xml+=`    <nd ref="${nid}"/>\n`; const tags=wd.tags||{}; for (const [k,v] of Object.entries(tags)) xml+=`    <tag k="${k}" v="${v}"/>\n`; xml+='  </way>\n'; } xml+='</osm>'; return xml; }

    clearData(){ if (!confirm('确定要清除所有数据吗？')) return; this.nodes.clear(); this.ways.clear(); this.relations.clear(); this.selectedNode=null; this.selectedWay=null; this.selectedWays.clear(); this.creatingWay=[]; this.measurePoints=[]; this.measureDistances=[]; this.undoStack=[]; this.redoStack=[]; this.updateUndoRedoButtons(); this.updateCreateStatus(); this.clearMeasurement(); this.redraw(); this.updateSelectionInfo(); }

    // 对话框工具(保留占位)
    createDialog(){ /* 可在需要时实现复杂对话框 */ }
    closeDialog(){ /* 可在需要时实现复杂对话框 */ }

    // 低层事件
    onClick(e){ const rect=this.canvas.getBoundingClientRect(); const cx=e.clientX-rect.left, cy=e.clientY-rect.top; const [wx,wy]=this.canvasToWorld(cx,cy); const shift=e.shiftKey, ctrl=e.ctrlKey; let ax=wx, ay=wy; if (this.gridSettings.snapToGrid){ [ax,ay]=this.snapToGrid(wx,wy); }
        if (this.mode==='select'){ this.handleSelect(cx,cy,shift,ctrl); }
        else if (this.mode==='box_select'){ this.startBoxSelect(cx,cy); }
        else if (this.mode==='add_node'){ this.addNode(ax,ay); }
        else if (this.mode==='add_way'){ this.handleWayCreation(cx,cy); }
        else if (this.mode==='add_polygon'){ this.handlePolygonCreation(cx,cy); }
        else if (this.mode==='measure'){ this.addMeasurePoint(ax,ay); }
        this.dragStart=[cx,cy]; if (this.selectedNode && this.nodes.has(this.selectedNode)){ const nd=this.nodes.get(this.selectedNode); const [nx,ny]=this.worldToCanvas(nd.lon,nd.lat); if (Math.hypot(cx-nx, cy-ny) < 12){ this.draggingNode=true; this.nodeStartPos=[nd.lon, nd.lat]; } }
        // 若未拖拽节点，且处于选择模式，则进入平移状态
        if (!this.draggingNode && this.mode==='select' && !this.boxSelecting){ this.panning=true; this.canvas.style.cursor='grabbing'; }
    }

    onRightClick(e){ if (this.mode==='add_way' || this.mode==='add_polygon'){ this.finishCreation(); }
        else if (this.boxSelecting){ this.boxSelecting=false; this.redraw(); }
    }

    onMouseMove(e){ const rect=this.canvas.getBoundingClientRect(); const cx=e.clientX-rect.left, cy=e.clientY-rect.top; const [wx,wy]=this.canvasToWorld(cx,cy); this.updateCoordinateDisplay(wx,wy); if (!this.dragStart) return; if (this.mode==='box_select' && this.boxSelecting){ this.updateBoxSelect(cx,cy); return; }
        // 平移视图
        if (this.panning && !this.draggingNode){
            const dxp = cx - this.dragStart[0];
            const dyp = cy - this.dragStart[1];
            const rad = this.rotation * Math.PI/180; const cR = Math.cos(rad); const sR = Math.sin(rad);
            const ux = (dxp * cR + dyp * sR) / this.scale; // 世界单位的dx
            const uy = (-dxp * sR + dyp * cR) / this.scale; // 世界单位的dy
            if (this.coordSystem.coordType==='webmercator'){
                const [cmx,cmy] = this.coordSystem.geographicToMercator(this.centerX, this.centerY);
                const [lon,lat] = this.coordSystem.mercatorToGeographic(cmx - ux, cmy + uy);
                this.centerX = lon; this.centerY = lat;
            } else {
                this.centerX -= ux; this.centerY += uy;
            }
            this.dragStart = [cx, cy];
            this.redraw();
            return;
        }
        if (this.draggingNode && this.selectedNode && this.nodeStartPos){ const nd=this.nodes.get(this.selectedNode); if (!nd) return; const [sx,sy]=this.worldToCanvas(this.nodeStartPos[0], this.nodeStartPos[1]); const [ex,ey]=[cx,cy]; const dx=(ex-sx)/this.scale, dy=-(ey-sy)/this.scale; nd.lon = this.nodeStartPos[0] + dx; nd.lat = this.nodeStartPos[1] + dy; this.redraw(); }
    }

    onRelease(e){ const rect=this.canvas.getBoundingClientRect(); const cx=e.clientX-rect.left, cy=e.clientY-rect.top; const shift=e.shiftKey, ctrl=e.ctrlKey; if (this.mode==='box_select' && this.boxSelecting){ this.finishBoxSelect(cx,cy,shift,ctrl); }
        if (this.draggingNode && this.selectedNode && this.nodeStartPos){ const nd=this.nodes.get(this.selectedNode); const old=[...this.nodeStartPos]; const now=[nd.lon, nd.lat]; const cmd=new MoveNodeCommand(this, this.selectedNode, old, now); this.executeCommand(cmd); }
        this.dragStart=null; this.draggingNode=false; this.nodeStartPos=null; if (this.panning){ this.panning=false; this.onModeChange(); }
    }

    onScroll(e){ e.preventDefault(); const factor=e.deltaY>0?0.9:1.1; this.scale*=factor; this.scale=this.clampScale(); this.redraw(); this.updateViewInfo(); }
    onDoubleClick(e){ /* 保留 */ }

    onKey(e){ 
        if (e.key==='Delete'){ this.deleteSelected(); return; } 
        if (e.ctrlKey && e.key==='z'){ this.undo(); return; } 
        if (e.ctrlKey && e.key==='y'){ this.redo(); return; } 
        if (e.ctrlKey && e.key==='a'){ e.preventDefault(); this.selectAllPolygons(); return; } 
        if (e.key==='Escape'){ this.cancelCreation(); this.clearSelection(); return; } 
        
        // 缩放快捷键
        if (e.key==='+' || e.key==='='){ 
            e.preventDefault(); 
            this.scale *= 1.5; 
            this.scale = this.clampScale(); 
            this.redraw(); 
            this.updateViewInfo(); 
            return; 
        }
        if (e.key==='-' || e.key==='_'){ 
            e.preventDefault(); 
            this.scale *= 0.667; 
            this.scale = this.clampScale(); 
            this.redraw(); 
            this.updateViewInfo(); 
            return; 
        }
        if (e.key==='0' && (e.ctrlKey || e.metaKey)){ 
            e.preventDefault(); 
            this.fitToWindow(); 
            return; 
        }
        
        if (this.renderMode==='3d' && (e.key==='h' || e.key==='H')){ 
            this.editBuildingHeight && this.editBuildingHeight(); 
            return; 
        } 
    }
}

export default OSMEditor;

    // 绘图
