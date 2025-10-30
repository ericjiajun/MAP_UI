# OSM地图编辑器 - 使用手册

## 项目简介

这是一个基于接口设计模式重构的OSM(OpenStreetMap)地图编辑器,支持2D/3D渲染、命令模式的撤销/重做系统、以及丰富的地图编辑功能。

## 架构设计

### 接口模式 (类似C++的虚基类)

项目采用命令模式(Command Pattern),所有可撤销的操作都实现了`ICommand`接口:

```javascript
class ICommand {
    execute()   // 执行命令 (类似C++ perform())
    undo()      // 撤销命令
    getName()   // 获取命令名称 (类似C++ get_name())
}
```

### 项目结构

```
project/
├── index.html              # 主HTML文件
├── styles.css              # 样式文件
├── js/
│   ├── interfaces/
│   │   └── ICommand.js     # 命令接口(基类)
│   ├── commands/
│   │   ├── MoveNodeCommand.js      # 移动节点命令
│   │   ├── DeleteObjectCommand.js  # 删除对象命令
│   │   ├── AddObjectCommand.js     # 添加对象命令
│   │   └── ModifyTagsCommand.js    # 修改标签命令
│   ├── models/
│   │   ├── GridSettings.js         # 网格设置模型
│   │   ├── CoordinateSystem.js     # 坐标系统模型
│   │   └── ThreeDSettings.js       # 3D设置模型
│   └── OSMEditor.js        # 主编辑器类
└── README.md               # 本文档
```

## 核心类说明

### 1. ICommand 接口

所有命令的基类,定义了命令的基本行为:

```javascript
class ICommand {
    execute()  // 必须实现: 执行命令
    undo()     // 必须实现: 撤销命令  
    getName()  // 返回命令名称,默认"(unnamed)"
}
```

### 2. 具体命令类

#### MoveNodeCommand - 移动节点命令
```javascript
const cmd = new MoveNodeCommand(editor, nodeId, oldPos, newPos);
cmd.execute();  // 移动节点到新位置
cmd.undo();     // 恢复到旧位置
```

#### AddObjectCommand - 添加对象命令
```javascript
const cmd = new AddObjectCommand(editor, 'node', nodeId, nodeData);
cmd.execute();  // 添加节点或路径
cmd.undo();     // 删除刚添加的对象
```

#### DeleteObjectCommand - 删除对象命令
```javascript
const cmd = new DeleteObjectCommand(editor, 'way', wayId, wayData);
cmd.execute();  // 删除对象
cmd.undo();     // 恢复被删除的对象
```

#### ModifyTagsCommand - 修改标签命令
```javascript
const cmd = new ModifyTagsCommand(editor, 'node', nodeId, oldTags, newTags);
cmd.execute();  // 应用新标签
cmd.undo();     // 恢复旧标签
```

### 3. 模型类

#### GridSettings - 网格设置
管理网格显示和对齐功能:
- `originX, originY`: 网格原点
- `gridSizeMeters`: 网格大小(米)
- `showGrid`: 是否显示网格
- `snapToGrid`: 是否吸附到网格

#### CoordinateSystem - 坐标系统
处理地理坐标和场景坐标转换:
- `geographicToScene(lon, lat)`: 经纬度转场景坐标
- `sceneToGeographic(x, y)`: 场景坐标转经纬度

#### ThreeDSettings - 3D设置
管理3D渲染参数:
- `viewAngle`: 俯视角度(0-90度)
- `rotationAngle`: 水平旋转角度(0-360度)
- `heightScale`: 高度缩放比例
- `defaultBuildingColor`: 默认建筑颜色

## 功能使用说明

### 1. 基本操作

#### 导入/导出文件
- **导入OSM文件**: 点击"文件 -> 导入",选择.osm或.xml文件
- **导出OSM文件**: 点击"文件 -> 导出",自动保存为export.osm
- **清除数据**: 点击"文件 -> 清除",清空所有数据

#### 撤销/重做
- **撤销**: 点击"撤销"按钮或按`Ctrl+Z`
- **重做**: 点击"重做"按钮或按`Ctrl+Y`
- 撤销栈最多保存50个操作

### 2. 编辑模式

切换编辑模式下拉菜单:

- **选择模式** (select): 选择和拖动节点/路径
  - 单击选择对象
  - 拖动移动节点
  - Shift+单击: 从多选中移除
  - Ctrl+单击: 添加到多选
  
- **添加节点** (add_node): 在地图上点击添加节点
  
- **添加路径** (add_way): 连续点击创建路径
  - 点击现有节点或新位置添加点
  - 右键或双击完成路径创建
  
- **添加多边形** (add_polygon): 创建封闭多边形
  - 与添加路径类似,自动闭合
  
- **框选模式** (box_select): 拖动矩形框选多个对象
  - 单独框选: 替换当前选择
  - Ctrl+框选: 添加到选择
  - Shift+框选: 从选择中移除
  
- **测量模式** (measure): 测量距离
  - 点击添加测量点
  - 显示每段距离和总距离

### 3. 视图控制

#### 缩放和平移
- **鼠标滚轮**: 缩放视图
- **拖动空白区域**: 平移视图
- **重置视图**: 恢复初始视角
- **适应窗口**: 自动缩放显示所有数据

#### 旋转
- **↺ / ↻ 按钮**: 每次旋转15度
- **指南针**: 显示当前旋转角度和北向

### 4. 坐标系统

#### 经纬度坐标
- 默认模式,使用WGS84坐标系
- 显示格式: `经度: xxx, 纬度: xxx`

#### 场景坐标
- 以米为单位的平面坐标系
- 设置原点: 点击"设原点"输入坐标
- 用中心: 将当前视图中心设为原点
- 显示格式: `X: xxx m, Y: xxx m`

### 5. 显示模式

#### 2D渲染模式
- **几何模式**: 显示节点和路径的几何结构
- **渲染模式**: 根据OSM标签渲染(道路、建筑、地貌等)
- **两者**: 同时显示几何和渲染

#### 3D渲染模式
进入3D模式后显示3D工具栏:

- **俯视角度**: 0°(俯视) 到 90°(侧视)
- **旋转角度**: 0° 到 360°水平旋转
- **高度缩放**: 0.1x 到 3x
- **重置相机**: 恢复默认3D视角

### 6. 3D建筑编辑

选中建筑后可以:

#### 编辑高度
- 单个建筑: 选中后点击"编辑高度"
- 批量编辑: 框选多个建筑后统一设置高度
- 支持标签: `height`, `building:levels`, `building:height`

#### 编辑颜色  
- 单个建筑: 选中后点击"编辑颜色"
- 批量编辑: 框选多个建筑后统一设置颜色
- 颜色选择器支持常用颜色预设
- 支持标签: `building:colour`, `building:color`, `colour`, `color`

#### 3D设置面板
点击"3D设置"打开高级设置:
- 光照角度: 调整光照方向
- 阴影强度: 0-1
- 墙面颜色强度: 调整墙面明暗
- 默认建筑高度: 未指定高度时使用
- 默认建筑颜色: 未指定颜色时使用

### 7. 网格系统

#### 网格控制面板
点击"网格面板"打开设置:

- **网格原点**: 设置网格(0,0)点的位置
- **网格大小**: 设置网格间距(米)
- **显示选项**: 
  - 显示网格线
  - 显示坐标轴
  - 显示坐标标注
- **吸附功能**: 开启后新建节点自动对齐网格

#### 快捷操作
- **重置到原点**: 网格原点设为(0,0)
- **重置到数据中心**: 网格原点设为所有数据的中心

### 8. 标签编辑

选中对象后点击"编辑标签":

- **查看标签**: 显示当前对象的所有键值对
- **添加标签**: 输入键(key)和值(value)
- **编辑标签**: 选中行后点击"编辑"修改
- **删除标签**: 选中行后点击"删除"移除
- **应用更改**: 保存修改并记录到撤销栈

### 9. 选择操作

#### 单选
- 点击节点或路径选中
- 选中的对象高亮显示(红色)

#### 多选
- **全选多边形**: 选中所有封闭多边形
- **清除选择**: 取消所有选择
- **框选**: 使用框选模式批量选择

#### 批量操作
- **批量删除**: 选中多个对象后按`Delete`
- **批量编辑高度**: 3D模式下选中多个建筑统一设置
- **批量编辑颜色**: 3D模式下选中多个建筑统一设置

### 10. 键盘快捷键

- `Ctrl+Z`: 撤销
- `Ctrl+Y`: 重做
- `Ctrl+A`: 全选多边形
- `Delete`: 删除选中对象
- `Escape`: 取消当前操作
- `H` (在3D模式): 编辑选中建筑高度

## 编程示例

### 创建自定义命令

```javascript
// 1. 继承ICommand接口
class CustomCommand extends ICommand {
    constructor(editor, params) {
        super();
        this.editor = editor;
        this.params = params;
    }

    // 2. 实现execute方法
    execute() {
        // 执行操作的代码
        console.log('执行自定义命令');
    }

    // 3. 实现undo方法
    undo() {
        // 撤销操作的代码
        console.log('撤销自定义命令');
    }

    // 4. 实现getName方法
    getName() {
        return '自定义命令';
    }
}

// 5. 使用命令
const cmd = new CustomCommand(editor, {...});
editor.executeCommand(cmd);  // 执行并加入撤销栈
```

### 扩展OSMEditor类

```javascript
// 在OSMEditor.js中添加新方法
class OSMEditor {
    // ... 现有代码 ...
    
    // 添加新功能
    customFeature() {
        // 创建命令
        const cmd = new CustomCommand(this, {...});
        
        // 执行命令(自动加入撤销栈)
        this.executeCommand(cmd);
        
        // 重绘
        this.redraw();
    }
}
```

## 性能优化建议

1. **大数据集**: 超过10000个节点时考虑分层渲染
2. **3D渲染**: 复杂场景可能影响性能,建议关闭"地貌"显示
3. **网格显示**: 缩放级别过大时自动调整网格密度
4. **撤销栈**: 默认最多50个操作,可修改`maxUndoLevels`

## 数据格式

### OSM XML格式
```xml
<?xml version="1.0" encoding="UTF-8"?>
<osm version="0.6">
  <node id="1" lat="39.9" lon="116.4">
    <tag k="name" v="北京"/>
  </node>
  <way id="1">
    <nd ref="1"/>
    <nd ref="2"/>
    <tag k="building" v="yes"/>
    <tag k="height" v="20"/>
  </way>
</osm>
```

## 常见问题

### Q: 如何添加新的命令类型?
A: 创建新类继承`ICommand`,实现`execute()`, `undo()`, `getName()`三个方法。

### Q: 撤销栈满了怎么办?
A: 默认保存50个操作,最老的操作会自动移除。可修改`maxUndoLevels`属性。

### Q: 3D模式下建筑颜色不对?
A: 检查OSM标签是否包含`building:colour`或`colour`,否则使用默认颜色。

### Q: 如何自定义建筑高度计算?
A: 修改`getBuildingHeight()`方法,添加自己的逻辑。

## 技术栈

- **纯JavaScript**: ES6+ 模块化
- **Canvas API**: 2D/3D渲染
- **DOM API**: 界面交互
- **设计模式**: 命令模式、观察者模式

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

需支持ES6模块和Canvas 2D Context。

## 开发者信息

- **项目类型**: OSM地图编辑器
- **架构模式**: 命令模式 + MVC
- **代码风格**: 接口驱动设计(类似C++虚基类)
- **许可证**: MIT

## 更新日志

### v2.0 (重构版)
- ✨ 采用命令模式重构所有可撤销操作
- ✨ 模块化架构,代码分离为独立文件
- ✨ 完整的撤销/重做系统
- ✨ 改进的3D渲染性能
- 📝 完整的API文档和使用手册

## 联系方式

如有问题或建议,欢迎反馈!

---

**Happy Mapping! 🗺️**
