import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { state } from './state.js';
import { VoxelWorld } from './world.js';
import { Boss } from './boss.js';

// --- CONFIG ---
const MOVE_SPEED = 10.0;
const JUMP_FORCE = 5.0;
const GRAVITY = 15.0;

// --- ENGINE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.05);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);
scene.add(camera); // Add camera to scene so it can have children

// --- 3D HAND & ITEM MODEL ---
const handGroup = new THREE.Group();
handGroup.position.set(0.5, -0.4, -0.8);
camera.add(handGroup);

let currentHandMesh = null;
// --- HOLD LAST HELD ITEM FOR HAND ---
let lastItemHeldName = null;

function updateHandModel() {
    if (currentHandMesh) {
        handGroup.remove(currentHandMesh);
        currentHandMesh = null;
    }

    let currentItem = state.inventory[state.selectedSlot];
    if (currentItem && currentItem.count > 0) {
        lastItemHeldName = currentItem.name;
    } else if (!currentItem || currentItem.count === 0) {
        // Show last held even if 0 left (until selection changes)
        if (lastItemHeldName) {
            currentItem = { name: lastItemHeldName, count: 0 };
        }
    }

    if (currentItem && currentItem.name) {
        const type = currentItem.name;
        let geometry, material;

        const baseBlocks = ['Dirt', 'Stone', 'Wood', 'Steel', 'Cores', 'Grass'];
        if (baseBlocks.includes(type)) {
            geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa }); // Fallback if world materials aren't available yet
            if (type === 'Dirt') material.color.setHex(0x8B4513);
            else if (type === 'Stone') material.color.setHex(0x808080);
            else if (type === 'Grass') material.color.setHex(0x228B22);
            else if (type === 'Steel') material.color.setHex(0x707070);
        } else {
            geometry = new THREE.CylinderGeometry(0.02, 0.04, 0.6, 8);
            let hash = 0;
            for (let i = 0; i < type.length; i++) hash = type.charCodeAt(i) + ((hash << 5) - hash);
            const color = new THREE.Color(`hsl(${Math.abs(hash) % 360}, 80%, 50%)`);
            material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.2, metalness: 0.8, emissive: color, emissiveIntensity: 0.2 });
        }

        currentHandMesh = new THREE.Mesh(geometry, material);
        if (!baseBlocks.includes(type)) {
            currentHandMesh.rotation.x = Math.PI / 2;
            currentHandMesh.position.set(0, 0, -0.2);
        } else {
            currentHandMesh.rotation.set(-0.2, -Math.PI / 4, 0.1);
        }
        handGroup.add(currentHandMesh);
    } else {
        // Bare hand (no item ever held)
        const geometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
        const material = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.6 });
        currentHandMesh = new THREE.Mesh(geometry, material);
        currentHandMesh.position.set(0, -0.1, 0);
        currentHandMesh.rotation.set(-0.4, -0.2, -0.1);
        handGroup.add(currentHandMesh);
    }
}
state.subscribe(updateHandModel);

// --- FLOATING AI ROBOT COMPANION ---
const robotGroup = new THREE.Group();
scene.add(robotGroup);

const robotBodyGeo = new THREE.SphereGeometry(0.3, 16, 16);
const robotBodyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.8, roughness: 0.2 });
const robotBody = new THREE.Mesh(robotBodyGeo, robotBodyMat);
robotGroup.add(robotBody);

const robotEyeGeo = new THREE.SphereGeometry(0.08, 8, 8);
const robotEyeMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
const robotEye = new THREE.Mesh(robotEyeGeo, robotEyeMat);
robotEye.position.set(0, 0, 0.25);
robotGroup.add(robotEye);

const robotAntennaGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2);
const robotAntenna = new THREE.Mesh(robotAntennaGeo, robotBodyMat);
robotAntenna.position.set(0, 0.35, 0);
robotGroup.add(robotAntenna);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game-container').appendChild(renderer.domElement);

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(50, 100, 50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);

// --- VOXEL WORLD ---
const world = new VoxelWorld(scene);
world.generateChunk(0, 0);
updateHandModel(); // Initialize hand now that we have state/world

// --- BOSS ---
const boss = new Boss(scene, camera);
let bossSpawned = false;

// --- CONTROLS ---
// Use renderer.domElement for PointerLock target and add safe guards
const controls = new PointerLockControls(camera, renderer.domElement);
const startBtn = document.getElementById('start-btn');
const overlay = document.getElementById('overlay');

if (startBtn && overlay) {
    startBtn.addEventListener('click', () => {
        controls.lock();
    });
} else {
    console.warn('Start button or overlay not found in DOM:', { startBtn: !!startBtn, overlay: !!overlay });
}

controls.addEventListener('lock', () => {
    if (overlay) overlay.style.display = 'none';
    state.isPointerLocked = true;
});

controls.addEventListener('unlock', () => {
    state.isPointerLocked = false;
    if (overlay && !isAccessoriesMenuOpen) {
        overlay.style.display = 'flex';
    }
});

// --- ACCESSORIES MENU ---
const accessoriesMenu = document.getElementById('accessories-menu');
const closeAccessoriesBtn = document.getElementById('close-accessories-btn');
const accessorySearch = document.getElementById('accessory-search');
const accessoryGetBtn = document.getElementById('accessory-get-btn');

let isAccessoriesMenuOpen = false;

function toggleAccessoriesMenu() {
    isAccessoriesMenuOpen = !isAccessoriesMenuOpen;
    if (isAccessoriesMenuOpen) {
        controls.unlock();
        overlay.style.display = 'none';
        accessoriesMenu.style.display = 'flex';
        buildCatalog(currentCatalogFilter);
        accessorySearch.focus();
    } else {
        accessoriesMenu.style.display = 'none';
        controls.lock();
    }
}

closeAccessoriesBtn.addEventListener('click', () => {
    if (isAccessoriesMenuOpen) toggleAccessoriesMenu();
});

// Search filters real Minecraft items only
accessorySearch.addEventListener('input', () => {
    const query = accessorySearch.value.trim().toLowerCase();
    if (query.length === 0) {
        buildCatalog(currentCatalogFilter);
        return;
    }
    const grid = document.getElementById('catalog-grid');
    const titleEl = document.getElementById('mc-tab-title');
    if (titleEl) titleEl.textContent = `"${accessorySearch.value.trim()}"`;
    grid.innerHTML = '';
    const results = MINECRAFT_ITEMS.filter(i => i.name.toLowerCase().includes(query));
    if (results.length === 0) {
        grid.innerHTML = `<div style="color:#fff;font-family:'Press Start 2P',monospace;font-size:7px;padding:10px;grid-column:1/-1;">NOT FOUND</div>`;
    } else {
        results.forEach(item => {
            const emoji = ITEM_EMOJI_MAP[item.name] || '📦';
            const card = document.createElement('div');
            card.className = 'catalog-item';
            card.setAttribute('data-name', item.name);
            card.innerHTML = `<span class="item-emoji">${emoji}</span>`;
            card.onclick = () => state.addResource(item.name, 1);
            grid.appendChild(card);
        });
    }
    document.querySelectorAll('.mc-tab').forEach(b => b.classList.remove('active'));
});

// --- MINECRAFT ITEM CATALOG ---
const TAB_TITLES = {
    all: 'All Items',
    weapons: 'Weapons & Combat',
    tools: 'Tools & Utilities',
    armor: 'Armor & Wearables',
    blocks: 'Blocks & Furniture',
    food: 'Food & Drinks',
    materials: 'Materials & Gems',
    potions: 'Potions & Brews',
    special: 'Special Items',
    yours: 'Your Inventory'
};

const ITEM_EMOJI_MAP = {
    // Weapons
    'Wooden Sword':'🗡️','Stone Sword':'⚔️','Iron Sword':'🔪','Diamond Sword':'💎',
    'Golden Sword':'✨','Netherite Sword':'🔥','Bow':'🏹','Crossbow':'🎯',
    'Trident':'🔱','Shield':'🛡️','Arrow':'➡️',
    // Tools
    'Wooden Pickaxe':'⛏️','Stone Pickaxe':'⛏️','Iron Pickaxe':'⚒️','Diamond Pickaxe':'💎',
    'Netherite Pickaxe':'🔥','Wooden Axe':'🪓','Iron Axe':'🪓','Diamond Axe':'💎',
    'Shovel':'🪣','Hoe':'🌾','Fishing Rod':'🎣','Shears':'✂️',
    'Flint and Steel':'🔥','Compass':'🧭','Clock':'🕐','Spyglass':'🔭',
    // Armor
    'Leather Helmet':'🪖','Iron Helmet':'⛑️','Diamond Helmet':'💎','Netherite Helmet':'🔥',
    'Iron Chestplate':'🦺','Diamond Chestplate':'💎','Elytra':'🦋',
    'Iron Leggings':'👖','Diamond Boots':'👢','Gold Armor':'👑','Turtle Shell':'🐢',
    // Blocks & Furniture
    'Red Bed':'🛏️','Blue Bed':'🛏️','White Bed':'🛏️','Yellow Bed':'🛏️',
    'Green Bed':'🛏️','Purple Bed':'🛏️','Black Bed':'🛏️','Pink Bed':'🛏️',
    'Orange Bed':'🛏️','Cyan Bed':'🛏️',
    'Chest':'📦','Ender Chest':'🟣','Trapped Chest':'⚠️',
    'Crafting Table':'🪵','Furnace':'🔥','Blast Furnace':'🔥','Smoker':'🍖',
    'Enchanting Table':'📖','Anvil':'⚙️','Grindstone':'⚙️','Smithing Table':'🔨',
    'Bookshelf':'📚','Cauldron':'🪣','Barrel':'🪣','Composter':'🌿',
    'Lectern':'📖','Cartography Table':'🗺️','Loom':'🧵','Stonecutter':'🪨',
    'Bed':'🛏️','Lantern':'🏮','Soul Lantern':'💙','Campfire':'🔥',
    'Jukebox':'🎵','Note Block':'🎵','Bell':'🔔','Flower Pot':'🌺',
    // Food
    'Apple':'🍎','Golden Apple':'🍏','Enchanted Golden Apple':'⭐',
    'Bread':'🍞','Cooked Chicken':'🍗','Cooked Beef':'🥩','Cooked Porkchop':'🥓',
    'Cooked Mutton':'🍖','Cooked Rabbit':'🍖','Cooked Cod':'🐟','Cooked Salmon':'🐟',
    'Cake':'🎂','Cookie':'🍪','Pumpkin Pie':'🥧','Melon Slice':'🍈',
    'Carrot':'🥕','Golden Carrot':'🌟','Potato':'🥔','Baked Potato':'🥔',
    'Beetroot':'🟣','Beetroot Soup':'🍲','Mushroom Stew':'🍲','Rabbit Stew':'🍲',
    'Suspicious Stew':'🍲','Honey Bottle':'🍯','Sweet Berries':'🫐','Dried Kelp':'🌿',
    'Glow Berries':'✨','Milk Bucket':'🥛',
    // Materials
    'Iron Ingot':'🔩','Gold Ingot':'🟡','Diamond':'💎','Emerald':'💚',
    'Netherite Ingot':'⬛','Copper Ingot':'🟠','Amethyst Shard':'🟣',
    'Lapis Lazuli':'🔵','Coal':'⚫','Redstone':'🔴','Quartz':'⬜',
    'Glowstone Dust':'💛','Blaze Rod':'🔥','Ender Eye':'👁️','Ghast Tear':'💧',
    'Slimeball':'🟢','Spider Eye':'🕷️','Gunpowder':'💥','String':'🧵',
    'Leather':'🟫','Wool':'🧶','Feather':'🪶','Bone':'🦴','Ink Sac':'⬛',
    // Potions
    'Health Potion':'❤️','Speed Potion':'💨','Strength Potion':'💪',
    'Fire Resist Potion':'🔥','Night Vision Potion':'👁️','Invisibility Potion':'👻',
    'Poison Potion':'☠️','Splash Potion':'💦','Exp Bottle':'🟢',
    'Slowness Potion':'🐢','Weakness Potion':'💔','Regeneration Potion':'💗',
    'Leaping Potion':'🦘','Water Breathing Potion':'🫧','Luck Potion':'🍀',
    // Special
    'Ender Pearl':'🟣','Eye of Ender':'👁️','Totem of Undying':'🗿',
    'Enchanted Book':'📖','Lead':'🪢','Name Tag':'🏷️','Firework':'🎆',
    'Map':'🗺️','Music Disc':'💿','TNT':'💥','Beacon':'🔆','Nether Star':'⭐',
    'Dragon Egg':'🥚','Nether Portal':'🌀','Saddle':'🐴','Horse Armor':'🐴',
    // Base blocks
    'Dirt':'🟫','Stone':'⬜','Wood':'🪵','Steel':'⚙️','Cores':'🔵','Grass':'🟩',
};

const MINECRAFT_ITEMS = [
    { name: 'Wooden Sword', cat: 'weapons' }, { name: 'Stone Sword', cat: 'weapons' },
    { name: 'Iron Sword', cat: 'weapons' }, { name: 'Diamond Sword', cat: 'weapons' },
    { name: 'Golden Sword', cat: 'weapons' }, { name: 'Netherite Sword', cat: 'weapons' },
    { name: 'Bow', cat: 'weapons' }, { name: 'Crossbow', cat: 'weapons' },
    { name: 'Trident', cat: 'weapons' }, { name: 'Shield', cat: 'weapons' },
    { name: 'Arrow', cat: 'weapons' },
    { name: 'Wooden Pickaxe', cat: 'tools' }, { name: 'Stone Pickaxe', cat: 'tools' },
    { name: 'Iron Pickaxe', cat: 'tools' }, { name: 'Diamond Pickaxe', cat: 'tools' },
    { name: 'Netherite Pickaxe', cat: 'tools' }, { name: 'Wooden Axe', cat: 'tools' },
    { name: 'Iron Axe', cat: 'tools' }, { name: 'Diamond Axe', cat: 'tools' },
    { name: 'Shovel', cat: 'tools' }, { name: 'Hoe', cat: 'tools' },
    { name: 'Fishing Rod', cat: 'tools' }, { name: 'Shears', cat: 'tools' },
    { name: 'Flint and Steel', cat: 'tools' }, { name: 'Compass', cat: 'tools' },
    { name: 'Clock', cat: 'tools' }, { name: 'Spyglass', cat: 'tools' },
    { name: 'Leather Helmet', cat: 'armor' }, { name: 'Iron Helmet', cat: 'armor' },
    { name: 'Diamond Helmet', cat: 'armor' }, { name: 'Netherite Helmet', cat: 'armor' },
    { name: 'Iron Chestplate', cat: 'armor' }, { name: 'Diamond Chestplate', cat: 'armor' },
    { name: 'Elytra', cat: 'armor' }, { name: 'Iron Leggings', cat: 'armor' },
    { name: 'Diamond Boots', cat: 'armor' }, { name: 'Gold Armor', cat: 'armor' },
    { name: 'Health Potion', cat: 'potions' }, { name: 'Speed Potion', cat: 'potions' },
    { name: 'Strength Potion', cat: 'potions' }, { name: 'Fire Resist Potion', cat: 'potions' },
    { name: 'Night Vision Potion', cat: 'potions' }, { name: 'Invisibility Potion', cat: 'potions' },
    { name: 'Poison Potion', cat: 'potions' }, { name: 'Splash Potion', cat: 'potions' },
    { name: 'Exp Bottle', cat: 'potions' },
    { name: 'Ender Pearl', cat: 'special' }, { name: 'Eye of Ender', cat: 'special' },
    { name: 'Totem of Undying', cat: 'special' }, { name: 'Enchanted Book', cat: 'special' },
    { name: 'Lead', cat: 'special' }, { name: 'Name Tag', cat: 'special' },
    { name: 'Firework', cat: 'special' }, { name: 'Map', cat: 'special' },
    { name: 'Music Disc', cat: 'special' }, { name: 'TNT', cat: 'special' },
    { name: 'Beacon', cat: 'special' }, { name: 'Nether Star', cat: 'special' },
    { name: 'Dragon Egg', cat: 'special' }, { name: 'Saddle', cat: 'special' },
    { name: 'Horse Armor', cat: 'special' },
    // Armor extras
    { name: 'Turtle Shell', cat: 'armor' },
    // Potions extras
    { name: 'Slowness Potion', cat: 'potions' }, { name: 'Weakness Potion', cat: 'potions' },
    { name: 'Regeneration Potion', cat: 'potions' }, { name: 'Leaping Potion', cat: 'potions' },
    { name: 'Water Breathing Potion', cat: 'potions' }, { name: 'Luck Potion', cat: 'potions' },
    // Blocks & Furniture
    { name: 'Red Bed', cat: 'blocks' }, { name: 'Blue Bed', cat: 'blocks' },
    { name: 'White Bed', cat: 'blocks' }, { name: 'Yellow Bed', cat: 'blocks' },
    { name: 'Green Bed', cat: 'blocks' }, { name: 'Purple Bed', cat: 'blocks' },
    { name: 'Black Bed', cat: 'blocks' }, { name: 'Pink Bed', cat: 'blocks' },
    { name: 'Orange Bed', cat: 'blocks' }, { name: 'Cyan Bed', cat: 'blocks' },
    { name: 'Chest', cat: 'blocks' }, { name: 'Ender Chest', cat: 'blocks' },
    { name: 'Trapped Chest', cat: 'blocks' }, { name: 'Crafting Table', cat: 'blocks' },
    { name: 'Furnace', cat: 'blocks' }, { name: 'Blast Furnace', cat: 'blocks' },
    { name: 'Smoker', cat: 'blocks' }, { name: 'Enchanting Table', cat: 'blocks' },
    { name: 'Anvil', cat: 'blocks' }, { name: 'Grindstone', cat: 'blocks' },
    { name: 'Smithing Table', cat: 'blocks' }, { name: 'Bookshelf', cat: 'blocks' },
    { name: 'Cauldron', cat: 'blocks' }, { name: 'Barrel', cat: 'blocks' },
    { name: 'Composter', cat: 'blocks' }, { name: 'Lectern', cat: 'blocks' },
    { name: 'Cartography Table', cat: 'blocks' }, { name: 'Loom', cat: 'blocks' },
    { name: 'Stonecutter', cat: 'blocks' }, { name: 'Lantern', cat: 'blocks' },
    { name: 'Soul Lantern', cat: 'blocks' }, { name: 'Campfire', cat: 'blocks' },
    { name: 'Jukebox', cat: 'blocks' }, { name: 'Note Block', cat: 'blocks' },
    { name: 'Bell', cat: 'blocks' }, { name: 'Flower Pot', cat: 'blocks' },
    // Food
    { name: 'Apple', cat: 'food' }, { name: 'Golden Apple', cat: 'food' },
    { name: 'Enchanted Golden Apple', cat: 'food' }, { name: 'Bread', cat: 'food' },
    { name: 'Cooked Chicken', cat: 'food' }, { name: 'Cooked Beef', cat: 'food' },
    { name: 'Cooked Porkchop', cat: 'food' }, { name: 'Cooked Mutton', cat: 'food' },
    { name: 'Cooked Rabbit', cat: 'food' }, { name: 'Cooked Cod', cat: 'food' },
    { name: 'Cooked Salmon', cat: 'food' }, { name: 'Cake', cat: 'food' },
    { name: 'Cookie', cat: 'food' }, { name: 'Pumpkin Pie', cat: 'food' },
    { name: 'Melon Slice', cat: 'food' }, { name: 'Carrot', cat: 'food' },
    { name: 'Golden Carrot', cat: 'food' }, { name: 'Potato', cat: 'food' },
    { name: 'Baked Potato', cat: 'food' }, { name: 'Beetroot', cat: 'food' },
    { name: 'Beetroot Soup', cat: 'food' }, { name: 'Mushroom Stew', cat: 'food' },
    { name: 'Rabbit Stew', cat: 'food' }, { name: 'Suspicious Stew', cat: 'food' },
    { name: 'Honey Bottle', cat: 'food' }, { name: 'Sweet Berries', cat: 'food' },
    { name: 'Dried Kelp', cat: 'food' }, { name: 'Glow Berries', cat: 'food' },
    { name: 'Milk Bucket', cat: 'food' },
    // Materials
    { name: 'Iron Ingot', cat: 'materials' }, { name: 'Gold Ingot', cat: 'materials' },
    { name: 'Diamond', cat: 'materials' }, { name: 'Emerald', cat: 'materials' },
    { name: 'Netherite Ingot', cat: 'materials' }, { name: 'Copper Ingot', cat: 'materials' },
    { name: 'Amethyst Shard', cat: 'materials' }, { name: 'Lapis Lazuli', cat: 'materials' },
    { name: 'Coal', cat: 'materials' }, { name: 'Redstone', cat: 'materials' },
    { name: 'Quartz', cat: 'materials' }, { name: 'Glowstone Dust', cat: 'materials' },
    { name: 'Blaze Rod', cat: 'materials' }, { name: 'Ghast Tear', cat: 'materials' },
    { name: 'Slimeball', cat: 'materials' }, { name: 'Spider Eye', cat: 'materials' },
    { name: 'Gunpowder', cat: 'materials' }, { name: 'String', cat: 'materials' },
    { name: 'Leather', cat: 'materials' }, { name: 'Wool', cat: 'materials' },
    { name: 'Feather', cat: 'materials' }, { name: 'Bone', cat: 'materials' },
    { name: 'Ink Sac', cat: 'materials' },
];

let currentCatalogFilter = 'all';

function buildCatalog(filter) {
    const grid = document.getElementById('catalog-grid');
    const titleEl = document.getElementById('mc-tab-title');
    if (titleEl) titleEl.textContent = TAB_TITLES[filter] || 'Items';
    grid.innerHTML = '';

    if (filter === 'yours') {
        state.inventory.filter(i => i.count > 0).forEach(item => {
            const emoji = ITEM_EMOJI_MAP[item.name] || '📦';
            const card = document.createElement('div');
            card.className = 'catalog-item';
            card.setAttribute('data-name', `${item.name} x${item.count}`);
            card.innerHTML = `<span class="item-emoji">${emoji}</span>`;
            card.onclick = () => state.equipItem(item);
            grid.appendChild(card);
        });
        return;
    }

    const items = filter === 'all' ? MINECRAFT_ITEMS : MINECRAFT_ITEMS.filter(i => i.cat === filter);
    items.forEach(item => {
        const emoji = ITEM_EMOJI_MAP[item.name] || '📦';
        const card = document.createElement('div');
        card.className = 'catalog-item';
        card.setAttribute('data-name', item.name);
        card.innerHTML = `<span class="item-emoji">${emoji}</span>`;
        card.onclick = () => state.addResource(item.name, 1);
        grid.appendChild(card);
    });
}

document.querySelectorAll('.mc-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mc-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCatalogFilter = btn.dataset.cat;
        buildCatalog(currentCatalogFilter);
    });
});

window.addEventListener('load', () => buildCatalog('all'));

// --- MOVEMENT STATE ---
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

const onKeyDown = (event) => {
    if (document.activeElement === accessorySearch) {
        if (event.code === 'Enter') accessoryGetBtn.click();
        return;
    }

    switch (event.code) {
        case 'KeyW': toggleAccessoriesMenu(); break;
        case 'ArrowUp': moveForward = true; break;
        case 'ArrowDown': moveBackward = true; break;
        case 'ArrowLeft': moveLeft = true; break;
        case 'ArrowRight': moveRight = true; break;
        case 'Space': if (canJump === true) velocity.y += JUMP_FORCE; canJump = false; break;
        case 'Digit1': state.setSelected(0); break;
        case 'Digit2': state.setSelected(1); break;
        case 'Digit3': state.setSelected(2); break;
        case 'Digit4': state.setSelected(3); break;
        case 'Digit5': state.setSelected(4); break;
        case 'KeyC': state.craft('Steel'); break;
    }
};

const onKeyUp = (event) => {
    switch (event.code) {
        case 'ArrowUp': moveForward = false; break;
        case 'ArrowDown': moveBackward = false; break;
        case 'ArrowLeft': moveLeft = false; break;
        case 'ArrowRight': moveRight = false; break;
    }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// --- MINING & BUILDING ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0, 0); // Center

document.addEventListener('mousedown', (event) => {
    if (!state.isPointerLocked) return;

    // Only trigger swing on right-click
    if (event.button === 2) {
        isSwinging = true;
        swingTime = 0;
    }

    raycaster.setFromCamera(mouse, camera);

    // Check Boss Hit FIRST
    if (boss.active && event.button === 0) {
        const attackIntersects = raycaster.intersectObject(boss.group, true);
        if (attackIntersects.length > 0) {
            boss.takeDamage(10);
            return;
        }
    }

    const currentItem = state.inventory[state.selectedSlot];
    const baseBlocks = ['Dirt', 'Stone', 'Wood', 'Steel', 'Cores', 'Grass'];
    const isAccessory = currentItem && !baseBlocks.includes(currentItem.name) && currentItem.count > 0;

    // Right-click drops the accessory
    if (isAccessory && event.button === 2) {
        state.showHelperMsg(`Dropped the ${currentItem.name}!`);
        currentItem.count = Math.max(0, currentItem.count - 1);
        state.notify();
        return;
    }

    const intersects = raycaster.intersectObjects(world.getSurfaceObjects());

    if (intersects.length > 0) {
        const intersection = intersects[0];
        if (event.button === 0) { // LEFT CLICK: ALWAYS MINE/DIG
            world.mineBlock(intersection.object, intersection.point);

            // Spawn Boss after mining 5 blocks
            const dirtCount = state.inventory.find(i => i.name === 'Dirt')?.count || 0;
            if (dirtCount >= 5 && !bossSpawned) {
                boss.activate();
                bossSpawned = true;
            }
        } else if (event.button === 2 && !isAccessory) { // RIGHT CLICK: BUILD (if holding block)
            world.placeBlock(intersection.point, intersection.face.normal);
        }
    }
});

let prevTime = performance.now();
let swingTime = 0;
let isSwinging = false;
let bobTime = 0;

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    if (state.isPointerLocked) {
        // Physics & Movement
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= GRAVITY * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * MOVE_SPEED * 10.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * MOVE_SPEED * 10.0 * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        camera.position.y += (velocity.y * delta);

        // Ground Collision (Simple)
        if (camera.position.y < 2) {
            velocity.y = 0;
            camera.position.y = 2;
            canJump = true;
        }

        // Hand Animations
        if (isSwinging) {
            swingTime += delta * 20; // Minecraft swings are fast
            if (swingTime > Math.PI) {
                isSwinging = false;
                handGroup.rotation.set(0, 0, 0);
                handGroup.position.set(0.5, -0.4, -0.8);
            } else {
                // Minecraft swing: strikes down, inwards, and rotates forward
                const progress = Math.sin(swingTime);
                handGroup.rotation.x = -progress * 1.2;
                handGroup.rotation.y = progress * 0.5;
                handGroup.rotation.z = progress * 0.4;
                handGroup.position.y = -0.4 - progress * 0.3;
                handGroup.position.z = -0.8 - progress * 0.2;
                handGroup.position.x = 0.5 - progress * 0.2;
            }
        } else {
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
            if (speed > 0.1 && canJump) {
                bobTime += delta * 12;
                handGroup.position.y = -0.4 + Math.sin(bobTime) * 0.05;
                handGroup.position.x = 0.5 + Math.cos(bobTime * 0.5) * 0.02;
            } else {
                handGroup.position.y = THREE.MathUtils.lerp(handGroup.position.y, -0.4, delta * 10);
                handGroup.position.x = THREE.MathUtils.lerp(handGroup.position.x, 0.5, delta * 10);
            }
            handGroup.position.z = -0.8;
            handGroup.rotation.set(0, 0, 0);
        }

        // Robot Follow Logic
        const targetPos = camera.position.clone();
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);

        const right = new THREE.Vector3().crossVectors(cameraDirection, camera.up).normalize();
        targetPos.addScaledVector(cameraDirection, -1.5);
        targetPos.addScaledVector(right, 1.2);
        targetPos.y += Math.sin(time * 0.002) * 0.2;

        robotGroup.position.lerp(targetPos, delta * 3);

        const lookTarget = camera.position.clone().addScaledVector(cameraDirection, 10);
        robotGroup.lookAt(lookTarget);

        world.update(delta, camera.position);
        boss.update(delta);
    }

    renderer.render(scene, camera);
    prevTime = time;
}

animate();

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
