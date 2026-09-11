import * as THREE from 'three';

export const isTV = name => ['tv', 'television'].includes(String(name).toLowerCase());
export function parseYouTubeId(value) {
    const text = String(value || '').trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;
    try {
        const url = new URL(text);
        if (url.protocol !== 'https:') return null;
        const host = url.hostname.toLowerCase();
        let id;
        if (host === 'youtu.be') id = url.pathname.slice(1);
        else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
            id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(embed|shorts|live)\/([^/]+)$/.exec(url.pathname)?.[2];
        }
        return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : null;
    } catch { return null; }
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
    tv.userData = { itemName: 'TV', powered: true, videoId: '' };
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
    if (['on', 'home', 'apps'].includes(action)) tv.userData.powered = true;
    if (action === 'off') {
        tv.userData.powered = false;
        if (activeTV === tv) closeTVPlayer();
    }
    tv.getObjectByName('tv-led').material.color.setHex(tv.userData.powered ? 0x55ff88 : 0xff4444);
    drawTVScreen(tv);
    return `TV ${tv.userData.powered ? 'on' : 'off'} — YouTube${tv.userData.videoId ? ': ' + tv.userData.videoId : ' ready'}.`;
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
        ctx.fillStyle = '#ffffff'; ctx.font = '21px sans-serif'; ctx.fillText('Home     YouTube', 420, 43);
        ctx.fillStyle = '#ff9900'; ctx.fillRect(417, 53, 57, 3);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 42px sans-serif'; ctx.fillText('YouTube on your TV.', 32, 127);
        ctx.font = '22px sans-serif'; ctx.fillStyle = '#c4cdd7'; ctx.fillText('Watch videos right here in the game.', 32, 166);
        ctx.fillStyle = '#ff9900'; ctx.fillRect(32, 191, 255, 43);
        ctx.fillStyle = '#11151c'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('Open: tv youtube', 49, 220);
        ctx.fillStyle = '#c52226'; ctx.fillRect(32, 269, 704, 82);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 34px sans-serif'; ctx.fillText('▶  YouTube', 265, 323);
        ctx.fillStyle = '#aebaca'; ctx.font = '18px sans-serif'; ctx.fillText('Use tv youtube <video URL or ID> to choose a video.', 32, 397);
    }
    texture.needsUpdate = true;
}

let playerDialog;
let activeTV;
export function closeTVPlayer() {
    if (playerDialog) {
        playerDialog.querySelector('iframe')?.remove();
        playerDialog.remove();
    }
    playerDialog = null;
    activeTV = null;
}

export function showTVApps(tv, videoId = '') {
    closeTVPlayer();
    setTV(tv, 'on');
    document.exitPointerLock?.();
    const dialog = document.createElement('dialog');
    playerDialog = dialog; activeTV = tv;
    dialog.setAttribute('aria-label', 'YouTube TV player');
    dialog.style.cssText = 'width:min(900px,94vw);max-height:94vh;box-sizing:border-box;overflow:auto;border:1px solid #405166;border-radius:18px;background:#101924;color:white;padding:24px;font-family:Arial,sans-serif;box-shadow:0 20px 90px #000b;';
    const title = document.createElement('h2'); title.textContent = 'YouTube • TV'; title.style.cssText = 'margin:0 0 16px;color:#ff9900;';
    const form = document.createElement('form'); form.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;';
    const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'YouTube video URL or ID'; input.setAttribute('aria-label', 'YouTube video URL or ID');
    input.style.cssText = 'flex:1;min-width:180px;padding:12px;border:1px solid #667080;border-radius:7px;background:#202b39;color:white;font-size:16px;';
    const button = document.createElement('button'); button.type = 'submit'; button.textContent = 'Play video';
    button.style.cssText = 'padding:12px 20px;border:0;border-radius:7px;background:#c52226;color:white;font-size:16px;cursor:pointer;';
    form.append(input, button);
    const message = document.createElement('p'); message.setAttribute('role', 'status'); message.textContent = 'Paste a YouTube link to watch inside the game.';
    const frameHost = document.createElement('div');
    const loadVideo = value => {
        const id = parseYouTubeId(value);
        if (!id) { message.textContent = 'Enter a valid YouTube video URL or 11-character video ID.'; return; }
        tv.userData.videoId = id;
        input.value = id;
        frameHost.replaceChildren();
        const frame = document.createElement('iframe');
        frame.title = 'YouTube video player';
        frame.src = `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0`;
        frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        frame.allowFullscreen = true;
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.style.cssText = 'display:block;width:100%;aspect-ratio:16/9;min-height:200px;border:0;border-radius:8px;background:#000;';
        frameHost.append(frame);
        message.textContent = 'Use the YouTube player controls. If a video cannot be embedded, try another video.';
        drawTVScreen(tv);
    };
    form.addEventListener('submit', e => { e.preventDefault(); loadVideo(input.value); });
    const close = document.createElement('button'); close.textContent = 'Stop & back to game';
    close.style.cssText = 'margin-top:14px;padding:12px 20px;border:0;border-radius:7px;background:#ff9900;color:#111;font-size:16px;cursor:pointer;';
    const stop = () => { closeTVPlayer(); document.getElementById('agent-input')?.focus(); };
    close.addEventListener('click', stop);
    dialog.addEventListener('cancel', e => { e.preventDefault(); stop(); });
    for (const event of ['keydown', 'keyup', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend']) dialog.addEventListener(event, e => e.stopPropagation());
    dialog.append(title, form, frameHost, message, close); document.body.append(dialog); dialog.showModal();
    if (videoId || tv.userData.videoId) loadVideo(videoId || tv.userData.videoId);
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
    appendMessage('Built TV in front of you. ' + setTV(tv, 'status') + ' Use tv youtube <video URL or ID> to watch in the game.');
}

export function controlTV(args, camera, placedFurniture, appendMessage) {
    const action = (args[1] || 'status').toLowerCase();
    const youtube = action === 'youtube' || (action === 'app' && args[2]?.toLowerCase() === 'youtube');
    const value = args.slice(action === 'app' ? 3 : 2).join(' ');
    if (!youtube && !['on', 'off', 'home', 'apps', 'open', 'status', 'stop'].includes(action)) {
        appendMessage('Usage: tv <on|off|home|open|status|stop> or tv youtube <video URL or ID>'); return;
    }
    const id = youtube && value ? parseYouTubeId(value) : '';
    if (youtube && value && !id) { appendMessage('Enter a valid YouTube video URL or 11-character video ID.'); return; }
    const nearby = placedFurniture.filter(mesh => isTV(mesh.userData.itemName) && mesh.position.distanceTo(camera.position) <= 8);
    nearby.sort((a, b) => a.position.distanceToSquared(camera.position) - b.position.distanceToSquared(camera.position));
    if (!nearby.length) { appendMessage('No TV within 8 blocks. Use build tv first.'); return; }
    const tv = nearby[0];
    if (action === 'stop') { closeTVPlayer(); appendMessage('TV playback stopped.'); return; }
    if (youtube || ['apps', 'open'].includes(action)) {
        showTVApps(tv, id);
        appendMessage('YouTube player opened inside the game. Use Stop & back to game to return.');
    } else appendMessage(setTV(tv, action));
}
