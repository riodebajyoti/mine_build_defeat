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

        this.bobTime += delta * 2.2;
        this.mesh.position.y = this.groundY + 0.35 + Math.sin(this.bobTime) * 0.08;
        
        if (this.mesh.isSprite) {
            this.mesh.material.rotation += delta * 1.8;
        } else {
            this.mesh.rotation.y += delta * 1.8;
        }
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
