# Reverse TD

A browser-based tower defense game with the roles flipped: you control the attacking horde, and the AI controls the defending towers. Recruit and upgrade a roster of units, buy mod cards and trinkets between bases, and see how far you can push into an endlessly scaling gauntlet before your army runs out.

Plain HTML/CSS/JS. No build step, no npm dependencies, no framework.

## Running it locally

ES modules require a real HTTP server — opening `index.html` directly via `file://` will not work.

### 1. Get the sprites

This game uses the free ["Tiny Swords"](https://pixelfrog-assets.itch.io/tiny-swords) pixel-art pack by Pixel Frog. **It is not included in this repo** — the pack's license permits using it in a finished game (including commercially) but does not permit redistributing the raw asset files themselves, so they're gitignored here.

1. Download the Free Pack from https://pixelfrog-assets.itch.io/tiny-swords
2. Extract it into the repo root so the structure looks like:
   ```
   Assets/
     Tiny Swords (Free Pack)/
       Buildings/
       Particle FX/
       Terrain/
       UI Elements/
       Units/
   ```

### 2. Serve the folder

Any static file server works. If you don't have Node or Python installed, a zero-dependency option is included:

```powershell
powershell -ExecutionPolicy Bypass -File tools\devserver.ps1
```

Then open http://127.0.0.1:8642/

Or, with Node/Python already installed:

```bash
npx serve .
# or
python -m http.server 8642
```

## Project structure

- `src/data/` — game balance and content definitions (unit types, mod tiers, trinkets, tower stats, base scaling)
- `src/game/` — core simulation (`GameState` for persistent run state, `Battle` for a single wave's combat)
- `src/render/` — canvas rendering of the battle scene
- `src/ui/` — DOM-based UI screens (menu, wave planning, shop, game over)
- `src/engine/` — small reusable helpers (asset loading, sprite sheet animation, path/waypoint math)
- `tools/` — local dev server plus a scripted headless-browser test harness used during development (no formal test framework — `harness.html` drives a real playthrough via simulated clicks/drag events)

## License

**Code:** no license has been chosen yet — treat as all-rights-reserved for now.

**Assets:** "Tiny Swords" by [Pixel Frog](https://pixelfrog-assets.itch.io/tiny-swords), used under its own license. Not redistributed here — see "Get the sprites" above.
