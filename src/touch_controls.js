import { state } from './state.js';

const touchMode = window.matchMedia('(pointer: coarse)').matches ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth <= 1180;

const controlsRoot = document.getElementById('mobile-controls');

if (touchMode && controlsRoot) {
    document.body.classList.add('touch-device');
    initializeTouchControls();
}

function initializeTouchControls() {
    const moveStick = document.getElementById('move-stick');
    const moveKnob = document.getElementById('move-knob');
    const lookZone = document.getElementById('look-zone');
    const startButton = document.getElementById('start-btn');
    const overlay = document.getElementById('overlay');
    const inventoryBar = document.getElementById('inventory-bar');

    let movePointer = null;
    let lookPointer = null;
    let lastLookX = 0;
    let lastLookY = 0;
    const activeMoveKeys = new Set();

    const dispatchKey = (code, pressed) => {
        document.dispatchEvent(new KeyboardEvent(pressed ? 'keydown' : 'keyup', {
            code,
            key: code,
            bubbles: true
        }));
    };

    const setMoveKey = (code, pressed) => {
        if (pressed && !activeMoveKeys.has(code)) {
            activeMoveKeys.add(code);
            dispatchKey(code, true);
        } else if (!pressed && activeMoveKeys.has(code)) {
            activeMoveKeys.delete(code);
            dispatchKey(code, false);
        }
    };

    const resetMovement = () => {
        [...activeMoveKeys].forEach(code => dispatchKey(code, false));
        activeMoveKeys.clear();
        movePointer = null;
        if (moveKnob) moveKnob.style.transform = 'translate(-50%, -50%)';
    };

    const activateGame = () => {
        state.isPointerLocked = true;
        document.body.classList.add('game-started');
        if (overlay) overlay.style.display = 'none';
    };

    startButton?.addEventListener('click', () => {
        setTimeout(activateGame, 0);
    });

    moveStick?.addEventListener('pointerdown', event => {
        if (!state.isPointerLocked) return;
        event.preventDefault();
        event.stopPropagation();
        movePointer = event.pointerId;
        moveStick.setPointerCapture(event.pointerId);
        updateJoystick(event);
    });

    moveStick?.addEventListener('pointermove', event => {
        if (event.pointerId !== movePointer) return;
        event.preventDefault();
        updateJoystick(event);
    });

    const releaseJoystick = event => {
        if (event.pointerId !== movePointer) return;
        event.preventDefault();
        resetMovement();
    };

    moveStick?.addEventListener('pointerup', releaseJoystick);
    moveStick?.addEventListener('pointercancel', releaseJoystick);

    function updateJoystick(event) {
        const ring = moveStick.querySelector('.stick-ring');
        const rect = ring.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const maxDistance = rect.width * 0.34;
        let dx = event.clientX - centerX;
        let dy = event.clientY - centerY;
        const distance = Math.hypot(dx, dy);

        if (distance > maxDistance) {
            dx = dx / distance * maxDistance;
            dy = dy / distance * maxDistance;
        }

        moveKnob.style.transform =
            'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';

        const deadZone = maxDistance * 0.22;
        setMoveKey('ArrowUp', dy < -deadZone);
        setMoveKey('ArrowDown', dy > deadZone);
        setMoveKey('ArrowLeft', dx < -deadZone);
        setMoveKey('ArrowRight', dx > deadZone);
    }

    lookZone?.addEventListener('pointerdown', event => {
        if (!state.isPointerLocked) return;
        event.preventDefault();
        event.stopPropagation();
        lookPointer = event.pointerId;
        lastLookX = event.clientX;
        lastLookY = event.clientY;
        lookZone.setPointerCapture(event.pointerId);
    });

    lookZone?.addEventListener('pointermove', event => {
        if (event.pointerId !== lookPointer || !state.isPointerLocked) return;
        event.preventDefault();

        const camera = window.touchGameCamera;
        if (!camera) return;

        const dx = event.clientX - lastLookX;
        const dy = event.clientY - lastLookY;
        lastLookX = event.clientX;
        lastLookY = event.clientY;

        camera.rotation.order = 'YXZ';
        camera.rotation.y -= dx * 0.0032;
        camera.rotation.x -= dy * 0.0032;
        camera.rotation.x = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, camera.rotation.x));
    });

    const releaseLook = event => {
        if (event.pointerId === lookPointer) lookPointer = null;
    };

    lookZone?.addEventListener('pointerup', releaseLook);
    lookZone?.addEventListener('pointercancel', releaseLook);

    const bindAction = (id, mouseButton) => {
        const button = document.getElementById(id);
        if (!button) return;

        button.addEventListener('pointerdown', event => {
            event.preventDefault();
            event.stopPropagation();
            if (!state.isPointerLocked) return;
            button.classList.add('pressed');
            button.setPointerCapture(event.pointerId);
            document.dispatchEvent(new MouseEvent('mousedown', {
                button: mouseButton,
                bubbles: true
            }));
        });

        const release = event => {
            event.preventDefault();
            event.stopPropagation();
            button.classList.remove('pressed');
        };

        button.addEventListener('pointerup', release);
        button.addEventListener('pointercancel', release);
    };

    bindAction('mobile-mine-btn', 0);
    bindAction('mobile-place-btn', 2);

    const jumpButton = document.getElementById('mobile-jump-btn');
    jumpButton?.addEventListener('pointerdown', event => {
        event.preventDefault();
        event.stopPropagation();
        if (!state.isPointerLocked) return;
        jumpButton.classList.add('pressed');
        jumpButton.setPointerCapture(event.pointerId);
        dispatchKey('Space', true);
    });

    const releaseJump = event => {
        event.preventDefault();
        event.stopPropagation();
        jumpButton?.classList.remove('pressed');
        dispatchKey('Space', false);
    };

    jumpButton?.addEventListener('pointerup', releaseJump);
    jumpButton?.addEventListener('pointercancel', releaseJump);

    const menuButton = document.getElementById('mobile-menu-btn');
    menuButton?.addEventListener('pointerdown', event => {
        event.preventDefault();
        event.stopPropagation();
        resetMovement();
        dispatchKey('KeyE', true);
        dispatchKey('KeyE', false);
    });

    const pauseButton = document.getElementById('mobile-pause-btn');
    pauseButton?.addEventListener('pointerdown', event => {
        event.preventDefault();
        event.stopPropagation();
        resetMovement();
        state.isPointerLocked = false;
        if (overlay) overlay.style.display = 'flex';
    });

    inventoryBar?.addEventListener('mousedown', event => event.stopPropagation());
    inventoryBar?.addEventListener('pointerdown', event => event.stopPropagation());

    document.addEventListener('click', event => {
        if (event.target.closest('#close-accessories-btn, .accessory-item, #respawn-btn, .bk-close')) {
            setTimeout(activateGame, 80);
        }
    });

    document.addEventListener('contextmenu', event => {
        if (state.isPointerLocked) event.preventDefault();
    });

    window.addEventListener('blur', resetMovement);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) resetMovement();
    });
}
