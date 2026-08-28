import * as THREE from 'three';

const villageResidents = [];

export function updateVillageResidents(delta, time) {
    for (const resident of villageResidents) {
        const mover = resident.userData.villageMover;
        mover.changeDirectionTime -= delta;
        if (mover.changeDirectionTime <= 0) {
            mover.direction.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
            mover.changeDirectionTime = 2 + Math.random() * 5;
            mover.speed = Math.random() < 0.28 ? 0 : mover.walkSpeed * (0.75 + Math.random() * 0.5);
        }

        const distanceFromVillage = Math.hypot(resident.position.x - mover.centerX, resident.position.z - mover.centerZ);
        if (distanceFromVillage > mover.wanderLimit) {
            mover.direction.set(mover.centerX - resident.position.x, 0, mover.centerZ - resident.position.z).normalize();
            mover.speed = mover.walkSpeed;
            mover.changeDirectionTime = 1.5 + Math.random() * 2;
        }

        if (mover.speed > 0) {
            resident.position.addScaledVector(mover.direction, mover.speed * delta);
            // The villager's face is modeled toward local -Z, so add PI to face travel direction.
            resident.rotation.y = Math.atan2(mover.direction.x, mover.direction.z) + Math.PI;
            mover.stepTime += delta * mover.speed * 9;
            if (mover.legs) {
                const swing = Math.sin(mover.stepTime) * 0.5;
                mover.legs[0].rotation.x = swing;
                mover.legs[1].rotation.x = -swing;
            }
        } else if (mover.legs) {
            mover.legs[0].rotation.x = 0;
            mover.legs[1].rotation.x = 0;
        }
        resident.position.y = mover.baseY + Math.sin(time * (mover.isGolem ? 1.2 : 2.8) + mover.phase) * (mover.isGolem ? 0.025 : 0.05);
    }
}

export function buildVillage({ camera, world, velocity, appendMessage, scene, createBedMesh, placedBeds }) {
    for (const resident of villageResidents) scene.remove(resident);
    villageResidents.length = 0;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() < 0.01) dir.set(0, 0, -1);
    dir.normalize();
    let fx = 0, fz = 0;
    if (Math.abs(dir.x) > Math.abs(dir.z)) fx = Math.sign(dir.x); else fz = Math.sign(dir.z);
    const rx = -fz, rz = fx;
    const centerX = Math.round(camera.position.x + fx * 22);
    const centerZ = Math.round(camera.position.z + fz * 22);
    const baseY = Math.round(camera.position.y - 1.5);
    const chunks = new Set();
    const toWorld = (x, z) => ({ x: centerX + rx * x + fx * z, z: centerZ + rz * x + fz * z });
    const setBlock = (x, y, z, type) => {
        const p = toWorld(x, z);
        world.setBlock(p.x, y, p.z, type);
        chunks.add(`${Math.floor(p.x / world.chunkSize)},${Math.floor(p.z / world.chunkSize)}`);
    };

    for (let x = -17; x <= 17; x++) for (let z = -17; z <= 17; z++) {
        setBlock(x, baseY, z, 'Grass');
        for (let y = baseY + 1; y <= baseY + 8; y++) setBlock(x, y, z, null);
    }
    for (let n = -17; n <= 17; n++) for (let w = -1; w <= 1; w++) {
        setBlock(w, baseY, n, 'Stone'); setBlock(n, baseY, w, 'Stone');
    }

    const house = (cx, cz, hx, hz, shop = false) => {
        for (let x = -hx; x <= hx; x++) for (let z = -hz; z <= hz; z++) {
            setBlock(cx + x, baseY + 1, cz + z, 'Wood');
            setBlock(cx + x, baseY + 5, cz + z, shop ? 'Steel' : 'Stone');
            if (Math.abs(x) === hx || Math.abs(z) === hz) for (let level = 2; level <= 4; level++) {
                const door = z === -hz && x === 0 && level <= 3;
                const window = level === 3 && ((Math.abs(x) === hx && z === 0) || (Math.abs(z) === hz && Math.abs(x) === 1));
                if (!door && !window) setBlock(cx + x, baseY + level, cz + z, shop ? 'Stone' : 'Wood');
            }
        }
        if (shop) for (let x = -hx; x <= hx; x++) setBlock(cx + x, baseY + 4, cz - hz - 1, 'Leaves');
    };
    house(-10, -10, 3, 3); house(10, -10, 3, 3);
    house(-10, 10, 3, 3); house(10, 10, 3, 3);
    house(-10, 0, 4, 3, true); house(10, 0, 4, 3, true);

    // Central well.
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++)
        setBlock(x, baseY + 1, z, Math.abs(x) === 2 || Math.abs(z) === 2 ? 'Stone' : 'Water');
    for (const x of [-2, 2]) for (const z of [-2, 2]) for (let y = 2; y <= 4; y++) setBlock(x, baseY + y, z, 'Wood');
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) setBlock(x, baseY + 5, z, 'Wood');

    const mat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const cube = (group, size, material, pos) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
        mesh.position.set(...pos); group.add(mesh); return mesh;
    };
    const addVillager = (x, z) => {
        const g = new THREE.Group(), robe = mat(0x4f3028), skin = mat(0x8b5a47), green = mat(0x39a852), dark = mat(0x241711);
        cube(g, [0.8, 1.25, 0.55], robe, [0, 0.95, 0]);
        cube(g, [0.84, 0.84, 0.72], skin, [0, 2.0, 0]);
        cube(g, [0.22, 0.34, 0.3], skin, [0, 1.92, -0.49]);
        cube(g, [0.1, 0.1, 0.05], green, [-0.22, 2.08, -0.39]); cube(g, [0.1, 0.1, 0.05], green, [0.22, 2.08, -0.39]);
        cube(g, [1.18, 0.25, 0.28], robe, [0, 1.28, -0.35]);
        const leftLeg = cube(g, [0.25, 0.55, 0.3], dark, [-0.22, 0.15, 0]);
        const rightLeg = cube(g, [0.25, 0.55, 0.3], dark, [0.22, 0.15, 0]);
        const p = toWorld(x, z); g.position.set(p.x, baseY + 1, p.z); g.userData.villager = true;
        g.userData.villageMover = { centerX, centerZ, baseY: baseY + 1, walkSpeed: 0.8 + Math.random() * 0.65, speed: 1, direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(), changeDirectionTime: Math.random() * 3, wanderLimit: 13, phase: x * 0.77 + z, isGolem: false, legs: [leftLeg, rightLeg], stepTime: 0 };
        scene.add(g); villageResidents.push(g);
    };
    const addGolem = (x, z) => {
        const g = new THREE.Group(), iron = mat(0xc9c3b7), shade = mat(0x81776d), vine = mat(0x3f7d2a), eye = mat(0x68152a);
        cube(g, [1.5, 1.2, 0.75], iron, [0, 2.55, 0]);
        cube(g, [0.8, 0.85, 0.75], iron, [0, 3.55, 0]);
        cube(g, [0.2, 0.45, 0.3], shade, [0, 3.45, -0.5]);
        cube(g, [0.12, 0.12, 0.05], eye, [-0.22, 3.64, -0.39]); cube(g, [0.12, 0.12, 0.05], eye, [0.22, 3.64, -0.39]);
        cube(g, [0.4, 2.2, 0.48], iron, [-0.95, 2.05, 0]); cube(g, [0.4, 2.2, 0.48], iron, [0.95, 2.05, 0]);
        cube(g, [0.52, 1.8, 0.6], iron, [-0.42, 0.85, 0]); cube(g, [0.52, 1.8, 0.6], iron, [0.42, 0.85, 0]);
        cube(g, [0.18, 1.7, 0.08], vine, [-0.32, 2.5, -0.42]); cube(g, [0.18, 1.25, 0.08], vine, [0.42, 1.25, -0.34]);
        const p = toWorld(x, z); g.position.set(p.x, baseY + 1, p.z); g.userData.ironGolem = true;
        g.userData.villageMover = { centerX, centerZ, baseY: baseY + 1, walkSpeed: 0.45, speed: 0.45, direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(), changeDirectionTime: Math.random() * 3, wanderLimit: 14, phase: x * 0.51 + z, isGolem: true };
        scene.add(g); villageResidents.push(g);
    };
    [-5, 0, 5].forEach((x, i) => addVillager(x, i % 2 ? 7 : -5));
    addVillager(-8, 5); addVillager(8, 5);
    addGolem(-4, 10); addGolem(4, -10);

    if (createBedMesh && placedBeds) for (const [x, z, color] of [[-10,-9,'Red Bed'],[10,-9,'Blue Bed'],[-10,11,'Green Bed'],[10,11,'Purple Bed']]) {
        try { const bed = createBedMesh(color); const p = toWorld(x,z); bed.position.set(p.x, baseY + 1.5, p.z); scene.add(bed); placedBeds.push(bed); } catch(e) { console.error(e); }
    }
    for (const key of chunks) { const [cx, cz] = key.split(',').map(Number); world.updateChunkMesh(cx, cz); }
    const arrival = toWorld(0, -14); camera.position.set(arrival.x, baseY + 2.5, arrival.z); velocity.set(0,0,0);
    appendMessage('Village built with four houses, two shops, roads, a well, five villagers, two iron golems, and beds!');
}
