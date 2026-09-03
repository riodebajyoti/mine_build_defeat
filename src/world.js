import * as THREE from 'three';
import { state } from './state.js';

export class VoxelWorld {
    constructor(scene) {
        this.scene = scene;
        this.chunkSize = 16;
        this.blockSize = 1;
        this.blocks = new Map(); // key: "x,y,z", value: type
        this.chunks = new Map(); // key: "cx,cz", value: Chunk object
        this.savedOverrides = new Map();
        this.isRestoringSave = false;
        this.lastChunkLoadTime = 0;

        // Materials
        this.materials = {
            'Dirt': new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 }),
            'Stone': new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.5 }),
            'Grass': new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8 }),
            'Steel': new THREE.MeshStandardMaterial({ color: 0x707070, metalness: 0.8, roughness: 0.2 }),
            'Wood': new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 0.9 }),
            'Leaves': new THREE.MeshStandardMaterial({ color: 0x2E8B57, roughness: 0.9 }),
            'SnowGrass': new THREE.MeshStandardMaterial({ color: 0xF0F8FF, roughness: 0.8 }),
            'SnowStone': new THREE.MeshStandardMaterial({ color: 0xE0E0E0, roughness: 0.5 }),
            'Water': new THREE.MeshStandardMaterial({
                color: 0x1E90FF,
                transparent: true,
                opacity: 0.75,
                roughness: 0.1,
                metalness: 0.1,
                side: THREE.DoubleSide
            }),
        };

        this.geometry = new THREE.BoxGeometry(1, 1, 1);

        // Add a single large flat liquid water plane over the lake centered at (35, 2.4, -35)
        const waterGeo = new THREE.PlaneGeometry(33, 33);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x0066FF,
            transparent: true,
            opacity: 0.65,
            roughness: 0.05,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const waterMesh = new THREE.Mesh(waterGeo, waterMat);
        waterMesh.rotation.x = -Math.PI / 2;
        waterMesh.position.set(35, 2.4, -35);
        this.scene.add(waterMesh);
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

                // Mountain generation - peak at (30, 30)
                const mountainCenterX = 30;
                const mountainCenterZ = 30;
                const distToMountain = Math.sqrt(
                    Math.pow(worldX - mountainCenterX, 2) + 
                    Math.pow(worldZ - mountainCenterZ, 2)
                );
                
                let height;
                if (distToMountain < 25) {
                    // Mountain - steeper falloff near center
                    const mountainHeight = 20 * Math.exp(-distToMountain / 12);
                    height = Math.floor(mountainHeight + 8);
                } else {
                    // Regular terrain - simple wave pattern
                    height = Math.floor(Math.sin(worldX * 0.2) * 2 + Math.cos(worldZ * 0.2) * 2 + 5);
                }

                // Add some noise variation to terrain
                const noiseVariation = Math.sin(worldX * 0.1) * Math.cos(worldZ * 0.15);
                height = Math.max(0, height + Math.floor(noiseVariation));

                // Ensure spawn area is dry on startup
                if (Math.abs(worldX) < 15 && Math.abs(worldZ) < 15) {
                    height = Math.max(5, height);
                }

                const waterLevel = 3;
                
                // Define a single large sloping lake far from spawn center (0,0)
                const lakeCenterX = 35;
                const lakeCenterZ = -35;
                const lakeRadius = 16.0;
                const distToLake = Math.sqrt(Math.pow(worldX - lakeCenterX, 2) + Math.pow(worldZ - lakeCenterZ, 2));
                const insideLake = (distToLake < lakeRadius);
                
                // Embankment / containing shoreline rim just outside the lake radius
                const isRim = (distToLake >= lakeRadius && distToLake < lakeRadius + 2.5);
                
                // Carve a sloping lake bed (deeper at center)
                if (insideLake && distToMountain >= 25) {
                    const depthFactor = (1.0 - distToLake / lakeRadius); // 0.0 at edge, 1.0 at center
                    height = Math.round(THREE.MathUtils.lerp(2, -2, depthFactor));
                } else if (isRim && distToMountain >= 25) {
                    // Force containing wall elevation to be at least y = 4 (1 block above water level 3)
                    height = Math.max(4, height);
                }
                
                const hasWater = (height <= waterLevel && distToMountain >= 25 && insideLake);

                for (let y = -15; y < height; y++) {
                    let type;
                    
                    // Determine block type based on height and whether in mountain
                    if (distToMountain < 25 && height > 15) {
                        // Snow-covered mountain peak
                        type = y === height - 1 ? 'SnowGrass' : (y > height - 3 ? 'SnowStone' : 'Stone');
                    } else {
                        // Regular terrain
                        if (y === height - 1) {
                            type = hasWater ? 'Dirt' : (isRim ? 'Dirt' : 'Grass');
                        } else {
                            type = y > height - 4 ? 'Dirt' : 'Stone';
                        }
                    }
                    
                    const key = `${worldX},${y},${worldZ}`;
                    this.blocks.set(key, type);
                    chunk.blocks.set(key, type);
                }

                // Fill with water pools in valleys below y = 3
                if (hasWater) {
                    for (let y = height; y <= waterLevel; y++) {
                        const key = `${worldX},${y},${worldZ}`;
                        this.blocks.set(key, 'Water');
                        chunk.blocks.set(key, 'Water');
                    }
                }

                // Tree generation with 1.5% chance per column on grass
                // Trees spawn on regular terrain AND on mountain slopes (but not the very peak)
                if (Math.random() < 0.015 && height > 2) {
                    // Don't spawn trees on very steep peaks (height > 20)
                    if (distToMountain < 25 && height > 20) {
                        // Skip very high snow peaks
                        continue;
                    }
                    
                    const trunkHeight = 4 + Math.floor(Math.random() * 2);
                    
                    // Place trunk (Wood)
                    for (let ty = height; ty < height + trunkHeight; ty++) {
                        const key = `${worldX},${ty},${worldZ}`;
                        this.blocks.set(key, 'Wood');
                        chunk.blocks.set(key, 'Wood');
                    }
                    
                    // Place leaves around the trunk
                    const leafTop = height + trunkHeight;
                    
                    // Bottom layers of leaves (leafTop - 2, leafTop - 1): 3x3 square
                    for (let ly = leafTop - 2; ly <= leafTop - 1; ly++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            for (let dz = -1; dz <= 1; dz++) {
                                if (dx === 0 && dz === 0) continue; // Skip the trunk itself
                                const lx = worldX + dx;
                                const lz = worldZ + dz;
                                // Clip to current chunk boundaries
                                if (Math.floor(lx / this.chunkSize) === cx && Math.floor(lz / this.chunkSize) === cz) {
                                    const key = `${lx},${ly},${lz}`;
                                    if (!chunk.blocks.has(key)) {
                                        this.blocks.set(key, 'Leaves');
                                        chunk.blocks.set(key, 'Leaves');
                                    }
                                }
                            }
                        }
                    }
                    
                    // Middle layer of leaves (leafTop): cross shape
                    const crossOffsets = [
                        {x: 0, z: 0},
                        {x: 1, z: 0},
                        {x: -1, z: 0},
                        {x: 0, z: 1},
                        {x: 0, z: -1}
                    ];
                    crossOffsets.forEach(offset => {
                        const lx = worldX + offset.x;
                        const lz = worldZ + offset.z;
                        if (Math.floor(lx / this.chunkSize) === cx && Math.floor(lz / this.chunkSize) === cz) {
                            const key = `${lx},${leafTop},${lz}`;
                            if (!chunk.blocks.has(key)) {
                                this.blocks.set(key, 'Leaves');
                                chunk.blocks.set(key, 'Leaves');
                            }
                        }
                    });
                    
                    // Top layer of leaves (leafTop + 1): single block
                    if (Math.floor(worldX / this.chunkSize) === cx && Math.floor(worldZ / this.chunkSize) === cz) {
                        const key = `${worldX},${leafTop + 1},${worldZ}`;
                        if (!chunk.blocks.has(key)) {
                            this.blocks.set(key, 'Leaves');
                            chunk.blocks.set(key, 'Leaves');
                        }
                    }
                }
            }
        }
        this.savedOverrides.forEach((type, key) => {
            const [x, y, z] = key.split(',').map(Number);
            if (Math.floor(x / this.chunkSize) !== cx || Math.floor(z / this.chunkSize) !== cz) return;
            if (type === null) {
                this.blocks.delete(key);
                chunk.blocks.delete(key);
            } else {
                this.blocks.set(key, type);
                chunk.blocks.set(key, type);
            }
        });
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
        if (!this.isRestoringSave) this.savedOverrides.set(key, type);
    }

    restoreSavedOverrides(entries) {
        if (!Array.isArray(entries)) return;
        this.savedOverrides = new Map(entries);
        const chunksToRefresh = new Set();
        this.isRestoringSave = true;
        for (const [key, type] of this.savedOverrides) {
            const [x, y, z] = key.split(',').map(Number);
            const cx = Math.floor(x / this.chunkSize);
            const cz = Math.floor(z / this.chunkSize);
            if (!this.chunks.has(`${cx},${cz}`)) continue;
            this.setBlock(x, y, z, type);
            chunksToRefresh.add(`${cx},${cz}`);
        }
        this.isRestoringSave = false;
        chunksToRefresh.forEach((key) => {
            const [cx, cz] = key.split(',').map(Number);
            this.updateChunkMesh(cx, cz);
        });
    }

    getSavedOverrides() {
        return Array.from(this.savedOverrides.entries());
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
            if (type === 'Water' || type === 'Door') return; // Skip rendering water and doors as cubes!

            // Dynamically generate a material if it doesn't exist
            if (!this.materials[type]) {
                // Generate a random color based on the string hash
                let hash = 0;
                for (let i = 0; i < type.length; i++) hash = type.charCodeAt(i) + ((hash << 5) - hash);
                const color = new THREE.Color(`hsl(${Math.abs(hash) % 360}, 80%, 50%)`);
                this.materials[type] = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.2 });
            }

            const mesh = new THREE.InstancedMesh(this.geometry, this.materials[type], count);
            // Receiving the world shadow keeps depth cues without the high cost of
            // making tens of thousands of terrain cubes shadow casters.
            mesh.castShadow = false;
            mesh.receiveShadow = true;
            mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

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
        // Step slightly INSIDE the face to find which block was hit (same as mineBlock)
        const hitX = Math.round(point.x - normal.x * 0.5);
        const hitY = Math.round(point.y - normal.y * 0.5);
        const hitZ = Math.round(point.z - normal.z * 0.5);
        // Then step one full block outward in the normal direction to get the adjacent slot
        this.placeBlockAt(
            hitX + Math.round(normal.x),
            hitY + Math.round(normal.y),
            hitZ + Math.round(normal.z)
        );
    }

    placeBlockAt(x, y, z) {
        const currentItem = state.inventory[state.selectedSlot];
        if (currentItem && currentItem.count > 0) {
            this.setBlock(x, y, z, currentItem.name === 'Dirt' ? 'Grass' : currentItem.name);
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
        const viewDistance = 3;

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

        // Spread chunk creation across frames so entering or moving never causes
        // a long burst of synchronous terrain generation.
        const now = performance.now();
        if (chunksToLoad.length > 0 && now - this.lastChunkLoadTime >= 100) {
            const { cx, cz } = chunksToLoad[0];
            this.generateChunk(cx, cz);
            this.lastChunkLoadTime = now;
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
