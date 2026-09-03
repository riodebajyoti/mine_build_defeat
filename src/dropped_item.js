import * as THREE from 'three';
import { getItemCanvas } from './item_icons.js';

export class DroppedItem {
    constructor(scene, position, itemName, count = 1, meshFactory) {
        this.scene = scene;
        this.itemName = itemName;
        this.count = count;
        this.active = true;
        this.bobTime = Math.random() * Math.PI * 2;
        this.groundY = position.y;
        this.pickupDelay = 0.65;
        this.velocity = new THREE.Vector3();

        if (meshFactory) {
            this.mesh = meshFactory(itemName);
        } else {
            const canvas = getItemCanvas(itemName);
            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;

            const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
            this.mesh = new THREE.Sprite(mat);
            this.mesh.scale.set(0.45, 0.45, 0.45);
        }

        this.mesh.position.set(position.x, this.groundY + 0.35, position.z);
        scene.add(this.mesh);
    }

    update(delta, playerPos, state) {
        if (!this.active) return;

        this.pickupDelay = Math.max(0, this.pickupDelay - delta);
        this.bobTime += delta * 2.2;
        this.velocity.y -= 11 * delta;
        this.mesh.position.addScaledVector(this.velocity, delta);
        const restingY = this.groundY + 0.35;
        if (this.mesh.position.y < restingY) {
            this.mesh.position.y = restingY;
            if (Math.abs(this.velocity.y) > 0.45) this.velocity.y *= -0.28;
            else this.velocity.y = 0;
        }
        if (this.velocity.y === 0) this.mesh.position.y = restingY + Math.sin(this.bobTime) * 0.08;
        
        this.mesh.rotation.y += delta * 1.8;

        if (this.pickupDelay === 0 && playerPos) {
            const distance = this.mesh.position.distanceTo(playerPos);
            if (distance < 3) {
                const pull = playerPos.clone().sub(this.mesh.position).normalize();
                this.mesh.position.addScaledVector(pull, delta * Math.max(1.5, 5 - distance));
            }
            if (distance < 1.05 && state) {
                state.addResource(this.itemName, this.count);
                state.showHelperMsg(`Picked up ${this.count}x ${this.itemName}!`);
                this.die();
            }
        }
    }

    canMergeWith(other) {
        return this.active && other.active &&
            this.itemName.toLowerCase() === other.itemName.toLowerCase() &&
            this.mesh.position.distanceToSquared(other.mesh.position) < 0.64;
    }

    merge(other) {
        if (!this.canMergeWith(other)) return false;
        this.count += other.count;
        other.die();
        return true;
    }

    die() {
        this.active = false;
        this.scene.remove(this.mesh);
        if (this.mesh.geometry) this.mesh.geometry.dispose();
        if (this.mesh.material) {
            if (Array.isArray(this.mesh.material)) {
                this.mesh.material.forEach(m => m.dispose());
            } else {
                if (this.mesh.material.map) this.mesh.material.map.dispose();
                this.mesh.material.dispose();
            }
        }
    }
}
