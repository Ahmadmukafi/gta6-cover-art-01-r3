# VICE GRID — GTA 6 Cover Art Maker

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Ahmadmukafi/gta6-cover-art-01-r3/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Ahmadmukafi/gta6-cover-art-01-r3/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn a photo and a caption into a GTA-style multi-panel cover poster, fully
offline in your desktop browser. Photos never leave your machine.

## What it does

- **Multi-panel poster** — four layouts (2×2 grid, hero + strip, triptych,
  duo) with a bold caption band, Vice City sunset / neon colour grades, and a
  live preview.
- **Any photo** — load your own photos, fill several panels with one photo or
  several, drag panels to swap them, drag inside a panel to pan, scroll to
  zoom, and edit the caption.
- **Fast export** — one click exports a PNG in 1080×1080, 1080×1350, or
  1920×1080.

## Keyboard shortcuts

- `1`–`4` — switch layout (grid, hero, triptych, duo)
- `L` — cycle to the next look
- `E` — export the current poster as a PNG

Shortcuts never fire while you are typing in a text field.

## Run it

Serve `app/` with any static file server and open `app/index.html`, for
example:

```sh
cd app && python3 -m http.server 8080
```

Then open http://localhost:8080 in desktop Chrome. No network requests: every
script, style, and sample image is a file under `app/`.

## Files

- `app/index.html`, `app/style.css` — editor page and styling.
- `app/src/cover.js` — the poster renderer (panels, grades, caption).
- `app/src/main.js` — editor wiring (photos, drag, pan, zoom, export,
  keyboard shortcuts).
- `app/samples/` — two sample photos drawn for this entry.
- `main.ts` — hands the app in (copies `app/` + `screenshots/`, writes
  `dossier.json`).

## License

MIT — see [LICENSE](LICENSE).
