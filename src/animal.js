import * as THREE from 'three';

export class Animal {
    constructor(scene, playerPos = new THREE.Vector3()) {
        this.scene = scene;
        this.group = new THREE.Group();

        // Simple sheep-like animal
        const bodyGeo = new THREE.BoxGeometry(1.2, 0.8, 1.6);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); // White color
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6;
        
        // Head
        const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa }); // Skin color
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.0;
        head.position.z = 0.8;
        
        this.group.add(body, head);
        this.scene.add(this.group);

        // Random spawn far away relative to player
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnRadius = 20 + Math.random() * 20;
        this.group.position.set(
            playerPos.x + Math.cos(spawnAngle) * spawnRadius,
            playerPos.y + 15,
            playerPos.z + Math.sin(spawnAngle) * spawnRadius
        );

        this.speed = 1.0 + Math.random() * 1.5; // Slower than monsters
        this.hp = 10;
        this.active = true;
        this.velocity = new THREE.Vector3();
        this.wanderDirection = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
        this.changeDirectionTime = 0;
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

        // Flee when hit
        this.speed = 4.0;
        
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

        // Wandering logic
        this.changeDirectionTime -= delta;
        if (this.changeDirectionTime <= 0) {
            this.wanderDirection.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
            this.changeDirectionTime = 2 + Math.random() * 5; // Change direction every 2-7 seconds
            
            // Randomly stop moving
            if (Math.random() < 0.3) {
                this.speed = 0;
            } else {
                this.speed = 1.0 + Math.random() * 1.5;
            }
        }

        // Move
        if (this.speed > 0) {
            this.group.position.addScaledVector(this.wanderDirection, this.speed * delta);
            
            // Look in direction of travel
            const lookTarget = this.group.position.clone().add(this.wanderDirection);
            lookTarget.y = this.group.position.y;
            this.group.lookAt(lookTarget);
        }
    }
}
