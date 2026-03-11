# Ivy Corner Companion V1 Spec

## Concept
A small corner ivy growth that quietly reacts to chat mood over time.

## Placement
- top-right corner anchor
- visual footprint stays small (roughly 6-10% width)
- decorative/ambient, not gameplay-dominant

## State model
Hidden numeric score (`0..10`) drives visual state.

- `0-1` => `sprout`
- `2-5` => `growing`
- `6+` => `wilted`
- `reset` action temporarily shows `blooming`, then returns to score-derived state

## Actions
- `corrupt`: score +1, adds droop motion
- `heal`: score -1
- `reset`: score -> 0, bloom burst
- `lookLeft` / `lookRight`: gentle nudge sway
- `blink`: mapped to a gentle bloom pulse (for compatibility)

## Message protocol
Main entrypoint: `window.ChatEye.receive(payload)`

Supported payloads:
- `{"type":"action","action":"corrupt|heal|reset|lookLeft|lookRight|blink"}`
- `{"type":"setScore","value":number}`
- `{"type":"setState","state":"sprout|growing|wilted|blooming"}`
- `{"type":"focus","x":number,"y":number}` (mapped to nudge direction)

## Compatibility aliases
`setState` also accepts older names:
- `awakened` or `alive` => `sprout`
- `overgrown` or `alert` => `growing`
- `corrupted` or `rotten` or `zombified` => `wilted`

## Palette direction
Healthy:
- deep ivy green
- muted sage highlight
- dark forest stem

Corrupted:
- grey-olive
- brown-green
- near-black green thorn

Reset accent:
- soft ivory bloom
