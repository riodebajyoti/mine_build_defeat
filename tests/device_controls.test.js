import assert from 'node:assert/strict';
import { shouldUseTouchControls } from '../src/device_controls.js';

const cases = [
    ['desktop', 'fine', 0, 'Win32', '', false],
    ['narrow desktop window', 'fine', 0, 'MacIntel', '', false],
    ['touchscreen laptop with mouse', 'fine', 10, 'Win32', '', false],
    ['Android tablet', 'coarse', 5, 'Linux', '', true],
    ['iPad desktop identity with trackpad', 'fine', 5, 'MacIntel', '', true],
    ['iPad mobile identity', 'fine', 5, 'iPad', 'iPad', true],
    ['phone', 'coarse', 5, 'Linux', '', true],
    ['touch device with no primary pointer', 'none', 5, '', '', true],
    ['no pointer and no touch', 'none', 0, '', '', false],
];
for (const [name, pointer, maxTouchPoints, platform, userAgent, expected] of cases) {
    for (const innerWidth of [600, 1024, 1920]) {
        const deviceWindow = { innerWidth, matchMedia: query => ({ matches: query === `(pointer: ${pointer})` }) };
        assert.equal(shouldUseTouchControls(deviceWindow, { maxTouchPoints, platform, userAgent }), expected, `${name} at ${innerWidth}px`);
    }
}
console.log('Passed 27 device/input detection cases.');
