# Ghost Dog Overlay (OBS Browser Source)

This repo contains a lightweight web overlay for OBS Browser Source and a simple message protocol so Streamer.bot can push stream pet actions/states from Twitch chat events.

The stream pet is now a ghost dog:
- includes a special **turn reaction** where it rises on 2 legs and spins
- **best condition**: happy, ghostly-yellow glow with energetic wagging
- **worst condition**: poisoned by ivy, cycles through sick-on-ground, zombified, and true-zombie expressions with choking/suffocating motion

## Quick start

1. Open OBS and add a **Browser Source**.
2. Point it to `overlay/index.html` as a local file.
3. Set dimensions to `320x220` (or your preference).
4. Keep background transparency enabled.

## Localhost preview (recommended)

If you want a quick local test page in your browser:

1. From the repo root, run:
   ```bash
   python3 -m http.server 4173
   ```
2. Open:
   - `http://localhost:4173` (new test page with control buttons), or
   - `http://localhost:4173/overlay/index.html` (raw overlay only).

The root test page includes buttons for heal/corrupt/reset/look/blink so you can verify the ghost dog animation states without needing OBS first.

## Manual testing

In the browser dev console:

```js
window.ChatEye.receive({ type: 'action', action: 'corrupt' });
window.ChatEye.receive({ type: 'action', action: 'heal' });
window.ChatEye.receive({ type: 'action', action: 'reset' });
window.ChatEye.receive({ type: 'action', action: 'blink' });
window.ChatEye.receive({ type: 'action', action: 'lookLeft' });
window.ChatEye.receive({ type: 'action', action: 'lookRight' });
window.ChatEye.receive({ type: 'action', action: 'turn' });
```

Set score directly:

```js
window.ChatEye.receive({ type: 'setScore', value: 8 });
```

## State thresholds

- `0-1`: Awakened (happy ghost dog)
- `2-3`: Overgrown
- `4-5`: Corrupted
- `6+`: Rotten (ivy poison suffocation + zombified/true-zombie expression cycle)

## Streamer.bot integration outline

1. Use Streamer.bot Twitch Chat Message triggers.
2. Match keywords:
   - Corrupt: `poison`, `ivy`, `curse`, `suffocate`
   - Heal: `safe`, `love`, `happy`, `good dog`
   - Reset: `revive`, `recover`
3. In trigger actions, update a global `corruptionScore` variable.
4. Send a structured message matching this overlay protocol:

```json
{ "type": "action", "action": "corrupt" }
```

or

```json
{ "type": "setScore", "value": 3 }
```

Optional WebSocket bridge: launch the overlay with `?ws=ws://127.0.0.1:8080` and send JSON messages over that socket.

See `docs/V1_SPEC.md` for the complete spec.
