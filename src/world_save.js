function storageKey(worldId) {
    return `mine-build-defeat-save:${worldId}`;
}

export async function loadWorldSave(worldId) {
    const raw = window.localStorage.getItem(storageKey(worldId));
    if (!raw) return { position: null, overrides: [] };
    const save = JSON.parse(raw);
    return {
        position: Array.isArray(save.position) ? save.position : null,
        overrides: Array.isArray(save.overrides) ? save.overrides : [],
        televisions: Array.isArray(save.televisions) ? save.televisions : [],
    };
}

export async function saveWorld(worldId, camera, world, keepalive = false, televisions = []) {
    const payload = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        overrides: world.getSavedOverrides(),
        televisions,
    };
    window.localStorage.setItem(storageKey(worldId), JSON.stringify(payload));
}
