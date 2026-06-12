import * as THREE from 'three';

export class WeatherSystem {
    constructor(scene) {
        this.scene = scene;
        this.weatherType = 'clear';
        this.rainCount = 4000;
        this.rainPositions = null;
        this.rainParticles = null;
        this.lightningTimer = 0;
        this.lightningFlash = null;
        this.isActive = false;
        this.fogColor = new THREE.Color();

        this._createRainSystem();
        this._createLightningOverlay();
    }

    _createRainSystem() {
        const positions = new Float32Array(this.rainCount * 3);
        for (let i = 0; i < this.rainCount; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = Math.random() * 40;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x99aabb,
            size: 0.07,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            sizeAttenuation: true,
        });

        this.rainParticles = new THREE.Points(geometry, material);
        this.rainPositions = positions;
        this.scene.add(this.rainParticles);
    }

    _createLightningOverlay() {
        this.lightningFlash = document.createElement('div');
        this.lightningFlash.id = 'lightning-flash';
        this.lightningFlash.style.cssText = `
            position: fixed;
            inset: 0;
            background: white;
            opacity: 0;
            pointer-events: none;
            z-index: 998;
        `;
        document.body.appendChild(this.lightningFlash);
    }

    setWeather(type, scene, ambient, sun) {
        this.weatherType = type;
        const mat = this.rainParticles.material;

        if (type === 'clear') {
            mat.opacity = 0.0;
            this.isActive = false;
            if (scene && ambient) {
                scene.fog.density = 0.05;
            }
        } else if (type === 'rain') {
            mat.opacity = 0.45;
            this.isActive = true;
            if (scene) scene.fog.density = 0.07;
        } else if (type === 'storm') {
            mat.opacity = 0.65;
            this.isActive = true;
            this.lightningTimer = 1.5 + Math.random() * 4;
            if (scene) scene.fog.density = 0.09;
        }
    }

    update(delta, playerPos) {
        if (!this.isActive) return;

        const speed = this.weatherType === 'storm' ? 28 : 16;
        this.rainParticles.position.copy(playerPos);

        for (let i = 0; i < this.rainCount; i++) {
            this.rainPositions[i * 3 + 1] -= speed * delta;
            if (this.rainPositions[i * 3 + 1] < -5) {
                this.rainPositions[i * 3 + 1] = 35;
                this.rainPositions[i * 3]     = (Math.random() - 0.5) * 100;
                this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 100;
            }
        }
        this.rainParticles.geometry.attributes.position.needsUpdate = true;

        if (this.weatherType === 'storm') {
            this.lightningTimer -= delta;
            if (this.lightningTimer <= 0) {
                this._triggerLightning();
                this.lightningTimer = 3 + Math.random() * 8;
            }
        }
    }

    _triggerLightning() {
        const el = this.lightningFlash;
        el.style.transition = 'none';
        el.style.opacity = '0.85';
        setTimeout(() => {
            el.style.transition = 'opacity 0.08s';
            el.style.opacity = '0';
        }, 70);
        setTimeout(() => {
            el.style.transition = 'none';
            el.style.opacity = '0.55';
        }, 180);
        setTimeout(() => {
            el.style.transition = 'opacity 0.12s';
            el.style.opacity = '0';
        }, 260);
    }

    getStatus() {
        if (this.weatherType === 'clear') return 'CLEAR';
        if (this.weatherType === 'rain') return 'RAIN';
        return 'STORM';
    }

    getIcon() {
        if (this.weatherType === 'clear') return '☀️';
        if (this.weatherType === 'rain') return '🌧️';
        return '⛈️';
    }
}
