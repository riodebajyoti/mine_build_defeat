import * as THREE from 'three';

export const isTV = name => ['tv', 'television'].includes(String(name).toLowerCase());
export const TV_APPS = [
    { name: 'YouTube', id: 'youtube', url: 'https://www.youtube.com/', color: '#c52226' },
    { name: 'Netflix', id: 'netflix', url: 'https://www.netflix.com/', color: '#94121b' },
    { name: 'Prime Video', id: 'prime video', url: 'https://www.primevideo.com/', color: '#126994' },
    { name: 'Disney+', id: 'disney+', url: 'https://www.disneyplus.com/', color: '#17387c' },
];
export function findTVApp(name) {
    const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
    const aliases = { prime: 'prime video', 'amazon prime': 'prime video', 'amazon prime video': 'prime video', disney: 'disney+', 'disney plus': 'disney+' };
    return TV_APPS.find(app => app.id === (aliases[normalized] || normalized));
}

export function createTV() {
    const tv = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x171c24, roughness: 0.4 });
    const add = (w, h, d, x, y, z, material = dark) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        mesh.position.set(x, y, z); mesh.castShadow = true; tv.add(mesh); return mesh;
    };
    add(0.94, 0.59, 0.16, 0, 0.59, 0);
    add(0.12, 0.23, 0.12, 0, 0.20, 0);
    add(0.54, 0.06, 0.34, 0, 0.03, 0);
    add(0.025, 0.025, 0.012, 0.39, 0.335, 0.087,
        new THREE.MeshBasicMaterial({ color: 0x55ff88 })).name = 'tv-led';
    tv.userData = { itemName: 'TV', powered: true, channel: 0 };
    const screenMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 768; canvas.height = 432;
        screenMaterial.map = new THREE.CanvasTexture(canvas);
        screenMaterial.map.colorSpace = THREE.SRGBColorSpace;
    }
    add(0.84, 0.45, 0.014, 0, 0.61, 0.102, screenMaterial).name = 'tv-display';
    setTV(tv, 'status');
    return tv;
}

export function setTV(tv, action) {
    if (action === 'on' || action === 'home' || action === 'apps') tv.userData.powered = true;
    if (action === 'off') tv.userData.powered = false;
    if (action === 'channel') tv.userData.channel = (tv.userData.channel + 1) % TV_APPS.length;
    const app = action.startsWith('app ') ? findTVApp(action.slice(4)) : null;
    if (app) { tv.userData.channel = TV_APPS.indexOf(app); tv.userData.powered = true; }
    tv.getObjectByName('tv-led').material.color.setHex(tv.userData.powered ? 0x55ff88 : 0xff4444);
    drawTVScreen(tv);
    return `TV ${tv.userData.powered ? 'on' : 'off'} â€” selected app: ${TV_APPS[tv.userData.channel].name}.`;
}

function drawTVScreen(tv) {
    const display = tv.getObjectByName('tv-display');
    display.material.color.setHex(tv.userData.powered ? 0xffffff : 0x080b11);
    const texture = display.material.map;
    if (!texture) return;
    const ctx = texture.image.getContext('2d');
    ctx.fillStyle = '#080b11'; ctx.fillRect(0, 0, 768, 432);
    if (tv.userData.powered) {
        const gradient = ctx.createLinearGradient(0, 0, 768, 380);
        gradient.addColorStop(0, '#193b53'); gradient.addColorStop(1, '#080b11');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, 768, 432);
        ctx.fillStyle = '#ff9900'; ctx.font = 'bold 24px sans-serif'; ctx.fillText('MINE TV', 32, 43);
        ctx.fillStyle = '#ffffff'; ctx.font = '21px sans-serif'; ctx.fillText('Home     Your apps', 420, 43);
        ctx.fillStyle = '#ff9900'; ctx.fillRect(417, 53, 57, 3);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 42px sans-serif'; ctx.fillText('All your favorites.', 32, 127);
        ctx.font = '22px sans-serif'; ctx.fillStyle = '#c4cdd7'; ctx.fillText('Choose an app to open its official website.', 32, 166);
        ctx.fillStyle = '#ff9900'; ctx.fillRect(32, 191, 255, 43);
        ctx.fillStyle = '#11151c'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('Open apps: tv apps', 49, 220);
        TV_APPS.forEach((app, i) => {
            const x = 32 + i * 184;
            ctx.fillStyle = app.color; ctx.fillRect(x, 269, 166, 82);
            if (i === tv.userData.channel) { ctx.strokeStyle = '#ff9900'; ctx.lineWidth = 5; ctx.strokeRect(x, 269, 166, 82); }
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px sans-serif'; ctx.fillText(app.name, x + 15, 319);
        });
        ctx.fillStyle = '#aebaca'; ctx.font = '18px sans-serif'; ctx.fillText('Official services open in a new tab. Sign-in may be required.', 32, 397);
    }
    texture.needsUpdate = true;
}

let appsDialog;
export function showTVApps(tv, launchApp = null) {
    setTV(tv, 'on');
    document.exitPointerLock?.();
    if (appsDialog) appsDialog.remove();
    const dialog = document.createElement('dialog');
    appsDialog = dialog;
    dialog.setAttribute('aria-label', 'TV Apps');
    dialog.style.cssText = 'width:min(760px,90vw);box-sizing:border-box;border:1px solid #405166;border-radius:18px;background:#101924;color:white;padding:30px;font-family:Arial,sans-serif;box-shadow:0 20px 90px #000b;';
    const title = document.createElement('h2'); title.textContent = 'TV Apps'; title.style.cssText = 'margin:0 0 12px;color:#ff9900;font-size:30px;';
    const description = document.createElement('p'); description.textContent = 'Open the real service in a new tab. Use your account there to watch.';
    const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;margin:24px 0;';
    const links = new Map();
    for (const app of TV_APPS) {
        const link = document.createElement('a'); link.textContent = app.name;
        link.href = app.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.style.cssText = `padding:28px 15px;background:${app.color};color:white;text-align:center;text-decoration:none;border-radius:10px;font-weight:bold;font-size:24px;border:2px solid transparent;`;
        link.addEventListener('click', () => setTV(tv, 'app ' + app.id));
        link.addEventListener('focus', () => link.style.borderColor = '#ff9900');
        link.addEventListener('blur', () => link.style.borderColor = 'transparent');
        grid.append(link); links.set(app.id, link);
    }
    const close = document.createElement('button'); close.textContent = 'Back to game';
    close.style.cssText = 'padding:12px 22px;border:0;border-radius:8px;background:#ff9900;color:#111;font-weight:bold;font-size:17px;cursor:pointer;';
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { dialog.remove(); if (appsDialog === dialog) appsDialog = null; document.getElementById('agent-input')?.focus(); });
    // Keep game hotkeys and mining controls out of the app picker.
    for (const event of ['keydown', 'keyup', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend']) dialog.addEventListener(event, e => e.stopPropagation());
    dialog.append(title, description, grid, close); document.body.append(dialog); dialog.showModal();
    if (launchApp) links.get(launchApp.id).click();
}

export function buildTV({ camera, world, scene, placedFurniture, appendMessage }) {
    const direction = camera.getWorldDirection(new THREE.Vector3());
    direction.y = 0;
    if (direction.lengthSq() < 0.01) direction.set(0, 0, -1);
    direction.normalize();
    const x = Math.round(camera.position.x + direction.x * 3);
    const z = Math.round(camera.position.z + direction.z * 3);
    // Find nearby solid ground without altering the terrain or existing furniture.
    const start = Math.floor(camera.position.y);
    let y = start;
    while (y > start - 20 && !world.blocks.has(`${x},${y},${z}`)) y--;
    if (!world.blocks.has(`${x},${y},${z}`) || world.blocks.get(`${x},${y},${z}`) === 'Water' ||
        world.blocks.has(`${x},${y + 1},${z}`)) {
        appendMessage('No clear ground for a TV ahead. Look toward nearby dry ground and try build tv again.');
        return;
    }
    const position = new THREE.Vector3(x, y + 0.5, z);
    if (placedFurniture.some(mesh => mesh.position.distanceTo(position) < 1)) {
        appendMessage('Furniture is already there. Face an empty spot and try build tv again.');
        return;
    }
    const tv = createTV();
    tv.position.copy(position);
    tv.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z);
    scene.add(tv);
    placedFurniture.push(tv);
    appendMessage('Built TV in front of you. ' + setTV(tv, 'status') + ' Use tv apps, tv app youtube, tv app netflix, tv app prime video, or tv app disney+.');
}

export function controlTV(args, camera, placedFurniture, appendMessage) {
    const action = args.slice(1).join(' ').toLowerCase().trim() || 'status';
    const app = action.startsWith('app ') ? findTVApp(action.slice(4)) : null;
    if (!['on', 'off', 'channel', 'status', 'home', 'apps', 'open'].includes(action) && !app) {
        appendMessage('Usage: tv <on|off|home|apps|channel|open|status> or tv app <youtube|netflix|prime video|disney+>');
        return;
    }
    const nearby = placedFurniture.filter(mesh => isTV(mesh.userData.itemName) && mesh.position.distanceTo(camera.position) <= 8);
    nearby.sort((a, b) => a.position.distanceToSquared(camera.position) - b.position.distanceToSquared(camera.position));
    if (!nearby.length) { appendMessage('No TV within 8 blocks. Use build tv first.'); return; }
    const tv = nearby[0];
    appendMessage(setTV(tv, action));
    if (app || action === 'apps' || action === 'open') {
        const target = app || (action === 'open' ? TV_APPS[tv.userData.channel] : null);
        showTVApps(tv, target);
        if (target) appendMessage(`Requested ${target.name} in a new tab. If the browser blocks it, use its link in TV Apps.`);
    }
}
