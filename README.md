# Lantern Familiar Overlay (OBS Browser Source)

A polished, atmospheric OBS browser overlay featuring a living cursed lantern companion. The lantern reacts to chat intensity and mood with distinct emotional states:

- **Dormant** (dim ember)
- **Awake** (balanced baseline)
- **Warm/Fond** (honey glow + soft sparkles)
- **Agitated/Chaotic** (sharper flicker + ash)
- **Possessed/Cursed** (violet flame + shadow smoke)

## Run in OBS

1. Add **Browser Source** in OBS.
2. Point to local file: `overlay/index.html`.
3. Suggested size: `320x280` (adjust as needed).
4. Keep transparency enabled.

## Test / Demo Mode

Open with query params:

- `overlay/index.html?mode=test`

Test mode adds compact controls for:

- forcing each state
- increasing/decreasing activity
- triggering kind/chaos/curse bursts
- toggling particles, smoke, thorns/cracks
- auto demo sequence
- visible debug status (`state`, `auto`, `manual`, intensity channels)

## Event API (for chat bridges / Streamer.bot)

Use `window.LanternOverlay`:

```js
window.LanternOverlay.setState('warm');
window.LanternOverlay.clearForcedState();
window.LanternOverlay.addActivity(1);
window.LanternOverlay.triggerBurst('kind');
window.LanternOverlay.triggerBurst('chaos');
window.LanternOverlay.triggerBurst('curse');
window.LanternOverlay.toggleEffect('smoke', true);
window.LanternOverlay.parseChatText('love cozy safe');
```

Or send protocol-style messages:

```js
window.LanternOverlay.receive({ type: 'setState', state: 'possessed' });
window.LanternOverlay.receive({ type: 'addActivity', amount: 1 });
window.LanternOverlay.receive({ type: 'triggerBurst', kind: 'chaos' });
window.LanternOverlay.receive({ type: 'toggleEffect', effect: 'particles', value: false });
window.LanternOverlay.receive({ type: 'chat', text: 'void hex consume' });
window.LanternOverlay.receive({
  type: 'setIntensity',
  activity: 0.8,
  warm: 0.1,
  chaos: 0.7,
  curse: 0.4
});
```

## Notes

- Overlay mode is clean: no permanent labels, no debug text.
- Test UI is hidden unless `mode=test` is set.
- The architecture is ready for future chat/websocket adapters and skin variants.
