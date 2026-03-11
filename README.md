# Ivy Corner Companion Overlay (OBS Browser Source)

A lightweight web overlay for OBS Browser Source that renders a subtle living ivy growth in one corner of the stream.

## Visual direction
- top-right corner botanical companion
- dark botanical greens (healthy), olive/grey-green (corrupted)
- soft ivory bloom on reset
- no labels, bars, or UI widgets

## Quick start
1. Add a **Browser Source** in OBS.
2. Use local file `overlay/index.html`.
3. Recommended source size: `320x240`.
4. Keep source background transparent.

## States
- `sprout` (base)
- `growing` (healthier/full)
- `wilted` (corrupted/drooping)
- `blooming` (brief reset burst)

## Manual testing
```js
window.ChatEye.receive({ type: 'action', action: 'corrupt' });
window.ChatEye.receive({ type: 'action', action: 'heal' });
window.ChatEye.receive({ type: 'action', action: 'reset' });
window.ChatEye.receive({ type: 'action', action: 'lookLeft' });
window.ChatEye.receive({ type: 'action', action: 'lookRight' });
window.ChatEye.receive({ type: 'setScore', value: 5 });
window.ChatEye.receive({ type: 'setState', state: 'growing' });
```

Optional WebSocket bridge:
- `overlay/index.html?ws=ws://127.0.0.1:8080`

See `docs/V1_SPEC.md` for protocol details.
