import * as THREE from 'three';
import { state } from './state.js';

export class Boss {
    constructor(scene, playerCamera) {
        this.scene = scene;
        this.playerCamera = playerCamera;
        this.hp = 100;
        this.active = false;

        // --- MODEL ---
        this.group = new THREE.Group();
        this.group.position.set(20, 2, 20);

        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.1 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), bodyMat);
        torso.position.y = 1.5;
        this.group.add(torso);

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), bodyMat);
        head.position.y = 3.6;
        this.group.add(head);

        // Eyes
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), eyeMat);
        eyeL.position.set(-0.3, 3.7, 0.6);
        this.group.add(eyeL);

        const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), eyeMat);
        eyeR.position.set(0.3, 3.7, 0.6);
        this.group.add(eyeR);

        // Arms
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.5, 0.6), bodyMat);
        armL.position.set(-1.4, 2, 0);
        this.group.add(armL);

        const armR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.5, 0.6), bodyMat);
        armR.position.set(1.4, 2, 0);
        this.group.add(armR);

        this.scene.add(this.group);

        // Simple bounding box for hits
        this.box = new THREE.Box3().setFromObject(this.group);
    }

    activate() {
        this.active = true;
        state.showHelperMsg("WARNING: ios-2 has detected your presence!");
    }

    takeDamage(amount) {
        if (!this.active) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.die();
        } else {
            state.showHelperMsg(`ios-2 HP: ${Math.floor(this.hp)}%`);
            // Flash red
            this.group.traverse(child => {
                if (child.isMesh && child.material.color) {
                    const original = child.material.color.clone();
                    child.material.color.set(0xff0000);
                    setTimeout(() => child.material.color.copy(original), 100);
                }
            });
        }
    }

    die() {
        this.active = false;
        state.showHelperMsg("ios-2 DEFEATED! Mission Accomplished.");
        this.scene.remove(this.group);
        // Add celebration logic
    }

    update(delta) {
        if (!this.active) return;

        // Move towards player
        const direction = new THREE.Vector3();
        direction.subVectors(this.playerCamera.position, this.group.position);
        direction.y = 0; // Keep on ground

        if (direction.length() > 5) {
            direction.normalize();
            this.group.position.addScaledVector(direction, delta * 3);
            this.group.lookAt(this.playerCamera.position.x, 0, this.playerCamera.position.z);
        }

        // Update bounding box
        this.box.setFromObject(this.group);

        // Attack player if close
        if (direction.length() < 3) {
            state.setHP(state.hp - delta * 10);
            state.showHelperMsg("CRITICAL: Under attack by ios-2!");
        }
    }
}
