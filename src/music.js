import { tracks } from './music_tracks.js';
import { state } from './state.js';
let context, bus, phase = 'day', next = 0, index = 0, active = false;
export function updateMusic(value) {
    const selected = value === 'NIGHT' ? 'night' : 'day';
    if (selected !== phase) { phase = selected; active = false; }
}
async function unlock() {
    try {
        context ||= new (window.AudioContext || window.webkitAudioContext)();
        if (!bus) { bus = context.createGain(); bus.gain.value = 0.12; bus.connect(context.destination); }
        await context.resume();
    } catch (error) { console.warn('Music could not start', error); }
}
document.addEventListener('pointerdown', unlock);
document.addEventListener('keydown', unlock);
function note(pitch, drum, time) {
    const oscillator = context.createOscillator(), envelope = context.createGain();
    oscillator.type = drum ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(drum ? (pitch === 35 ? 120 : 330) : 440 * 2 ** ((pitch - 69) / 12), time);
    if (drum) oscillator.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    envelope.gain.setValueAtTime(0.001, time);
    envelope.gain.exponentialRampToValueAtTime(drum ? 0.3 : 0.55, time + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + (drum ? 0.17 : 0.4));
    oscillator.connect(envelope).connect(bus);
    oscillator.start(time); oscillator.stop(time + 0.45);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
}
setInterval(() => {
    if (!context || context.state !== 'running') return;
    const playing = state.isPointerLocked && !document.hidden && state.hp > 0;
    bus.gain.setTargetAtTime(playing ? 0.12 : 0, context.currentTime, 0.04);
    if (!playing) { active = false; return; }
    const track = tracks[phase];
    if (!active) { next = context.currentTime + 0.03; index = 0; active = true; }
    if (next + track.notes[index][0] < context.currentTime - 0.2) { next = context.currentTime + 0.03; index = 0; }
    while (next + track.notes[index][0] < context.currentTime + 0.1) {
        const [offset, pitch, drum] = track.notes[index];
        note(pitch, drum, next + offset);
        if (++index === track.notes.length) { index = 0; next += track.duration; }
    }
}, 25);
