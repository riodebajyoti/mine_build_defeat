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

function updateHandModel() {
    if (currentHandMesh) {
        handGroup.remove(currentHandMesh);
        currentHandMesh = null;
    }

    const currentItem = state.inventory[state.selectedSlot];
    if (currentItem && currentItem.count > 0) {
        const type = currentItem.name;
        let geometry, material;
        
        const baseBlocks = ['Dirt', 'Stone', 'Wood', 'Steel', 'Cores', 'Grass'];
        if (baseBlocks.includes(type)) {
            geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa }); // Fallback if world materials aren't available yet
            // Wait for world to init if possible, or just recreate basic materials
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
        }
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
const controls = new PointerLockControls(camera, document.body);
const startBtn = document.getElementById('start-btn');
const overlay = document.getElementById('overlay');

startBtn.addEventListener('click', () => {
    controls.lock();
});

controls.addEventListener('lock', () => {
    overlay.style.display = 'none';
    state.isPointerLocked = true;
});

controls.addEventListener('unlock', () => {
    state.isPointerLocked = false;
    if (!isAccessoriesMenuOpen) {
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
        overlay.style.display = 'none'; // Ensure start menu is hidden
        accessoriesMenu.style.display = 'flex';
        accessorySearch.focus();
    } else {
        accessoriesMenu.style.display = 'none';
        controls.lock();
    }
}

closeAccessoriesBtn.addEventListener('click', () => {
    if (isAccessoriesMenuOpen) toggleAccessoriesMenu();
});

accessoryGetBtn.addEventListener('click', () => {
    const val = accessorySearch.value.trim();
    if (val) {
        state.addResource(val, 1);
        accessorySearch.value = '';
    }
});

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
    
    isSwinging = true;
    swingTime = 0;

    raycaster.setFromCamera(mouse, camera);

    // Check Boss Hit FIRST
    if (boss.active) {
        const attackIntersects = raycaster.intersectObject(boss.group, true);
        if (attackIntersects.length > 0) {
            boss.takeDamage(10);
            return;
        }
    }

    const currentItem = state.inventory[state.selectedSlot];
    const baseBlocks = ['Dirt', 'Stone', 'Wood', 'Steel', 'Cores', 'Grass'];
    const isAccessory = currentItem && !baseBlocks.includes(currentItem.name);

    // Use accessory without needing a block
    if (isAccessory) {
        if (event.button === 2) {
            state.showHelperMsg(`Used the ${currentItem.name}!`);
            return;
        } else if (event.button === 0) {
            state.showHelperMsg(`Swung the ${currentItem.name}!`);
            return;
        }
    }

    const intersects = raycaster.intersectObjects(world.getSurfaceObjects());

    if (intersects.length > 0) {
        const intersection = intersects[0];
        if (event.button === 0) { // LEFT CLICK: MINE
            world.mineBlock(intersection.object, intersection.point);

            // Spawn Boss after mining 5 blocks
            const dirtCount = state.inventory.find(i => i.name === 'Dirt')?.count || 0;
            if (dirtCount >= 5 && !bossSpawned) {
                boss.activate();
                bossSpawned = true;
            }
        } else if (event.button === 2) { // RIGHT CLICK: BUILD
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
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        if (speed > 0.1 && canJump) {
            bobTime += delta * 12;
            handGroup.position.y = -0.4 + Math.sin(bobTime) * 0.05;
            handGroup.position.x = 0.5 + Math.cos(bobTime * 0.5) * 0.02;
        } else {
            handGroup.position.y = THREE.MathUtils.lerp(handGroup.position.y, -0.4, delta * 5);
            handGroup.position.x = THREE.MathUtils.lerp(handGroup.position.x, 0.5, delta * 5);
        }

        if (isSwinging) {
            swingTime += delta * 15;
            if (swingTime > Math.PI) {
                isSwinging = false;
                handGroup.rotation.x = 0;
            } else {
                handGroup.rotation.x = -Math.sin(swingTime) * 0.8;
            }
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
