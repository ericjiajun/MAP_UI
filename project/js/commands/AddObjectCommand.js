import ICommand from '../interfaces/ICommand.js';

/**
 * 添加对象命令
 * 支持添加节点和路径
 */
class AddObjectCommand extends ICommand {
    /**
     * @param {OSMEditor} editor - 编辑器实例
     * @param {string} objType - 对象类型 ('node' 或 'way')
     * @param {number} objId - 对象ID
     * @param {Object} objData - 对象数据
     */
    constructor(editor, objType, objId, objData) {
        super();
        this.editor = editor;
        this.objType = objType;
        this.objId = objId;
        this.objData = structuredClone(objData);
    }

    execute() {
        if (this.objType === 'node') {
            this.editor.nodes.set(this.objId, structuredClone(this.objData));
        } else if (this.objType === 'way') {
            this.editor.ways.set(this.objId, structuredClone(this.objData));
        }
    }

    undo() {
        if (this.objType === 'node') {
            this.editor.nodes.delete(this.objId);
        } else if (this.objType === 'way') {
            this.editor.ways.delete(this.objId);
        }
    }

    getName() {
        const typeLabel = this.objType === 'node' ? '节点' : '路径';
        return `添加${typeLabel} #${this.objId}`;
    }
}

export default AddObjectCommand;
