import * as THREE from 'three';

export class Monster {
    constructor(scene, playerPos = new THREE.Vector3()) {
        this.scene = scene;
        this.group = new THREE.Group();

        // Simple zombie-like monster
        const bodyGeo = new THREE.BoxGeometry(0.8, 1.8, 0.4);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57 }); // Green color
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.9; // Half height
        
        // Head
        const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.y = 2.1;
        
        // Red glowing eyes
        const eyeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.15, 2.15, 0.31);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.15, 2.15, 0.31);

        this.group.add(body, head, leftEye, rightEye);
        this.scene.add(this.group);

        // Random spawn far away relative to player
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnRadius = 20 + Math.random() * 20;
        this.group.position.set(
            playerPos.x + Math.cos(spawnAngle) * spawnRadius,
            playerPos.y + 15,
            playerPos.z + Math.sin(spawnAngle) * spawnRadius
        );

        this.speed = 2.5 + Math.random() * 2; // Random speed
        this.hp = 20;
        this.active = true;
        this.velocity = new THREE.Vector3();
    }

    takeDamage(amount) {
        this.hp -= amount;
        
        // Flash red
        this.group.children.forEach(child => {
            if (child.material && child.material.color) {
                const originalColor = child.material.color.getHex();
                child.material.color.setHex(0xff0000);
                setTimeout(() => {
                    if (this.active) child.material.color.setHex(originalColor);
                }, 200);
            }
        });

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.active = false;
        this.scene.remove(this.group);
    }

    update(delta, playerPos, world) {
        if (!this.active) return;

        // Simple gravity and ground collision
        this.velocity.y -= 15.0 * delta; // Gravity

        // Dynamic ground collision
        const currentX = Math.round(this.group.position.x);
        const currentZ = Math.round(this.group.position.z);
        let groundY = -50;
        if (world && world.blocks) {
            for (let y = 15; y >= -15; y--) {
                if (world.blocks.has(`${currentX},${y},${currentZ}`)) {
                    groundY = y + 1; // Stand on top of block
                    break;
                }
            }
        } else {
            groundY = 2; // Fallback
        }

        this.group.position.y += this.velocity.y * delta;

        if (this.group.position.y < groundY) {
            this.velocity.y = 0;
            this.group.position.y = groundY;
        }

        // Move towards player
        const direction = new THREE.Vector3();
        direction.subVectors(playerPos, this.group.position);
        direction.y = 0; // Ignore height difference for movement direction
        
        if (direction.length() > 1.0) {
            direction.normalize();
            this.group.position.addScaledVector(direction, this.speed * delta);
            
            // Look at player
            const lookTarget = this.group.position.clone().add(direction);
            lookTarget.y = this.group.position.y;
            this.group.lookAt(lookTarget);
        }
    }
}
