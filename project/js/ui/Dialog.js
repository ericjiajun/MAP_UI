class Dialog {
    constructor(title = '', width = 480, height = 400) {
        this.overlay = document.createElement('div');
        this.overlay.className = 'dialog-overlay';
        this.overlay.addEventListener('click', () => this.close());

        this.root = document.createElement('div');
        this.root.className = 'dialog';
        this.root.style.width = `${width}px`;
        this.root.style.height = `${height}px`;
        this.root.addEventListener('click', (e) => e.stopPropagation());

        const h3 = document.createElement('h3');
        h3.textContent = title;
        this.root.appendChild(h3);

        this.content = document.createElement('div');
        this.root.appendChild(this.content);

        this.buttons = document.createElement('div');
        this.buttons.className = 'dialog-buttons';
        this.root.appendChild(this.buttons);

        document.body.appendChild(this.overlay);
        document.body.appendChild(this.root);
    }

    setHTML(html) {
        this.content.innerHTML = html;
    }

    addButton(label, onClick, opts = {}) {
        const btn = document.createElement('button');
        btn.textContent = label;
        if (opts.id) btn.id = opts.id;
        btn.addEventListener('click', (e) => { e.stopPropagation(); onClick?.(); });
        this.buttons.appendChild(btn);
        return btn;
    }

    query(selector) { return this.root.querySelector(selector); }

    close() {
        try { this.root.remove(); } catch {}
        try { this.overlay.remove(); } catch {}
    }
}

export default Dialog;
