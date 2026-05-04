export const state = {
    hp: 100,
    energy: 100,
    inventory: [
        { id: 1, name: 'Dirt', count: 0, active: true },
        { id: 2, name: 'Stone', count: 0, active: false },
        { id: 3, name: 'Wood', count: 0, active: false },
        { id: 4, name: 'Steel', count: 0, active: false },
        { id: 5, name: 'Cores', count: 0, active: false },
    ],
    selectedSlot: 0,
    isPointerLocked: false,

    listeners: [],
    subscribe(callback) {
        this.listeners.push(callback);
    },
    notify() {
        this.listeners.forEach(cb => cb(this));
        this.updateHUD();
        this.updateAccessoriesUI();
    },

    updateAccessoriesUI() {
        const list = document.getElementById('accessories-list');
        if (!list) return;
        list.innerHTML = '';
        this.inventory.forEach(item => {
            if (item.count > 0 || item.id <= 5) { // Show all items that have >0 count or are base items
                const el = document.createElement('div');
                el.className = 'accessory-item';
                el.innerHTML = `<span>${item.name}</span> <span>x${item.count}</span>`;
                list.appendChild(el);
            }
        });
    },

    updateHUD() {
        const hpFill = document.getElementById('hp-fill');
        const energyFill = document.getElementById('energy-fill');
        if (hpFill) hpFill.style.width = `${this.hp}%`;
        if (energyFill) energyFill.style.width = `${this.energy}%`;

        const slots = document.querySelectorAll('.slot');
        slots.forEach((slot, i) => {
            if (i === this.selectedSlot) slot.classList.add('active');
            else slot.classList.remove('active');

            const item = this.inventory[i];
            slot.textContent = item.count > 0 ? `${item.count}` : '';
        });
    },

    addResource(name, count = 1) {
        let item = this.inventory.find(i => i.name.toLowerCase() === name.toLowerCase());
        if (item) {
            item.count += count;
        } else {
            // Add as a new item
            const newId = this.inventory.length > 0 ? Math.max(...this.inventory.map(i => i.id)) + 1 : 1;
            item = { id: newId, name: name, count: count, active: false };
            this.inventory.push(item);
        }
        this.notify();
        this.showHelperMsg(`Collected ${count}x ${item.name}!`);
    },

    setHP(val) {
        this.hp = Math.max(0, Math.min(100, val));
        this.notify();
    },

    setSelected(index) {
        this.selectedSlot = index;
        this.notify();
    },

    showHelperMsg(text) {
        const helper = document.getElementById('helper-text');
        if (helper) helper.textContent = text;
    },

    craft(itemToCraft) {
        if (itemToCraft === 'Steel') {
            const stone = this.inventory.find(i => i.name === 'Stone');
            if (stone && stone.count >= 3) {
                stone.count -= 3;
                this.addResource('Steel', 1);
                this.showHelperMsg("Crafted 1x Steel!");
            } else {
                this.showHelperMsg("Need 3x Stone to craft Steel!");
            }
        }
    }
};

// Initial update
window.addEventListener('load', () => state.updateHUD());
