import Dialog from './Dialog.js';
import ModifyTagsCommand from '../commands/ModifyTagsCommand.js';

class TagEditorDialog {
    constructor(editor, objType, objId) {
        this.editor = editor;
        this.objType = objType;
        this.objId = objId;
        this.dialog = new Dialog(`编辑标签 (${objType} #${objId})`, 520, 480);
        const obj = objType === 'node' ? editor.nodes.get(objId) : editor.ways.get(objId);
        this.tags = structuredClone((obj && obj.tags) || {});
        this.render();
    }

    render() {
        this.dialog.setHTML(`
            <div>
                <table class="tag-table">
                    <thead><tr><th>Key</th><th>Value</th></tr></thead>
                    <tbody id="tagRows"></tbody>
                </table>
                <div class="dialog-buttons" style="justify-content:flex-start; gap:8px;">
                    <button id="addBtn">添加</button>
                    <button id="editBtn">编辑</button>
                    <button id="delBtn">删除</button>
                </div>
            </div>
        `);
        this.fillRows();
        const tbody = this.dialog.query('#tagRows');
        tbody.addEventListener('click', (e) => {
            const tr = e.target.closest('tr');
            if (!tr) return;
            tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
            tr.classList.add('selected');
        });
        this.dialog.query('#addBtn').addEventListener('click', () => this.addTag());
        this.dialog.query('#editBtn').addEventListener('click', () => this.editTag());
        this.dialog.query('#delBtn').addEventListener('click', () => this.delTag());
        this.dialog.addButton('应用', () => this.apply());
        this.dialog.addButton('关闭', () => this.dialog.close());
    }

    fillRows() {
        const tbody = this.dialog.query('#tagRows');
        tbody.innerHTML = '';
        Object.entries(this.tags).forEach(([k, v]) => {
            const tr = document.createElement('tr');
            tr.className = 'tag-row';
            tr.innerHTML = `<td>${k}</td><td>${v}</td>`;
            tbody.appendChild(tr);
        });
    }

    getSelectedKey() {
        const tr = this.dialog.query('#tagRows tr.selected');
        return tr ? tr.children[0].textContent : null;
    }

    addTag() {
        const key = prompt('键 (key):');
        if (!key) return;
        const value = prompt('值 (value):', this.tags[key] || '');
        if (value === null) return;
        this.tags[key] = value;
        this.fillRows();
    }

    editTag() {
        const key = this.getSelectedKey();
        if (!key) { alert('请先选择一行'); return; }
        const value = prompt('值 (value):', this.tags[key] || '');
        if (value === null) return;
        this.tags[key] = value;
        this.fillRows();
    }

    delTag() {
        const key = this.getSelectedKey();
        if (!key) { alert('请先选择一行'); return; }
        delete this.tags[key];
        this.fillRows();
    }

    apply() {
        const obj = this.objType === 'node' ? this.editor.nodes.get(this.objId) : this.editor.ways.get(this.objId);
        const old = structuredClone((obj && obj.tags) || {});
        const cmd = new ModifyTagsCommand(this.editor, this.objType, this.objId, old, this.tags);
        this.editor.executeCommand(cmd);
        this.editor.updateSelectionInfo();
        this.editor.redraw();
        this.dialog.close();
    }
}

export default TagEditorDialog;
