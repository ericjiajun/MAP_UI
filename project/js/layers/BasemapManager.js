class BasemapManager {
    constructor(editor){
        this.editor = editor;
        this.zoom = 16; // 0-19
        // OSM 矢量瓦片
        this.osmEnabled = false;
        this.osm = {
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            cache: new Map(),
            attribution: '© OpenStreetMap contributors'
        };
        // 卫星底图（Esri World Imagery）
        this.satEnabled = false;
        this.sat = {
            urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            cache: new Map(),
            attribution: 'Esri, Maxar, Earthstar Geographics'
        };
    }

    setOSMEnabled(v){ this.osmEnabled = !!v; }
    setSatelliteEnabled(v){ this.satEnabled = !!v; }
    isAnyEnabled(){ return this.osmEnabled || this.satEnabled; }

    setZoom(z){ const zi = Math.max(0, Math.min(19, parseInt(z))); this.zoom = isNaN(zi)? this.zoom : zi; }
    getZoom(){ return this.zoom; }

    getAttribution(){
        const parts = [];
        if (this.osmEnabled) parts.push(this.osm.attribution);
        if (this.satEnabled) parts.push(this.sat.attribution);
        return parts.join(' | ');
    }

    // --- 瓦片工具 ---
    lon2tileX(lon, z){ return (lon + 180) / 360 * Math.pow(2, z); }
    lat2tileY(lat, z){ const rad = Math.max(Math.min(lat, 85.05112878), -85.05112878) * Math.PI / 180; return (1 - Math.log(Math.tan(rad) + 1/Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, z); }
    tileX2lon(x, z){ return x / Math.pow(2, z) * 360 - 180; }
    tileY2lat(y, z){ const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z); return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); }

    draw(ctx){
        if (!this.isAnyEnabled()) return;
        if (this.osmEnabled) this.drawSource(ctx, this.osm, 'osm');
        if (this.satEnabled) this.drawSource(ctx, this.sat, 'sat');
    }

    drawSource(ctx, source, keyPrefix){
        const z = this.zoom;
        // 计算当前视图四角经纬度
        const corners = [ [0,0], [this.editor.canvas.width,0], [this.editor.canvas.width,this.editor.canvas.height], [0,this.editor.canvas.height] ]
            .map(([x,y])=>this.editor.canvasToWorld(x,y));
        let minLon= Infinity, maxLon= -Infinity, minLat= Infinity, maxLat= -Infinity;
        for (const [lon,lat] of corners){ if (lon<minLon) minLon=lon; if (lon>maxLon) maxLon=lon; if (lat<minLat) minLat=lat; if (lat>maxLat) maxLat=lat; }
        // clamp 纬度
        minLat = Math.max(minLat, -85.05112878); maxLat = Math.min(maxLat, 85.05112878);
        // 可见瓦片索引范围
        let minX = Math.floor(this.lon2tileX(minLon, z));
        let maxX = Math.floor(this.lon2tileX(maxLon, z));
        let minY = Math.floor(this.lat2tileY(maxLat, z));
        let maxY = Math.floor(this.lat2tileY(minLat, z));
        const maxTiles = Math.pow(2,z);
        if (maxX - minX > maxTiles/2){ minX = 0; maxX = maxTiles - 1; }

        const MAX_DRAW = 512; let count = 0;
        ctx.save();
        this.editor.applyWorldTransform(ctx);
        // 局部翻转到 y 向下语义，使用正高度绘制，避免上下镜像
        ctx.scale(1, -1);

        for (let x=minX; x<=maxX; x++){
            for (let y=minY; y<=maxY; y++){
                if (count++ > MAX_DRAW) break;
                const xWrap = ((x % maxTiles) + maxTiles) % maxTiles; // 经度循环
                const key = `${keyPrefix}:${z}/${xWrap}/${y}`;
                const url = source.urlTemplate.replace('{z}', z).replace('{x}', xWrap).replace('{y}', y);
                let img = source.cache.get(key);
                if (!img){
                    img = new Image(); img.crossOrigin = 'anonymous'; img.src = url;
                    img.onload = () => { source.cache.set(key, img); this.editor.redraw(); };
                    img.onerror = () => { source.cache.set(key, null); };
                    source.cache.set(key, img);
                }
                if (img && img.complete && img.naturalWidth>0){
                    if (this.editor.coordSystem.coordType==='webmercator'){
                        const lonL = this.tileX2lon(x, z), lonR = this.tileX2lon(x+1, z);
                        const latT = this.tileY2lat(y, z), latB = this.tileY2lat(y+1, z);
                        const [mxL, myT] = this.editor.coordSystem.geographicToMercator(lonL, latT);
                        const [mxR, myB] = this.editor.coordSystem.geographicToMercator(lonR, latB);
                        const dx = mxR - mxL; const dy = myT - myB; // 正值
                        ctx.drawImage(img, mxL, -myT, dx, dy);
                    } else {
                        const lonL = this.tileX2lon(x, z), lonR = this.tileX2lon(x+1, z);
                        const latT = this.tileY2lat(y, z), latB = this.tileY2lat(y+1, z);
                        const dx = lonR - lonL; const dy = latT - latB; // 正值
                        ctx.drawImage(img, lonL, -latT, dx, dy);
                    }
                }
            }
        }
        ctx.restore();
    }
}

export default BasemapManager;
