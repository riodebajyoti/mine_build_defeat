import * as THREE from 'three';
import { getItemCanvas } from './item_icons.js';

export class DroppedItem {
    constructor(scene, position, itemName, count = 1) {
        this.scene = scene;
        this.itemName = itemName;
        this.count = count;
        this.active = true;
        this.bobTime = Math.random() * Math.PI * 2;
        this.groundY = position.y;

        const canvas = getItemCanvas(itemName);
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;

        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        this.sprite = new THREE.Sprite(mat);
        this.sprite.scale.set(0.45, 0.45, 0.45);
        this.sprite.position.set(position.x, this.groundY + 0.35, position.z);
        scene.add(this.sprite);
    }

    update(delta, playerPos, state) {
        if (!this.active) return;

        this.bobTime += delta * 2.2;
        this.sprite.position.y = this.groundY + 0.35 + Math.sin(this.bobTime) * 0.08;
        this.sprite.material.rotation += delta * 1.8;
    }

    die() {
        this.active = false;
        this.scene.remove(this.sprite);
        this.sprite.material.map.dispose();
        this.sprite.material.dispose();
    }
}
