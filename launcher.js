const WORLDS_KEY = 'mine-build-defeat-worlds-v1';

const worldList = document.querySelector('#world-list');
const emptyState = document.querySelector('#empty-state');
const worldCount = document.querySelector('#world-count');
const dialog = document.querySelector('#world-dialog');
const form = document.querySelector('#world-form');
const nameInput = document.querySelector('#world-name');

function readWorlds() {
  try {
    const worlds = JSON.parse(localStorage.getItem(WORLDS_KEY) || '[]');
    return Array.isArray(worlds) ? worlds : [];
  } catch {
    return [];
  }
}

function writeWorlds(worlds) {
  localStorage.setItem(WORLDS_KEY, JSON.stringify(worlds));
}

function safeId() {
  return globalThis.crypto?.randomUUID?.() || `world-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function openWorld(world) {
  world.lastPlayedAt = new Date().toISOString();
  const worlds = readWorlds().map(item => item.id === world.id ? world : item);
  writeWorlds(worlds);
  const params = new URLSearchParams({ worldId: world.id, mode: world.mode, name: world.name });
  location.href = `game.html?${params}`;
}

function removeWorld(world) {
  if (!confirm(`Delete “${world.name}” and its locally saved build?`)) return;
  writeWorlds(readWorlds().filter(item => item.id !== world.id));
  localStorage.removeItem(`mine-build-defeat-save:${world.id}`);
  render();
}

function render() {
  const worlds = readWorlds().sort((a, b) => (b.lastPlayedAt || b.createdAt).localeCompare(a.lastPlayedAt || a.createdAt));
  worldList.replaceChildren();
  emptyState.hidden = worlds.length > 0;
  worldCount.textContent = `${worlds.length} ${worlds.length === 1 ? 'WORLD' : 'WORLDS'}`;

  for (const world of worlds) {
    const card = document.createElement('article');
    card.className = 'world-card';
    const date = new Date(world.lastPlayedAt || world.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    card.innerHTML = `<div class="world-meta">${world.mode.toUpperCase()} • LOCAL</div><h3></h3><p>Last played ${date}</p><div class="card-actions"><button class="play">CONTINUE →</button><button class="delete" aria-label="Delete world">×</button></div>`;
    card.querySelector('h3').textContent = world.name;
    card.querySelector('.play').addEventListener('click', () => openWorld(world));
    card.querySelector('.delete').addEventListener('click', () => removeWorld(world));
    worldList.append(card);
  }
}

document.querySelector('#create-world').addEventListener('click', () => {
  nameInput.value = `World ${readWorlds().length + 1}`;
  dialog.showModal();
  nameInput.select();
});

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const world = {
    id: safeId(),
    name: nameInput.value.trim() || 'My World',
    mode: new FormData(form).get('mode') === 'survival' ? 'survival' : 'creative',
    createdAt: new Date().toISOString(),
    lastPlayedAt: new Date().toISOString(),
  };
  writeWorlds([...readWorlds(), world]);
  dialog.close();
  openWorld(world);
});

render();
