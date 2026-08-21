import * as THREE from 'three';

export function buildCastle({ camera, world, velocity, appendMessage }) {
    const lookDir = new THREE.Vector3();
    camera.getWorldDirection(lookDir);
    lookDir.y = 0;
    if (lookDir.lengthSq() < 0.01) lookDir.set(0, 0, -1);
    lookDir.normalize();

    let forwardX = 0;
    let forwardZ = 0;
    if (Math.abs(lookDir.x) > Math.abs(lookDir.z)) forwardX = Math.sign(lookDir.x);
    else forwardZ = Math.sign(lookDir.z);

    const rightX = -forwardZ;
    const rightZ = forwardX;
    const centerX = Math.round(camera.position.x + forwardX * 16);
    const centerZ = Math.round(camera.position.z + forwardZ * 16);
    const baseY = Math.round(camera.position.y - 1.5);
    const half = 10;
    const chunksToUpdate = new Set();

    const toWorld = (localX, localZ) => ({
        x: centerX + rightX * localX + forwardX * localZ,
        z: centerZ + rightZ * localX + forwardZ * localZ
    });
    const setBlock = (localX, y, localZ, type) => {
        const position = toWorld(localX, localZ);
        world.setBlock(position.x, y, position.z, type);
        chunksToUpdate.add(`${Math.floor(position.x / world.chunkSize)},${Math.floor(position.z / world.chunkSize)}`);
    };

    // Level and clear the construction site.
    for (let x = -half - 3; x <= half + 3; x++) {
        for (let z = -half - 3; z <= half + 3; z++) {
            setBlock(x, baseY, z, 'Stone');
            for (let y = baseY + 1; y <= baseY + 11; y++) setBlock(x, y, z, null);
        }
    }

    // Curtain walls, front gate, and crenellated battlements.
    for (let level = 1; level <= 6; level++) {
        for (let x = -half; x <= half; x++) {
            for (const z of [-half, -half + 1, half - 1, half]) {
                const inGate = z < 0 && Math.abs(x) <= 1 && level <= 4;
                if (!inGate) setBlock(x, baseY + level, z, 'Stone');
            }
        }
        for (let z = -half + 2; z <= half - 2; z++) {
            for (const x of [-half, -half + 1, half - 1, half]) setBlock(x, baseY + level, z, 'Stone');
        }
    }
    for (let x = -half; x <= half; x += 2) {
        setBlock(x, baseY + 7, -half, 'Stone');
        setBlock(x, baseY + 7, half, 'Stone');
    }
    for (let z = -half; z <= half; z += 2) {
        setBlock(-half, baseY + 7, z, 'Stone');
        setBlock(half, baseY + 7, z, 'Stone');
    }

    // Four hollow towers with usable wooden upper floors.
    for (const towerX of [-half, half]) {
        for (const towerZ of [-half, half]) {
            for (let dx = -3; dx <= 3; dx++) {
                for (let dz = -3; dz <= 3; dz++) {
                    const edge = Math.abs(dx) === 3 || Math.abs(dz) === 3;
                    if (edge) {
                        for (let level = 1; level <= 9; level++) setBlock(towerX + dx, baseY + level, towerZ + dz, 'Stone');
                    }
                    setBlock(towerX + dx, baseY + 6, towerZ + dz, 'Wood');
                    if (edge && (Math.abs(dx) + Math.abs(dz)) % 2 === 0) {
                        setBlock(towerX + dx, baseY + 10, towerZ + dz, 'Stone');
                    }
                }
            }
        }
    }

    // A two-story central keep with doorways, windows, and roof battlements.
    const keepHalf = 4;
    for (let x = -keepHalf; x <= keepHalf; x++) {
        for (let z = -keepHalf; z <= keepHalf; z++) {
            setBlock(x, baseY + 1, z, 'Wood');
            setBlock(x, baseY + 5, z, 'Wood');
            const edge = Math.abs(x) === keepHalf || Math.abs(z) === keepHalf;
            if (!edge) continue;
            for (let level = 2; level <= 8; level++) {
                const doorway = z === -keepHalf && Math.abs(x) <= 1 && level <= 4;
                const window = (level === 4 || level === 7) &&
                    ((Math.abs(x) === keepHalf && z === 0) || (Math.abs(z) === keepHalf && x === 0));
                if (!doorway && !window) setBlock(x, baseY + level, z, 'Stone');
            }
            if ((Math.abs(x) + Math.abs(z)) % 2 === 0) setBlock(x, baseY + 9, z, 'Stone');
        }
    }

    // Road and wooden drawbridge through the main gate.
    for (let z = -half - 5; z <= -keepHalf; z++) {
        for (let x = -1; x <= 1; x++) setBlock(x, baseY + 1, z, z < -half ? 'Wood' : 'Stone');
    }

    for (const chunkKey of chunksToUpdate) {
        const [cx, cz] = chunkKey.split(',').map(Number);
        world.updateChunkMesh(cx, cz);
    }

    const arrival = toWorld(0, -half + 3);
    camera.position.set(arrival.x, baseY + 2.5, arrival.z);
    velocity.set(0, 0, 0);
    appendMessage('Castle constructed! Stone curtain walls, four towers, battlements, a gate and drawbridge, courtyard, and a two-story keep are ready to defend.');
}
