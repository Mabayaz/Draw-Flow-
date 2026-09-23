# DrawFlow

DrawFlow is a static educational website for learning Solid Drawing fundamentals through lessons, guided exercises, a self-check quiz, and an interactive perspective cube challenge.

## Run locally

Because the focused lesson pages load lesson content with `fetch()`, run the site through a local web server instead of opening the HTML files directly.

### macOS / Linux

```bash
python3 scripts/run_server.py
```

### Windows

Double-click `run_web.bat`, or run it from Command Prompt.

Then open:

```text
http://127.0.0.1:8000
```

## Site sections

- `index.html` — homepage and overall lesson progress
- `pages/lessons.html` — complete lesson overview
- `pages/form.html`, `pages/perspective.html`, `pages/shadow.html`, `pages/depth.html` — focused lesson readers
- `pages/exercises.html` — staged practice flow
- `pages/self-check.html` — 10-question quiz
- `pages/game.html` — interactive perspective cube challenge

## Notes

- Theme, lesson completion, exercise progress, quiz score, and cube score are saved in browser `localStorage`.
- GitHub Pages deployment is handled by `.github/workflows/pages.yml`.
