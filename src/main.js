import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { state } from './state.js';
import { VoxelWorld } from './world.js';
import { Boss } from './boss.js';
import { Monster } from './monster.js';
import { Animal } from './animal.js';
import { openAIService } from './services/openai.js';
import { WeatherSystem } from './weather.js';
import { getItemIcon } from './item_icons.js';
import { getItemCanvas } from './item_icons.js';
import { DroppedItem } from './dropped_item.js';

// --- CONFIG ---
const MOVE_SPEED = 10.0;
const JUMP_FORCE = 5.0;
const GRAVITY = 15.0;
const FLY_SPEED = 30.0;

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
        if (currentHandMesh.material) {
            if (currentHandMesh.material.map) currentHandMesh.material.map.dispose();
            currentHandMesh.material.dispose();
        }
        if (currentHandMesh.geometry) currentHandMesh.geometry.dispose();
        currentHandMesh = null;
    }

    let currentItem = state.inventory[state.selectedSlot];
    if (currentItem && currentItem.count > 0) {
        lastItemHeldName = currentItem.name;
    } else if (!currentItem || currentItem.count === 0) {
        if (lastItemHeldName) {
            currentItem = { name: lastItemHeldName, count: 0 };
        }
    }

    if (currentItem && currentItem.name) {
        const canvas = getItemCanvas(currentItem.name);
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;

        const geometry = new THREE.PlaneGeometry(0.5, 0.5);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.05,
            side: THREE.DoubleSide,
            depthTest: false,
        });
        currentHandMesh = new THREE.Mesh(geometry, material);
        currentHandMesh.renderOrder = 999;
        currentHandMesh.rotation.set(-0.1, -Math.PI / 6, 0.08);
        handGroup.add(currentHandMesh);
    } else {
        // Bare fist
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
// Pre-generate a 3x3 grid around player to ensure stable collision on start
for (let cx = -1; cx <= 1; cx++) {
    for (let cz = -1; cz <= 1; cz++) {
        world.generateChunk(cx, cz);
    }
}
updateHandModel(); // Initialize hand now that we have state/world

// --- WEATHER SYSTEM ---
const weather = new WeatherSystem(scene);

// --- ENEMY SYSTEM ---
const boss = new Boss(scene, camera);
let bossSpawned = false;
let monsters = [];
let nextMonsterSpawn = 10;
let animals = [];
let nextAnimalSpawn = 10;
let droppedItems = [];
let gameMode = 'creative';

// Game Rules State
let worldTime = 'MORNING';
let timeCycleTimer = 0;
let enableMonstersSpawning = false;
let enableAnimalsSpawning = true;
let gravityEnabled = true;
let flyMode = false;

function initGameRules(mode) {
    worldTime = 'MORNING';
    timeCycleTimer = 0;
    gravityEnabled = true;
    flyMode = false;
    updateLighting();
    
    if (mode === 'survival') {
        enableAnimalsSpawning = true;
        enableMonstersSpawning = false;
    } else if (mode === 'creative') {
        enableAnimalsSpawning = true;
        enableMonstersSpawning = false;
    }
}

function updateLighting() {
    if (worldTime === 'MORNING') {
        ambientLight.intensity = 1.5;
        scene.background.setHex(0x87CEEB); // Sky blue
        scene.fog.color.setHex(0x87CEEB);
        sunLight.intensity = 2.0;
    } else {
        ambientLight.intensity = 0.4;
        scene.background.setHex(0x0a0a1a); // Night sky
        scene.fog.color.setHex(0x0a0a1a);
        sunLight.intensity = 0.2;
    }
}
function updateWeatherHUD() {
    const el = document.getElementById('weather-indicator');
    if (el) el.textContent = `${weather.getIcon()} ${weather.getStatus()}`;
}

// Init rules on start
initGameRules(gameMode);

// --- CONTROLS ---
// Use renderer.domElement for PointerLock target and add safe guards
const controls = new PointerLockControls(camera, renderer.domElement);
const startBtn = document.getElementById('start-btn');
const overlay = document.getElementById('overlay');

// --- MODE SELECTION ---
const modeTabs = document.querySelectorAll('.modal-tab');
const creativeInfo = document.getElementById('mode-creative-info');
const survivalInfo = document.getElementById('mode-survival-info');

modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        modeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        gameMode = tab.dataset.mode;
        
        initGameRules(gameMode);
        
        if (gameMode === 'creative') {
            creativeInfo.style.display = 'block';
            survivalInfo.style.display = 'none';
        } else {
            creativeInfo.style.display = 'none';
            survivalInfo.style.display = 'block';
        }
    });
});

// DEBUG: verify DOM & pointerlock flow
console.log('DEBUG: game-container exists?', !!document.getElementById('game-container'));
console.log('DEBUG: startBtn present?', !!startBtn, 'overlay present?', !!overlay);

if (controls) {
    controls.addEventListener('lock', () => console.log('DEBUG: pointer locked'));
    controls.addEventListener('unlock', () => console.log('DEBUG: pointer unlocked'));
} else {
    console.warn('DEBUG: controls not defined');
}

if (startBtn) {
    startBtn.addEventListener('click', (e) => {
        console.log('DEBUG: start button clicked (user gesture). Attempting pointer lock...');
        try { controls.lock(); } catch (err) { console.error('DEBUG: controls.lock() threw', err); }
    });
} else {
    console.warn('DEBUG: start button missing');
}

// TEMP fallback (testing): hide overlay and enable movement if pointer lock fails
startBtn?.addEventListener('click', () => {
    if (overlay) overlay.style.display = 'none';
    state.isPointerLocked = true;
    console.warn('TEMP: pointer lock fallback enabled (testing).');
});

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

var isAccessoriesMenuOpen = false;

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

// --- AGENT CONSOLE ---
const agentConsole = document.getElementById('agent-console');
const closeAgentBtn = document.getElementById('close-agent-btn');
const agentInput = document.getElementById('agent-input');
const agentHistory = document.getElementById('agent-history');

// Settings UI
const agentSettingsBtn = document.getElementById('agent-settings-btn');
const agentSettingsPanel = document.getElementById('agent-settings-panel');
const openaiApiKeyInput = document.getElementById('openai-api-key');
const openaiModelSelect = document.getElementById('openai-model');
const openaiTempInput = document.getElementById('openai-temp');
const openaiSaveBtn = document.getElementById('openai-save-btn');
const agentStatusIndicator = document.getElementById('agent-status-indicator');

var isAgentConsoleOpen = false;
var isSettingsOpen = false;

// Initialize OpenAI on load if ENV var is present
if (openAIService.init()) {
    agentStatusIndicator.classList.add('connected');
    agentStatusIndicator.title = "Connected to ChatGPT";
}

agentSettingsBtn.addEventListener('click', () => {
    isSettingsOpen = !isSettingsOpen;
    agentSettingsPanel.style.display = isSettingsOpen ? 'block' : 'none';
});

openaiSaveBtn.addEventListener('click', () => {
    const key = openaiApiKeyInput.value.trim();
    const model = openaiModelSelect.value;
    const temp = parseFloat(openaiTempInput.value);
    
    const connected = openAIService.init(key, model, temp);
    if (connected) {
        agentStatusIndicator.classList.add('connected');
        agentStatusIndicator.title = "Connected to ChatGPT";
        isSettingsOpen = false;
        agentSettingsPanel.style.display = 'none';
        appendAgentMessage("ChatGPT integration connected and ready.", false);
    } else {
        agentStatusIndicator.classList.remove('connected');
        agentStatusIndicator.title = "Disconnected from ChatGPT";
        appendAgentMessage("Error connecting to ChatGPT. Please check your API key.", false);
    }
});

function toggleAgentConsole() {
    isAgentConsoleOpen = !isAgentConsoleOpen;
    if (isAgentConsoleOpen) {
        controls.unlock();
        overlay.style.display = 'none';
        if (isAccessoriesMenuOpen) toggleAccessoriesMenu(); // Close accessories if open
        agentConsole.style.display = 'flex';
        setTimeout(() => agentInput.focus(), 50); // Focus input
    } else {
        agentConsole.style.display = 'none';
        agentInput.blur();
        controls.lock();
    }
}

closeAgentBtn.addEventListener('click', () => {
    if (isAgentConsoleOpen) toggleAgentConsole();
});

function appendAgentMessage(text, isPlayer = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = isPlayer ? 'agent-msg player-msg' : 'agent-msg';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = isPlayer ? 'player-name' : 'agent-name';
    nameSpan.textContent = isPlayer ? 'You:' : 'Agent:';
    
    msgDiv.appendChild(nameSpan);
    msgDiv.appendChild(document.createTextNode(' ' + text));
    
    agentHistory.appendChild(msgDiv);
    agentHistory.scrollTop = agentHistory.scrollHeight; // Auto-scroll
}

function createAgentStreamMessage(isPlayer = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = isPlayer ? 'agent-msg player-msg' : 'agent-msg';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = isPlayer ? 'player-name' : 'agent-name';
    nameSpan.textContent = isPlayer ? 'You:' : 'Agent:';
    
    const textNode = document.createTextNode(' ');
    
    msgDiv.appendChild(nameSpan);
    msgDiv.appendChild(textNode);
    
    agentHistory.appendChild(msgDiv);
    agentHistory.scrollTop = agentHistory.scrollHeight;
    
    return textNode;
}

async function parseAgentCommand(cmdString) {
    const args = cmdString.trim().split(/\s+/);
    if (args.length === 0 || args[0] === '') return;
    
    const command = args[0].toLowerCase();
    
    appendAgentMessage(cmdString, true);
    
    switch (command) {
        case 'help':
            appendAgentMessage("Available commands: 'give <item> [amount]', 'mode <creative|survival>', 'heal', 'start fly', 'end fly', 'weather <clear|rain|storm>', 'help'.");
            break;
        case 'heal':
            state.setHP(100);
            state.energy = 100; // Directly setting energy if setEnergy isn't exposed
            state.notify();
            appendAgentMessage("Vitals restored to 100%. Keep fighting, Captain!");
            break;
        case 'start':
            if (args.length > 1 && args[1].toLowerCase() === 'fly') {
                flyMode = true;
                gravityEnabled = false;
                appendAgentMessage("Flight mode activated! Use arrow keys to move in all directions. Speed: 30 units/sec!");
            } else {
                appendAgentMessage("Usage: start fly");
            }
            break;
        case 'end':
            if (args.length > 1 && args[1].toLowerCase() === 'fly') {
                flyMode = false;
                gravityEnabled = true;
                velocity.y = 0;
                appendAgentMessage("Flight mode deactivated. Welcome back to the ground, Captain.");
            } else {
                appendAgentMessage("Usage: end fly");
            }
            break;
        case 'kill':
            if (args.length > 1) {
                const target = args[1].toLowerCase();
                if (target === 'ios2' || target === 'ios-2' || target === 'boss') {
                    if (gameMode === 'survival' && boss.active) {
                        boss.takeDamage(10000); // Massive damage to instantly kill
                        appendAgentMessage("Target 'ios-2' has been eliminated by command override.");
                    } else {
                        appendAgentMessage("Target 'ios-2' is not active or you are not in survival mode.");
                    }
                } else if (target === 'all' || target === 'monsters') {
                    if (gameMode === 'survival') {
                        monsters.forEach(m => {
                            if (m.active) m.takeDamage(10000);
                        });
                        appendAgentMessage("All active monsters have been cleared.");
                    } else {
                        appendAgentMessage("You are not in survival mode.");
                    }
                } else {
                    appendAgentMessage(`Unknown target '${target}'. Try 'kill ios2' or 'kill all'.`);
                }
            } else {
                appendAgentMessage("Usage: kill <target> (e.g., 'kill ios2', 'kill all')");
            }
            break;
        case 'mode':
            if (args.length > 1) {
                const newMode = args[1].toLowerCase();
                if (newMode === 'creative' || newMode === 'survival') {
                    // Simulate clicking the tab
                    const tabId = newMode === 'creative' ? 'tab-creative' : 'tab-survival';
                    const tab = document.getElementById(tabId);
                    if (tab) {
                        tab.click();
                        appendAgentMessage(`Game mode switched to ${newMode.toUpperCase()}.`);
                        toggleAgentConsole(); // Close console after mode switch to show UI
                    } else {
                         appendAgentMessage(`Error switching to ${newMode}.`);
                    }
                } else {
                    appendAgentMessage("Unknown mode. Use 'creative' or 'survival'.");
                }
            } else {
                appendAgentMessage("Usage: mode <creative|survival>");
            }
            break;
        case 'weather':
            if (args.length > 1) {
                const wType = args[1].toLowerCase();
                if (['clear', 'rain', 'storm'].includes(wType)) {
                    weather.setWeather(wType, scene, ambientLight, sunLight);
                    updateWeatherHUD();
                    appendAgentMessage(`Weather changed to ${wType.toUpperCase()}. ${weather.getIcon()}`);
                } else {
                    appendAgentMessage("Usage: weather <clear|rain|storm>");
                }
            } else {
                appendAgentMessage(`Current weather: ${weather.getStatus()} ${weather.getIcon()}. Usage: weather <clear|rain|storm>`);
            }
            break;
        case 'give':
            if (args.length > 1) {
                let count = 1;
                // Check if last arg is a number
                if (!isNaN(parseInt(args[args.length - 1]))) {
                    count = parseInt(args.pop());
                }
                const itemName = args.slice(1).join(' '); // Rejoin the rest as item name
                
                // Capitalize first letter of each word to try to match item names
                const formattedName = itemName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                
                state.addResource(formattedName, count);
                appendAgentMessage(`Synthesized ${count}x ${formattedName}. Check your inventory.`);
            } else {
                appendAgentMessage("Usage: give <item> [amount]");
            }
            break;
        default:
            if (openAIService.isConnected()) {
                const textNode = createAgentStreamMessage(false);
                for await (const chunk of openAIService.streamMessage(cmdString)) {
                    textNode.nodeValue += chunk;
                    agentHistory.scrollTop = agentHistory.scrollHeight;
                }
            } else {
                appendAgentMessage(`Command not recognized: '${command}'. Type 'help' for commands, or configure ChatGPT Settings to chat.`);
            }
            break;
    }
}

agentInput.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
        parseAgentCommand(agentInput.value);
        agentInput.value = '';
    }
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
            const card = document.createElement('div');
            card.className = 'catalog-item';
            card.setAttribute('data-name', item.name);
            card.innerHTML = `<img class="mc-item-icon" src="${getItemIcon(item.name)}" alt="${item.name}">`;
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
    'Wooden Sword': '🗡️', 'Stone Sword': '⚔️', 'Iron Sword': '🔪', 'Diamond Sword': '💎',
    'Golden Sword': '✨', 'Netherite Sword': '🔥', 'Bow': '🏹', 'Crossbow': '🎯',
    'Trident': '🔱', 'Shield': '🛡️', 'Arrow': '➡️',
    // Tools
    'Wooden Pickaxe': '⛏️', 'Stone Pickaxe': '⛏️', 'Iron Pickaxe': '⚒️', 'Diamond Pickaxe': '💎',
    'Netherite Pickaxe': '🔥', 'Wooden Axe': '🪓', 'Iron Axe': '🪓', 'Diamond Axe': '💎',
    'Shovel': '🪣', 'Hoe': '🌾', 'Fishing Rod': '🎣', 'Shears': '✂️',
    'Flint and Steel': '🔥', 'Compass': '🧭', 'Clock': '🕐', 'Spyglass': '🔭',
    // Armor
    'Leather Helmet': '🪖', 'Iron Helmet': '⛑️', 'Diamond Helmet': '💎', 'Netherite Helmet': '🔥',
    'Iron Chestplate': '🦺', 'Diamond Chestplate': '💎', 'Elytra': '🦋',
    'Iron Leggings': '👖', 'Diamond Boots': '👢', 'Gold Armor': '👑', 'Turtle Shell': '🐢',
    // Blocks & Furniture
    'Red Bed': '🛏️', 'Blue Bed': '🛏️', 'White Bed': '🛏️', 'Yellow Bed': '🛏️',
    'Green Bed': '🛏️', 'Purple Bed': '🛏️', 'Black Bed': '🛏️', 'Pink Bed': '🛏️',
    'Orange Bed': '🛏️', 'Cyan Bed': '🛏️',
    'Chest': '📦', 'Ender Chest': '🟣', 'Trapped Chest': '⚠️',
    'Crafting Table': '🪵', 'Furnace': '🔥', 'Blast Furnace': '🔥', 'Smoker': '🍖',
    'Enchanting Table': '📖', 'Anvil': '⚙️', 'Grindstone': '⚙️', 'Smithing Table': '🔨',
    'Bookshelf': '📚', 'Cauldron': '🪣', 'Barrel': '🪣', 'Composter': '🌿',
    'Lectern': '📖', 'Cartography Table': '🗺️', 'Loom': '🧵', 'Stonecutter': '🪨',
    'Bed': '🛏️', 'Lantern': '🏮', 'Soul Lantern': '💙', 'Campfire': '🔥',
    'Jukebox': '🎵', 'Note Block': '🎵', 'Bell': '🔔', 'Flower Pot': '🌺',
    // Food
    'Apple': '🍎', 'Golden Apple': '🍏', 'Enchanted Golden Apple': '⭐',
    'Bread': '🍞', 'Cooked Chicken': '🍗', 'Cooked Beef': '🥩', 'Cooked Porkchop': '🥓',
    'Cooked Mutton': '🍖', 'Cooked Rabbit': '🍖', 'Cooked Cod': '🐟', 'Cooked Salmon': '🐟',
    'Cake': '🎂', 'Cookie': '🍪', 'Pumpkin Pie': '🥧', 'Melon Slice': '🍈',
    'Carrot': '🥕', 'Golden Carrot': '🌟', 'Potato': '🥔', 'Baked Potato': '🥔',
    'Beetroot': '🟣', 'Beetroot Soup': '🍲', 'Mushroom Stew': '🍲', 'Rabbit Stew': '🍲',
    'Suspicious Stew': '🍲', 'Honey Bottle': '🍯', 'Sweet Berries': '🫐', 'Dried Kelp': '🌿',
    'Glow Berries': '✨', 'Milk Bucket': '🥛',
    // Materials
    'Iron Ingot': '🔩', 'Gold Ingot': '🟡', 'Diamond': '💎', 'Emerald': '💚',
    'Netherite Ingot': '⬛', 'Copper Ingot': '🟠', 'Amethyst Shard': '🟣',
    'Lapis Lazuli': '🔵', 'Coal': '⚫', 'Redstone': '🔴', 'Quartz': '⬜',
    'Glowstone Dust': '💛', 'Blaze Rod': '🔥', 'Ender Eye': '👁️', 'Ghast Tear': '💧',
    'Slimeball': '🟢', 'Spider Eye': '🕷️', 'Gunpowder': '💥', 'String': '🧵',
    'Leather': '🟫', 'Wool': '🧶', 'Feather': '🪶', 'Bone': '🦴', 'Ink Sac': '⬛',
    // Potions
    'Health Potion': '❤️', 'Speed Potion': '💨', 'Strength Potion': '💪',
    'Fire Resist Potion': '🔥', 'Night Vision Potion': '👁️', 'Invisibility Potion': '👻',
    'Poison Potion': '☠️', 'Splash Potion': '💦', 'Exp Bottle': '🟢',
    'Slowness Potion': '🐢', 'Weakness Potion': '💔', 'Regeneration Potion': '💗',
    'Leaping Potion': '🦘', 'Water Breathing Potion': '🫧', 'Luck Potion': '🍀',
    // Special
    'Ender Pearl': '🟣', 'Eye of Ender': '👁️', 'Totem of Undying': '🗿',
    'Enchanted Book': '📖', 'Lead': '🪢', 'Name Tag': '🏷️', 'Firework': '🎆',
    'Map': '🗺️', 'Music Disc': '💿', 'TNT': '💥', 'Beacon': '🔆', 'Nether Star': '⭐',
    'Dragon Egg': '🥚', 'Nether Portal': '🌀', 'Saddle': '🐴', 'Horse Armor': '🐴',
    // Base blocks
    'Dirt': '🟫', 'Stone': '⬜', 'Wood': '🪵', 'Steel': '⚙️', 'Cores': '🔵', 'Grass': '🟩',
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
            const card = document.createElement('div');
            card.className = 'catalog-item';
            card.setAttribute('data-name', `${item.name} x${item.count}`);
            card.innerHTML = `<img class="mc-item-icon" src="${getItemIcon(item.name)}" alt="${item.name}"><span class="mc-item-count">${item.count}</span>`;
            card.onclick = () => state.equipItem(item);
            grid.appendChild(card);
        });
        return;
    }

    const items = filter === 'all' ? MINECRAFT_ITEMS : MINECRAFT_ITEMS.filter(i => i.cat === filter);
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'catalog-item';
        card.setAttribute('data-name', item.name);
        card.innerHTML = `<img class="mc-item-icon" src="${getItemIcon(item.name)}" alt="${item.name}">`;
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
let moveUp = false;
let moveDown = false;
let canJump = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

const onKeyDown = (event) => {
    if (document.activeElement === accessorySearch) {
        if (event.code === 'Enter') accessoryGetBtn.click();
        return;
    }
    
    if (document.activeElement === agentInput) {
        if (event.code === 'Escape') toggleAgentConsole();
        return;
    }

    switch (event.code) {
        case 'KeyW': toggleAccessoriesMenu(); break;
        case 'KeyT': 
        case 'Slash':
            event.preventDefault(); // Prevent '/' from typing immediately in the input
            toggleAgentConsole(); 
            break;
        case 'ArrowUp': moveForward = true; break;
        case 'ArrowDown': moveBackward = true; break;
        case 'ArrowLeft': moveLeft = true; break;
        case 'ArrowRight': moveRight = true; break;
        case 'Space': 
            if (flyMode) {
                moveUp = true;
            } else if (canJump === true) {
                velocity.y += JUMP_FORCE;
                canJump = false;
            }
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            if (flyMode) moveDown = true;
            break;
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
        case 'Space': moveUp = false; break;
        case 'ShiftLeft':
        case 'ShiftRight':
            moveDown = false;
            break;
    }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// --- COLLISION DETECTION ---
function checkCollision(newPos, playerRadius = 0.3) {
    const checkX = Math.round(newPos.x);
    const checkY = Math.round(newPos.y);
    const checkZ = Math.round(newPos.z);
    
    // Check a small box around the player
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
                const key = `${checkX + dx},${checkY + dy},${checkZ + dz}`;
                if (world.blocks.has(key)) {
                    return true; // Collision detected
                }
            }
        }
    }
    return false; // No collision
}

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

    // RIGHT-CLICK on a dropped item on the ground → pick it up
    if (event.button === 2) {
        const itemSprites = droppedItems.filter(d => d.active).map(d => d.sprite);
        const itemHits = raycaster.intersectObjects(itemSprites);
        if (itemHits.length > 0) {
            const hitSprite = itemHits[0].object;
            const dropped = droppedItems.find(d => d.sprite === hitSprite);
            if (dropped) {
                state.addResource(dropped.itemName, dropped.count);
                state.showHelperMsg(`Picked up ${dropped.itemName}!`);
                dropped.die();
            }
            return;
        }
    }

    // Check Boss Hit FIRST
    if (gameMode === 'survival' && boss.active && event.button === 0) {
        const attackIntersects = raycaster.intersectObject(boss.group, true);
        if (attackIntersects.length > 0) {
            boss.takeDamage(10);
            return;
        }
    }

    // Check Monsters Hit
    if (gameMode === 'survival' && event.button === 0) {
        for (const monster of monsters) {
            if (monster.active) {
                const attackIntersects = raycaster.intersectObject(monster.group, true);
                if (attackIntersects.length > 0) {
                    monster.takeDamage(10);
                    return;
                }
            }
        }
    }

    // Check Animals Hit
    if (event.button === 0) {
        for (const animal of animals) {
            if (animal.active) {
                const attackIntersects = raycaster.intersectObject(animal.group, true);
                if (attackIntersects.length > 0) {
                    animal.takeDamage(10);
                    return;
                }
            }
        }
    }

    const currentItem = state.inventory[state.selectedSlot];
    const baseBlocks = ['Dirt', 'Stone', 'Wood', 'Steel', 'Cores', 'Grass'];
    const isAccessory = currentItem && !baseBlocks.includes(currentItem.name) && currentItem.count > 0;

    // Right-click drops the accessory onto the ground
    if (isAccessory && event.button === 2) {
        const dropPos = camera.position.clone();
        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        dropPos.addScaledVector(fwd, 1.2);
        // Find ground beneath drop point
        const gx = Math.round(dropPos.x), gz = Math.round(dropPos.z);
        let groundY = dropPos.y - 1.5;
        for (let y = 15; y >= -15; y--) {
            if (world.blocks.has(`${gx},${y},${gz}`)) { groundY = y + 0.5; break; }
        }
        dropPos.y = groundY;
        droppedItems.push(new DroppedItem(scene, dropPos, currentItem.name, 1));
        state.showHelperMsg(`Dropped ${currentItem.name}!`);
        currentItem.count = Math.max(0, currentItem.count - 1);
        state.notify();
        return;
    }

    const intersects = raycaster.intersectObjects(world.getSurfaceObjects());

    if (intersects.length > 0) {
        const intersection = intersects[0];
        if (event.button === 0) { // LEFT CLICK: MINE
            world.mineBlock(intersection.object, intersection.point, intersection.face.normal);

            const dirtCount = state.inventory.find(i => i.name === 'Dirt')?.count || 0;
            if (gameMode === 'survival' && dirtCount >= 5 && !bossSpawned) {
                boss.activate();
                bossSpawned = true;
            }
        } else if (event.button === 2 && !isAccessory) { // RIGHT CLICK: PLACE on surface
            world.placeBlock(intersection.point, intersection.face.normal);
        }
    } else if (event.button === 2 && !isAccessory) {
        // RIGHT CLICK in empty air: place block at cursor reach (5 units)
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        const reach = camera.position.clone().addScaledVector(dir, 5);
        world.placeBlockAt(Math.round(reach.x), Math.round(reach.y), Math.round(reach.z));
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
        if (flyMode) {
            // Flight mode - no gravity, direct movement control with collision
            const flyDir = new THREE.Vector3();
            
            // Get local forward and right vectors of the camera in world space
            const camDir = new THREE.Vector3();
            camera.getWorldDirection(camDir);
            
            const camRight = new THREE.Vector3();
            camRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();

            // Accumulate directions based on camera orientation
            if (moveForward) flyDir.add(camDir);
            if (moveBackward) flyDir.sub(camDir);
            if (moveRight) flyDir.add(camRight);
            if (moveLeft) flyDir.sub(camRight);
            
            // Space/Shift go straight up/down along world Y axis
            if (moveUp) flyDir.y += 1.0;
            if (moveDown) flyDir.y -= 1.0;

            flyDir.normalize();

            // Calculate new position
            const newX = camera.position.x + (flyDir.x * FLY_SPEED * delta);
            const newY = camera.position.y + (flyDir.y * FLY_SPEED * delta);
            const newZ = camera.position.z + (flyDir.z * FLY_SPEED * delta);

            // Check collision before moving
            const newPos = new THREE.Vector3(newX, newY, newZ);
            if (!checkCollision(newPos)) {
                camera.position.copy(newPos);
            } else {
                // Try moving only in individual directions if full movement blocked
                const testX = new THREE.Vector3(newX, camera.position.y, camera.position.z);
                if (!checkCollision(testX)) {
                    camera.position.x = newX;
                }
                const testY = new THREE.Vector3(camera.position.x, newY, camera.position.z);
                if (!checkCollision(testY)) {
                    camera.position.y = newY;
                }
                const testZ = new THREE.Vector3(camera.position.x, camera.position.y, newZ);
                if (!checkCollision(testZ)) {
                    camera.position.z = newZ;
                }
            }
        } else {
            // Normal walking mode
            velocity.x -= velocity.x * 10.0 * delta;
            velocity.z -= velocity.z * 10.0 * delta;
            if (gravityEnabled) {
                velocity.y -= GRAVITY * delta;
            } else {
                // SLOW_FALL effect
                velocity.y -= (GRAVITY * 0.1) * delta;
                if (velocity.y < -2.0) velocity.y = -2.0;
            }

            direction.z = Number(moveForward) - Number(moveBackward);
            direction.x = Number(moveRight) - Number(moveLeft);
            direction.normalize();

            if (moveForward || moveBackward) velocity.z -= direction.z * MOVE_SPEED * 10.0 * delta;
            if (moveLeft || moveRight) velocity.x -= direction.x * MOVE_SPEED * 10.0 * delta;

            controls.moveRight(-velocity.x * delta);
            controls.moveForward(-velocity.z * delta);

            camera.position.y += (velocity.y * delta);

            // Ground Collision — check 4 corners of player footprint, search from feet down
            const px = camera.position.x, pz = camera.position.z;
            const pr = 0.28;
            const corners = [
                [Math.floor(px - pr), Math.floor(pz - pr)],
                [Math.floor(px + pr), Math.floor(pz - pr)],
                [Math.floor(px - pr), Math.floor(pz + pr)],
                [Math.floor(px + pr), Math.floor(pz + pr)],
            ];
            const searchTop = Math.floor(camera.position.y - 0.6); // start just below hips, never above
            let groundY = 0;
            for (const [gx, gz] of corners) {
                for (let y = searchTop; y >= -5; y--) {
                    if (world.blocks.has(`${gx},${y},${gz}`)) {
                        groundY = Math.max(groundY, y + 1.5);
                        break;
                    }
                }
            }

            if (camera.position.y < groundY) {
                velocity.y = 0;
                camera.position.y = groundY;
                canJump = true;
            }
            
            // HOLE_ZONE logic
            if (camera.position.y < -10 && gravityEnabled) {
                gravityEnabled = false;
                worldTime = 'NIGHT';
                updateLighting();
                state.showHelperMsg("Entered the HOLE_ZONE. Gravity disabled. Night descends...");
            } else if (camera.position.y >= -10 && !gravityEnabled) {
                gravityEnabled = true;
                state.showHelperMsg("Exited the HOLE_ZONE. Gravity restored.");
            }
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
            if (speed > 0.1 && canJump && !flyMode) {
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
        weather.update(delta, camera.position);
        
        // Time Cycle Logic
        if (camera.position.y >= -10) { // Don't process time cycles while in HOLE_ZONE
            timeCycleTimer += delta;
            if (timeCycleTimer >= 60) {
                if (gameMode === 'survival' && worldTime === 'MORNING') {
                    // ON_TIMER_COMPLETE (60 seconds)
                    worldTime = 'NIGHT';
                    enableAnimalsSpawning = false;
                    enableMonstersSpawning = true;
                    updateLighting();
                    weather.setWeather('storm', scene, ambientLight, sunLight);
                    updateWeatherHUD();
                    state.showHelperMsg("Night has fallen. A storm rages. Monsters are emerging.");
                } else if (gameMode === 'survival' && worldTime === 'NIGHT') {
                    worldTime = 'MORNING';
                    enableMonstersSpawning = false;
                    enableAnimalsSpawning = true;
                    updateLighting();
                    weather.setWeather('clear', scene, ambientLight, sunLight);
                    updateWeatherHUD();
                    state.showHelperMsg("Morning breaks. The storm has passed.");
                } else if (gameMode === 'creative') {
                    // EVERY 60 seconds: TOGGLE world.time
                    worldTime = worldTime === 'MORNING' ? 'NIGHT' : 'MORNING';
                    updateLighting();
                    if (worldTime === 'NIGHT') {
                        weather.setWeather('rain', scene, ambientLight, sunLight);
                    } else {
                        weather.setWeather('clear', scene, ambientLight, sunLight);
                    }
                    updateWeatherHUD();
                    state.showHelperMsg(worldTime === 'MORNING' ? "Morning breaks." : "Night falls.");
                }
                timeCycleTimer = 0; 
            }
        }
        
        if (gameMode === 'survival') {
            boss.update(delta);
        }
        
        // Spawning Logic
        if (enableMonstersSpawning) {
            nextMonsterSpawn -= delta;
            if (nextMonsterSpawn <= 0 && monsters.length < 15) {
                monsters.push(new Monster(scene, camera.position));
                nextMonsterSpawn = 5 + Math.random() * 8;
            }
        }
        
        if (enableAnimalsSpawning) {
            nextAnimalSpawn -= delta;
            if (nextAnimalSpawn <= 0 && animals.length < 10) {
                animals.push(new Animal(scene, camera.position));
                nextAnimalSpawn = 8 + Math.random() * 10;
            }
        }
        
        monsters.forEach(m => m.update(delta, camera.position, world));
        monsters = monsters.filter(m => {
            if (!m.active) return false;
            // Prune monsters that are too far away
            if (m.group.position.distanceTo(camera.position) > 80) {
                m.die();
                return false;
            }
            return true;
        });
        
        animals.forEach(a => a.update(delta, camera.position, world));
        animals = animals.filter(a => {
            if (!a.active) return false;
            // Prune animals that are too far away
            if (a.group.position.distanceTo(camera.position) > 80) {
                a.die();
                return false;
            }
            return true;
        });

        droppedItems.forEach(d => d.update(delta, camera.position, state));
        droppedItems = droppedItems.filter(d => d.active);
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
