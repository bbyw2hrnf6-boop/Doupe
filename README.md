# Doupe

Toepen Royale: a browser card game for solo bot play and online multiplayer.

## Run

Open `index.html` directly, or serve the repository root with GitHub Pages.

## GitHub Pages

The site is static and GitHub Pages-ready:

- `index.html`
- `assets/css/styles.css`
- `assets/js/script.js`
- `assets/js/multiplayer.js`
- `manifest.webmanifest`

## Multiplayer

Multiplayer uses Firebase from CDN ES modules. No npm, Vite, or build step.

- Anonymous Firebase Authentication signs players in as guests.
- Realtime Database stores open rooms under `toepenRooms`.
- Players can open a lobby or join an open lobby.
- When the lobby reaches the selected seat count, the game auto-starts.
- Moves are written through Realtime Database transactions.

Current test rules are open. For real public play, restrict room writes to authenticated room players. For cheat-resistant hidden hands, move dealing and move validation to trusted server code such as Cloud Functions.
