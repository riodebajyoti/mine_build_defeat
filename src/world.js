import * as THREE from 'three';
import { state } from './state.js';

export class VoxelWorld {
    constructor(scene) {
        this.scene = scene;
        this.chunkSize = 16;
        this.blockSize = 1;
        this.blocks = new Map(); // key: "x,y,z", value: type
        this.chunks = new Map(); // key: "cx,cz", value: Chunk object

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
        const chunkKey = `${cx},${cz}`;
        if (this.chunks.has(chunkKey)) return;

        const chunk = {
            cx: cx,
            cz: cz,
            group: new THREE.Group(),
            blocks: new Map(),
            instancedMeshes: {}
        };
        this.chunks.set(chunkKey, chunk);
        this.scene.add(chunk.group);

        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                const worldX = cx * this.chunkSize + x;
                const worldZ = cz * this.chunkSize + z;

                // Simple height generation
                const height = Math.floor(Math.sin(worldX * 0.2) * 2 + Math.cos(worldZ * 0.2) * 2 + 5);

                for (let y = -15; y < height; y++) {
                    const type = y === height - 1 ? 'Grass' : (y > height - 4 ? 'Dirt' : 'Stone');
                    const key = `${worldX},${y},${worldZ}`;
                    this.blocks.set(key, type);
                    chunk.blocks.set(key, type);
                }
            }
        }
        this.updateChunkMesh(cx, cz);
    }

    setBlock(x, y, z, type) {
        const key = `${x},${y},${z}`;
        const cx = Math.floor(x / this.chunkSize);
        const cz = Math.floor(z / this.chunkSize);
        const chunkKey = `${cx},${cz}`;

        let chunk = this.chunks.get(chunkKey);
        if (!chunk) {
            chunk = {
                cx: cx,
                cz: cz,
                group: new THREE.Group(),
                blocks: new Map(),
                instancedMeshes: {}
            };
            this.chunks.set(chunkKey, chunk);
            this.scene.add(chunk.group);
        }

        if (type === null) {
            this.blocks.delete(key);
            chunk.blocks.delete(key);
        } else {
            this.blocks.set(key, type);
            chunk.blocks.set(key, type);
        }
    }

    updateChunkMesh(cx, cz) {
        const chunkKey = `${cx},${cz}`;
        const chunk = this.chunks.get(chunkKey);
        if (!chunk) return;

        // Clear existing meshes
        Object.values(chunk.instancedMeshes).forEach(m => chunk.group.remove(m));
        chunk.instancedMeshes = {};

        const typeCounts = {};
        chunk.blocks.forEach((type) => {
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
            chunk.blocks.forEach((val, key) => {
                if (val !== type) return;
                const [x, y, z] = key.split(',').map(Number);
                matrix.setPosition(x, y, z);
                mesh.setMatrixAt(i++, matrix);
            });

            chunk.instancedMeshes[type] = mesh;
            chunk.group.add(mesh);
        });
    }

    getSurfaceObjects() {
        const objects = [];
        this.chunks.forEach(chunk => {
            objects.push(...Object.values(chunk.instancedMeshes));
        });
        return objects;
    }

    mineBlock(mesh, intersectionPoint, normal) {
        // Use normal to find the exact block center inside the volume
        const x = Math.round(intersectionPoint.x - normal.x * 0.5);
        const y = Math.round(intersectionPoint.y - normal.y * 0.5);
        const z = Math.round(intersectionPoint.z - normal.z * 0.5);

        const type = this.blocks.get(`${x},${y},${z}`);
        if (type) {
            state.addResource(type === 'Grass' ? 'Dirt' : type, 1);
            this.setBlock(x, y, z, null);
            const cx = Math.floor(x / this.chunkSize);
            const cz = Math.floor(z / this.chunkSize);
            this.updateChunkMesh(cx, cz);
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
            const cx = Math.floor(x / this.chunkSize);
            const cz = Math.floor(z / this.chunkSize);
            this.updateChunkMesh(cx, cz);
        } else {
            state.showHelperMsg("No blocks to build with!");
        }
    }

    playEffect(x, y, z) {
        // Add particle effects later or simple flash
    }

    update(delta, playerPos) {
        if (!playerPos) return;

        const px = Math.floor(playerPos.x / this.chunkSize);
        const pz = Math.floor(playerPos.z / this.chunkSize);
        const viewDistance = 4;

        // 1. Identify chunks to load
        const chunksToLoad = [];
        for (let dx = -viewDistance; dx <= viewDistance; dx++) {
            for (let dz = -viewDistance; dz <= viewDistance; dz++) {
                const cx = px + dx;
                const cz = pz + dz;
                const key = `${cx},${cz}`;
                if (!this.chunks.has(key)) {
                    const distSq = dx * dx + dz * dz;
                    chunksToLoad.push({ cx, cz, distSq });
                }
            }
        }

        // Sort so closest chunks load first
        chunksToLoad.sort((a, b) => a.distSq - b.distSq);

        // Load at most one chunk per frame
        if (chunksToLoad.length > 0) {
            const { cx, cz } = chunksToLoad[0];
            this.generateChunk(cx, cz);
        }

        // 2. Unload chunks that are too far away
        const unloadDistance = viewDistance + 2;
        this.chunks.forEach((chunk, key) => {
            const dx = chunk.cx - px;
            const dz = chunk.cz - pz;
            if (Math.abs(dx) > unloadDistance || Math.abs(dz) > unloadDistance) {
                // Remove chunk group from scene
                this.scene.remove(chunk.group);

                // Clear block entries from this.blocks
                chunk.blocks.forEach((type, blockKey) => {
                    this.blocks.delete(blockKey);
                });

                this.chunks.delete(key);
            }
        });
    }
}
