import ICommand from '../interfaces/ICommand.js';

/**
 * 移动节点命令
 * 实现节点位置的移动和撤销操作
 */
class MoveNodeCommand extends ICommand {
    /**
     * @param {OSMEditor} editor - 编辑器实例
     * @param {number} nodeId - 节点ID
     * @param {Array<number>} oldPos - 旧位置 [lon, lat]
     * @param {Array<number>} newPos - 新位置 [lon, lat]
     */
    constructor(editor, nodeId, oldPos, newPos) {
        super();
        this.editor = editor;
        this.nodeId = nodeId;
        this.oldPos = [...oldPos]; // 深拷贝防止引用问题
        this.newPos = [...newPos];
    }

    execute() {
        if (this.editor.nodes.has(this.nodeId)) {
            const node = this.editor.nodes.get(this.nodeId);
            node.lon = this.newPos[0];
            node.lat = this.newPos[1];
        }
    }

    undo() {
        if (this.editor.nodes.has(this.nodeId)) {
            const node = this.editor.nodes.get(this.nodeId);
            node.lon = this.oldPos[0];
            node.lat = this.oldPos[1];
        }
    }

    getName() {
        return `移动节点 #${this.nodeId}`;
    }
}

export default MoveNodeCommand;
