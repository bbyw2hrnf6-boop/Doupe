import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getDatabase,
  off,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  set,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

const firebaseConfig = window.TOEPEN_FIREBASE_CONFIG;

const ROOM_PATH = "toepenRooms";
const STALE_ROOM_MS = 48 * 60 * 60 * 1000;
const EMPTY_OPEN_ROOM_GRACE_MS = 2 * 60 * 1000;
const CLEANUP_THROTTLE_MS = 60 * 1000;
let app = null;
let auth = null;
let db = null;

const ui = {
  soloModeBtn: document.querySelector("#soloModeBtn"),
  onlineModeBtn: document.querySelector("#onlineModeBtn"),
  gameToepenBtn: document.querySelector("#gameToepenBtn"),
  gameSchwimmenBtn: document.querySelector("#gameSchwimmenBtn"),
  localSetup: document.querySelector("#localSetup"),
  onlineSetup: document.querySelector("#onlineSetup"),
  playerNameInput: document.querySelector("#playerNameInput"),
  randomNameBtn: document.querySelector("#randomNameBtn"),
  lobbyNameInput: document.querySelector("#lobbyNameInput"),
  onlineSeatSelect: document.querySelector("#onlineSeatSelect"),
  onlineHandSizeRow: document.querySelector("#onlineHandSizeRow"),
  onlineHandSizeSelect: document.querySelector("#onlineHandSizeSelect"),
  onlineSwimLivesRow: document.querySelector("#onlineSwimLivesRow"),
  onlineSwimLivesSelect: document.querySelector("#onlineSwimLivesSelect"),
  createLobbyBtn: document.querySelector("#createLobbyBtn"),
  refreshLobbiesBtn: document.querySelector("#refreshLobbiesBtn"),
  roomToolsBtn: document.querySelector("#roomToolsBtn"),
  roomToolsPanel: document.querySelector("#roomToolsPanel"),
  cleanupRoomsBtn: document.querySelector("#cleanupRoomsBtn"),
  roomToolsList: document.querySelector("#roomToolsList"),
  onlineStatus: document.querySelector("#onlineStatus"),
  lobbyPanel: document.querySelector("#lobbyPanel"),
  lobbyTitle: document.querySelector("#lobbyTitle"),
  lobbyCount: document.querySelector("#lobbyCount"),
  lobbyPlayers: document.querySelector("#lobbyPlayers"),
  leaveLobbyBtn: document.querySelector("#leaveLobbyBtn"),
  lobbyList: document.querySelector("#lobbyList"),
};

let currentUser = null;
let activeRoomId = null;
let activeRoomRef = null;
let roomsListening = false;
let joinedRoomListening = false;
let roomToolsOpen = false;
let roomCache = [];
let lastCleanupAt = 0;

bootMultiplayer();

function bootMultiplayer() {
  if (!isFirebaseConfigUsable()) {
    setMode("solo");
    setStatus("Firebase config missing or invalid. Add the current Firebase Web apiKey in assets/js/firebase-config.js.");
    return;
  }

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);

  ui.playerNameInput.value = localStorage.getItem("toepenPlayerName") || randomNickname();
  ui.lobbyNameInput.value = localStorage.getItem("toepenLobbyName") || "";
  ui.soloModeBtn.addEventListener("click", () => setMode("solo"));
  ui.onlineModeBtn.addEventListener("click", () => setMode("online"));
  ui.createLobbyBtn.addEventListener("click", createLobby);
  ui.refreshLobbiesBtn.addEventListener("click", findLobbies);
  ui.leaveLobbyBtn.addEventListener("click", leaveRoom);
  ui.roomToolsBtn.addEventListener("click", toggleRoomTools);
  ui.cleanupRoomsBtn.addEventListener("click", () => cleanupStaleRooms(roomCache, { force: true }));
  ui.onlineSeatSelect.addEventListener("change", syncOnlineHandSize);
  ui.gameToepenBtn.addEventListener("click", syncOnlineGameRows);
  ui.gameSchwimmenBtn.addEventListener("click", syncOnlineGameRows);
  document.addEventListener("doupeGameTypeChanged", syncOnlineGameRows);
  ui.randomNameBtn.addEventListener("click", randomizePlayerName);
  ui.playerNameInput.addEventListener("input", () => {
    localStorage.setItem("toepenPlayerName", cleanName(ui.playerNameInput.value));
  });
  ui.lobbyNameInput.addEventListener("input", () => {
    localStorage.setItem("toepenLobbyName", cleanLobbyName(ui.lobbyNameInput.value));
  });
  syncOnlineGameRows();

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user && !activeRoomId) {
      setStatus("Connected as guest. Open a lobby or join one.");
    }
  });

  window.ToepenOnline = {
    sendAction,
    leaveRoom,
  };
}

function setMode(mode) {
  const online = mode === "online";
  ui.soloModeBtn.classList.toggle("active", !online);
  ui.onlineModeBtn.classList.toggle("active", online);
  ui.soloModeBtn.setAttribute("aria-pressed", String(!online));
  ui.onlineModeBtn.setAttribute("aria-pressed", String(online));
  ui.localSetup.classList.toggle("hidden", online);
  ui.onlineSetup.classList.toggle("hidden", !online);

  if (online) {
    findLobbies();
  }
}

async function ensureAuth() {
  if (currentUser) return currentUser;
  setStatus("Connecting to Firebase guest login...");
  const credential = await signInAnonymously(auth);
  currentUser = credential.user;
  return currentUser;
}

async function findLobbies() {
  try {
    await ensureAuth();
    listenForRooms();
    setStatus("Looking for open lobbies...");
  } catch (error) {
    setStatus(`Could not connect: ${friendlyError(error)}`);
  }
}

function listenForRooms() {
  if (roomsListening) return;
  roomsListening = true;
  onValue(ref(db, ROOM_PATH), (snapshot) => {
    const rooms = snapshot.val() || {};
    roomCache = Object.values(rooms)
      .filter(Boolean)
      .sort((a, b) => roomTime(b) - roomTime(a));
    cleanupStaleRooms(roomCache);
    renderRoomTools();
    renderLobbyList(
      roomCache
        .filter((room) => room && room.status === "open")
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    );
  });
}

async function createLobby() {
  try {
    const user = await ensureAuth();
    const roomRef = push(ref(db, ROOM_PATH));
    const now = Date.now();
    const maxPlayers = Number(ui.onlineSeatSelect.value);
    const gameType = selectedLobbyGameType();
    const handSize = gameType === "toepen" ? selectedOnlineHandSize(maxPlayers) : 3;
    const swimLives = selectedOnlineSwimLives();
    const code = makeRoomCode();
    const room = {
      id: roomRef.key,
      code,
      lobbyName: cleanLobbyName(ui.lobbyNameInput.value) || `Table ${code}`,
      status: "open",
      gameType,
      maxPlayers,
      handSize,
      swimLives,
      hostUid: user.uid,
      createdAt: now,
      updatedAt: now,
      players: {
        [user.uid]: makeLobbyPlayer(user.uid, 0),
      },
    };
    await set(roomRef, room);
    await onDisconnect(ref(db, `${ROOM_PATH}/${roomRef.key}/players/${user.uid}`)).remove();
    joinRoom(roomRef.key);
  } catch (error) {
    setStatus(`Could not open lobby: ${friendlyError(error)}`);
  }
}

async function joinRoom(roomId) {
  try {
    const user = await ensureAuth();
    localStorage.setItem("toepenPlayerName", cleanName(ui.playerNameInput.value));
    const roomRef = ref(db, `${ROOM_PATH}/${roomId}`);
    const result = await runTransaction(roomRef, (room) => {
      if (!room || room.status !== "open") return room;
      const players = room.players || {};
      const alreadyInside = Boolean(players[user.uid]);
      const playerCount = Object.keys(players).length;
      if (!alreadyInside && playerCount >= room.maxPlayers) return room;

      players[user.uid] = players[user.uid] || makeLobbyPlayer(user.uid, playerCount);
      players[user.uid].name = cleanName(ui.playerNameInput.value);
      room.players = players;
      room.updatedAt = Date.now();

      const roster = rosterFromPlayers(players);
      if (roster.length >= room.maxPlayers) {
        room.status = "playing";
        room.game =
          room.gameType === "schwimmen"
            ? window.ToepenGame.createOnlineSchwimmenGame(
                roster.slice(0, room.maxPlayers),
                room.id,
                room.maxPlayers,
                room.swimLives || 3,
              )
            : window.ToepenGame.createOnlineGame(
                roster.slice(0, room.maxPlayers),
                room.id,
                room.maxPlayers,
                room.handSize || 4,
              );
      }
      return room;
    });

    const room = result.snapshot.val();
    if (!room?.players?.[user.uid] && room?.status !== "playing") {
      setStatus("Lobby is already full or closed.");
      return;
    }

    await onDisconnect(ref(db, `${ROOM_PATH}/${roomId}/players/${user.uid}`)).remove();
    activeRoomId = roomId;
    activeRoomRef = roomRef;
    subscribeJoinedRoom(roomId);
  } catch (error) {
    setStatus(`Could not join lobby: ${friendlyError(error)}`);
  }
}

function subscribeJoinedRoom(roomId) {
  if (joinedRoomListening && activeRoomRef) off(activeRoomRef);
  activeRoomRef = ref(db, `${ROOM_PATH}/${roomId}`);
  joinedRoomListening = true;
  onValue(activeRoomRef, (snapshot) => {
    const room = snapshot.val();
    if (!room) {
      activeRoomId = null;
      activeRoomRef = null;
      hideLobbyPanel();
      setStatus("Lobby closed.");
      return;
    }

    if (room.status === "closed") {
      activeRoomId = null;
      activeRoomRef = null;
      hideLobbyPanel();
      setStatus("Room closed.");
      return;
    }

    if (room.status === "playing" && room.game) {
      hideLobbyPanel();
      window.ToepenGame.loadOnlineGame(room.id, currentUser.uid, room.game, room);
      return;
    }

    if (room.status === "finished" && room.game) {
      hideLobbyPanel();
      window.ToepenGame.loadOnlineGame(room.id, currentUser.uid, room.game, room);
      return;
    }

    renderLobbyPanel(room);
  });
}

async function sendAction(action) {
  if (!activeRoomId || !currentUser) return;
  const roomRef = ref(db, `${ROOM_PATH}/${activeRoomId}`);
  await runTransaction(roomRef, (room) => {
    if (!room?.game || room.status !== "playing") return room;
    const game = window.ToepenGame.reduceOnlineAction(room.game, {
      ...action,
      uid: currentUser.uid,
      at: Date.now(),
    });
    room.game = game;
    room.updatedAt = Date.now();
    if (game.phase === "gameOver") {
      room.status = "finished";
      room.closedAt = Date.now();
      room.closedReason = "game-over";
    }
    return room;
  });
}

async function leaveRoom() {
  if (!activeRoomId || !currentUser) return;
  const roomId = activeRoomId;
  const uid = currentUser.uid;
  const roomRef = ref(db, `${ROOM_PATH}/${roomId}`);
  activeRoomId = null;
  activeRoomRef = null;
  joinedRoomListening = false;

  await runTransaction(roomRef, (room) => {
    if (!room) return room;
    if (room.status === "open") {
      delete room.players?.[uid];
      const remaining = Object.keys(room.players || {});
      if (remaining.length === 0) return null;
      if (room.hostUid === uid) room.hostUid = remaining[0];
      room.updatedAt = Date.now();
    }
    return room;
  }).catch(() => {});

  hideLobbyPanel();
  setStatus("Left lobby.");
}

function renderLobbyList(rooms) {
  ui.lobbyList.innerHTML = "";
  const openRooms = rooms.filter((room) => {
    const count = Object.keys(room.players || {}).length;
    return count < room.maxPlayers;
  });

  if (!openRooms.length) {
    const empty = document.createElement("div");
    empty.className = "lobby-status";
    empty.textContent = "No open lobbies right now. Open one and wait for players.";
    ui.lobbyList.append(empty);
    return;
  }

  for (const room of openRooms) {
    const count = Object.keys(room.players || {}).length;
    const card = document.createElement("div");
    card.className = "lobby-card";
    const body = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = roomTitle(room);
    const meta = document.createElement("small");
    meta.textContent = `${count} / ${room.maxPlayers} players · ${roomGameText(room)}`;
    body.append(title, meta);

    const button = document.createElement("button");
    button.className = "table-action";
    button.type = "button";
    button.textContent = "Join";
    button.addEventListener("click", () => joinRoom(room.id));
    card.append(body, button);
    ui.lobbyList.append(card);
  }
}

function renderLobbyPanel(room) {
  const roster = rosterFromPlayers(room.players || {});
  ui.lobbyPanel.classList.remove("hidden");
  ui.lobbyTitle.textContent = roomTitle(room);
  ui.lobbyCount.textContent = `${roster.length} / ${room.maxPlayers}`;
  ui.lobbyPlayers.innerHTML = "";
  for (const player of roster) {
    const row = document.createElement("div");
    row.className = "lobby-player";
    const body = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = player.name;
    const meta = document.createElement("small");
    meta.textContent = player.uid === room.hostUid ? "Host" : "Guest";
    body.append(name, meta);
    row.append(body);
    ui.lobbyPlayers.append(row);
  }
  setStatus(
    roster.length >= room.maxPlayers
      ? "Lobby full. Dealing..."
      : `Waiting for more players. This table plays ${roomGameText(room)}.`,
  );
}

function toggleRoomTools() {
  roomToolsOpen = !roomToolsOpen;
  ui.roomToolsBtn.setAttribute("aria-pressed", String(roomToolsOpen));
  ui.roomToolsPanel.classList.toggle("hidden", !roomToolsOpen);
  if (roomToolsOpen) {
    findLobbies();
    renderRoomTools();
  }
}

function renderRoomTools() {
  if (!ui.roomToolsList || !roomToolsOpen) return;
  ui.roomToolsList.innerHTML = "";

  if (!roomCache.length) {
    const empty = document.createElement("div");
    empty.className = "lobby-status";
    empty.textContent = "No rooms found.";
    ui.roomToolsList.append(empty);
    return;
  }

  for (const room of roomCache.slice(0, 32)) {
    const row = document.createElement("div");
    row.className = "room-row";

    const body = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = roomTitle(room);
    const meta = document.createElement("small");
    meta.textContent = `${roomStatusText(room)} · ${roomGameText(room)} · ${roomAgeText(room)}`;
    body.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "room-row-actions";

    if (room.status !== "closed" && room.status !== "finished") {
      actions.append(actionButton("Close", "table-action", () => closeRoom(room.id)));
    }
    actions.append(actionButton("Delete", "danger-action", () => deleteRoom(room.id)));

    row.append(body, actions);
    ui.roomToolsList.append(row);
  }
}

async function closeRoom(roomId) {
  if (!roomId) return;
  try {
    await ensureAuth();
    await runTransaction(ref(db, `${ROOM_PATH}/${roomId}`), (room) => {
      if (!room) return room;
      room.status = "closed";
      room.closedAt = Date.now();
      room.closedReason = "manual";
      room.updatedAt = Date.now();
      return room;
    });
    setStatus("Room closed.");
  } catch (error) {
    setStatus(`Could not close room: ${friendlyError(error)}`);
  }
}

async function deleteRoom(roomId) {
  if (!roomId) return;
  try {
    await ensureAuth();
    await remove(ref(db, `${ROOM_PATH}/${roomId}`));
    if (activeRoomId === roomId) {
      activeRoomId = null;
      activeRoomRef = null;
      hideLobbyPanel();
    }
    setStatus("Room deleted.");
  } catch (error) {
    setStatus(`Could not delete room: ${friendlyError(error)}`);
  }
}

async function cleanupStaleRooms(rooms, options = {}) {
  try {
    const now = Date.now();
    if (!options.force && now - lastCleanupAt < CLEANUP_THROTTLE_MS) return;
    lastCleanupAt = now;

    const staleRooms = (rooms || []).filter(
      (room) =>
        room?.id &&
        room.id !== activeRoomId &&
        (now - roomTime(room) > STALE_ROOM_MS || isAbandonedOpenRoom(room, now)),
    );
    if (!staleRooms.length) {
      if (options.force) setStatus("No rooms older than 48 hours.");
      return;
    }

    await Promise.allSettled(staleRooms.map((room) => remove(ref(db, `${ROOM_PATH}/${room.id}`))));
    setStatus(`${staleRooms.length} stale room${staleRooms.length === 1 ? "" : "s"} deleted.`);
  } catch (error) {
    if (options.force) setStatus(`Could not clean rooms: ${friendlyError(error)}`);
  }
}

function hideLobbyPanel() {
  ui.lobbyPanel.classList.add("hidden");
  ui.lobbyPlayers.innerHTML = "";
}

function makeLobbyPlayer(uid, order) {
  return {
    uid,
    name: cleanName(ui.playerNameInput.value),
    joinedAt: Date.now() + order,
  };
}

function randomizePlayerName() {
  ui.playerNameInput.value = randomNickname();
  localStorage.setItem("toepenPlayerName", cleanName(ui.playerNameInput.value));
}

function syncOnlineGameRows() {
  const isSchwimmen = selectedLobbyGameType() === "schwimmen";
  ui.onlineSwimLivesRow?.classList.toggle("hidden", !isSchwimmen);
  syncOnlineHandSize();
}

function syncOnlineHandSize() {
  const isDuel = Number(ui.onlineSeatSelect.value) === 2;
  const isToepen = selectedLobbyGameType() === "toepen";
  ui.onlineHandSizeRow?.classList.toggle("hidden", !(isToepen && isDuel));
}

function selectedOnlineHandSize(maxPlayers) {
  if (Number(maxPlayers) !== 2) return 4;
  return Number(ui.onlineHandSizeSelect?.value) === 8 ? 8 : 4;
}

function selectedOnlineSwimLives() {
  return Number(ui.onlineSwimLivesSelect?.value) === 4 ? 4 : 3;
}

function selectedLobbyGameType() {
  return window.ToepenGame?.getSelectedGameType?.() === "schwimmen" ? "schwimmen" : "toepen";
}

function roomStatusText(room) {
  if (isAbandonedOpenRoom(room)) return "open · empty";
  if (isRoomStale(room)) return `${room?.status || "room"} · stale`;
  if (room?.status === "finished") return "finished";
  if (room?.status === "closed") return "closed";
  if (room?.status === "playing") return "playing";
  return "open";
}

function roomGameText(room) {
  if (room?.gameType === "schwimmen") {
    const lives = Number(room?.swimLives) === 4 ? 4 : 3;
    return `Schnautz / 31 · ${lives} lives`;
  }
  const cards = Number(room?.handSize) === 8 ? 8 : 4;
  return `Toepen · ${cards} card${cards === 1 ? "" : "s"} each`;
}

function roomTitle(room) {
  return cleanLobbyName(room?.lobbyName) || `Room ${room?.code || room?.id?.slice(-4) || "OPEN"}`;
}

function roomAgeText(room) {
  const ageMs = Math.max(0, Date.now() - roomTime(room));
  const hours = Math.floor(ageMs / (60 * 60 * 1000));
  if (hours < 1) return "used now";
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function roomTime(room) {
  return Number(room?.updatedAt || room?.closedAt || room?.createdAt || 0);
}

function isRoomStale(room) {
  return Date.now() - roomTime(room) > STALE_ROOM_MS;
}

function isAbandonedOpenRoom(room, now = Date.now()) {
  return room?.status === "open" && Object.keys(room.players || {}).length === 0 && now - roomTime(room) > EMPTY_OPEN_ROOM_GRACE_MS;
}

function actionButton(text, className, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.addEventListener("click", handler);
  return button;
}

function rosterFromPlayers(players) {
  return Object.values(players)
    .filter(Boolean)
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
    .map((player) => ({
      uid: player.uid,
      name: cleanName(player.name),
      joinedAt: player.joinedAt || 0,
    }));
}

function cleanName(value) {
  const clean = String(value || "").trim().slice(0, 18);
  return clean || defaultPlayerName();
}

function cleanLobbyName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 24);
}

function defaultPlayerName() {
  return `Player ${Math.floor(1000 + Math.random() * 9000)}`;
}

function randomNickname() {
  const first = ["Velvet", "Royal", "Lucky", "Golden", "Silent", "Sharp", "Midnight", "Diamond", "Sable", "Crown"];
  const second = ["Ace", "Ten", "Jack", "Bluff", "Dealer", "Spade", "Heart", "King", "Queen", "Card"];
  return cleanName(`${pick(first)} ${pick(second)}`);
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function setStatus(message) {
  ui.onlineStatus.textContent = message;
}

function friendlyError(error) {
  const code = error?.code || "";
  if (code === "auth/api-key-not-valid" || code === "auth/invalid-api-key") {
    return "Firebase apiKey is invalid. Copy the current Web App apiKey from Firebase Console > Project settings > Your apps.";
  }
  if (code === "auth/network-request-failed") {
    return "network blocked Firebase Auth. Check internet and allowed domains.";
  }
  if (code === "auth/unauthorized-domain") {
    return "GitHub Pages domain is not authorized in Firebase Auth. Add bbyw2hrnf6-boop.github.io in Authentication > Settings > Authorized domains.";
  }
  return error?.message?.replace(/^Firebase:\s*/i, "").replace(/\.$/, "") || "unknown error";
}

function isFirebaseConfigUsable() {
  return Boolean(
    firebaseConfig &&
      firebaseConfig.apiKey &&
      firebaseConfig.apiKey.startsWith("AIza") &&
      firebaseConfig.authDomain &&
      firebaseConfig.databaseURL &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}
