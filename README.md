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
- `assets/js/firebase-config.js`
- `manifest.webmanifest`

## Multiplayer

Multiplayer uses Firebase from CDN ES modules. No npm, Vite, or build step.

- Firebase config lives in `assets/js/firebase-config.js`.
- Anonymous Firebase Authentication signs players in as guests.
- Realtime Database stores open rooms under `toepenRooms`.
- Players can open a lobby or join an open lobby.
- Hosts can name their lobby. Players can type a nickname or generate a random one before joining.
- When the lobby reaches the selected seat count, the game auto-starts.
- Multiplayer supports 2-8 seats. Two-player rooms can choose 4-card or 8-card rounds before the lobby opens.
- Dirty Laundry stays with 4-card rounds and can be claimed once per player per round; 8-card duels skip Dirty Laundry and score on the final eighth trick.
- Only the trick leader can Toep, and only before leading that trick. Others may join or step out.
- Each round shows a shuffle/deal animation. The dealer rotates, and the next living seat after the dealer starts.
- Moves are written through Realtime Database transactions.

Current test rules are open. For real public play, restrict room writes to authenticated room players. For cheat-resistant hidden hands, move dealing and move validation to trusted server code such as Cloud Functions.

If online mode shows an invalid apiKey message, copy the current Web App config from Firebase Console > Project settings > General > Your apps > SDK setup and configuration, then replace the values in `assets/js/firebase-config.js`.

For GitHub Pages, add the Pages host to Firebase Auth authorized domains: Firebase Console > Authentication > Settings > Authorized domains > Add domain > `bbyw2hrnf6-boop.github.io`.
