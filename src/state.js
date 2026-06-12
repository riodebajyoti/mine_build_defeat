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
        const EMOJI_MAP = {
            'Dirt':'🟫','Stone':'⬜','Wood':'🪵','Steel':'⚙️','Cores':'🔵','Grass':'🟩','Meat':'🥩',
            'Wood Sword':'🗡️','Stone Sword':'⚔️','Iron Sword':'🔪','Diamond Sword':'💎',
            'Gold Sword':'✨','Netherite Sword':'🔥','Bow':'🏹','Crossbow':'🎯',
            'Trident':'🔱','Shield':'🛡️','Arrow':'➡️','Wood Pickaxe':'⛏️',
            'Stone Pickaxe':'⛏️','Iron Pickaxe':'⚒️','Diamond Pickaxe':'💎',
            'Netherite Pickaxe':'🔥','Wood Axe':'🪓','Iron Axe':'🪓','Diamond Axe':'💎',
            'Shovel':'🪣','Hoe':'🌾','Fishing Rod':'🎣','Shears':'✂️',
            'Flint & Steel':'🔥','Compass':'🧭','Clock':'🕐','Spyglass':'🔭',
            'Leather Helmet':'🪖','Iron Helmet':'⛑️','Diamond Helmet':'💎',
            'Netherite Helmet':'🔥','Iron Chestplate':'🦺','Diamond Chestplate':'💎',
            'Elytra':'🦋','Iron Leggings':'👖','Diamond Boots':'👢','Gold Armor':'👑',
            'Health Potion':'❤️','Speed Potion':'💨','Strength Potion':'💪',
            'Fire Resist Potion':'🔥','Night Vision Potion':'👁️','Invisibility Potion':'👻',
            'Poison Potion':'☠️','Splash Potion':'💦','Exp Bottle':'🟢',
            'Ender Pearl':'🟣','Eye of Ender':'👁️','Totem of Undying':'🗿',
            'Enchanted Book':'📖','Lead':'🪢','Name Tag':'🏷️','Firework':'🎆',
            'Map':'🗺️','Music Disc':'💿','TNT':'💥','Beacon':'🔆','Nether Star':'⭐',
        };
        this.inventory.forEach(item => {
            if (item.count > 0 || item.id <= 5) {
                const emoji = EMOJI_MAP[item.name] || '📦';
                const el = document.createElement('div');
                el.className = 'accessory-item';
                el.title = item.name;
                el.innerHTML = `${emoji}<span class="item-count">${item.count > 0 ? item.count : ''}</span>`;
                el.onclick = () => this.equipItem(item);
                list.appendChild(el);
            }
        });
    },

    equipItem(item) {
        const activeItemIndex = this.selectedSlot;
        const clickedItemIndex = this.inventory.findIndex(i => i === item);
        
        if (clickedItemIndex !== -1) {
            if (clickedItemIndex !== activeItemIndex) {
                // Swap items in the inventory so the clicked item is in the active quick-slot
                const temp = this.inventory[activeItemIndex];
                this.inventory[activeItemIndex] = this.inventory[clickedItemIndex];
                this.inventory[clickedItemIndex] = temp;
                
                this.notify();
                this.showHelperMsg(`Equipped ${item.name} to slot ${activeItemIndex + 1}!`);
            }
            
            // Close the menu automatically
            const closeBtn = document.getElementById('close-accessories-btn');
            if (closeBtn) closeBtn.click();
        }
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
            if (item) {
                let shortName = item.name.length > 3 ? item.name.substring(0,3).toUpperCase() : item.name.toUpperCase();
                slot.innerHTML = `<span style="font-size: 9px; color: var(--accent);">${shortName}</span><br><b>${item.count}</b>`;
                slot.title = item.name;
            }
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
