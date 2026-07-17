# Reverse TD
https://franzpringle.github.io/reverse-TD/


A browser-based tower defense game with the roles flipped: you control the attacking horde, and the AI controls the defending towers. Recruit and upgrade a roster of units, buy mod cards and trinkets between bases, and see how far you can push into an endlessly scaling gauntlet before your army runs out.

Plain HTML/CSS/JS. No build step, no npm dependencies, no framework. Everything needed to run it, including sprites, is included in this repo.

## Running it locally

ES modules require a real HTTP server — opening `index.html` directly via `file://` will not work.

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
- `src/engine/` — small reusable helpers (asset loading, sprite rendering, path/waypoint math)
- `Assets/Kenney TD Pack/` — the sprite set in use (see License below)
- `tools/` — local dev server plus a scripted headless-browser test harness used during development (no formal test framework — `harness.html` drives a real playthrough via simulated clicks/drag events)

## License

**Code:** no license has been chosen yet — treat as all-rights-reserved for now.

**Assets:** sprites are from Kenney's ["Tower Defense (Top-Down)"](https://kenney.nl/assets/tower-defense-top-down) pack, released under CC0 1.0 (public domain) — free to use and redistribute, no attribution required. `Assets/Kenney TD Pack/License.txt` has the original license text.
