import * as THREE from 'three';
import { state } from './state.js';

export class Animal {
    constructor(scene, playerPos = new THREE.Vector3()) {
        this.scene = scene;
        this.group = new THREE.Group();

        // Simple sheep-like animal
        const bodyGeo = new THREE.BoxGeometry(1.2, 0.8, 1.6);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); // White color
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.8;
        
        // Head
        const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa }); // Skin color
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.2;
        head.position.z = 0.8;
        
        // Legs (Front left/right, Back left/right)
        const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const legMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
        
        const leg1 = new THREE.Mesh(legGeo, legMat); // FL
        leg1.position.set(-0.4, 0.3, 0.5);
        const leg2 = new THREE.Mesh(legGeo, legMat); // FR
        leg2.position.set(0.4, 0.3, 0.5);
        const leg3 = new THREE.Mesh(legGeo, legMat); // BL
        leg3.position.set(-0.4, 0.3, -0.5);
        const leg4 = new THREE.Mesh(legGeo, legMat); // BR
        leg4.position.set(0.4, 0.3, -0.5);
        
        this.legs = [leg1, leg2, leg3, leg4];
        this.animTime = 0;

        this.group.add(body, head, leg1, leg2, leg3, leg4);
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
            this.die(true);
        }
    }

    die(killedByPlayer = false) {
        this.active = false;
        this.scene.remove(this.group);
        if (killedByPlayer) {
            state.addResource('Meat', 1);
        }
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

            // Leg swing animation
            this.animTime += delta * this.speed * 8;
            this.legs[0].rotation.x = Math.sin(this.animTime) * 0.5; // FL
            this.legs[3].rotation.x = Math.sin(this.animTime) * 0.5; // BR
            this.legs[1].rotation.x = -Math.sin(this.animTime) * 0.5; // FR
            this.legs[2].rotation.x = -Math.sin(this.animTime) * 0.5; // BL
        } else {
            // Stand still
            this.legs.forEach(leg => { leg.rotation.x = 0; });
        }
    }
}
