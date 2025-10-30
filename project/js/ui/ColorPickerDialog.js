import Dialog from './Dialog.js';

class ColorPickerDialog {
    constructor(currentColor = '#F0F0F0', onApply) {
        this.currentColor = currentColor;
        this.onApply = onApply;
        this.dialog = new Dialog('选择颜色', 420, 280);
        this.render();
    }

    render(){
        const presets = ['#FFFFFF','#F0F0F0','#FF0000','#00FF00','#0000FF','#FFFF00','#FFA500','#800080','#00FFFF','#FFC0CB','#A52A2A','#808080'];
        this.dialog.setHTML(`
            <div class="form-row"><label>颜色</label><input id="cpColor" type="color" value="${this.asColor(this.currentColor)}"></div>
            <div class="form-row"><label>HEX</label><input id="cpHex" type="text" value="${this.asColor(this.currentColor)}"></div>
            <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">
                ${presets.map(c=>`<span class="color-preview" data-c="${c}" style="background:${c}"></span>`).join('')}
            </div>
        `);
        const update = (c) => {
            const hex = this.asColor(c);
            this.dialog.query('#cpColor').value = hex;
            this.dialog.query('#cpHex').value = hex;
        };
        this.dialog.query('#cpColor').addEventListener('input', e=>update(e.target.value));
        this.dialog.query('#cpHex').addEventListener('input', e=>update(e.target.value));
        this.dialog.content.querySelectorAll('.color-preview').forEach(el=>{
            el.addEventListener('click', ()=>update(el.dataset.c));
        });
        this.dialog.addButton('确定', ()=>{ this.apply(); });
        this.dialog.addButton('取消', ()=>this.dialog.close());
    }

    asColor(c){ if(/^#[0-9A-Fa-f]{6}$/.test(c)) return c; const m=String(c).toLowerCase().match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/); if (m){ const [r,g,b]=[+m[1],+m[2],+m[3]]; return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join(''); } return '#F0F0F0'; }

    apply(){ const hex = this.asColor(this.dialog.query('#cpHex').value); if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) { alert('颜色格式须为 #RRGGBB'); return; } try { this.onApply?.(hex); } finally { this.dialog.close(); } }
}

export default ColorPickerDialog;
