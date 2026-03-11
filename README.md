# The Ivy Eye Overlay (OBS Browser Source)

This repo contains a lightweight web overlay for OBS Browser Source and a simple message protocol so Streamer.bot can push ivy-eye actions/states from Twitch chat events.

## Quick start

1. Open OBS and add a **Browser Source**.
2. Point it to `overlay/index.html` as a local file.
3. Set dimensions to `320x220` (or your preference).
4. Keep background transparency enabled.

The eye will animate on its own with:
- idle float
- random blink
- subtle twitch
- small pupil drift

## Manual testing

In the browser dev console:

```js
window.ChatEye.receive({ type: 'action', action: 'corrupt' });
window.ChatEye.receive({ type: 'action', action: 'heal' });
window.ChatEye.receive({ type: 'action', action: 'reset' });
window.ChatEye.receive({ type: 'action', action: 'blink' });
window.ChatEye.receive({ type: 'action', action: 'lookLeft' });
window.ChatEye.receive({ type: 'action', action: 'lookRight' });
```

Set score directly:

```js
window.ChatEye.receive({ type: 'setScore', value: 5 });
```

## State thresholds

- `0-1`: Awakened
- `2-3`: Overgrown
- `4-5`: Corrupted
- `6+`: Rotten

## Streamer.bot integration outline

1. Use Streamer.bot Twitch Chat Message triggers.
2. Match keywords:
   - Corrupt: `ghost`, `demon`, `cursed`, `run`, `hunt`
   - Heal: `chill`, `safe`, `love`, `okay`, `cute`
   - Reset: `wake`, `blink`, `revive`
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
