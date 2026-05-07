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


