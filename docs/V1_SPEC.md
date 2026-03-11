# The Ivy Eye V1 Specification

## Goal
Build a lightweight OBS Browser Source overlay where a living, ivy-wrapped eye is always animated and Twitch chat nudges it through gradual botanical corruption states.

## V1 State Model
The eye always has one current state derived from a hidden `corruptionScore`.

- **Awakened** (`0-1`): clean glow, healthy ivy
- **Overgrown** (`2-3`): brighter leaves, more active vines
- **Corrupted** (`4-5`): wilted leaves, visible thorns, cloudy eye
- **Rotten** (`6+`): decayed vines, thorn-forward, sickly eye

### Corruption score rules
- Initial value: `0`
- Corrupt word: `+1`
- Heal word: `-1`
- Reset word: set to `0` and trigger bloom + blink
- Clamp floor: `0`
- Optional cap for styling logic: `10`

## V1 Actions
Supported live actions:

- `blink`
- `lookLeft`
- `lookRight`
- `corrupt` (equivalent to `corrupt+1`)
- `heal` (equivalent to `heal-1`)
- `reset`

## Trigger Words
Start list for Streamer.bot chat trigger matching:

- Corrupt: `ghost`, `demon`, `cursed`, `run`, `hunt`
- Heal: `chill`, `safe`, `love`, `okay`, `cute`
- Reset: `wake`, `blink`, `revive`

## Overlay Placement
- Single eye in one corner (recommend: top-right).
- No permanent label text.
- Keep mood dark botanical, not comic/neon superhero.
- Visual intent: *enchanted ivy watcher*, not UI widget.

## Integration Protocol (Streamer.bot -> Overlay)
The overlay accepts JSON messages either by direct browser function call (for local manual testing) or via an optional WebSocket event bridge.

### Browser function entrypoint
`window.ChatEye.receive(payload)` where `payload` has shape:

```json
{
  "type": "action",
  "action": "corrupt"
}
```

or

```json
{
  "type": "setScore",
  "value": 4
}
```

Supported payloads:
- `{"type":"action","action":"blink"}`
- `{"type":"action","action":"lookLeft"}`
- `{"type":"action","action":"lookRight"}`
- `{"type":"action","action":"corrupt"}`
- `{"type":"action","action":"heal"}`
- `{"type":"action","action":"reset"}`
- `{"type":"setScore","value":number}`
- `{"type":"setState","state":"awakened|overgrown|corrupted|rotten"}`

Compatibility aliases accepted by `setState`:
- `alive -> awakened`
- `alert -> overgrown`
- `zombified -> rotten`

### Optional WebSocket bridge
If the overlay URL includes `?ws=ws://HOST:PORT`, the overlay opens a WebSocket client and consumes each text message as JSON, then passes it to `window.ChatEye.receive(payload)`.
