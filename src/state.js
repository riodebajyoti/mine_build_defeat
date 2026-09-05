import { getItemIcon } from './item_icons.js';

export const state = {
    hp: 100,
    energy: 100,
    gameMode: 'creative',
    inventory: [
        { id: 1, name: 'Dirt', count: 0, active: true },
        { id: 2, name: 'Stone', count: 0, active: false },
        { id: 3, name: 'Wood', count: 0, active: false },
        { id: 4, name: 'Steel', count: 0, active: false },
        { id: 5, name: 'Cores', count: 0, active: false },
    ],
    selectedSlot: 0,
    isPointerLocked: false,
    effects: {},

    listeners: [],
    draggedItem: null,
    recipes: [
        { ingredients: ['Wood', 'Stone'], amounts: [2, 3], result: 'Stone Pickaxe' },
        { ingredients: ['Wood', 'Iron Ingot'], amounts: [1, 2], result: 'Iron Sword' },
        { ingredients: ['Wood', 'Diamond'], amounts: [1, 3], result: 'Diamond Pickaxe' },
        { ingredients: ['Apple', 'Gold Ingot'], amounts: [1, 8], result: 'Golden Apple' },
        { ingredients: ['Wood', 'Coal'], amounts: [1, 1], result: 'Campfire' },
        { ingredients: ['Stone', 'Iron Ingot'], amounts: [3, 1], result: 'Anvil' }
    ],
    subscribe(callback) {
        this.listeners.push(callback);
    },
    notify() {
        this.listeners.forEach(cb => cb(this));
        this.updateHUD();
        this.updateAccessoriesUI();
        if (this.hp <= 0 && this.gameMode === 'survival') {
            if (this.onGameOver) this.onGameOver();
        }
    },

    updateAccessoriesUI() {
        const list = document.getElementById('accessories-list');
        if (!list) return;
        list.innerHTML = '';
        this.inventory.forEach(item => {
            if (item.count > 0 || item.id <= 5) {
                const icon = getItemIcon(item.name);
                const el = document.createElement('div');
                el.className = 'accessory-item';
                el.title = item.name;
                el.draggable = item.count > 0;
                el.dataset.itemName = item.name;
                el.innerHTML = `<img class="slot-icon" src="${icon}" alt="${item.name}"><span class="item-count">${item.count > 0 ? item.count : ''}</span>`;
                el.onclick = () => this.equipItem(item);
                el.ondragstart = (event) => {
                    if (item.count < 1) return event.preventDefault();
                    this.draggedItem = item;
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', item.name);
                    el.classList.add('dragging');
                };
                el.ondragend = () => {
                    this.draggedItem = null;
                    el.classList.remove('dragging');
                    document.querySelectorAll('.craft-target').forEach(node => node.classList.remove('craft-target'));
                };
                el.ondragover = (event) => {
                    if (this.draggedItem && this.draggedItem !== item) {
                        event.preventDefault();
                        el.classList.add('craft-target');
                    }
                };
                el.ondragleave = () => el.classList.remove('craft-target');
                el.ondrop = (event) => {
                    event.preventDefault();
                    el.classList.remove('craft-target');
                    if (this.draggedItem) this.combineItems(this.draggedItem, item);
                };
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
                const icon = getItemIcon(item.name);
                const count = item.count > 0 ? `<span class="slot-count">${item.count > 99 ? '99+' : item.count}</span>` : '';
                slot.innerHTML = `<img class="slot-icon" src="${icon}" alt="${item.name}">${count}`;
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

    combineItems(first, second) {
        if (!first || !second || first === second) return false;
        const names = [first.name, second.name];
        const recipe = this.recipes.find(candidate =>
            candidate.ingredients.every(name => names.some(value => value.toLowerCase() === name.toLowerCase()))
        );
        if (!recipe) {
            this.showHelperMsg(`${first.name} and ${second.name} do not make a recipe.`);
            return false;
        }

        const ingredientItems = recipe.ingredients.map(name =>
            this.inventory.find(item => item.name.toLowerCase() === name.toLowerCase())
        );
        const missing = ingredientItems.findIndex((item, index) => !item || item.count < recipe.amounts[index]);
        if (missing !== -1) {
            this.showHelperMsg(`Need ${recipe.amounts[missing]}x ${recipe.ingredients[missing]}!`);
            return false;
        }

        ingredientItems.forEach((item, index) => { item.count -= recipe.amounts[index]; });
        let result = this.inventory.find(item => item.name.toLowerCase() === recipe.result.toLowerCase());
        if (result) result.count += 1;
        else this.inventory.push({ id: Math.max(...this.inventory.map(item => item.id), 0) + 1, name: recipe.result, count: 1, active: false });
        this.draggedItem = null;
        this.notify();
        this.showHelperMsg(`Crafted 1x ${recipe.result}!`);
        return true;
    },

    setHP(val) {
        if (val < this.hp) {
            const resistance = this.effects.Resistance;
            if (resistance && resistance.until > Date.now()) {
                val = this.hp - ((this.hp - val) * resistance.damageMultiplier);
            }
        }
        this.hp = Math.max(0, Math.min(100, val));
        this.notify();
    },

    setEnergy(val) {
        this.energy = Math.max(0, Math.min(100, val));
        this.notify();
    },

    addEffect(name, seconds, damageMultiplier = 1) {
        this.effects[name] = { until: Date.now() + seconds * 1000, damageMultiplier };
    },

    clearEffects() {
        this.effects = {};
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
