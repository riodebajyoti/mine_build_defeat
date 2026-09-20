// Choose controls by input capability, never by browser-window width.
export function shouldUseTouchControls(deviceWindow = window, deviceNavigator = navigator) {
    const coarsePointer = deviceWindow.matchMedia('(pointer: coarse)').matches;
    const finePointer = deviceWindow.matchMedia('(pointer: fine)').matches;
    const hasTouch = deviceNavigator.maxTouchPoints > 0;
    // iPadOS can identify itself as a Mac, including with a trackpad attached.
    const isIPad = /iPad/i.test(deviceNavigator.userAgent || '') ||
        (deviceNavigator.platform === 'MacIntel' && deviceNavigator.maxTouchPoints > 1);
    return isIPad || coarsePointer || (hasTouch && !finePointer);
}
