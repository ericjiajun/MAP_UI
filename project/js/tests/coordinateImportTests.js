/**
 * 坐标导入功能测试用例
 * 在浏览器控制台运行这些测试
 */

// 测试1: 简单矩形房间（米制坐标）
function test1_SimpleRoom() {
    console.log('测试1: 导入10m×8m矩形房间');
    const coords = [
        [0, 0],
        [10, 0],
        [10, 8],
        [0, 8]
    ];
    
    // 模拟CSV输入
    const csvText = coords.map(c => c.join(', ')).join('\n');
    console.log('CSV格式:', csvText);
    
    // 预期结果：4个节点，1个闭合多边形（5个节点引用）
}

// 测试2: L型房间
function test2_LShapedRoom() {
    console.log('测试2: 导入L型房间');
    const coords = [
        [0, 0],
        [12, 0],
        [12, 6],
        [8, 6],
        [8, 10],
        [0, 10]
    ];
    
    const jsonText = JSON.stringify(coords);
    console.log('JSON格式:', jsonText);
}

// 测试3: 真实建筑坐标（经纬度）
function test3_RealBuilding() {
    console.log('测试3: 真实建筑坐标');
    // 北京某建筑物角点坐标
    const coords = [
        [116.404000, 39.915000],
        [116.404100, 39.915000],
        [116.404100, 39.915050],
        [116.404000, 39.915050]
    ];
    
    console.log('经纬度坐标:', coords);
    // 预期：约10m×5.5m的矩形
}

// 测试4: 坐标转换验证
function test4_CoordinateConversion() {
    console.log('测试4: 坐标转换验证');
    
    const refLon = 116.404;
    const refLat = 39.915;
    
    // 测试点：向东10米，向北10米
    const dx = 10;
    const dy = 10;
    
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLon = metersPerDegreeLat * Math.cos(refLat * Math.PI / 180);
    
    const lon = refLon + dx / metersPerDegreeLon;
    const lat = refLat + dy / metersPerDegreeLat;
    
    console.log(`参考点: (${refLon}, ${refLat})`);
    console.log(`偏移: 东${dx}米, 北${dy}米`);
    console.log(`结果: (${lon.toFixed(7)}, ${lat.toFixed(7)})`);
    console.log(`经度变化: ${((lon - refLon) * metersPerDegreeLon).toFixed(2)}米`);
    console.log(`纬度变化: ${((lat - refLat) * metersPerDegreeLat).toFixed(2)}米`);
}

// 测试5: 精度测试
function test5_PrecisionTest() {
    console.log('测试5: 精度测试');
    
    // 精确到1厘米的坐标
    const preciseCoords = [
        [0.00, 0.00],
        [10.56, 0.00],
        [10.56, 8.34],
        [0.00, 8.34]
    ];
    
    console.log('输入坐标（米）:', preciseCoords);
    
    // 转换后再转回来验证精度损失
    const refLon = 116.404;
    const refLat = 39.915;
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLon = metersPerDegreeLat * Math.cos(refLat * Math.PI / 180);
    
    const lonlatCoords = preciseCoords.map(([x, y]) => [
        refLon + x / metersPerDegreeLon,
        refLat + y / metersPerDegreeLat
    ]);
    
    console.log('转换为经纬度:', lonlatCoords.map(c => c.map(v => v.toFixed(7))));
    
    // 反向转换验证
    const backToMeters = lonlatCoords.map(([lon, lat]) => [
        (lon - refLon) * metersPerDegreeLon,
        (lat - refLat) * metersPerDegreeLat
    ]);
    
    console.log('反向转换回米:', backToMeters.map(c => c.map(v => v.toFixed(2))));
    
    // 计算误差
    const errors = preciseCoords.map((orig, i) => {
        const back = backToMeters[i];
        return [
            Math.abs(orig[0] - back[0]),
            Math.abs(orig[1] - back[1])
        ];
    });
    
    const maxError = Math.max(...errors.flat());
    console.log(`最大误差: ${(maxError * 1000).toFixed(6)}毫米`);
}

// 运行所有测试
function runAllTests() {
    console.log('=== 坐标导入功能测试套件 ===\n');
    test1_SimpleRoom();
    console.log('\n---\n');
    test2_LShapedRoom();
    console.log('\n---\n');
    test3_RealBuilding();
    console.log('\n---\n');
    test4_CoordinateConversion();
    console.log('\n---\n');
    test5_PrecisionTest();
    console.log('\n=== 测试完成 ===');
}

// 导出测试函数
if (typeof window !== 'undefined') {
    window.coordinateImportTests = {
        test1_SimpleRoom,
        test2_LShapedRoom,
        test3_RealBuilding,
        test4_CoordinateConversion,
        test5_PrecisionTest,
        runAllTests
    };
    console.log('坐标导入测试已加载。运行 coordinateImportTests.runAllTests() 执行所有测试。');
}
