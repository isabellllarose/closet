# Closet

Your personal wardrobe inventory.

## Files
- `index.html` — the app
- `app.jsx` — all the logic and UI
- `sw.js` — service worker (offline support)
- `manifest.json` — makes it installable as a PWA
- `icon-192.png` / `icon-512.png` — app icons

## To deploy on GitHub Pages

1. Go to github.com and create a new repository called `closet`
2. Upload all these files to the repository
3. Go to Settings → Pages → set Source to "Deploy from a branch" → select `main` → `/ (root)`
4. Your app will be live at `https://isabellllarose.github.io/closet`
5. Open that URL in Safari on your iPhone → Share → Add to Home Screen

Your data saves automatically in your browser's local storage, so it persists between sessions.
