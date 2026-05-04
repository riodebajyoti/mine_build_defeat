import * as THREE from 'three';
import { state } from './state.js';

export class VoxelWorld {
    constructor(scene) {
        this.scene = scene;
        this.chunkSize = 16;
        this.blockSize = 1;
        this.blocks = new Map(); // key: "x,y,z", value: type
        this.instancedMeshes = {}; // type -> THREE.InstancedMesh

        // Materials
        this.materials = {
            'Dirt': new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 }),
            'Stone': new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.5 }),
            'Grass': new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8 }),
            'Steel': new THREE.MeshStandardMaterial({ color: 0x707070, metalness: 0.8, roughness: 0.2 }),
        };

        this.geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    generateChunk(cx, cz) {
        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                const worldX = cx * this.chunkSize + x;
                const worldZ = cz * this.chunkSize + z;

                // Simple height generation
                const height = Math.floor(Math.sin(worldX * 0.2) * 2 + Math.cos(worldZ * 0.2) * 2 + 5);

                for (let y = 0; y < height; y++) {
                    const type = y === height - 1 ? 'Grass' : (y > height - 4 ? 'Dirt' : 'Stone');
                    this.setBlock(worldX, y, worldZ, type);
                }
            }
        }
        this.updateMesh();
    }

    setBlock(x, y, z, type) {
        const key = `${x},${y},${z}`;
        if (type === null) {
            this.blocks.delete(key);
        } else {
            this.blocks.set(key, type);
        }
    }

    updateMesh() {
        // Clear existing meshes
        Object.values(this.instancedMeshes).forEach(m => this.scene.remove(m));
        this.instancedMeshes = {};

        const typeCounts = {};
        this.blocks.forEach((type) => {
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        Object.keys(typeCounts).forEach(type => {
            const count = typeCounts[type] || 0;
            if (count === 0) return;

            // Dynamically generate a material if it doesn't exist
            if (!this.materials[type]) {
                // Generate a random color based on the string hash
                let hash = 0;
                for (let i = 0; i < type.length; i++) hash = type.charCodeAt(i) + ((hash << 5) - hash);
                const color = new THREE.Color(`hsl(${Math.abs(hash) % 360}, 80%, 50%)`);
                this.materials[type] = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.2 });
            }

            const mesh = new THREE.InstancedMesh(this.geometry, this.materials[type], count);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            let i = 0;
            const matrix = new THREE.Matrix4();
            this.blocks.forEach((val, key) => {
                if (val !== type) return;
                const [x, y, z] = key.split(',').map(Number);
                matrix.setPosition(x, y, z);
                mesh.setMatrixAt(i++, matrix);
            });

            this.instancedMeshes[type] = mesh;
            this.scene.add(mesh);
        });
    }

    getSurfaceObjects() {
        return Object.values(this.instancedMeshes);
    }

    mineBlock(mesh, intersectionPoint) {
        // Find which block in the instanced mesh was hit
        // Note: For simplicity in this demo, we'll use a more direct approach 
        // by calculating position from the intersection point and normal.
        const raycaster = new THREE.Raycaster();
        // Since we know the block size is 1, we can find the block center
        const x = Math.round(intersectionPoint.x);
        const y = Math.round(intersectionPoint.y);
        const z = Math.round(intersectionPoint.z);

        // Raycasting from slightly outside towards the block to find the exact block hit
        // But for a voxel game, rounding the intersection point - normal * 0.5 works best
        // Actually, normal is easier to get from the intersection object if it was a single mesh.
        // For InstancedMesh, we'll just use the rounded point for now.

        const type = this.blocks.get(`${x},${y},${z}`);
        if (type) {
            state.addResource(type === 'Grass' ? 'Dirt' : type, 1);
            this.setBlock(x, y, z, null);
            this.updateMesh();
            this.playEffect(x, y, z);
        }
    }

    placeBlock(point, normal) {
        // Place block adjacent to the surface hit
        const x = Math.round(point.x + normal.x * 0.5);
        const y = Math.round(point.y + normal.y * 0.5);
        const z = Math.round(point.z + normal.z * 0.5);

        const currentItem = state.inventory[state.selectedSlot];
        if (currentItem && currentItem.count > 0) {
            this.setBlock(x, y, z, currentItem.name === 'Dirt' ? 'Grass' : currentItem.name); // Simple map
            currentItem.count--;
            state.notify();
            this.updateMesh();
        } else {
            state.showHelperMsg("No blocks to build with!");
        }
    }

    playEffect(x, y, z) {
        // Add particle effects later or simple flash
    }

    update(delta, playerPos) {
        // Dynamic loading could happen here
    }
}
