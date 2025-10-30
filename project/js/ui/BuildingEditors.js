import ModifyTagsCommand from '../commands/ModifyTagsCommand.js';
import ColorPickerDialog from './ColorPickerDialog.js';

export function openHeightEditor(editor){
    const ways = editor.selectedWay ? [editor.selectedWay] : Array.from(editor.selectedWays);
    if (ways.length===0){ alert('请先选择一个或多个建筑多边形'); return; }
    const val = prompt('输入高度(米) 或 楼层数如 12L (例如: 24 或 8L):');
    if (val===null) return;
    const isLevels = /l$/i.test(val.trim());
    const num = parseFloat(val);
    if (isNaN(num)){ alert('无效的数字'); return; }
    ways.forEach(wayId => {
        const way = editor.ways.get(wayId);
        if (!way) return;
        const oldTags = structuredClone(way.tags||{});
        const newTags = structuredClone(way.tags||{});
        if (isLevels) newTags['building:levels'] = String(num);
        else newTags['building:height'] = String(num);
        const cmd = new ModifyTagsCommand(editor, 'way', wayId, oldTags, newTags);
        editor.executeCommand(cmd);
    });
    editor.redraw();
}

export function openColorEditor(editor){
    const ways = editor.selectedWay ? [editor.selectedWay] : Array.from(editor.selectedWays);
    if (ways.length===0){ alert('请先选择一个或多个建筑多边形'); return; }
    // 取第一个的颜色作为初始值
    let init = '#F0F0F0';
    const w0 = editor.ways.get(ways[0]);
    if (w0 && w0.tags){ init = editor.getBuildingColor(w0.tags); }
    new ColorPickerDialog(init, (hex)=>{
        ways.forEach(wayId => {
            const way = editor.ways.get(wayId);
            if (!way) return;
            const oldTags = structuredClone(way.tags||{});
            const newTags = structuredClone(way.tags||{});
            newTags['building:colour'] = hex;
            const cmd = new ModifyTagsCommand(editor, 'way', wayId, oldTags, newTags);
            editor.executeCommand(cmd);
        });
        editor.redraw();
    });
}
