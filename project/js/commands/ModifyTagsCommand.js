import ICommand from '../interfaces/ICommand.js';

/**
 * 修改标签命令
 * 支持修改节点和路径的标签属性
 */
class ModifyTagsCommand extends ICommand {
    /**
     * @param {OSMEditor} editor - 编辑器实例
     * @param {string} objType - 对象类型 ('node' 或 'way')
     * @param {number} objId - 对象ID
     * @param {Object} oldTags - 旧标签
     * @param {Object} newTags - 新标签
     */
    constructor(editor, objType, objId, oldTags, newTags) {
        super();
        this.editor = editor;
        this.objType = objType;
        this.objId = objId;
        this.oldTags = structuredClone(oldTags);
        this.newTags = structuredClone(newTags);
    }

    execute() {
        if (this.objType === 'node' && this.editor.nodes.has(this.objId)) {
            this.editor.nodes.get(this.objId).tags = structuredClone(this.newTags);
        } else if (this.objType === 'way' && this.editor.ways.has(this.objId)) {
            this.editor.ways.get(this.objId).tags = structuredClone(this.newTags);
        }
    }

    undo() {
        if (this.objType === 'node' && this.editor.nodes.has(this.objId)) {
            this.editor.nodes.get(this.objId).tags = structuredClone(this.oldTags);
        } else if (this.objType === 'way' && this.editor.ways.has(this.objId)) {
            this.editor.ways.get(this.objId).tags = structuredClone(this.oldTags);
        }
    }

    getName() {
        const typeLabel = this.objType === 'node' ? '节点' : '路径';
        return `修改${typeLabel}标签 #${this.objId}`;
    }
}

export default ModifyTagsCommand;
