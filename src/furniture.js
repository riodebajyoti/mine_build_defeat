import * as THREE from 'three';

// ─── items that get a custom 3-D mesh when placed ────────────────────────────
export const FURNITURE_NAMES = new Set([
    'chest','ender chest','trapped chest',
    'crafting table',
    'furnace','blast furnace','smoker',
    'enchanting table',
    'anvil','grindstone','smithing table','stonecutter',
    'bookshelf',
    'lantern','soul lantern',
    'campfire',
    'bell',
    'flower pot',
    'barrel',
    'cauldron',
    'jukebox','note block',
    'lectern','loom','cartography table','composter',
]);

// ─── tiny helpers ─────────────────────────────────────────────────────────────
function mat(color, rough=0.8, metal=0, emissive=null, emissiveInt=0) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    if (emissive !== null) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = emissiveInt; }
    return m;
}
function box(w, h, d, material, px=0, py=0, pz=0, shadow=true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(px, py, pz);
    if (shadow) m.castShadow = true;
    return m;
}

// ─── Chest / Ender Chest / Trapped Chest ─────────────────────────────────────
function makeChest(n) {
    const g = new THREE.Group();
    const isEnder   = n.includes('ender');
    const isTrapped = n.includes('trapped');
    const woodC  = isEnder ? 0x200830 : 0x8B5E2A;
    const trimC  = isEnder ? 0x20A0B0 : (isTrapped ? 0xCC4010 : 0xC8A020);
    const wMat   = mat(woodC, 0.85);
    const tMat   = mat(trimC, 0.3, 0.6);

    g.add(box(0.88, 0.52, 0.88, wMat,  0, 0.26,  0));   // base
    g.add(box(0.88, 0.20, 0.88, wMat,  0, 0.62,  0));   // lid
    g.add(box(0.92, 0.04, 0.92, tMat,  0, 0.52,  0));   // trim strip
    g.add(box(0.12, 0.14, 0.05, tMat,  0, 0.37,  0.45));// latch
    // corner pins
    [[-0.38,-0.38],[0.38,-0.38],[-0.38,0.38],[0.38,0.38]].forEach(([x,z])=>{
        g.add(box(0.07,0.72,0.07, tMat, x, 0.36, z));
    });
    return g;
}

// ─── Crafting Table ───────────────────────────────────────────────────────────
function makeCraftingTable() {
    const g = new THREE.Group();
    const wood = mat(0x8B5E2A, 0.8);
    const top  = mat(0xC08040, 0.65);
    const grid = mat(0x5A3A10, 0.9);

    g.add(box(0.88, 0.88, 0.88, wood, 0, 0.44, 0));
    g.add(box(0.88, 0.02, 0.88, top,  0, 0.89, 0));
    // 3×3 grid lines on top
    [-0.22, 0.22].forEach(i=>{
        g.add(box(0.88, 0.03, 0.04, grid, 0, 0.9,  i));
        g.add(box(0.04, 0.03, 0.88, grid, i, 0.9,  0));
    });
    // tool icon on front face (yellow square = crafting symbol)
    g.add(box(0.24, 0.24, 0.03, mat(0xFFD020,0.5), 0, 0.55, 0.455));
    return g;
}

// ─── Furnace / Blast Furnace / Smoker ─────────────────────────────────────────
function makeFurnace(n='') {
    const g = new THREE.Group();
    const isSmoker = n.includes('smoker');
    const bodyC = isSmoker ? 0x6E4818 : 0x808080;
    g.add(box(0.88, 0.88, 0.88, mat(bodyC, 0.7), 0, 0.44, 0));
    // dark opening
    g.add(box(0.50, 0.38, 0.03, mat(0x181818, 0.9), 0, 0.35, 0.455));
    // glowing fire inside (emissive)
    g.add(box(0.36, 0.26, 0.03, mat(0xFF7010,0.4,0,0xFF3000,1.0), 0, 0.34, 0.46));
    // top slots (2 dark squares)
    [-0.18, 0.18].forEach(x=>g.add(box(0.14,0.12,0.03,mat(0x282828,0.9), x, 0.72, 0.455)));
    return g;
}

// ─── Enchanting Table ─────────────────────────────────────────────────────────
function makeEnchantingTable() {
    const g = new THREE.Group();
    g.add(box(0.88, 0.16, 0.88, mat(0x282828,0.5,0.3),  0, 0.08, 0));  // dark stone base
    g.add(box(0.80, 0.06, 0.80, mat(0xC83030,0.6),       0, 0.19, 0));  // red top slab
    // book on top
    g.add(box(0.32, 0.24, 0.06, mat(0x8B1A14,0.7),  -0.04, 0.34, 0));
    g.add(box(0.06, 0.24, 0.06, mat(0x5A1010,0.9),   0.06, 0.34, 0));
    // purple particles (tiny glowing cubes)
    [[0.32,0.6,-0.2],[-0.35,0.5,0.25],[0.1,0.75,0.35]].forEach(([x,y,z])=>{
        g.add(box(0.04,0.04,0.04, mat(0xA040FF,0.2,0,0x8020FF,1.5), x,y,z,false));
    });
    return g;
}

// ─── Anvil ────────────────────────────────────────────────────────────────────
function makeAnvil() {
    const g = new THREE.Group();
    const iron = mat(0x484848, 0.4, 0.7);
    g.add(box(0.78, 0.14, 0.82, iron,  0, 0.07,  0));  // base foot
    g.add(box(0.30, 0.26, 0.82, iron,  0, 0.27,  0));  // narrow waist
    g.add(box(0.68, 0.18, 0.82, iron,  0, 0.49,  0));  // upper body
    g.add(box(0.18, 0.12, 0.82, iron, -0.35,0.45, 0)); // horn
    // highlight
    g.add(box(0.64, 0.02, 0.78, mat(0x686868,0.3,0.8), 0, 0.58, 0));
    return g;
}

// ─── Bookshelf ────────────────────────────────────────────────────────────────
function makeBookshelf() {
    const g = new THREE.Group();
    g.add(box(0.88, 0.88, 0.88, mat(0x8B5E2A,0.85), 0, 0.44, 0));
    // three rows of colourful books on the front face
    const bookColors = [0xCC2020,0x2050CC,0x208040,0xD4A010,0x8020CC,0xCC5020,0x20A0A0];
    [0.72, 0.44, 0.16].forEach(y => {
        bookColors.forEach((c, i) => {
            g.add(box(0.09, 0.20, 0.04, mat(c,0.7), -0.36+i*0.12, y, 0.455));
        });
    });
    // shelf dividers
    [0.56, 0.3].forEach(y => g.add(box(0.88,0.04,0.04,mat(0xC8A040,0.6), 0, y, 0.455)));
    return g;
}

// ─── Lantern / Soul Lantern ───────────────────────────────────────────────────
function makeLantern(isSoul=false) {
    const g = new THREE.Group();
    const glowC = isSoul ? 0x20D8D0 : 0xFFD060;
    const iron  = mat(0x606060, 0.3, 0.8);
    const glow  = mat(glowC, 0.2, 0, glowC, 1.2);

    g.add(box(0.06, 0.22, 0.06, iron, 0, 0.89, 0));   // chain
    g.add(box(0.30, 0.05, 0.30, iron, 0, 0.76, 0));   // top cap
    // 4 frame bars
    [[-0.12,0],[ 0.12,0],[0,-0.12],[0,0.12]].forEach(([x,z])=>{
        const isX = x!==0;
        g.add(box(isX?0.05:0.30, 0.34, isX?0.30:0.05, iron, x, 0.48, z));
    });
    g.add(box(0.22, 0.22, 0.22, glow,  0, 0.48, 0)); // glow core
    g.add(box(0.30, 0.05, 0.30, iron,  0, 0.30, 0)); // bottom cap
    return g;
}

// ─── Campfire ─────────────────────────────────────────────────────────────────
function makeCampfire() {
    const g = new THREE.Group();
    const logMat = mat(0x6E4818, 0.9);
    const fireMat= mat(0xFF6010, 0.4, 0, 0xFF2000, 0.9);
    const emberM = mat(0xFF9020, 0.3, 0, 0xFF6000, 1.2);

    // crossed logs
    const l1 = box(0.86, 0.11, 0.18, logMat, 0, 0.055, 0);
    l1.rotation.y =  Math.PI/4; g.add(l1);
    const l2 = box(0.86, 0.11, 0.18, logMat, 0, 0.055, 0);
    l2.rotation.y = -Math.PI/4; g.add(l2);

    // fire tiers (narrowing upward)
    [[0.38,0.08,0.14],[0.22,0.12,0.24],[0.12,0.1,0.34]].forEach(([s,h,y])=>{
        g.add(box(s,h,s, y>0.3?emberM:fireMat, 0, y, 0));
    });
    return g;
}

// ─── Bell ─────────────────────────────────────────────────────────────────────
function makeBell() {
    const g = new THREE.Group();
    const gold = mat(0xD4B030, 0.3, 0.6);
    const iron = mat(0x707070, 0.4, 0.7);

    g.add(box(0.08, 0.55, 0.08, iron,  0, 0.71, 0));   // post
    g.add(box(0.50, 0.06, 0.12, iron,  0, 0.90, 0));   // crossbar
    g.add(box(0.40, 0.06, 0.40, gold,  0, 0.63, 0));   // bell top (cap)
    g.add(box(0.44, 0.26, 0.44, gold,  0, 0.42, 0));   // bell body
    g.add(box(0.48, 0.08, 0.48, gold,  0, 0.22, 0));   // bell flare rim
    g.add(box(0.06, 0.14, 0.06, iron,  0, 0.30, 0));   // clapper
    return g;
}

// ─── Flower Pot ───────────────────────────────────────────────────────────────
function makeFlowerPot() {
    const g = new THREE.Group();
    const clay = mat(0xA05030, 0.9);
    const soil = mat(0x4A2A10, 0.95);
    const green= mat(0x3A8A12, 0.8);
    const red  = mat(0xCC2020, 0.6);

    g.add(box(0.34, 0.30, 0.34, clay, 0, 0.15, 0));   // pot body
    g.add(box(0.40, 0.05, 0.40, clay, 0, 0.32, 0));   // rim
    g.add(box(0.28, 0.06, 0.28, soil, 0, 0.33, 0));   // soil
    // flower stem + bloom
    g.add(box(0.04, 0.20, 0.04, green, 0, 0.48, 0));
    g.add(box(0.14, 0.10, 0.14, red, 0, 0.60, 0));
    return g;
}

// ─── Barrel ───────────────────────────────────────────────────────────────────
function makeBarrel() {
    const g = new THREE.Group();
    const wood = mat(0x8B5E2A, 0.85);
    const iron = mat(0x606060, 0.35, 0.7);

    g.add(box(0.82, 0.88, 0.82, wood, 0, 0.44, 0));
    // barrel hoops
    [0.16, 0.44, 0.72].forEach(y => g.add(box(0.86, 0.06, 0.86, iron, 0, y, 0)));
    // lid
    g.add(box(0.76, 0.05, 0.76, mat(0xA07040,0.7), 0, 0.905, 0));
    // vertical plank lines
    [-0.22, 0, 0.22].forEach(x => g.add(box(0.04, 0.88, 0.03, mat(0x6E4818,0.9), x, 0.44, 0.42)));
    return g;
}

// ─── Cauldron ─────────────────────────────────────────────────────────────────
function makeCauldron() {
    const g = new THREE.Group();
    const iron = mat(0x484848, 0.4, 0.7);
    const water= mat(0x2060CC, 0.1, 0, 0x1040AA, 0.3);

    // outer walls (4 sides as thick slabs — approximate bowl)
    g.add(box(0.88, 0.70, 0.88, iron, 0, 0.35, 0));
    // hollow out the top by placing inner lighter piece
    g.add(box(0.62, 0.50, 0.62, mat(0x282828,1.0), 0, 0.45, 0));
    // water surface
    g.add(box(0.58, 0.04, 0.58, water, 0, 0.62, 0));
    // legs
    [[-0.32,-0.32],[0.32,-0.32],[-0.32,0.32],[0.32,0.32]].forEach(([x,z])=>{
        g.add(box(0.10,0.12,0.10,iron, x, 0.06, z));
    });
    // rim
    g.add(box(0.92, 0.07, 0.92, iron, 0, 0.725, 0));
    return g;
}

// ─── Note Block / Jukebox ─────────────────────────────────────────────────────
function makeNoteBlock(isJukebox=false) {
    const g = new THREE.Group();
    const wood = mat(isJukebox ? 0x4A2A10 : 0x8B5E2A, 0.8);
    const face = mat(isJukebox ? 0x181818 : 0x5A3A18, 0.9);
    const noteC= isJukebox ? 0xFF50A0 : 0x50D8FF;

    g.add(box(0.88, 0.88, 0.88, wood, 0, 0.44, 0));
    // face detail
    g.add(box(0.60, 0.50, 0.03, face, 0, 0.44, 0.455));
    // note icon or disc
    if (isJukebox) {
        g.add(box(0.24,0.24,0.04, mat(noteC,0.3,0,noteC,0.8), 0, 0.52, 0.46));
        g.add(box(0.06,0.06,0.04, mat(0x101010,1.0), 0, 0.52, 0.465));
    } else {
        // ♪ note silhouette (two thin boxes)
        g.add(box(0.08,0.22,0.04, mat(noteC,0.3,0,noteC,0.9), -0.06, 0.46, 0.46));
        g.add(box(0.12,0.05,0.04, mat(noteC,0.3,0,noteC,0.9),  0.00, 0.56, 0.46));
    }
    return g;
}

// ─── Generic styled cube (fallback) ───────────────────────────────────────────
function makeStyledCube(itemName) {
    const g = new THREE.Group();
    const h = [...itemName].reduce((a,c)=>a*31+c.charCodeAt(0),0);
    const hue = Math.abs(h) % 360;
    const bodyMat = mat(`hsl(${hue},55%,38%)`, 0.7);
    const topMat  = mat(`hsl(${hue},55%,52%)`, 0.5);
    const sideMat = mat(`hsl(${hue},55%,28%)`, 0.85);
    g.add(box(0.88, 0.88, 0.88, bodyMat, 0, 0.44, 0));
    g.add(box(0.88, 0.02, 0.88, topMat,  0, 0.885, 0));
    g.add(box(0.02, 0.88, 0.88, sideMat, 0.45, 0.44, 0));
    return g;
}

// ─── Main dispatch ────────────────────────────────────────────────────────────
export function createFurnitureMesh(itemName) {
    const n = itemName.toLowerCase();
    if (n.includes('chest'))                                return makeChest(n);
    if (n.includes('crafting'))                             return makeCraftingTable();
    if (n.includes('furnace')||n.includes('smoker')||n.includes('blast')) return makeFurnace(n);
    if (n.includes('enchanting'))                           return makeEnchantingTable();
    if (n.includes('anvil')||n.includes('grindstone')||n.includes('smithing')||n.includes('stonecutter')) return makeAnvil();
    if (n.includes('bookshelf'))                            return makeBookshelf();
    if (n.includes('lantern'))                              return makeLantern(n.includes('soul'));
    if (n.includes('campfire'))                             return makeCampfire();
    if (n.includes('bell'))                                 return makeBell();
    if (n.includes('flower pot'))                           return makeFlowerPot();
    if (n.includes('barrel'))                               return makeBarrel();
    if (n.includes('cauldron'))                             return makeCauldron();
    if (n.includes('jukebox'))                              return makeNoteBlock(true);
    if (n.includes('note block'))                           return makeNoteBlock(false);
    return makeStyledCube(itemName);
}
