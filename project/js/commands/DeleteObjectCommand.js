import ICommand from '../interfaces/ICommand.js';

/**
 * 删除对象命令
 * 支持删除节点和路径,并处理相关联的对象
 */
class DeleteObjectCommand extends ICommand {
    /**
     * @param {OSMEditor} editor - 编辑器实例
     * @param {string} objType - 对象类型 ('node' 或 'way')
     * @param {number} objId - 对象ID
     * @param {Object} objData - 对象数据
     * @param {Object|null} affectedWays - 受影响的路径数据
     */
    constructor(editor, objType, objId, objData, affectedWays = null) {
        super();
        this.editor = editor;
        this.objType = objType;
        this.objId = objId;
        this.objData = structuredClone(objData);
        this.affectedWays = affectedWays ? structuredClone(affectedWays) : {};
    }

    execute() {
        if (this.objType === 'node') {
            this.editor.nodes.delete(this.objId);
            // 删除包含此节点的所有路径
            for (const wayId of Object.keys(this.affectedWays)) {
                this.editor.ways.delete(parseInt(wayId));
            }
        } else if (this.objType === 'way') {
            this.editor.ways.delete(this.objId);
        }
    }

    undo() {
        if (this.objType === 'node') {
            this.editor.nodes.set(this.objId, structuredClone(this.objData));
            // 恢复受影响的路径
            for (const [wayId, wayData] of Object.entries(this.affectedWays)) {
                this.editor.ways.set(parseInt(wayId), structuredClone(wayData));
            }
        } else if (this.objType === 'way') {
            this.editor.ways.set(this.objId, structuredClone(this.objData));
        }
    }

    getName() {
        const typeLabel = this.objType === 'node' ? '节点' : '路径';
        return `删除${typeLabel} #${this.objId}`;
    }
}

export default DeleteObjectCommand;
