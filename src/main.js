// v1.3.0 — sofa + chair furniture update
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
import { FURNITURE_NAMES, createFurnitureMesh } from './furniture.js';
import { buildCastle } from './castle_builder.js';
import { buildVillage } from './village_builder.js';

// --- CONFIG ---
const MOVE_SPEED = 4.3;
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
window.touchGameCamera = camera; // Shared only with the tablet swipe-look controls

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

const moonLight = new THREE.DirectionalLight(0x5577ff, 0.0);
moonLight.position.set(-50, -100, -50);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 1024;
moonLight.shadow.mapSize.height = 1024;
scene.add(moonLight);

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
let isGameOver = false;

// --- BED 3D MODEL SYSTEM ---
const BED_NAMES = new Set(['bed','red bed','blue bed','white bed','yellow bed','green bed','purple bed','black bed','pink bed','orange bed','cyan bed']);
const BED_COLOR_MAP = {
    red: 0xCC2020, blue: 0x2050CC, white: 0xE8E8E8, yellow: 0xD4C010,
    green: 0x208020, purple: 0x8020CC, black: 0x282828, pink: 0xE050A0,
    orange: 0xD45010, cyan: 0x10A0A0,
};
function getBedColor(itemName) {
    const n = itemName.toLowerCase();
    for (const [key, val] of Object.entries(BED_COLOR_MAP)) {
        if (n.includes(key)) return val;
    }
    return 0xCC2020; // default red
}
function createBedMesh(itemName) {
    const g = new THREE.Group();
    const frameMat  = new THREE.MeshStandardMaterial({ color: 0x7A5028, roughness: 0.85 });
    const legMat    = new THREE.MeshStandardMaterial({ color: 0x4A2010, roughness: 0.9  });
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xEFEFEF, roughness: 0.5  });
    const blanketMat= new THREE.MeshStandardMaterial({ color: getBedColor(itemName), roughness: 0.7 });
    // 4 legs  (y 0 → 0.2)
    const legGeo = new THREE.BoxGeometry(0.1, 0.2, 0.1);
    [[-0.38,-0.38],[0.38,-0.38],[-0.38,0.38],[0.38,0.38]].forEach(([x,z]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(x, 0.1, z);
        leg.castShadow = true;
        g.add(leg);
    });
    // Flat frame base  (y 0.2 → 0.32)
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.12, 0.88), frameMat);
    base.position.set(0, 0.26, 0); base.castShadow = true; g.add(base);
    // Headboard  (tall panel at -Z end)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.32, 0.08), frameMat);
    head.position.set(0, 0.38, -0.44); head.castShadow = true; g.add(head);
    // Footboard  (shorter panel at +Z end)
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.16, 0.07), frameMat);
    foot.position.set(0, 0.3, 0.44); foot.castShadow = true; g.add(foot);
    // Pillow  (head-end half)
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.65), pillowMat);
    pillow.position.set(-0.22, 0.355, 0); pillow.castShadow = true; g.add(pillow);
    // Blanket  (foot-end half)
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.09, 0.65), blanketMat);
    blanket.position.set(0.2, 0.355, 0); blanket.castShadow = true; g.add(blanket);
    return g;
}
let placedBeds = [];
function placeBed(point, normal, itemName) {
    // Find adjacent cell (same math as world.placeBlock)
    const hitX = Math.round(point.x - normal.x * 0.5);
    const hitY = Math.round(point.y - normal.y * 0.5);
    const hitZ = Math.round(point.z - normal.z * 0.5);
    const bx = hitX + Math.round(normal.x);
    const by = hitY + Math.round(normal.y);
    const bz = hitZ + Math.round(normal.z);
    const bed = createBedMesh(itemName);
    // Face toward the player (yaw only)
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    bed.rotation.y = Math.atan2(camDir.x, camDir.z);
    // Sit on top of the surface (block center is by, surface top is by-0.5)
    bed.position.set(bx, by - 0.5, bz);
    scene.add(bed);
    placedBeds.push(bed);
}

// --- DOOR 3D MODEL & INTERACTION SYSTEM ---
let placedDoors = [];
function createDoorMesh() {
    const doorGroup = new THREE.Group();
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.9 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, metalness: 0.8, roughness: 0.2 });
    
    const doorPanelGeo = new THREE.BoxGeometry(0.9, 2.0, 0.1);
    const doorPanelMesh = new THREE.Mesh(doorPanelGeo, doorMat);
    doorPanelMesh.position.set(0.45, 1.0, 0);
    doorPanelMesh.castShadow = true;
    doorPanelMesh.receiveShadow = true;
    doorGroup.add(doorPanelMesh);
    
    const handleGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const handleMesh = new THREE.Mesh(handleGeo, handleMat);
    handleMesh.position.set(0.75, 1.0, 0.08);
    doorGroup.add(handleMesh);
    
    const handleMeshBack = handleMesh.clone();
    handleMeshBack.position.z = -0.08;
    doorGroup.add(handleMeshBack);

    doorGroup.userData.isOpen = false;
    doorGroup.userData.itemName = 'door';
    doorGroup.userData.targetYRotation = 0;
    
    return doorGroup;
}

function placeDoor(bx, by, bz) {
    const door = createDoorMesh();
    door.position.set(bx - 0.5, by - 0.5, bz);
    
    door.userData.bx = bx;
    door.userData.by = by;
    door.userData.bz = bz;
    
    scene.add(door);
    placedDoors.push(door);
    placedFurniture.push(door);
    
    world.blocks.set(`${bx},${by},${bz}`, 'Door');
    world.blocks.set(`${bx},${by + 1},${bz}`, 'Door');
}

function placeDoorAtPoint(point, normal) {
    const hitX = Math.round(point.x - normal.x * 0.5);
    const hitY = Math.round(point.y - normal.y * 0.5);
    const hitZ = Math.round(point.z - normal.z * 0.5);
    const bx = hitX + Math.round(normal.x);
    const by = hitY + Math.round(normal.y);
    const bz = hitZ + Math.round(normal.z);
    placeDoor(bx, by, bz);
}

function droppedItemMeshFactory(itemName) {
    const n = itemName.toLowerCase();
    const nameMap = {
        'stone': 'Stone', 'dirt': 'Dirt', 'grass': 'Grass',
        'wood': 'Wood', 'leaves': 'Leaves', 'steel': 'Steel',
        'snowgrass': 'SnowGrass', 'snowstone': 'SnowStone',
        'water': 'Water'
    };
    
    if (nameMap[n]) {
        const mat = world.materials[nameMap[n]];
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }
    
    if (FURNITURE_NAMES.has(n)) {
        try {
            const mesh = createFurnitureMesh(itemName);
            mesh.scale.set(0.35, 0.35, 0.35);
            return mesh;
        } catch(e) {}
    }
    
    if (BED_NAMES.has(n) || n.includes('bed')) {
        try {
            const mesh = createBedMesh(itemName);
            mesh.scale.set(0.35, 0.35, 0.35);
            return mesh;
        } catch(e) {}
    }
    
    if (n === 'door' || n === 'oak door') {
        try {
            const mesh = createDoorMesh();
            mesh.scale.set(0.35, 0.35, 0.35);
            return mesh;
        } catch(e) {}
    }
    
    const canvas = getItemCanvas(itemName);
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    const material = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        roughness: 0.5
    });
    const geometry = new THREE.PlaneGeometry(0.45, 0.45);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
}

// --- FURNITURE 3D MODEL SYSTEM ---
let placedFurniture = [];
function placeFurniture(point, normal, itemName) {
    const hitX = Math.round(point.x - normal.x * 0.5);
    const hitY = Math.round(point.y - normal.y * 0.5);
    const hitZ = Math.round(point.z - normal.z * 0.5);
    const bx = hitX + Math.round(normal.x);
    const by = hitY + Math.round(normal.y);
    const bz = hitZ + Math.round(normal.z);
    const mesh = createFurnitureMesh(itemName);
    mesh.userData.itemName = itemName;
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    mesh.rotation.y = Math.atan2(camDir.x, camDir.z);
    mesh.position.set(bx, by - 0.5, bz);
    mesh.traverse(m => { if (m.isMesh) m.castShadow = true; });
    scene.add(mesh);
    placedFurniture.push(mesh);
}

// --- FURNITURE INTERACTION SYSTEM ---
let isSitting   = false;   // player is seated on chair/sofa
let seatMesh    = null;    // the furniture mesh being sat on
let isSleeping  = false;   // player is sleeping in a bed

// Book overlay — created once
// Full pool of entries — 5 random ones are picked each time you open a bookshelf
const ALL_BOOK_ENTRIES = [
    // ── World Lore ──
    { title: "The First Block",           text: "In the beginning there was nothing but stone and dirt. The first builders shaped the land with their bare hands, carving mountains and valleys from the endless grey..." },
    { title: "The Night Creatures",       text: "As night fell for the first time, shadowy creatures crawled from the darkness. The builders learned quickly: build high, stay lit, survive until morning." },
    { title: "The Ancient Boss",          text: "Deep beneath the earth lives an ancient evil. It stirs when five blocks of earth are torn from the ground. Nobody who has woken it has lived to tell the full tale." },
    { title: "The Age of Crafters",       text: "With steel in hand and stone at their feet, a new generation of builders rose. They crafted not just shelters, but entire cities — monuments to their will to survive." },
    { title: "The Endless World",         text: "No story truly ends here. Every block placed is a new sentence. Every night survived is a new chapter. The world is yours to write." },
    { title: "Legend of the Storm",       text: "Every night in survival, the sky cracks open and a storm rages. The monsters grow bolder in the rain. Old builders say the storm feeds them — makes them stronger, faster, angrier." },
    { title: "The Dragon's Egg",          text: "There is said to be a single dragon egg hidden in the world. Those who find it never speak of what they saw afterwards. The egg is always warm to the touch." },
    // ── Survival Tips ──
    { title: "Tip: Stay Lit",             text: "Monsters only spawn in darkness. Keep your base well-lit with lanterns or campfires. A single dark corner is all they need to appear." },
    { title: "Tip: Watch the Sky",        text: "When the sky turns dark blue and the music shifts — night is coming. You have about 60 seconds before the monsters emerge. Use that time wisely." },
    { title: "Tip: Sleep Early",          text: "A bed placed before nightfall is worth a hundred swords. Sleeping skips the dangerous hours and restores your health and energy. Rest is not weakness — it is strategy." },
    { title: "Tip: Dig Carefully",        text: "Mining downward rewards you with stone and resources — but go too deep and gravity fails you. Always keep a torch and a clear path back to the surface." },
    { title: "Tip: The Boss",             text: "Mine five pieces of dirt and the boss awakens. Fight it to claim its reward. But be warned — it will hunt you relentlessly until one of you falls." },
    { title: "Tip: Crafting Steel",       text: "Steel cannot be found in the world — it must be forged. Gather 3 Stone and press C at any time to craft a Steel ingot. Steel opens doors Stone never could." },
    { title: "Tip: Collect Furniture",    text: "Left-clicking placed furniture picks it back up. Nothing is permanent — rearrange your home as often as you like. Builders call this 'creative destruction'." },
    { title: "Tip: Fly in Creative",      text: "In creative mode, double-tap Space to toggle flight. Use Space to rise, Shift to descend. The world looks very different from above." },
    // ── Nature & Science Facts ──
    { title: "Did You Know? Diamonds",    text: "Real diamonds form under enormous pressure about 100 miles below Earth's surface. They are carried upward by volcanic eruptions in formations called kimberlite pipes." },
    { title: "Did You Know? Lightning",   text: "A single bolt of lightning is five times hotter than the surface of the Sun — roughly 30,000 Kelvin. It lasts less than a second but can travel 5 miles." },
    { title: "Did You Know? Stone",       text: "Granite, the most common building stone, takes millions of years to form as magma cools slowly underground. The stone beneath your feet is older than life itself." },
    { title: "Did You Know? Forests",     text: "A single mature oak tree can absorb about 48 pounds of carbon dioxide per year and produces enough oxygen for two people to breathe for a full day." },
    { title: "Did You Know? The Moon",    text: "The Moon moves about 1.5 inches further from Earth every year. When it formed 4.5 billion years ago, it was 14 times closer — and nights would have been blindingly bright." },
    { title: "Did You Know? Caves",       text: "The world's longest cave system is Mammoth Cave in Kentucky, USA — over 400 miles of mapped passages. Scientists believe at least 600 more miles remain unexplored." },
    { title: "Did You Know? Iron",        text: "Iron is the most abundant element on Earth by mass. The Earth's core is mostly iron and nickel. Without it, our planet would have no magnetic field and no protection from solar wind." },
    { title: "Did You Know? Water",       text: "Water is the only natural substance found in all three states — solid, liquid, and gas — at temperatures naturally occurring on Earth's surface." },
    { title: "Did You Know? Sand",        text: "Sand is one of the world's most consumed natural resources after water. It takes thousands of years for rocks to erode into sand grains fine enough to build with." },
    { title: "Did You Know? Stars",       text: "When you look at a star in the night sky, you are seeing light that left it years, decades, or even thousands of years ago. Some stars you see no longer exist." },
    // ── Crafting & Building Lore ──
    { title: "The Art of Building",       text: "The greatest builders did not plan their creations — they listened to the land. They built around hills, over rivers, beneath cliffs. Let the world guide your hand." },
    { title: "On Wood",                   text: "Every type of wood tells a different story. Oak speaks of endurance. Birch of lightness. Dark Oak of mystery. Choose your materials the way a writer chooses words." },
    { title: "On Stone",                  text: "Stone is the language of permanence. Civilizations are remembered by what they built in stone. What will yours say?" },
    { title: "Furniture & Memory",        text: "A chair placed by a window. A bookshelf beside a bed. These small arrangements turn four walls into a home. Objects carry memory — place them with intention." },
    { title: "The Campfire Circle",       text: "Before there were walls, there was the campfire. Builders would gather around its warmth, sharing knowledge and stories. The campfire is the oldest piece of furniture." },
    // ── Fun & Philosophical ──
    { title: "A Thought on Monsters",     text: "Perhaps the monsters are not evil — only afraid. They emerge in darkness, searching for what builders have: warmth, light, a place to call home. We fear what we share." },
    { title: "On Survival",               text: "Survival is not the absence of danger. It is the presence of will. Every morning you see is a victory. Every shelter you raise is a declaration: I am still here." },
    { title: "On Rest",                   text: "The greatest builders knew that rest is part of building. A tired mind places crooked walls. Sleep, and you see your creation clearly again in the morning light." },
    { title: "The Builder's Creed",       text: "We build not because we must, but because we can imagine something that doesn't yet exist — and refuse to leave it that way." },
    { title: "On Exploration",            text: "Every unexplored corner of the map holds something. It may be danger. It may be beauty. It is almost always both. Walk further than you planned." },
    { title: "Time",                      text: "Days and nights cycle whether you act or not. Time does not wait for the builder who is still deciding. The question is never when — it is always what will you do with it now." },
    { title: "Mystery of the Ender Pearl", text: "Nobody knows where Ender Pearls come from, or what lies on the other side of each throw. Some say they are windows to alternate worlds. Others say they are just rocks. Both may be right." },
    { title: "Last Entry",                text: "Whoever wrote these pages is gone now. But their words remain — pressed into paper, preserved on shelves, waiting for someone who would stop, sit down, and read. That someone is you." },
];

let currentBookPages = [];
let bookPageIndex = 0;

// DOM refs — set once when overlay is created
let bookTitleEl = null, bookTextEl = null, bookPageNumEl = null;

function renderPage() {
    if (!currentBookPages.length) return;
    const p = currentBookPages[bookPageIndex];
    bookTitleEl.textContent    = p.title;
    bookTextEl.textContent     = p.text;
    bookPageNumEl.textContent  = `${bookPageIndex + 1} / ${currentBookPages.length}`;
}

function createBookOverlay() {
    const el = document.createElement('div');
    el.id = 'book-overlay';
    // Use el.style directly — no duplicate display values
    el.style.display         = 'none';
    el.style.position        = 'fixed';
    el.style.inset           = '0';
    el.style.zIndex          = '2000';
    el.style.background      = 'rgba(0,0,0,0.75)';
    el.style.alignItems      = 'center';
    el.style.justifyContent  = 'center';

    el.innerHTML = `
        <div style="
            background:linear-gradient(135deg,#f5e6c8,#e8d5a0);
            border:4px solid #8B5E2A; border-radius:8px;
            width:440px; max-width:90vw; padding:32px 36px;
            box-shadow:0 8px 40px rgba(0,0,0,0.7);
            font-family:'Georgia',serif; color:#3a2000;
            position:relative;
        ">
            <div style="font-size:11px;opacity:0.6;margin-bottom:8px;letter-spacing:1px;">📖 BOOKSHELF — ANCIENT TOME</div>
            <h2 class="bk-title" style="margin:0 0 16px;font-size:20px;border-bottom:2px solid #8B5E2A;padding-bottom:10px;"></h2>
            <p  class="bk-text"  style="line-height:1.8;font-size:15px;margin:0 0 24px;min-height:100px;"></p>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <button class="bk-prev" style="padding:8px 18px;background:#8B5E2A;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;">◀ Prev</button>
                <span class="bk-num" style="font-size:12px;opacity:0.7;"></span>
                <button class="bk-next" style="padding:8px 18px;background:#8B5E2A;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;">Next ▶</button>
            </div>
            <button class="bk-close" style="
                position:absolute;top:12px;right:14px;
                background:none;border:none;font-size:22px;
                cursor:pointer;color:#8B5E2A;font-weight:bold;
            ">✕</button>
        </div>
    `;
    document.body.appendChild(el);

    // Store refs by class — no getElementById conflicts
    bookTitleEl   = el.querySelector('.bk-title');
    bookTextEl    = el.querySelector('.bk-text');
    bookPageNumEl = el.querySelector('.bk-num');

    el.querySelector('.bk-prev').onclick  = () => { bookPageIndex = (bookPageIndex - 1 + currentBookPages.length) % currentBookPages.length; renderPage(); };
    el.querySelector('.bk-next').onclick  = () => { bookPageIndex = (bookPageIndex + 1) % currentBookPages.length; renderPage(); };
    el.querySelector('.bk-close').onclick = closeBook;

    return el;
}
let bookOverlay = null;

function openBook() {
    // 1. Pick 5 random entries first
    const shuffled = [...ALL_BOOK_ENTRIES].sort(() => Math.random() - 0.5);
    currentBookPages = shuffled.slice(0, 5);
    bookPageIndex = 0;
    // 2. Create overlay if first time (DOM refs get set inside)
    if (!bookOverlay) bookOverlay = createBookOverlay();
    // 3. Render the first page
    renderPage();
    // 4. Show overlay
    bookOverlay.style.display = 'flex';
    controls.unlock();
}
function closeBook() {
    if (bookOverlay) bookOverlay.style.display = 'none';
    controls.lock();
}

// Sleep fade overlay
function doSleep() {
    if (isSleeping) return;
    isSleeping = true;
    const fade = document.createElement('div');
    fade.style.cssText = `position:fixed;inset:0;background:#000;opacity:0;z-index:1999;pointer-events:none;transition:opacity 1.5s ease;`;
    document.body.appendChild(fade);
    requestAnimationFrame(() => { fade.style.opacity = '1'; });
    setTimeout(() => {
        // Skip to morning
        timeOfDay = 0.075;
        enableMonstersSpawning = false;
        enableAnimalsSpawning  = true;
        updateLighting(1.0);
        weather.setWeather('clear', scene, ambientLight, sunLight);
        updateWeatherHUD();
        // Restore HP & energy
        state.hp     = Math.min(100, state.hp + 40);
        state.energy = Math.min(100, state.energy + 60);
        state.notify();
        // Fade back in
        fade.style.opacity = '0';
        setTimeout(() => { document.body.removeChild(fade); isSleeping = false; }, 1500);
        state.showHelperMsg('You slept through the night. Morning! HP and energy restored.');
    }, 1800);
}

// Sit / stand logic
function sitOn(mesh) {
    if (isSitting) return;
    isSitting = true;
    seatMesh  = mesh;
    // Snap camera to seated position above the mesh
    const pos = mesh.position;
    camera.position.set(pos.x, pos.y + 0.95, pos.z);
    velocity.set(0, 0, 0);
    state.showHelperMsg('Sitting — press E or Space to stand up');
}
function standUp() {
    if (!isSitting) return;
    isSitting = false;
    camera.position.y += 0.6; // nudge up so you don't clip the seat
    seatMesh = null;
    state.showHelperMsg('You stood up.');
}

// Main interaction dispatcher — called on right-click on placed furniture
function interactFurniture(mesh) {
    const name = (mesh.userData.itemName || '').toLowerCase();
    if (name === 'door') {
        const isOpen = !mesh.userData.isOpen;
        mesh.userData.isOpen = isOpen;
        mesh.userData.targetYRotation = isOpen ? Math.PI / 2 : 0;
        
        const bx = mesh.userData.bx;
        const by = mesh.userData.by;
        const bz = mesh.userData.bz;
        if (isOpen) {
            world.blocks.delete(`${bx},${by},${bz}`);
            world.blocks.delete(`${bx},${by + 1},${bz}`);
        } else {
            world.blocks.set(`${bx},${by},${bz}`, 'Door');
            world.blocks.set(`${bx},${by + 1},${bz}`, 'Door');
        }
        
        state.showHelperMsg(isOpen ? "Opened door." : "Closed door.");
    } else if (name.includes('chair') || name.includes('sofa')) {
        if (isSitting) { standUp(); }
        else           { sitOn(mesh); }
    } else if (name.includes('bookshelf')) {
        openBook();
    } else if (name.includes('bed') || BED_NAMES.has(name)) {
        if (worldTime === 'NIGHT' || gameMode === 'creative') {
            doSleep();
        } else {
            state.showHelperMsg('You can only sleep at night!');
        }
    } else {
        state.showHelperMsg(`You examine the ${mesh.userData.itemName}.`);
    }
}


// Game Rules State
let worldTime = 'MORNING';
let timeOfDay = 0.2; // 0.0 to 1.0 cycle (0.2 is morning)
let enableMonstersSpawning = false;
let enableAnimalsSpawning = true;
let gravityEnabled = true;
let flyMode = false;

// Color gradients for different times of day
const skyColorDay = new THREE.Color(0x87CEEB);     // Sky blue
const skyColorSunset = new THREE.Color(0xe06030);  // Sunset Orange
const skyColorNight = new THREE.Color(0x050510);   // Dark night sky

function initGameRules(mode) {
    timeOfDay = 0.2;
    gravityEnabled = true;
    flyMode = false;
    updateLighting(1.0);
    state.gameMode = mode;
    
    if (mode === 'survival') {
        enableAnimalsSpawning = true;
        enableMonstersSpawning = false;
    } else if (mode === 'creative') {
        enableAnimalsSpawning = true;
        enableMonstersSpawning = false;
    }
}

function updateLighting(delta) {
    // Increment timeOfDay. Cycle takes 1200 seconds (20 real minutes).
    // Allow passing delta=1.0 to snap time instantly (e.g. commands/sleep/clicks)
    if (delta > 0.0 && delta < 1.0) {
        timeOfDay += delta / 1200.0;
        if (timeOfDay >= 1.0) timeOfDay -= 1.0;
    }

    // Piecewise map timeOfDay to sun angle theta (0 to 2*PI)
    // 0.0 to 0.65 is above horizon (Sunrise + Day + Sunset = 13 mins = 65% of cycle)
    // 0.65 to 1.0 is below horizon (Night = 7 mins = 35% of cycle)
    let theta;
    if (timeOfDay <= 0.65) {
        theta = (timeOfDay / 0.65) * Math.PI;
    } else {
        theta = Math.PI + ((timeOfDay - 0.65) / 0.35) * Math.PI;
    }

    const radius = 120;
    sunLight.position.set(radius * Math.cos(theta), radius * Math.sin(theta), 30);
    moonLight.position.set(-radius * Math.cos(theta), -radius * Math.sin(theta), -30);

    let targetAmbientIntensity = 0.4;
    let targetSunIntensity = 0.0;
    let targetMoonIntensity = 0.0;
    let targetSkyColor = new THREE.Color();
    let currentPhase = 'DAY';

    // Phase identification based on Minecraft timeline
    if (timeOfDay >= 0.075 && timeOfDay < 0.575) {
        // Full Day (10 minutes)
        currentPhase = 'DAY';
        targetAmbientIntensity = 1.4;
        targetSunIntensity = 2.0;
        targetMoonIntensity = 0.0;
        targetSkyColor.copy(skyColorDay);
    } else if (timeOfDay < 0.075) {
        // Sunrise (1.5 minutes)
        currentPhase = 'SUNRISE';
        const t = timeOfDay / 0.075; // 0.0 to 1.0
        targetAmbientIntensity = THREE.MathUtils.lerp(0.3, 1.4, t);
        targetSunIntensity = THREE.MathUtils.lerp(0.0, 2.0, t);
        targetMoonIntensity = THREE.MathUtils.lerp(0.6, 0.0, t);
        if (t < 0.5) {
            targetSkyColor.lerpColors(skyColorNight, skyColorSunset, t * 2.0);
        } else {
            targetSkyColor.lerpColors(skyColorSunset, skyColorDay, (t - 0.5) * 2.0);
        }
    } else if (timeOfDay >= 0.575 && timeOfDay < 0.65) {
        // Sunset (1.5 minutes)
        currentPhase = 'SUNSET';
        const t = (timeOfDay - 0.575) / 0.075; // 0.0 to 1.0
        targetAmbientIntensity = THREE.MathUtils.lerp(1.4, 0.3, t);
        targetSunIntensity = THREE.MathUtils.lerp(2.0, 0.0, t);
        targetMoonIntensity = THREE.MathUtils.lerp(0.0, 0.6, t);
        if (t < 0.5) {
            targetSkyColor.lerpColors(skyColorDay, skyColorSunset, t * 2.0);
        } else {
            targetSkyColor.lerpColors(skyColorSunset, skyColorNight, (t - 0.5) * 2.0);
        }
    } else {
        // Night (7 minutes)
        currentPhase = 'NIGHT';
        targetAmbientIntensity = 0.3;
        targetSunIntensity = 0.0;
        targetMoonIntensity = 0.6;
        targetSkyColor.copy(skyColorNight);
    }

    // Apply lighting intensities
    const lerpFactor = delta >= 1.0 ? 1.0 : delta * 2.0;
    ambientLight.intensity = THREE.MathUtils.lerp(ambientLight.intensity, targetAmbientIntensity, lerpFactor);
    sunLight.intensity = THREE.MathUtils.lerp(sunLight.intensity, targetSunIntensity, lerpFactor);
    moonLight.intensity = THREE.MathUtils.lerp(moonLight.intensity, targetMoonIntensity, lerpFactor);

    // Apply background and fog colors
    const lerpedSkyColor = new THREE.Color();
    lerpedSkyColor.lerpColors(scene.background, targetSkyColor, lerpFactor);
    scene.background.copy(lerpedSkyColor);
    scene.fog.color.copy(lerpedSkyColor);

    // Sync worldTime state variable for game loop spawning logic
    const prevWorldTime = worldTime;
    worldTime = (currentPhase === 'NIGHT') ? 'NIGHT' : 'MORNING';

    if (worldTime === 'NIGHT') {
        enableAnimalsSpawning = false;
        enableMonstersSpawning = true;
    } else {
        enableAnimalsSpawning = true;
        enableMonstersSpawning = false;
    }

    // Trigger state message on dawn/dusk transitions
    if (worldTime !== prevWorldTime) {
        if (worldTime === 'NIGHT') {
            if (gameMode === 'survival') {
                weather.setWeather('storm', scene, ambientLight, sunLight);
                state.showHelperMsg("Night falls. A storm rages. Monsters emerge.");
            } else {
                weather.setWeather('rain', scene, ambientLight, sunLight);
                state.showHelperMsg("Night falls.");
            }
        } else {
            weather.setWeather('clear', scene, ambientLight, sunLight);
            state.showHelperMsg("Morning breaks. The storm has passed.");
        }
        updateWeatherHUD();
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
    if (isGameOver) return;
    if (overlay && !isAccessoriesMenuOpen) {
        overlay.style.display = 'flex';
    }
});

// --- GAME OVER SYSTEM ---
state.onGameOver = () => {
    isGameOver = true;
    controls.unlock();
    const gameOverOverlay = document.getElementById('game-over-overlay');
    if (gameOverOverlay) {
        gameOverOverlay.style.display = 'flex';
    }
};

const respawnBtn = document.getElementById('respawn-btn');
if (respawnBtn) {
    respawnBtn.addEventListener('click', () => {
        isGameOver = false;
        const gameOverOverlay = document.getElementById('game-over-overlay');
        if (gameOverOverlay) {
            gameOverOverlay.style.display = 'none';
        }
        state.hp = 100;
        state.energy = 100;
        state.notify();
        camera.position.set(0, 15, 0);
        try { controls.lock(); } catch (err) { console.error(err); }
    });
}

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

// Settings & ChatGPT Auth UI
const agentSettingsBtn = document.getElementById('agent-settings-btn');
const agentSettingsPanel = document.getElementById('agent-settings-panel');
const openaiModelSelect = document.getElementById('openai-model');
const openaiTempInput = document.getElementById('openai-temp');
const openaiSaveBtn = document.getElementById('openai-save-btn');
const agentStatusIndicator = document.getElementById('agent-status-indicator');

// ChatGPT Auth buttons
const chatgptSigninBtn = document.getElementById('chatgpt-signin-btn');
const chatgptSignoutBtn = document.getElementById('chatgpt-signout-btn');
const chatgptUserInfo = document.getElementById('chatgpt-user-info');
const chatgptUserEmail = document.getElementById('chatgpt-user-email');

// ChatGPT Login Modal Elements
const chatgptLoginModal = document.getElementById('chatgpt-login-modal');
const closeLoginBtn = document.getElementById('close-login-btn');
const chatgptEmailInput = document.getElementById('chatgpt-email');
const chatgptPasswordInput = document.getElementById('chatgpt-password');
const chatgptContinueBtn = document.getElementById('chatgpt-login-continue-btn');
const chatgptLoginFormContainer = document.getElementById('chatgpt-login-form-container');
const chatgptAuthLoading = document.getElementById('chatgpt-auth-loading');
const chatgptLoadingText = document.getElementById('chatgpt-loading-text');
const chatgptOauthBtns = document.querySelectorAll('.chatgpt-oauth-btn');

var isAgentConsoleOpen = false;
var isSettingsOpen = false;

function updateAuthUI() {
    if (openAIService.isConnected()) {
        agentStatusIndicator.classList.add('connected');
        agentStatusIndicator.title = "Connected to ChatGPT";
        chatgptSigninBtn.style.display = 'none';
        chatgptUserInfo.style.display = 'flex';
        chatgptUserEmail.textContent = openAIService.userEmail || "captain@openai.com";
    } else {
        agentStatusIndicator.classList.remove('connected');
        agentStatusIndicator.title = "Disconnected from ChatGPT";
        chatgptSigninBtn.style.display = 'block';
        chatgptUserInfo.style.display = 'none';
    }
}

// Initial UI sync
updateAuthUI();

agentSettingsBtn.addEventListener('click', () => {
    isSettingsOpen = !isSettingsOpen;
    agentSettingsPanel.style.display = isSettingsOpen ? 'block' : 'none';
});

// Save non-credentials settings
openaiSaveBtn.addEventListener('click', () => {
    const model = openaiModelSelect.value;
    const temp = parseFloat(openaiTempInput.value);
    
    openAIService.init(null, model, temp);
    isSettingsOpen = false;
    agentSettingsPanel.style.display = 'none';
    appendAgentMessage("Settings saved successfully.", false);
});

// Sign-in flow triggers
chatgptSigninBtn.addEventListener('click', () => {
    chatgptLoginModal.style.display = 'flex';
    chatgptLoginFormContainer.style.display = 'block';
    chatgptAuthLoading.style.display = 'none';
});

closeLoginBtn.addEventListener('click', () => {
    chatgptLoginModal.style.display = 'none';
});

chatgptSignoutBtn.addEventListener('click', () => {
    openAIService.setLoggedOut();
    updateAuthUI();
    appendAgentMessage("Signed out of ChatGPT. Using offline mode.", false);
});

// Simulate ChatGPT authentication
function triggerMockAuth(email) {
    chatgptLoginFormContainer.style.display = 'none';
    chatgptAuthLoading.style.display = 'block';
    
    chatgptLoadingText.textContent = "Connecting to ChatGPT auth...";
    
    setTimeout(() => {
        chatgptLoadingText.textContent = "Verifying secure session...";
    }, 500);

    setTimeout(() => {
        chatgptLoadingText.textContent = "Authentication successful!";
    }, 1000);

    setTimeout(() => {
        openAIService.setLoggedIn(email);
        updateAuthUI();
        chatgptLoginModal.style.display = 'none';
        appendAgentMessage("Logged in to ChatGPT successfully. Companion core synchronized!", false);
    }, 1500);
}

chatgptContinueBtn.addEventListener('click', () => {
    const email = chatgptEmailInput.value.trim() || "explorer@openai.com";
    triggerMockAuth(email);
});

chatgptOauthBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        let provider = "Google";
        if (btn.classList.contains('microsoft-btn')) provider = "Microsoft";
        if (btn.classList.contains('apple-btn')) provider = "Apple";
        
        triggerMockAuth(`user_via_${provider.toLowerCase()}@openai.com`);
    });
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
    let cleanCmd = cmdString.trim();
    if (cleanCmd.startsWith('/')) {
        cleanCmd = cleanCmd.slice(1);
    }
    const args = cleanCmd.split(/\s+/);
    if (args.length === 0 || args[0] === '') return;
    
    const command = args[0].toLowerCase();
    
    appendAgentMessage(cmdString, true);
    
    switch (command) {
        case 'help':
            appendAgentMessage("Available commands: 'give <item> [amount]', 'mode <creative|survival>', 'heal', 'start fly', 'end fly', 'weather <clear|rain|storm>', 'build house', 'build castle', 'build village', 'help'.");
            break;
        case 'build':
            if (args.length > 1 && args[1].toLowerCase() === 'castle') {
                buildCastle({ camera, world, velocity, appendMessage: appendAgentMessage, scene, createBedMesh, placedBeds });
            } else if (args.length > 1 && args[1].toLowerCase() === 'village') {
                buildVillage({ camera, world, velocity, appendMessage: appendAgentMessage, scene, createBedMesh, placedBeds });
            } else if (args.length > 1 && args[1].toLowerCase() === 'house') {
                const lookDir = new THREE.Vector3();
                camera.getWorldDirection(lookDir);
                lookDir.y = 0;
                lookDir.normalize();
                
                if (lookDir.lengthSq() < 0.01) {
                    lookDir.set(0, 0, -1);
                }
                
                const distance = 5;
                const centerX = Math.round(camera.position.x + lookDir.x * distance);
                const centerZ = Math.round(camera.position.z + lookDir.z * distance);
                const centerY = Math.round(camera.position.y - 1.5);
                
                const chunksToUpdate = new Set();
                const setBlockHelper = (x, y, z, type) => {
                    world.setBlock(x, y, z, type);
                    const cx = Math.floor(x / world.chunkSize);
                    const cz = Math.floor(z / world.chunkSize);
                    chunksToUpdate.add(`${cx},${cz}`);
                };

                // Floor
                for (let dx = -2; dx <= 2; dx++) {
                    for (let dz = -2; dz <= 2; dz++) {
                        setBlockHelper(centerX + dx, centerY, centerZ + dz, 'Wood');
                    }
                }

                // Walls
                for (let y = centerY + 1; y <= centerY + 3; y++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        for (let dz = -2; dz <= 2; dz++) {
                            if (Math.abs(dx) === 2 || Math.abs(dz) === 2) {
                                const wx = centerX + dx;
                                const wz = centerZ + dz;
                                
                                let blockType = 'Wood';
                                if (Math.abs(dx) === 2 && Math.abs(dz) === 2) {
                                    blockType = 'Stone';
                                }

                                const isDoor = (dz === -2 && dx === 0 && (y === centerY + 1 || y === centerY + 2));
                                const isWindow = (y === centerY + 2 && (
                                    (dz === 2 && dx === 0) ||
                                    (dx === -2 && dz === 0) ||
                                    (dx === 2 && dz === 0)
                                ));

                                if (isDoor || isWindow) {
                                    setBlockHelper(wx, y, wz, null);
                                } else {
                                    setBlockHelper(wx, y, wz, blockType);
                                }
                            }
                        }
                    }
                }

                // Roof
                for (let dx = -2; dx <= 2; dx++) {
                    for (let dz = -2; dz <= 2; dz++) {
                        setBlockHelper(centerX + dx, centerY + 4, centerZ + dz, 'Stone');
                    }
                }

                // Roof decoration
                for (let dx = -2; dx <= 2; dx++) {
                    for (let dz = -2; dz <= 2; dz++) {
                        if (Math.abs(dx) === 2 || Math.abs(dz) === 2) {
                            setBlockHelper(centerX + dx, centerY + 5, centerZ + dz, 'Leaves');
                        }
                    }
                }

                for (const chunkKey of chunksToUpdate) {
                    const [cx, cz] = chunkKey.split(',').map(Number);
                    world.updateChunkMesh(cx, cz);
                }

                try {
                    const bed = createBedMesh('Red Bed');
                    bed.position.set(centerX - 1, centerY + 0.5, centerZ + 1);
                    scene.add(bed);
                    placedBeds.push(bed);
                } catch(e) { console.error(e); }

                try {
                    const craftingTable = createFurnitureMesh('crafting table');
                    craftingTable.userData.itemName = 'crafting table';
                    craftingTable.position.set(centerX + 1, centerY + 0.5, centerZ + 1);
                    scene.add(craftingTable);
                    placedFurniture.push(craftingTable);
                } catch(e) { console.error(e); }

                try {
                    const chest = createFurnitureMesh('chest');
                    chest.userData.itemName = 'chest';
                    chest.position.set(centerX + 1, centerY + 0.5, centerZ - 1);
                    scene.add(chest);
                    placedFurniture.push(chest);
                } catch(e) { console.error(e); }

                try {
                    const campfire = createFurnitureMesh('campfire');
                    campfire.userData.itemName = 'campfire';
                    campfire.position.set(centerX - 1, centerY + 0.5, centerZ - 1);
                    scene.add(campfire);
                    placedFurniture.push(campfire);
                } catch(e) { console.error(e); }

                // Place 3D Door in the doorway
                try {
                    placeDoor(centerX, centerY + 1, centerZ - 2);
                } catch(e) { console.error(e); }

                // Teleport player safely into the center of the house and reset velocity
                camera.position.set(centerX, centerY + 1.5, centerZ);
                velocity.set(0, 0, 0);

                appendAgentMessage("House constructed successfully! Complete with walls, stone roof, green accents, a red bed, crafting table, chest, and campfire. Welcome home, Captain!");
            } else {
                appendAgentMessage("Usage: build <house|castle|village>");
            }
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
        case 'time':
            if (args.length > 1) {
                const targetTime = args[1].toLowerCase();
                if (targetTime === 'day' || targetTime === 'morning') {
                    timeOfDay = 0.075; // Start of Day
                    updateLighting(1.0);
                    appendAgentMessage("Time set to day.");
                } else if (targetTime === 'night') {
                    timeOfDay = 0.65; // Start of Night
                    updateLighting(1.0);
                    appendAgentMessage("Time set to night.");
                } else if (!isNaN(parseFloat(targetTime))) {
                    timeOfDay = parseFloat(targetTime) % 1.0;
                    updateLighting(1.0);
                    appendAgentMessage(`Time set to ${timeOfDay.toFixed(2)}.`);
                } else {
                    appendAgentMessage("Usage: time <day|night|number>");
                }
            } else {
                appendAgentMessage(`Current time: ${timeOfDay.toFixed(2)} (${Math.round(timeOfDay * 24)}:00). Usage: time <day|night|number>`);
            }
            break;
        case "what's":
        case 'whats':
            if (args.length > 2 && args[1].toLowerCase() === 'the' && args[2].toLowerCase() === 'time') {
                let displayTime = 'morning';
                if (timeOfDay >= 0.575 && timeOfDay < 0.65) {
                    displayTime = 'dusk';
                } else if (timeOfDay >= 0.65) {
                    displayTime = 'night';
                }
                appendAgentMessage(`The time is ${displayTime}.`);
            } else {
                appendAgentMessage("Usage: whats the time");
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
    // Chairs
    'Chair': '🪑', 'Oak Chair': '🪑', 'Spruce Chair': '🪑', 'Birch Chair': '🪑',
    'Jungle Chair': '🪑', 'Acacia Chair': '🪑', 'Dark Oak Chair': '🪑',
    // Sofas
    'Sofa': '🛋️', 'Red Sofa': '🛋️', 'Blue Sofa': '🛋️', 'Green Sofa': '🛋️',
    'Grey Sofa': '🛋️', 'White Sofa': '🛋️', 'Black Sofa': '🛋️',
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
    { name: 'Oak Door', cat: 'blocks' },
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
    { name: 'Chair', cat: 'blocks' }, { name: 'Oak Chair', cat: 'blocks' },
    { name: 'Spruce Chair', cat: 'blocks' }, { name: 'Birch Chair', cat: 'blocks' },
    { name: 'Jungle Chair', cat: 'blocks' }, { name: 'Acacia Chair', cat: 'blocks' },
    { name: 'Dark Oak Chair', cat: 'blocks' },
    { name: 'Sofa', cat: 'blocks' }, { name: 'Red Sofa', cat: 'blocks' },
    { name: 'Blue Sofa', cat: 'blocks' }, { name: 'Green Sofa', cat: 'blocks' },
    { name: 'Grey Sofa', cat: 'blocks' }, { name: 'White Sofa', cat: 'blocks' },
    { name: 'Black Sofa', cat: 'blocks' },
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
let isInWater = false;

const onKeyDown = (event) => {
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'SELECT')) {
        if (document.activeElement === accessorySearch && event.code === 'Enter') {
            accessoryGetBtn.click();
        } else if (document.activeElement === agentInput && event.code === 'Escape') {
            toggleAgentConsole();
        } else if ((document.activeElement === chatgptEmailInput || document.activeElement === chatgptPasswordInput) && event.code === 'Escape') {
            chatgptLoginModal.style.display = 'none';
        }
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
            if (isSitting) { standUp(); break; }
            if (flyMode) {
                moveUp = true;
            } else if (isInWater) {
                velocity.y = 2.5; // Swim up
            } else if (canJump === true) {
                velocity.y += JUMP_FORCE;
                canJump = false;
            }
            break;
        case 'KeyE':
            if (isSitting) standUp();
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
        case 'KeyL':
            timeOfDay = (timeOfDay + 0.25) % 1.0;
            updateLighting(1.0);
            state.showHelperMsg(`Time advanced to ${Math.round(timeOfDay * 24)}:00.`);
            break;
    }
};

const onKeyUp = (event) => {
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'SELECT')) {
        return;
    }
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
                const blockType = world.blocks.get(key);
                if (blockType && blockType !== 'Water') {
                    return true; // Collision detected (solid blocks only)
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

    // Left-click aimed at a dropped item → pick it up
    if (event.button === 0) {
        const lookDir = new THREE.Vector3();
        camera.getWorldDirection(lookDir);
        let nearestDrop = null;
        let nearestAlong = Infinity;
        for (const d of droppedItems) {
            if (!d.active) continue;
            const toItem = d.sprite.position.clone().sub(camera.position);
            const along = toItem.dot(lookDir);
            if (along < 0.5 || along > 8) continue;
            const perp = toItem.clone().sub(lookDir.clone().multiplyScalar(along)).length();
            if (perp < 0.7 && along < nearestAlong) {
                nearestAlong = along;
                nearestDrop = d;
            }
        }
        if (nearestDrop) {
            state.addResource(nearestDrop.itemName, nearestDrop.count);
            state.showHelperMsg(`Picked up ${nearestDrop.itemName}!`);
            nearestDrop.die();
            return;
        }

        // Left-click on placed furniture → collect it back into inventory
        const furnitureHits = raycaster.intersectObjects(placedFurniture, true);
        if (furnitureHits.length > 0) {
            let hitMesh = furnitureHits[0].object;
            // Walk up to the root furniture group (which has userData.itemName)
            while (hitMesh.parent && !hitMesh.userData.itemName) hitMesh = hitMesh.parent;
            const iName = hitMesh.userData.itemName;
            if (iName) {
                scene.remove(hitMesh);
                placedFurniture.splice(placedFurniture.indexOf(hitMesh), 1);
                state.addResource(iName, 1);
                state.showHelperMsg(`Collected ${iName}!`);
                return;
            }
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
    // Non-placeable categories: weapons, tools, armor, potions, etc. get DROPPED on right-click.
    // Everything else (world blocks, catalog blocks, beds, unknown items like 'Bed') gets PLACED.
    const ACCESSORY_CATS = new Set(['weapons', 'tools', 'armor', 'headgear', 'horsearmor', 'potions', 'special', 'food', 'materials']);
    const catalogEntry = currentItem ? MINECRAFT_ITEMS.find(i => i.name === currentItem.name) : null;
    const isAccessory = currentItem && currentItem.count > 0 && catalogEntry && ACCESSORY_CATS.has(catalogEntry.cat);

    // Right-click puts down the held item onto the ground
    if (isAccessory && event.button === 2) {
        const dropPos = camera.position.clone();
        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        fwd.y = 0;
        fwd.normalize();
        dropPos.addScaledVector(fwd, 1.2);

        // Search downward from just below player feet using Math.floor for accuracy
        const gx = Math.floor(dropPos.x + 0.5);
        const gz = Math.floor(dropPos.z + 0.5);
        const searchFrom = Math.floor(camera.position.y - 0.5);
        let groundY = camera.position.y - 1.5;
        for (let y = searchFrom; y >= -15; y--) {
            if (world.blocks.has(`${gx},${y},${gz}`)) {
                groundY = y + 0.5;
                break;
            }
        }
        dropPos.y = groundY;

        droppedItems.push(new DroppedItem(scene, dropPos, currentItem.name, 1, droppedItemMeshFactory));
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
        } else if (event.button === 2 && !isAccessory) { // RIGHT CLICK: interact or place
            // First check if right-clicking ON placed furniture → interact with it
            const furnitureInteractHits = raycaster.intersectObjects(placedFurniture, true);
            if (furnitureInteractHits.length > 0) {
                let hitMesh = furnitureInteractHits[0].object;
                while (hitMesh.parent && !hitMesh.userData.itemName) hitMesh = hitMesh.parent;
                if (hitMesh.userData.itemName) {
                    interactFurniture(hitMesh);
                    return;
                }
            }
            // Also check placed beds
            const bedInteractHits = raycaster.intersectObjects(placedBeds, true);
            if (bedInteractHits.length > 0) {
                if (worldTime === 'NIGHT' || gameMode === 'creative') {
                    doSleep();
                } else {
                    state.showHelperMsg('You can only sleep at night!');
                }
                return;
            }
            const iName = currentItem?.name ?? '';
            if (iName.toLowerCase() === 'oak door' || iName.toLowerCase() === 'door') {
                placeDoorAtPoint(intersection.point, intersection.face.normal);
                currentItem.count = Math.max(0, currentItem.count - 1);
                state.notify();
            } else if (BED_NAMES.has(iName.toLowerCase())) {
                placeBed(intersection.point, intersection.face.normal, iName);
                currentItem.count = Math.max(0, currentItem.count - 1);
                state.notify();
            } else if (FURNITURE_NAMES.has(iName.toLowerCase())) {
                placeFurniture(intersection.point, intersection.face.normal, iName);
                currentItem.count = Math.max(0, currentItem.count - 1);
                state.notify();
            } else {
                world.placeBlock(intersection.point, intersection.face.normal);
            }
        }
    }
});

// Wall collision — checks blocks beside the player (above ground level)
function wallCollides(x, z, camY = camera.position.y) {
    const r = 0.3;
    const by1 = Math.floor(camY - 0.5); // lower body
    const by2 = Math.floor(camY + 0.5); // upper body / head
    const corners = [
        [Math.round(x - r), Math.round(z - r)],
        [Math.round(x + r), Math.round(z - r)],
        [Math.round(x - r), Math.round(z + r)],
        [Math.round(x + r), Math.round(z + r)],
    ];
    for (const [bx, bz] of corners) {
        if (world.blocks.has(`${bx},${by1},${bz}`)) return true;
        if (world.blocks.has(`${bx},${by2},${bz}`)) return true;
    }
    return false;
}

let prevTime = performance.now();
let swingTime = 0;
let isSwinging = false;
let bobTime = 0;

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    // Smoothly animate doors
    for (const door of placedDoors) {
        const target = door.userData.targetYRotation || 0;
        door.rotation.y += (target - door.rotation.y) * 0.15;
    }

    if (state.isPointerLocked) {
        // Physics & Movement
        const pBX = Math.round(camera.position.x);
        const pBY = Math.round(camera.position.y);
        const pBZ = Math.round(camera.position.z);
        isInWater = world.blocks.get(`${pBX},${pBY},${pBZ}`) === 'Water' || 
                    world.blocks.get(`${pBX},${pBY - 1},${pBZ}`) === 'Water';
        // If sitting, lock camera to seat and skip all movement
        if (isSitting && seatMesh) {
            const pos = seatMesh.position;
            camera.position.x = pos.x;
            camera.position.z = pos.z;
            camera.position.y = pos.y + 0.95;
            velocity.set(0, 0, 0);
        } else if (flyMode) {
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
            
            if (isInWater) {
                // Water buoyancy/sinking physics
                velocity.y -= (GRAVITY * 0.15) * delta; // slow sinking
                if (velocity.y < -1.2) velocity.y = -1.2; 
            } else if (gravityEnabled) {
                velocity.y -= GRAVITY * delta;
            } else {
                // SLOW_FALL effect
                velocity.y -= (GRAVITY * 0.1) * delta;
                if (velocity.y < -2.0) velocity.y = -2.0;
            }

            direction.z = Number(moveForward) - Number(moveBackward);
            direction.x = Number(moveRight) - Number(moveLeft);
            direction.normalize();

            const currentMoveSpeed = isInWater ? MOVE_SPEED * 0.4 : MOVE_SPEED;

            if (moveForward || moveBackward) velocity.z -= direction.z * currentMoveSpeed * 10.0 * delta;
            if (moveLeft || moveRight) velocity.x -= direction.x * currentMoveSpeed * 10.0 * delta;

            // Apply vertical velocity then snap to ground BEFORE horizontal movement.
            // This ensures wallCollides always uses the correct snapped camera.y, preventing
            // ground-level terrain from being falsely detected as walls (which caused step-up glitches).
            camera.position.y += (velocity.y * delta);

            {
                const px = camera.position.x, pz = camera.position.z;
                const pr = 0.28;
                const gCorners = [
                    [Math.floor(px - pr), Math.floor(pz - pr)],
                    [Math.floor(px + pr), Math.floor(pz - pr)],
                    [Math.floor(px - pr), Math.floor(pz + pr)],
                    [Math.floor(px + pr), Math.floor(pz + pr)],
                ];
                const searchTop = Math.floor(camera.position.y - 0.6);
                let groundY = -Infinity;
                for (const [gx, gz] of gCorners) {
                    for (let y = searchTop; y >= -20; y--) {
                        if (world.blocks.has(`${gx},${y},${gz}`)) {
                            groundY = Math.max(groundY, y + 1.5);
                            break;
                        }
                    }
                }
                if (groundY > -Infinity && camera.position.y < groundY) {
                    velocity.y = 0;
                    camera.position.y = groundY;
                    canJump = true;
                } else if (camera.position.y > groundY + 0.1) {
                    canJump = false;
                }
            }

            // Horizontal movement
            const rightVec = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
            const fwdVec = new THREE.Vector3().crossVectors(camera.up, rightVec);
            const dx = rightVec.x * (-velocity.x * delta) + fwdVec.x * (-velocity.z * delta);
            const dz = rightVec.z * (-velocity.x * delta) + fwdVec.z * (-velocity.z * delta);
            const moveMag = Math.abs(dx) + Math.abs(dz);

            if (!wallCollides(camera.position.x + dx, camera.position.z + dz)) {
                camera.position.x += dx;
                camera.position.z += dz;
            } else if (moveMag > 0.001 && !wallCollides(camera.position.x + dx, camera.position.z + dz, camera.position.y + 1.1)) {
                // Auto step-up — space is clear 1 block higher, so step onto it
                camera.position.x += dx;
                camera.position.z += dz;
                camera.position.y += 1.0;
                velocity.y = 0;
            } else {
                // Slide along wall
                if (!wallCollides(camera.position.x + dx, camera.position.z)) camera.position.x += dx;
                if (!wallCollides(camera.position.x, camera.position.z + dz)) camera.position.z += dz;
            }
            
            // Snap player back up if they fall too far below the world
            if (camera.position.y < -20) {
                camera.position.y = 5;
                velocity.y = 0;
                state.showHelperMsg('You fell out of the world and were respawned!');
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
        
        // Continuous Day/Night Cycle
        updateLighting(delta);
        
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
        
        monsters.forEach(m => {
            m.update(delta, camera.position, world);
            if (m.active && gameMode === 'survival' && !isGameOver) {
                const dist = m.group.position.distanceTo(camera.position);
                if (dist < 2.2) {
                    state.setHP(state.hp - delta * 3.5);
                    state.showHelperMsg("WARNING: Under attack by zombie!");
                }
            }
        });
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
