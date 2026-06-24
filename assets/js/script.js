const SUITS = [
  { id: "hearts", name: "Hearts", symbol: "\u2665", red: true },
  { id: "diamonds", name: "Diamonds", symbol: "\u2666", red: true },
  { id: "spades", name: "Spades", symbol: "\u2660", red: false },
  { id: "clubs", name: "Clubs", symbol: "\u2663", red: false },
];

const RANKS = ["7", "8", "9", "10", "J", "Q", "K", "A"];
const POWER = { "10": 8, "9": 7, "8": 6, "7": 5, A: 4, K: 3, Q: 2, J: 1 };
const SCHWIMMEN_VALUES = { A: 11, "10": 10, K: 10, Q: 10, J: 10, "9": 9, "8": 8, "7": 7 };
const DIRTY_CORE = new Set(["A", "K", "Q", "J"]);
const BOT_NAMES = ["Rook", "Sable", "Vesper", "Marlow", "Onyx", "Sterling", "Crown"];
const PIP_LAYOUTS = {
  A: [{ x: 50, y: 50, large: true }],
  "7": [
    { x: 30, y: 17 },
    { x: 70, y: 17 },
    { x: 30, y: 35 },
    { x: 70, y: 35 },
    { x: 50, y: 50 },
    { x: 30, y: 83, down: true },
    { x: 70, y: 83, down: true },
  ],
  "8": [
    { x: 30, y: 17 },
    { x: 70, y: 17 },
    { x: 30, y: 35 },
    { x: 70, y: 35 },
    { x: 30, y: 65, down: true },
    { x: 70, y: 65, down: true },
    { x: 30, y: 83, down: true },
    { x: 70, y: 83, down: true },
  ],
  "9": [
    { x: 30, y: 15 },
    { x: 70, y: 15 },
    { x: 30, y: 33 },
    { x: 70, y: 33 },
    { x: 50, y: 50 },
    { x: 30, y: 67, down: true },
    { x: 70, y: 67, down: true },
    { x: 30, y: 85, down: true },
    { x: 70, y: 85, down: true },
  ],
  "10": [
    { x: 30, y: 13 },
    { x: 70, y: 13 },
    { x: 30, y: 29 },
    { x: 70, y: 29 },
    { x: 30, y: 45 },
    { x: 70, y: 45 },
    { x: 30, y: 61, down: true },
    { x: 70, y: 61, down: true },
    { x: 30, y: 77, down: true },
    { x: 70, y: 77, down: true },
  ],
};
const DELAYS = {
  dirtyOpen: 950,
  dirtyDecision: 1350,
  afterHumanChoice: 900,
  afterClaim: 1050,
  botThink: 2050,
  botRecover: 1150,
  trickSettle: 1700,
};
const DEAL_ANIMATION_MS = 1850;
const TOAST_PATTERN =
  /\b(Toep|knocks?|pass(?:es|ed)?|folds?|Dirty Laundry|Schnautz|31|loses?|sinks?|swimming|wins?|challenges?|stands alone|takes the)\b/i;

const els = {
  menuScreen: document.querySelector("#menuScreen"),
  gameScreen: document.querySelector("#gameScreen"),
  endScreen: document.querySelector("#endScreen"),
  gameToepenBtn: document.querySelector("#gameToepenBtn"),
  gameSchwimmenBtn: document.querySelector("#gameSchwimmenBtn"),
  playerPicker: document.querySelector("#playerPicker"),
  botCountLabel: document.querySelector("#botCountLabel"),
  localToepenLivesRow: document.querySelector("#localToepenLivesRow"),
  localSwimLivesRow: document.querySelector("#localSwimLivesRow"),
  localSwimLivesSelect: document.querySelector("#localSwimLivesSelect"),
  startGameBtn: document.querySelector("#startGameBtn"),
  playAgainBtn: document.querySelector("#playAgainBtn"),
  newGameBtn: document.querySelector("#newGameBtn"),
  fullscreenBtn: document.querySelector("#fullscreenBtn"),
  roundTitle: document.querySelector("#roundTitle"),
  stakeLabel: document.querySelector("#stakeLabel"),
  stakeValue: document.querySelector("#stakeValue"),
  trickLabel: document.querySelector("#trickLabel"),
  trickValue: document.querySelector("#trickValue"),
  leadLabel: document.querySelector("#leadLabel"),
  leadValue: document.querySelector("#leadValue"),
  centerStake: document.querySelector("#centerStake"),
  activeCount: document.querySelector("#activeCount"),
  scoreboardList: document.querySelector("#scoreboardList"),
  opponentRail: document.querySelector("#opponentRail"),
  trickArea: document.querySelector("#trickArea"),
  dealOverlay: document.querySelector("#dealOverlay"),
  tableToast: document.querySelector("#tableToast"),
  dealerName: document.querySelector("#dealerName"),
  dealText: document.querySelector("#dealText"),
  humanHand: document.querySelector("#humanHand"),
  handHint: document.querySelector("#handHint"),
  actionBox: document.querySelector("#actionBox"),
  phaseLabel: document.querySelector("#phaseLabel"),
  toepBtn: document.querySelector("#toepBtn"),
  rulesBtn: document.querySelector("#rulesBtn"),
  rulesDialog: document.querySelector("#rulesDialog"),
  closeRulesBtn: document.querySelector("#closeRulesBtn"),
  logList: document.querySelector("#logList"),
  logPanel: document.querySelector("#logPanel"),
  endTitle: document.querySelector("#endTitle"),
  endCopy: document.querySelector("#endCopy"),
};

let selectedBotCount = 2;
let selectedGameType = "toepen";
let state = null;
let timer = null;
let dealTimer = null;
let toastTimer = null;
let lastDealAnimationId = null;
let lastToastSerial = null;
let lastToastMessage = null;
let selectedSwimHandCardId = null;
let onlineContext = {
  roomId: null,
  uid: null,
};

function boot() {
  syncViewportSize();
  buildPlayerPicker();
  els.gameToepenBtn.addEventListener("click", () => selectGameType("toepen"));
  els.gameSchwimmenBtn.addEventListener("click", () => selectGameType("schwimmen"));
  els.localSwimLivesSelect.addEventListener("change", () => {
    document.dispatchEvent(new CustomEvent("doupeGameTypeChanged", { detail: getMenuGameSettings() }));
  });
  els.startGameBtn.addEventListener("click", () => {
    if (selectedGameType === "schwimmen") {
      startSchwimmenGame(selectedBotCount);
    } else {
      startGame(selectedBotCount);
    }
  });
  els.playAgainBtn.addEventListener("click", showMenu);
  els.newGameBtn.addEventListener("click", showMenu);
  els.fullscreenBtn.addEventListener("click", toggleFullscreen);
  els.toepBtn.addEventListener("click", () => humanToep());
  els.rulesBtn.addEventListener("click", () => els.rulesDialog.showModal());
  els.closeRulesBtn.addEventListener("click", () => els.rulesDialog.close());
  window.addEventListener("resize", syncViewportSize);
  window.addEventListener("orientationchange", syncViewportSize);
  window.visualViewport?.addEventListener("resize", syncViewportSize);
  document.addEventListener("fullscreenchange", renderFullscreenButton);
  document.addEventListener("webkitfullscreenchange", renderFullscreenButton);
  selectGameType("toepen");
  showMenu();
}

function buildPlayerPicker() {
  els.playerPicker.innerHTML = "";
  for (let count = 2; count <= 7; count += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `pick-button${count === selectedBotCount ? " active" : ""}`;
    button.textContent = count;
    button.setAttribute("aria-pressed", String(count === selectedBotCount));
    button.addEventListener("click", () => {
      selectedBotCount = count;
      els.botCountLabel.textContent = count;
      buildPlayerPicker();
    });
    els.playerPicker.append(button);
  }
}

function selectGameType(gameType) {
  selectedGameType = gameType === "schwimmen" ? "schwimmen" : "toepen";
  const isSchwimmen = selectedGameType === "schwimmen";
  els.gameToepenBtn.classList.toggle("active", !isSchwimmen);
  els.gameSchwimmenBtn.classList.toggle("active", isSchwimmen);
  els.gameToepenBtn.setAttribute("aria-pressed", String(!isSchwimmen));
  els.gameSchwimmenBtn.setAttribute("aria-pressed", String(isSchwimmen));
  els.localToepenLivesRow.classList.toggle("hidden", isSchwimmen);
  els.localSwimLivesRow.classList.toggle("hidden", !isSchwimmen);
  els.startGameBtn.textContent = isSchwimmen ? "Start Schnautz" : "Take seat";
  document.dispatchEvent(new CustomEvent("doupeGameTypeChanged", { detail: getMenuGameSettings() }));
}

function getMenuGameSettings() {
  return {
    gameType: selectedGameType,
    swimLives: selectedSwimLives(),
  };
}

function selectedSwimLives() {
  return Number(els.localSwimLivesSelect?.value) === 4 ? 4 : 3;
}

function showMenu() {
  clearTimer();
  if (state?.mode === "online") {
    window.ToepenOnline?.leaveRoom?.();
  }
  state = null;
  selectedSwimHandCardId = null;
  onlineContext = { roomId: null, uid: null };
  document.body.classList.remove("game-active", "app-fullscreen", "fullscreen-fallback");
  hideDealAnimation();
  clearTableToast();
  lastDealAnimationId = null;
  lastToastSerial = null;
  lastToastMessage = null;
  els.menuScreen.classList.remove("hidden");
  els.gameScreen.classList.add("hidden");
  els.endScreen.classList.add("hidden");
  renderFullscreenButton();
}

function startGame(botCount) {
  clearTimer();
  const players = [
    {
      id: "p0",
      name: "You",
      isHuman: true,
      lives: 10,
      hand: [],
      active: true,
      folded: false,
      eliminated: false,
      raises: 0,
      playedCards: [],
    },
  ];

  for (let index = 0; index < botCount; index += 1) {
    players.push({
      id: `p${index + 1}`,
      name: BOT_NAMES[index],
      isHuman: false,
      lives: 10,
      hand: [],
      active: true,
      folded: false,
      eliminated: false,
      raises: 0,
      playedCards: [],
    });
  }

  state = {
    gameType: "toepen",
    players,
    deck: [],
    round: 0,
    stake: 1,
    previousStake: 1,
    handSize: 4,
    tricksPerRound: 4,
    trickIndex: 0,
    currentTrick: emptyTrick(),
    turnPlayerId: "p0",
    nextLeaderId: "p0",
    roundStarterId: "p0",
    dealerId: null,
    dealAnimationId: 0,
    lastTrickWinnerId: null,
    dirtyQueue: [],
    dirtyPointer: 0,
    phase: "play",
    pendingDirtyClaim: null,
    dirtyClaimedIds: [],
    pendingToep: null,
    toepCooldownPlays: -1,
    log: [],
    winnerId: null,
  };

  els.menuScreen.classList.add("hidden");
  els.endScreen.classList.add("hidden");
  els.gameScreen.classList.remove("hidden");
  document.body.classList.add("game-active");
  setupMobilePanels();
  log("Welcome to the table. Ten lives each. Final trick rules all.");
  beginRound();
}

function startSchwimmenGame(botCount) {
  clearTimer();
  selectedSwimHandCardId = null;
  const startingLives = selectedSwimLives();
  const players = [
    {
      id: "p0",
      name: "You",
      isHuman: true,
      lives: startingLives,
      swimming: false,
      hand: [],
      active: true,
      folded: false,
      eliminated: false,
      playedCards: [],
    },
  ];

  for (let index = 0; index < botCount; index += 1) {
    players.push({
      id: `p${index + 1}`,
      name: BOT_NAMES[index],
      isHuman: false,
      lives: startingLives,
      swimming: false,
      hand: [],
      active: true,
      folded: false,
      eliminated: false,
      playedCards: [],
    });
  }

  state = {
    gameType: "schwimmen",
    players,
    deck: [],
    discard: [],
    centerCards: [],
    round: 0,
    swimLives: startingLives,
    turnPlayerId: "p0",
    nextLeaderId: "p0",
    dealerId: null,
    dealAnimationId: 0,
    phase: "swimPlay",
    knockerId: null,
    knockRemainingIds: [],
    passStreak: 0,
    lastRoundScores: [],
    log: [],
    winnerId: null,
  };

  els.menuScreen.classList.add("hidden");
  els.endScreen.classList.add("hidden");
  els.gameScreen.classList.remove("hidden");
  document.body.classList.add("game-active");
  setupMobilePanels();
  log(`Welcome to Schnautz. ${startingLives} lives, then swimming, then out.`);
  beginSchwimmenRound();
}

function beginSchwimmenRound() {
  if (state?.mode === "online") {
    window.ToepenOnline?.sendAction?.({ type: "beginRound" });
    return;
  }

  clearTimer();
  clearDealTimer();
  selectedSwimHandCardId = null;
  state.round += 1;
  state.deck = shuffle(createDeck());
  state.discard = [];
  state.centerCards = [];
  state.knockerId = null;
  state.knockRemainingIds = [];
  state.passStreak = 0;
  state.lastRoundScores = [];
  state.phase = "swimPlay";

  for (const player of state.players) {
    player.active = !player.eliminated;
    player.folded = false;
    player.playedCards = [];
    player.hand = player.eliminated ? [] : drawFromGameDeck(state, 3);
  }

  state.centerCards = drawFromGameDeck(state, 3);
  assignSchwimmenDealerForRound();
  state.turnPlayerId = firstSchwimmenPlayerIdFrom(state.nextLeaderId);
  state.dealAnimationId += 1;
  log(`${getPlayer(state.dealerId)?.name || "Dealer"} shuffles and deals. ${getPlayer(state.turnPlayerId)?.name || "Next seat"} starts.`);
  render();
  schedule(maybeSchwimmenBotTurn, DEAL_ANIMATION_MS + DELAYS.botThink);
}

function humanSelectSchwimmenCard(cardId) {
  const human = getHuman();
  if (!canHumanSchwimmenAct() || !human.hand.some((card) => card.id === cardId)) return;
  selectedSwimHandCardId = selectedSwimHandCardId === cardId ? null : cardId;
  render();
}

function humanSchwimmenSwapCenter(centerCardId) {
  if (!selectedSwimHandCardId) return;
  if (state?.mode === "online") {
    window.ToepenOnline?.sendAction?.({
      type: "swimSwapOne",
      handCardId: selectedSwimHandCardId,
      centerCardId,
    });
    selectedSwimHandCardId = null;
    return;
  }

  const human = getHuman();
  if (!canHumanSchwimmenAct()) return;
  const handCard = human.hand.find((card) => card.id === selectedSwimHandCardId);
  const centerCard = state.centerCards.find((card) => card.id === centerCardId);
  if (!handCard || !centerCard) return;

  performSchwimmenSwapOne(state, human, handCard.id, centerCard.id);
  log(`You trade ${cardLabel(handCard)} for ${cardLabel(centerCard)}.`);
  afterSchwimmenAction(human, { changed: true });
}

function humanSchwimmenSwapAll() {
  if (state?.mode === "online") {
    selectedSwimHandCardId = null;
    window.ToepenOnline?.sendAction?.({ type: "swimSwapAll" });
    return;
  }

  const human = getHuman();
  if (!canHumanSchwimmenAct()) return;
  performSchwimmenSwapAll(state, human);
  log("You trade all three cards with the center.");
  afterSchwimmenAction(human, { changed: true });
}

function humanSchwimmenPass() {
  if (state?.mode === "online") {
    selectedSwimHandCardId = null;
    window.ToepenOnline?.sendAction?.({ type: "swimPass" });
    return;
  }

  const human = getHuman();
  if (!canHumanSchwimmenAct()) return;
  log("You pass.");
  afterSchwimmenAction(human, { changed: false });
}

function humanSchwimmenKnock() {
  if (state?.mode === "online") {
    selectedSwimHandCardId = null;
    window.ToepenOnline?.sendAction?.({ type: "swimKnock" });
    return;
  }

  const human = getHuman();
  if (!canHumanSchwimmenAct() || state.knockerId) return;
  schwimmenKnock(human);
}

function humanSchwimmenSchnautz() {
  if (state?.mode === "online") {
    selectedSwimHandCardId = null;
    window.ToepenOnline?.sendAction?.({ type: "swimSchnautz" });
    return;
  }

  const human = getHuman();
  if (!canHumanSchwimmenAct() || schwimmenHandValue(human.hand) !== 31) return;
  finishSchwimmenRound(`${human.name} announces Schnautz with 31.`);
}

function schwimmenKnock(player) {
  state.knockerId = player.id;
  state.knockRemainingIds = activeSchwimmenPlayers()
    .filter((seat) => seat.id !== player.id)
    .map((seat) => seat.id);
  state.passStreak = 0;
  selectedSwimHandCardId = null;
  log(`${player.name} knocks. Everyone else gets one last turn.`);

  if (state.knockRemainingIds.length === 0) {
    finishSchwimmenRound(`${player.name} knocks and stands alone.`);
    return;
  }

  state.turnPlayerId = nextSchwimmenTurnId(player.id);
  render();
  schedule(maybeSchwimmenBotTurn, DELAYS.botThink);
}

function afterSchwimmenAction(player, options = {}) {
  selectedSwimHandCardId = null;
  if (options.changed) {
    state.passStreak = 0;
  } else if (!state.knockerId) {
    state.passStreak += 1;
    if (state.passStreak >= activeSchwimmenPlayers().length) {
      replaceSchwimmenCenter();
      state.passStreak = 0;
    }
  }

  const score = schwimmenHandValue(player.hand);
  if (score === 31) {
    finishSchwimmenRound(`${player.name} announces Schnautz with 31.`);
    return;
  }

  if (state.knockerId && player.id !== state.knockerId) {
    state.knockRemainingIds = state.knockRemainingIds.filter((id) => id !== player.id);
    if (state.knockRemainingIds.length === 0) {
      finishSchwimmenRound(`${getPlayer(state.knockerId)?.name || "The knocker"}'s final lap is complete.`);
      return;
    }
  }

  state.turnPlayerId = nextSchwimmenTurnId(player.id);
  render();
  schedule(maybeSchwimmenBotTurn, DELAYS.botThink);
}

function maybeSchwimmenBotTurn() {
  if (!state || state.gameType !== "schwimmen" || state.phase !== "swimPlay" || state.mode === "online") return;
  const player = getPlayer(state.turnPlayerId);
  if (!player || player.eliminated) {
    state.turnPlayerId = nextSchwimmenTurnId(state.turnPlayerId);
    render();
    schedule(maybeSchwimmenBotTurn, DELAYS.botRecover);
    return;
  }

  if (player.isHuman) {
    render();
    return;
  }

  const score = schwimmenHandValue(player.hand);
  if (score === 31) {
    finishSchwimmenRound(`${player.name} announces Schnautz with 31.`);
    return;
  }

  if (!state.knockerId && score >= 28 && Math.random() < 0.42) {
    schwimmenKnock(player);
    return;
  }

  const move = chooseSchwimmenBotMove(player);
  if (move.type === "swapOne") {
    const handCard = player.hand.find((card) => card.id === move.handCardId);
    const centerCard = state.centerCards.find((card) => card.id === move.centerCardId);
    performSchwimmenSwapOne(state, player, move.handCardId, move.centerCardId);
    log(`${player.name} trades ${cardLabel(handCard)} for ${cardLabel(centerCard)}.`);
    afterSchwimmenAction(player, { changed: true });
    return;
  }

  if (move.type === "swapAll") {
    performSchwimmenSwapAll(state, player);
    log(`${player.name} trades all three cards.`);
    afterSchwimmenAction(player, { changed: true });
    return;
  }

  if (!state.knockerId && score >= 25 && Math.random() < 0.18) {
    schwimmenKnock(player);
    return;
  }

  log(`${player.name} passes.`);
  afterSchwimmenAction(player, { changed: false });
}

function chooseSchwimmenBotMove(player) {
  const current = schwimmenHandValue(player.hand);
  let best = { type: "pass", score: current };

  for (const handCard of player.hand) {
    for (const centerCard of state.centerCards) {
      const testHand = player.hand.map((card) => (card.id === handCard.id ? centerCard : card));
      const score = schwimmenHandValue(testHand);
      if (score > best.score) best = { type: "swapOne", handCardId: handCard.id, centerCardId: centerCard.id, score };
    }
  }

  const allScore = schwimmenHandValue(state.centerCards);
  if (allScore > best.score) best = { type: "swapAll", score: allScore };

  if (best.score > current || (best.type !== "pass" && best.score >= 26 && Math.random() < 0.22)) return best;
  return { type: "pass", score: current };
}

function performSchwimmenSwapOne(game, player, handCardId, centerCardId) {
  const handIndex = player.hand.findIndex((card) => card.id === handCardId);
  const centerIndex = game.centerCards.findIndex((card) => card.id === centerCardId);
  if (handIndex < 0 || centerIndex < 0) return false;
  const handCard = player.hand[handIndex];
  player.hand[handIndex] = game.centerCards[centerIndex];
  game.centerCards[centerIndex] = handCard;
  return true;
}

function performSchwimmenSwapAll(game, player) {
  const oldHand = player.hand;
  player.hand = game.centerCards;
  game.centerCards = oldHand;
}

function replaceSchwimmenCenter(game = state) {
  game.discard = [...(game.discard || []), ...(game.centerCards || [])];
  game.centerCards = drawFromGameDeck(game, 3);
  log("Everyone passed. The center is washed away and three new cards appear.");
}

function finishSchwimmenRound(reason) {
  clearTimer();
  selectedSwimHandCardId = null;
  if (reason) log(reason);

  const players = activeSchwimmenPlayers();
  const scores = players.map((player) => ({
    playerId: player.id,
    name: player.name,
    score: schwimmenHandValue(player.hand),
    lost: false,
  }));
  const lowest = Math.min(...scores.map((entry) => entry.score));
  const losers = scores.filter((entry) => entry.score === lowest);

  for (const result of scores) {
    result.lost = losers.some((loser) => loser.playerId === result.playerId);
  }
  state.lastRoundScores = scores.sort((a, b) => b.score - a.score);

  for (const loser of losers) {
    const player = getPlayer(loser.playerId);
    if (!player || player.eliminated) continue;
    if (player.swimming || player.lives <= 0) {
      player.eliminated = true;
      player.active = false;
      log(`${player.name} loses with ${formatSchwimmenScore(loser.score)} and sinks out.`);
    } else if (player.lives > 1) {
      player.lives -= 1;
      log(`${player.name} loses with ${formatSchwimmenScore(loser.score)} and loses 1 life.`);
    } else {
      player.lives = 0;
      player.swimming = true;
      log(`${player.name} loses with ${formatSchwimmenScore(loser.score)} and starts swimming.`);
    }
  }

  const remaining = activeSchwimmenPlayers();
  if (remaining.length <= 1) {
    finishSchwimmenGame(remaining[0]?.id || null);
    return;
  }

  state.phase = "roundOver";
  render();
}

function finishSchwimmenGame(winnerId) {
  clearTimer();
  const winner = getPlayer(winnerId) || activeSchwimmenPlayers()[0];
  state.phase = "gameOver";
  state.winnerId = winner?.id || null;
  log(`${winner?.name || "No one"} wins the Schnautz match.`);
  render();
}

function assignSchwimmenDealerForRound() {
  const active = activeSchwimmenPlayers();
  if (active.length === 0) return;
  if (!state.dealerId) {
    state.dealerId = schwimmenSeatIdFrom(active[0].id, -1);
  } else {
    state.dealerId = schwimmenSeatIdFrom(state.dealerId, 1);
  }
  state.nextLeaderId = schwimmenSeatIdFrom(state.dealerId, 1);
}

function nextSchwimmenTurnId(fromId, game = state) {
  const remaining = game.knockerId ? new Set(game.knockRemainingIds || []) : null;
  const start = Math.max(0, game.players.findIndex((player) => player.id === fromId));
  for (let offset = 1; offset <= game.players.length; offset += 1) {
    const player = game.players[(start + offset) % game.players.length];
    if (!player?.eliminated && (!remaining || remaining.has(player.id))) return player.id;
  }
  return null;
}

function firstSchwimmenPlayerIdFrom(fromId, game = state) {
  const activeIds = activeSchwimmenPlayers(game).map((player) => player.id);
  return activeIds.includes(fromId) ? fromId : activeIds[0];
}

function schwimmenSeatIdFrom(fromId, direction, game = state) {
  const active = activeSchwimmenPlayers(game);
  if (active.length === 0) return null;
  const startIndex = Math.max(0, game.players.findIndex((player) => player.id === fromId));
  for (let offset = 1; offset <= game.players.length; offset += 1) {
    const player = game.players[(startIndex + direction * offset + game.players.length) % game.players.length];
    if (player && !player.eliminated) return player.id;
  }
  return active[0].id;
}

function canHumanSchwimmenAct() {
  const human = getHuman();
  return Boolean(
    state?.phase === "swimPlay" &&
      human &&
      state.turnPlayerId === human.id &&
      !human.eliminated &&
      state.knockerId !== human.id,
  );
}

function activeSchwimmenPlayers(game = state) {
  return (game?.players || []).filter((player) => !player.eliminated);
}

function drawFromGameDeck(game, count) {
  if (game.deck.length < count && game.discard?.length) {
    game.deck = shuffle([...game.deck, ...game.discard]);
    game.discard = [];
  }
  return game.deck.splice(0, count);
}

function schwimmenHandValue(hand) {
  if (!hand?.length) return 0;
  const rankCounts = hand.reduce((counts, card) => {
    counts[card.rank] = (counts[card.rank] || 0) + 1;
    return counts;
  }, {});
  const threeKind = Object.values(rankCounts).some((count) => count === 3) ? 30.5 : 0;
  const suitScores = hand.reduce((scores, card) => {
    scores[card.suit] = (scores[card.suit] || 0) + SCHWIMMEN_VALUES[card.rank];
    return scores;
  }, {});
  return Math.max(threeKind, ...Object.values(suitScores));
}

function schnautzSuitForHand(hand) {
  const suitScores = (hand || []).reduce((scores, card) => {
    scores[card.suit] = (scores[card.suit] || 0) + SCHWIMMEN_VALUES[card.rank];
    return scores;
  }, {});
  const entry = Object.entries(suitScores).find(([, score]) => score === 31);
  return entry?.[0] || null;
}

function formatSchwimmenScore(score) {
  return score === 30.5 ? "30.5" : String(Math.round(score));
}

function beginRound() {
  if (state?.mode === "online") {
    window.ToepenOnline?.sendAction?.({ type: "beginRound" });
    return;
  }

  clearTimer();
  clearDealTimer();
  state.round += 1;
  state.stake = 1;
  state.previousStake = 1;
  state.trickIndex = 0;
  state.lastTrickWinnerId = null;
  state.pendingDirtyClaim = null;
  state.dirtyClaimedIds = [];
  state.pendingToep = null;
  state.toepCooldownPlays = -1;
  state.currentTrick = emptyTrick();
  state.deck = shuffle(createDeck());

  for (const player of state.players) {
    player.eliminated = player.lives <= 0;
    player.active = !player.eliminated;
    player.folded = false;
    player.raises = 0;
    player.playedCards = [];
    player.hand = player.eliminated ? [] : drawCards(roundTricks());
  }

  assignDealerForRound();
  state.turnPlayerId = state.nextLeaderId;
  state.roundStarterId = state.nextLeaderId;
  state.dirtyQueue = orderedAliveIdsFrom(state.nextLeaderId);
  state.dirtyPointer = 0;
  state.phase = "dirty";
  state.dealAnimationId += 1;
  log(`${getPlayer(state.dealerId)?.name || "Dealer"} shuffles and deals. ${getPlayer(state.nextLeaderId)?.name || "Next seat"} starts.`);
  log(`Round ${state.round} starts. Dirty Laundry phase opens.`);
  render();
  schedule(processDirtyLaundry, DEAL_ANIMATION_MS + DELAYS.dirtyOpen);
}

function createDeck() {
  let uid = 0;
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      id: `${suit.id}-${rank}-${uid++}`,
      rank,
      suit: suit.id,
      suitName: suit.name,
      symbol: suit.symbol,
      red: suit.red,
      power: POWER[rank],
    })),
  );
}

function shuffle(cards) {
  const copy = [...cards];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function drawCards(count) {
  return state.deck.splice(0, count);
}

function emptyTrick() {
  return { leadSuit: null, plays: [] };
}

function assignDealerForRound() {
  const alive = alivePlayers();
  if (alive.length === 0) return;

  if (!state.dealerId) {
    state.dealerId = previousAliveIdFrom(alive[0].id);
  } else {
    state.dealerId = nextAliveIdFrom(state.dealerId);
  }
  state.nextLeaderId = nextAliveIdFrom(state.dealerId);
}

function nextAliveIdFrom(fromId) {
  return aliveIdFromSeatOffset(state.players, fromId, 1);
}

function previousAliveIdFrom(fromId) {
  return aliveIdFromSeatOffset(state.players, fromId, -1);
}

function aliveIdFromSeatOffset(players, fromId, direction) {
  const alive = players.filter((player) => player.lives > 0);
  if (alive.length === 0) return null;
  const startIndex = Math.max(0, players.findIndex((player) => player.id === fromId));
  for (let offset = 1; offset <= players.length; offset += 1) {
    const index = (startIndex + direction * offset + players.length) % players.length;
    const player = players[index];
    if (player?.lives > 0) return player.id;
  }
  return alive[0].id;
}

function totalPlayedCards(game = state) {
  return (game?.players || []).reduce((total, player) => total + (player.playedCards?.length || 0), 0);
}

function roundTricks(game = state) {
  const tricks = Number(game?.tricksPerRound || game?.handSize || 4);
  return Number.isFinite(tricks) && tricks > 0 ? tricks : 4;
}

function dirtyLaundryEnabled(game = state) {
  return roundTricks(game) === 4;
}

function hasDirtyClaimed(playerId) {
  return (state.dirtyClaimedIds || []).includes(playerId);
}

function markDirtyClaimed(playerId) {
  if (!playerId) return;
  state.dirtyClaimedIds = state.dirtyClaimedIds || [];
  if (!state.dirtyClaimedIds.includes(playerId)) state.dirtyClaimedIds.push(playerId);
}

function finalTrickName(game = state) {
  return roundTricks(game) === 4 ? "fourth trick" : "final trick";
}

function processDirtyLaundry() {
  if (!state || state.phase !== "dirty") return;

  const alive = alivePlayers();
  if (alive.length <= 1) {
    finishGame(alive[0]?.id);
    return;
  }

  while (state.dirtyPointer < state.dirtyQueue.length) {
    const player = getPlayer(state.dirtyQueue[state.dirtyPointer]);
    if (player && player.lives > 0) {
      if (player.isHuman) {
        render();
        return;
      }

      const claim = botWantsDirtyLaundry(player);
      if (claim) {
        resolveBotDirtyClaim(player);
      } else {
        log(`${player.name} keeps their hand.`);
        state.dirtyPointer += 1;
        render();
        schedule(processDirtyLaundry, DELAYS.dirtyDecision);
      }
      return;
    }
    state.dirtyPointer += 1;
  }

  startPlayPhase();
}

function humanPassDirty() {
  if (state?.mode === "online") {
    window.ToepenOnline?.sendAction?.({ type: "dirtyPass" });
    return;
  }

  if (!isHumanDirtyTurn()) return;
  log("You keep your hand.");
  state.dirtyPointer += 1;
  render();
  schedule(processDirtyLaundry, DELAYS.afterHumanChoice);
}

function humanClaimDirty() {
  if (state?.mode === "online") {
    window.ToepenOnline?.sendAction?.({ type: "dirtyClaim" });
    return;
  }

  if (!isHumanDirtyTurn()) return;
  const human = getHuman();
  if (hasDirtyClaimed(human.id)) return;
  markDirtyClaimed(human.id);
  const challenger = chooseBotDirtyChallenger(human);
  if (challenger) {
    settleDirtyChallenge(human, challenger);
    state.dirtyPointer += 1;
  } else {
    log("You claim Dirty Laundry. The table lets it pass.");
    exchangeHand(human);
    state.dirtyPointer += 1;
  }
  render();
  schedule(processDirtyLaundry, DELAYS.afterClaim);
}

function resolveBotDirtyClaim(player) {
  if (hasDirtyClaimed(player.id)) return;
  markDirtyClaimed(player.id);
  log(`${player.name} claims Dirty Laundry.`);
  const human = getHuman();
  if (human && human.lives > 0 && player.id !== human.id) {
    state.phase = "dirtyChallenge";
    state.pendingDirtyClaim = { claimerId: player.id };
    render();
    return;
  }

  finishBotDirtyClaim(false);
}

function humanDirtyChallenge(challenge) {
  if (state?.mode === "online") {
    window.ToepenOnline?.sendAction?.({ type: "dirtyResponse", challenge });
    return;
  }

  if (state.phase !== "dirtyChallenge" || !state.pendingDirtyClaim) return;
  finishBotDirtyClaim(challenge);
}

function finishBotDirtyClaim(humanChallenges) {
  const claimer = getPlayer(state.pendingDirtyClaim.claimerId);
  const human = getHuman();
  state.phase = "dirty";
  state.pendingDirtyClaim = null;

  if (humanChallenges && human && human.lives > 0) {
    settleDirtyChallenge(claimer, human);
  } else {
    const botChallenger = chooseBotDirtyChallenger(claimer);
    if (botChallenger) {
      settleDirtyChallenge(claimer, botChallenger);
    } else {
      log(`${claimer.name}'s Dirty Laundry passes. New cards hit the felt.`);
      exchangeHand(claimer);
    }
  }

  state.dirtyPointer += 1;
  render();
  schedule(processDirtyLaundry, DELAYS.afterClaim);
}

function settleDirtyChallenge(claimer, challenger) {
  const valid = isDirtyLaundry(claimer.hand);
  if (valid) {
    challenger.lives = Math.max(0, challenger.lives - 1);
    log(`${challenger.name} challenges ${claimer.name}. Claim is valid; ${challenger.name} loses 1 life.`);
    exchangeHand(claimer);
    markEliminations();
  } else {
    claimer.lives = Math.max(0, claimer.lives - 1);
    log(`${challenger.name} challenges ${claimer.name}. Bluff caught; ${claimer.name} loses 1 life and keeps the hand.`);
    markEliminations();
  }
}

function exchangeHand(player) {
  state.deck.push(...player.hand);
  state.deck = shuffle(state.deck);
  player.hand = drawCards(roundTricks());
}

function isDirtyLaundry(hand) {
  if (hand.length !== 4) return false;
  const coreCount = hand.filter((card) => DIRTY_CORE.has(card.rank)).length;
  const sevenCount = hand.filter((card) => card.rank === "7").length;
  return coreCount === 4 || (coreCount === 3 && sevenCount === 1);
}

function botWantsDirtyLaundry(player) {
  if (hasDirtyClaimed(player.id)) return false;
  const valid = isDirtyLaundry(player.hand);
  const score = handScore(player.hand);
  if (valid) return Math.random() < 0.86;
  if (score < 0.34) return Math.random() < 0.2;
  return Math.random() < 0.045;
}

function chooseBotDirtyChallenger(claimer) {
  const valid = isDirtyLaundry(claimer.hand);
  const suspicion = valid ? 0.1 : 0.34 + handScore(claimer.hand) * 0.32;
  const bots = alivePlayers().filter((player) => !player.isHuman && player.id !== claimer.id);
  return bots.find(() => Math.random() < suspicion) || null;
}

function startPlayPhase() {
  state.phase = "play";
  state.trickIndex = 0;
  state.currentTrick = emptyTrick();
  state.turnPlayerId = firstActiveIdFrom(state.nextLeaderId);
  state.roundStarterId = state.turnPlayerId;
  log("Cards down. The first trick begins.");
  render();
  schedule(maybeBotTurn, DELAYS.botThink);
}

function playHumanCard(cardId) {
  if (state?.mode === "online") {
    window.ToepenOnline?.sendAction?.({ type: "playCard", cardId });
    return;
  }

  const human = getHuman();
  if (!human || state.phase !== "play" || state.turnPlayerId !== human.id || !human.active) return;
  const card = human.hand.find((item) => item.id === cardId);
  if (!card || !isLegalCard(human, card)) return;
  playCard(human, card);
}

function playCard(player, card) {
  removeCard(player, card.id);
  if (!state.currentTrick.leadSuit) {
    state.currentTrick.leadSuit = card.suit;
  }

  state.currentTrick.plays.push({ playerId: player.id, card });
  player.playedCards.push(card);
  log(`${player.name} plays ${cardLabel(card)}.`);
  render();

  if (activeRoundPlayers().length <= 1) {
    endRoundByFold();
    return;
  }

  if (isTrickComplete()) {
    schedule(completeTrick, DELAYS.trickSettle);
    return;
  }

  state.turnPlayerId = nextUnplayedActiveId(player.id);
  render();
  schedule(maybeBotTurn, DELAYS.botThink);
}

function completeTrick() {
  if (state.phase !== "play") return;
  const winnerId = trickWinnerId();
  const winner = getPlayer(winnerId);
  state.lastTrickWinnerId = winnerId;
  log(`${winner.name} wins trick ${state.trickIndex + 1}.`);
  state.trickIndex += 1;

  if (state.trickIndex >= roundTricks()) {
    endRoundByLastTrick(winnerId);
    return;
  }

  state.currentTrick = emptyTrick();
  state.turnPlayerId = winnerId;
  render();
  schedule(maybeBotTurn, DELAYS.botThink);
}

function maybeBotTurn() {
  if (!state || state.phase !== "play") return;
  if (state.mode === "online") return;
  if (activeRoundPlayers().length <= 1) {
    endRoundByFold();
    return;
  }

  const player = getPlayer(state.turnPlayerId);
  if (!player || !player.active || player.lives <= 0) {
    state.turnPlayerId = nextUnplayedActiveId(state.turnPlayerId);
    render();
    schedule(maybeBotTurn, DELAYS.botRecover);
    return;
  }

  if (player.isHuman) {
    render();
    return;
  }

  if (canPlayerToep(player) && botShouldToep(player)) {
    initiateToep(player.id, { type: "botTurn" });
    return;
  }

  const card = chooseBotCard(player);
  playCard(player, card);
}

function chooseBotCard(player) {
  const legal = legalCards(player);
  const sortedLow = [...legal].sort((a, b) => a.power - b.power);
  const sortedHigh = [...legal].sort((a, b) => b.power - a.power);

  if (state.trickIndex === roundTricks() - 1) {
    const currentWinner = currentWinningPlay();
    if (currentWinner && currentWinner.card.suit === state.currentTrick.leadSuit) {
      const beating = sortedLow.find(
        (card) => card.suit === state.currentTrick.leadSuit && card.power > currentWinner.card.power,
      );
      return beating || sortedLow[0];
    }
    return sortedHigh[0];
  }

  if (!state.currentTrick.leadSuit) return sortedLow[0];

  const currentWinner = currentWinningPlay();
  const avoidWin = sortedLow.find((card) => {
    if (!currentWinner || card.suit !== state.currentTrick.leadSuit) return true;
    return card.power < currentWinner.card.power;
  });
  return avoidWin || sortedLow[0];
}

function humanToep() {
  if (state?.mode === "online") {
    window.ToepenOnline?.sendAction?.({ type: "toep" });
    return;
  }

  const human = getHuman();
  if (!canHumanToep()) return;
  initiateToep(human.id, { type: "human" });
}

function initiateToep(actorId, after) {
  const actor = getPlayer(actorId);
  if (!canPlayerToep(actor)) return;

  state.previousStake = state.stake;
  state.stake += 1;
  actor.raises += 1;
  log(`${actor.name} calls Toep. Stake rises to ${state.stake}.`);

  const human = getHuman();
  if (human && human.active && human.id !== actorId) {
    state.phase = "toepResponse";
    state.pendingToep = {
      actorId,
      previousStake: state.previousStake,
      after,
      playCount: totalPlayedCards(),
      resumeTurnPlayerId: state.turnPlayerId,
    };
    render();
    return;
  }

  finishToepResponses(true, after);
}

function humanToepResponse(call) {
  if (state?.mode === "online") {
    window.ToepenOnline?.sendAction?.({ type: "toepResponse", call });
    return;
  }

  if (state.phase !== "toepResponse" || !state.pendingToep) return;
  const pending = state.pendingToep;
  const human = getHuman();

  if (call) {
    log(`You call the Toep for ${state.stake} lives.`);
  } else {
    foldPlayer(human, pending.previousStake);
    log(`You fold and pay ${pending.previousStake} life.`);
  }

  finishToepResponses(call, pending.after);
}

function finishToepResponses(_humanCalled, after) {
  const pending = state.pendingToep;
  const actorId = pending?.actorId;
  const previousStake = pending?.previousStake ?? state.previousStake;
  const resumeTurnPlayerId = pending?.resumeTurnPlayerId || state.turnPlayerId;
  state.pendingToep = null;
  state.toepCooldownPlays = totalPlayedCards();

  for (const player of activeRoundPlayers()) {
    if (player.id === actorId || player.isHuman) continue;
    if (botCallsToep(player, actorId)) {
      log(`${player.name} calls.`);
    } else {
      foldPlayer(player, previousStake);
      log(`${player.name} folds and pays ${previousStake} life.`);
    }
  }

  markEliminations();

  if (activeRoundPlayers().length <= 1) {
    state.phase = "play";
    endRoundByFold();
    return;
  }

  state.phase = "play";
  if (isTrickComplete()) {
    render();
    schedule(completeTrick, DELAYS.trickSettle);
    return;
  }

  repairTurn(resumeTurnPlayerId || actorId || state.turnPlayerId);

  render();
  if (after?.type === "botTurn" || !getPlayer(state.turnPlayerId)?.isHuman) {
    schedule(maybeBotTurn, DELAYS.botThink);
  }
}

function botShouldToep(player) {
  if (state.stake >= 10 || player.raises >= 2 || activeRoundPlayers().length < 2) return false;
  const score = handScore(player.hand);
  const late = state.trickIndex >= Math.max(1, roundTricks() - 2) ? 0.06 : 0;
  if (score > 0.72) return Math.random() < 0.22 + late;
  if (score > 0.55) return Math.random() < 0.09 + late;
  return Math.random() < 0.025;
}

function botCallsToep(player, actorId) {
  const score = handScore(player.hand);
  const pressure = state.stake / Math.max(1, player.lives);
  const actor = getPlayer(actorId);
  const actorIsAggressive = actor?.raises > 1 ? 0.08 : 0;
  const confidence = score - pressure * 0.28 - actorIsAggressive + Math.random() * 0.28;
  return confidence > 0.28 || player.lives <= state.previousStake;
}

function foldPlayer(player, penalty) {
  if (!player || !player.active) return;
  player.lives = Math.max(0, player.lives - penalty);
  player.active = false;
  player.folded = true;
  if (player.lives <= 0) player.eliminated = true;
}

function endRoundByFold() {
  const winner = activeRoundPlayers()[0];
  if (!winner) {
    const alive = alivePlayers()[0];
    finishGame(alive?.id);
    return;
  }
  log(`${winner.name} stands alone and wins the round.`);
  finishRound(winner.id, false);
}

function endRoundByLastTrick(winnerId) {
  const winner = getPlayer(winnerId);
  log(`${winner.name} takes the ${finalTrickName()} and wins the round.`);
  finishRound(winnerId, true);
}

function finishRound(winnerId, chargeActiveLosers) {
  const winner = getPlayer(winnerId);

  if (chargeActiveLosers) {
    for (const player of state.players) {
      if (player.lives <= 0 || player.id === winnerId || player.folded || !player.active) continue;
      player.lives = Math.max(0, player.lives - state.stake);
      log(`${player.name} loses ${state.stake} life${state.stake === 1 ? "" : "s"}.`);
    }
  }

  markEliminations();
  const alive = alivePlayers();
  if (alive.length <= 1) {
    finishGame(alive[0]?.id || winner?.id);
    return;
  }

  state.phase = "roundOver";
  render();
}

function finishGame(winnerId) {
  clearTimer();
  const winner = getPlayer(winnerId) || alivePlayers()[0];
  state.phase = "gameOver";
  state.winnerId = winner?.id || null;
  render();

  els.gameScreen.classList.add("hidden");
  els.endScreen.classList.remove("hidden");
  document.body.classList.remove("game-active");
  els.endTitle.textContent = `${winner?.name || "No one"} wins`;
  els.endCopy.textContent =
    winner?.isHuman
      ? "You kept your nerve, stole the final table, and left with lives still burning."
      : `${winner?.name || "The table"} owns the final chair. Start a new table for revenge.`;
}

function markEliminations() {
  for (const player of state.players) {
    if (player.lives <= 0) {
      player.lives = 0;
      player.active = false;
      player.eliminated = true;
      player.hand = [];
    }
  }
}

function render() {
  if (!state) return;
  if (isSchwimmenState()) {
    renderSchwimmen();
    return;
  }
  const tricks = roundTricks();
  els.stakeLabel.textContent = "Stake";
  els.trickLabel.textContent = "Trick";
  els.leadLabel.textContent = "Lead";
  els.roundTitle.textContent = `Round ${state.round}`;
  els.stakeValue.textContent = state.stake;
  els.trickValue.textContent = state.phase.startsWith("dirty")
    ? "Dirty"
    : `${Math.min(state.trickIndex + 1, tricks)} / ${tricks}`;
  els.leadValue.textContent = state.currentTrick.leadSuit ? suitById(state.currentTrick.leadSuit).name : "-";
  els.centerStake.textContent = `${state.stake} life${state.stake === 1 ? "" : "s"}`;
  els.activeCount.textContent = `${activeRoundPlayers().length} active`;
  els.phaseLabel.textContent = phaseName();
  renderScoreboard();
  renderOpponents();
  renderTrick();
  renderHumanHand();
  renderActionBox();
  renderLog();
  renderButtons();
  renderDealAnimation();
  maybeShowLatestToast();
}

function renderSchwimmen() {
  const human = getHuman();
  els.stakeLabel.textContent = "Lives";
  els.trickLabel.textContent = "Center";
  els.leadLabel.textContent = "Turn";
  els.roundTitle.textContent = `Schnautz Round ${state.round}`;
  els.stakeValue.textContent = state.swimLives || 3;
  els.trickValue.textContent = `${state.centerCards?.length || 0} cards`;
  els.leadValue.textContent = getPlayer(state.turnPlayerId)?.name || "-";
  els.centerStake.textContent = human?.hand?.length ? `${formatSchwimmenScore(schwimmenHandValue(human.hand))} points` : "Center swap";
  els.activeCount.textContent = `${activeSchwimmenPlayers().length} in`;
  els.phaseLabel.textContent = phaseName();
  renderScoreboard();
  renderOpponents();
  renderTrick();
  renderHumanHand();
  renderActionBox();
  renderLog();
  renderButtons();
  renderDealAnimation();
  maybeShowLatestToast();
}

function isSchwimmenState(game = state) {
  return game?.gameType === "schwimmen";
}

function renderScoreboard() {
  els.scoreboardList.innerHTML = "";
  for (const player of state.players) {
    const row = document.createElement("div");
    row.className = [
      "player-chip",
      state.turnPlayerId === player.id && (state.phase === "play" || state.phase === "swimPlay") ? "turn" : "",
      player.folded ? "folded" : "",
      player.eliminated ? "out" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const mark = document.createElement("div");
    mark.className = "seat-mark";
    mark.textContent = player.isHuman ? "Y" : player.name[0];

    const body = document.createElement("div");
    const name = document.createElement("div");
    name.className = "player-name";
    name.textContent = player.name;
    const status = document.createElement("div");
    status.className = "player-state";
    status.textContent = playerStateText(player);
    body.append(name, status);

    const lives = document.createElement("div");
    lives.className = "lives";
    lives.textContent = player.lives;
    lives.setAttribute("aria-label", `${player.lives} lives`);

    row.append(mark, body, lives);
    els.scoreboardList.append(row);
  }
}

function renderOpponents() {
  els.opponentRail.innerHTML = "";
  for (const player of state.players.filter((item) => !item.isHuman)) {
    const seat = document.createElement("div");
    seat.className = "opponent-seat";
    const name = document.createElement("strong");
    name.textContent = player.name;
    const meta = document.createElement("small");
    meta.textContent = playerStateText(player);
    const mini = document.createElement("div");
    mini.className = "mini-hand";
    for (let index = 0; index < player.hand.length; index += 1) {
      const card = document.createElement("span");
      card.className = "mini-card";
      mini.append(card);
    }
    seat.append(name, meta, mini);
    els.opponentRail.append(seat);
  }
}

function renderTrick() {
  if (isSchwimmenState()) {
    renderSchwimmenTable();
    return;
  }

  els.trickArea.innerHTML = "";
  const tablePlayers = state.players.filter((player) => player.lives > 0 || player.playedCards?.length);
  const hasPlayedCards = tablePlayers.some((player) => player.playedCards?.length);

  if (!hasPlayedCards) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = state.phase === "dirty" ? "Dirty Laundry claims happen before cards land." : "No played cards yet.";
    els.trickArea.append(empty);
    return;
  }

  const currentWinning = currentWinningPlay();
  for (const player of tablePlayers) {
    const wrap = document.createElement("div");
    wrap.className = "played-stack";
    if (currentWinning?.playerId === player.id) wrap.classList.add("winning");

    const pile = document.createElement("div");
    pile.className = "pile-cards";
    const played = player.playedCards || [];
    if (played.length > 4) pile.classList.add("long-pile");
    played.forEach((card, index) => {
      const cardEl = renderCard(card);
      cardEl.classList.add("pile-card");
      cardEl.style.setProperty("--i", index);
      pile.append(cardEl);
    });

    const byline = document.createElement("div");
    byline.className = "byline";
    byline.textContent = played.length ? `${player.name} (${played.length})` : player.name;
    wrap.append(pile, byline);
    els.trickArea.append(wrap);
  }
}

function renderSchwimmenTable() {
  els.trickArea.innerHTML = "";

  const table = document.createElement("div");
  table.className = "swim-table";

  if ((state.phase === "roundOver" || state.phase === "gameOver") && state.lastRoundScores?.length) {
    table.append(renderSchwimmenReveal());
    els.trickArea.append(table);
    return;
  }

  const title = document.createElement("div");
  title.className = "swim-center-title";
  title.textContent = "Tauschmitte";

  const center = document.createElement("div");
  center.className = "swim-center";
  const canSwap = canHumanSchwimmenAct() && Boolean(selectedSwimHandCardId);
  for (const card of state.centerCards || []) {
    const cardEl = renderCard(card, { asButton: canSwap });
    cardEl.classList.toggle("playable", canSwap);
    if (canSwap) {
      cardEl.addEventListener("click", () => humanSchwimmenSwapCenter(card.id));
    }
    center.append(cardEl);
  }

  table.append(title, center);

  if (state.lastRoundScores?.length) {
    const results = document.createElement("div");
    results.className = "swim-results";
    for (const result of state.lastRoundScores) {
      const pill = document.createElement("div");
      pill.className = `score-pill${result.lost ? " lost" : ""}`;
      pill.textContent = `${result.name}: ${formatSchwimmenScore(result.score)}`;
      results.append(pill);
    }
    table.append(results);
  }

  els.trickArea.append(table);
}

function renderSchwimmenReveal() {
  const reveal = document.createElement("div");
  reveal.className = "swim-reveal-grid";

  for (const result of state.lastRoundScores || []) {
    const player = getPlayer(result.playerId);
    if (!player) continue;

    const seat = document.createElement("div");
    const schnautzSuit = result.score === 31 ? schnautzSuitForHand(player.hand) : null;
    seat.className = [
      "swim-reveal-seat",
      result.lost ? "lost" : "",
      player.eliminated ? "out" : "",
      schnautzSuit ? "schnautz" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const header = document.createElement("div");
    header.className = "swim-reveal-header";
    const name = document.createElement("strong");
    name.textContent = player.name;
    const score = document.createElement("span");
    score.textContent = `${formatSchwimmenScore(result.score)} pts`;
    header.append(name, score);

    const cards = document.createElement("div");
    cards.className = "swim-reveal-cards";
    for (const card of sortHand(player.hand)) {
      const cardEl = renderCard(card);
      cardEl.classList.add("reveal-card");
      if (schnautzSuit && card.suit === schnautzSuit) cardEl.classList.add("schnautz-card");
      cards.append(cardEl);
    }

    const status = document.createElement("small");
    status.textContent = result.lost
      ? player.eliminated
        ? "lost and out"
        : player.swimming
          ? "lost and swimming"
          : "lost 1 life"
      : player.swimming
        ? "swimming"
        : "safe";

    seat.append(header, cards, status);
    reveal.append(seat);
  }

  return reveal;
}

function renderHumanHand() {
  const human = getHuman();
  els.humanHand.innerHTML = "";
  els.humanHand.classList.toggle("swim-hand", isSchwimmenState());
  if (!human || human.hand.length === 0) {
    const note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = human?.eliminated ? "You are out of lives." : "No cards in hand.";
    els.humanHand.append(note);
    return;
  }

  if (isSchwimmenState()) {
    renderSchwimmenHumanHand(human);
    return;
  }

  const legal = new Set(legalCards(human).map((card) => card.id));
  const isTurn = state.phase === "play" && state.turnPlayerId === human.id && human.active;
  for (const card of sortHand(human.hand)) {
    const cardButton = renderCard(card, { asButton: true });
    const playable = isTurn && legal.has(card.id);
    cardButton.classList.toggle("playable", playable);
    cardButton.classList.toggle("disabled", !playable);
    cardButton.disabled = !playable;
    cardButton.addEventListener("click", () => playHumanCard(card.id));
    els.humanHand.append(cardButton);
  }

  if (state.phase === "play" && state.currentTrick.leadSuit) {
    els.handHint.textContent = `Follow ${suitById(state.currentTrick.leadSuit).name} if you can.`;
  } else if (isTurn) {
    els.handHint.textContent = "Lead any card.";
  } else {
    els.handHint.textContent = "Wait for your turn.";
  }
}

function renderSchwimmenHumanHand(human) {
  if (selectedSwimHandCardId && !human.hand.some((card) => card.id === selectedSwimHandCardId)) {
    selectedSwimHandCardId = null;
  }

  const canAct = canHumanSchwimmenAct();
  for (const card of sortHand(human.hand)) {
    const cardButton = renderCard(card, { asButton: true });
    cardButton.classList.toggle("playable", canAct);
    cardButton.classList.toggle("selected", selectedSwimHandCardId === card.id);
    cardButton.classList.toggle("disabled", !canAct);
    cardButton.disabled = !canAct;
    cardButton.addEventListener("click", () => humanSelectSchwimmenCard(card.id));
    els.humanHand.append(cardButton);
  }

  if (state.phase === "roundOver") {
    els.handHint.textContent = `Round score: ${formatSchwimmenScore(schwimmenHandValue(human.hand))}.`;
  } else if (canAct && selectedSwimHandCardId) {
    els.handHint.textContent = "Choose a center card to swap.";
  } else if (canAct) {
    els.handHint.textContent = "Select one card, swap all, pass, knock, or call 31.";
  } else {
    els.handHint.textContent = "Wait for your turn.";
  }
}

function renderCard(card, options = {}) {
  const element = document.createElement(options.asButton ? "button" : "div");
  element.className = `card ${card.red ? "red-card" : "black-card"}`;
  if (options.asButton) element.type = "button";
  element.dataset.rank = card.rank;
  element.dataset.suit = card.suit;

  const topCorner = renderCorner(card, "top");
  const bottomCorner = renderCorner(card, "bottom");
  const face = document.createElement("div");
  const isCourt = ["J", "Q", "K"].includes(card.rank);
  face.className = `card-face ${isCourt ? "court-face" : "pip-face"}`;

  if (isCourt) {
    const portrait = document.createElement("div");
    portrait.className = "court-portrait";

    const crown = document.createElement("div");
    crown.className = "court-crown";
    crown.textContent = card.rank === "K" ? "K" : card.rank === "Q" ? "Q" : "J";

    const centerSuit = document.createElement("div");
    centerSuit.className = "court-suit";
    centerSuit.textContent = card.symbol;

    const flourish = document.createElement("div");
    flourish.className = "court-flourish";
    flourish.textContent = card.rank === "K" ? "ROYAL" : card.rank === "Q" ? "QUEEN" : "KNAVE";

    portrait.append(crown, centerSuit, flourish);
    face.append(portrait);
  } else {
    for (const pipSpec of PIP_LAYOUTS[card.rank] || []) {
      const pip = document.createElement("span");
      pip.className = `pip${pipSpec.down ? " pip-down" : ""}${pipSpec.large ? " pip-large" : ""}`;
      pip.textContent = card.symbol;
      pip.style.setProperty("--x", `${pipSpec.x}%`);
      pip.style.setProperty("--y", `${pipSpec.y}%`);
      face.append(pip);
    }
  }

  element.append(topCorner, face, bottomCorner);
  element.setAttribute("aria-label", cardLabel(card));
  return element;
}

function renderCorner(card, position) {
  const corner = document.createElement("div");
  corner.className = `corner corner-${position}`;

  const rank = document.createElement("span");
  rank.className = "corner-rank";
  rank.textContent = card.rank;

  const suit = document.createElement("span");
  suit.className = "corner-suit";
  suit.textContent = card.symbol;

  corner.append(rank, suit);
  return corner;
}

function renderActionBox() {
  if (isSchwimmenState()) {
    renderSchwimmenActionBox();
    return;
  }

  els.actionBox.innerHTML = "";
  const title = document.createElement("h3");
  const copy = document.createElement("p");
  const stack = document.createElement("div");
  stack.className = "action-stack";

  if (state.phase === "dirtyChallenge") {
    const claimer = getPlayer(state.pendingDirtyClaim?.claimerId);
    const human = getHuman();
    const alreadyResponded = Boolean(state.pendingDirtyClaim?.responses?.[human?.id]);
    title.textContent = "Dirty Laundry claim";
    if (state.mode === "online" && claimer?.id === human?.id) {
      copy.textContent = "Your claim is on the table. Waiting for the others to challenge or pass.";
    } else if (state.mode === "online" && alreadyResponded) {
      copy.textContent = "Your answer is locked in. Waiting for the rest of the table.";
    } else {
      copy.textContent = `${claimer?.name || "A player"} asks for new cards. Challenge the claim or let the exchange pass.`;
      stack.append(
        actionButton("Challenge", "danger-action", () => humanDirtyChallenge(true)),
        actionButton("Let it pass", "table-action", () => humanDirtyChallenge(false)),
      );
    }
  } else if (isHumanDirtyTurn()) {
    title.textContent = "Your Dirty Laundry";
    copy.textContent = "Claim if your hand is weak, or bluff and dare the table to inspect it.";
    stack.append(
      actionButton("Claim Dirty Laundry", "danger-action", humanClaimDirty),
      actionButton("Keep hand", "table-action", humanPassDirty),
    );
  } else if (state.phase === "toepResponse") {
    const actor = getPlayer(state.pendingToep?.actorId);
    const human = getHuman();
    const alreadyResponded = Boolean(state.pendingToep?.responses?.[human?.id]);
    title.textContent = "Toep called";
    if (state.mode === "online" && actor?.id === human?.id) {
      copy.textContent = "Your Toep is live. The table can join this stake or step out; no one can raise over it.";
    } else if (state.mode === "online" && alreadyResponded) {
      copy.textContent = "Your answer is locked in. Waiting for other players.";
    } else {
      copy.textContent = `${actor?.name || "A player"} raised the stake to ${state.stake}. Join to stay in, or step out for ${state.pendingToep?.previousStake || state.previousStake}.`;
      stack.append(
        actionButton(`Join ${state.stake}`, "primary-action", () => humanToepResponse(true)),
        actionButton(`Step out ${state.pendingToep?.previousStake || state.previousStake}`, "table-action", () =>
          humanToepResponse(false),
        ),
      );
    }
  } else if (state.phase === "roundOver") {
    title.textContent = "Round settled";
    copy.textContent = "The table is ready for fresh cards.";
    stack.append(actionButton("Deal next round", "primary-action", beginRound));
  } else if (state.phase === "dirty") {
    const player = getPlayer(state.dirtyQueue[state.dirtyPointer]);
    title.textContent = "Dirty Laundry";
    copy.textContent = `${player?.name || "The table"} is judging the hand. Weak hands may be exchanged if no one catches a bluff.`;
  } else if (state.phase === "play") {
    const turn = getPlayer(state.turnPlayerId);
    title.textContent = turn?.isHuman ? "Your move" : `${turn?.name || "Player"} thinks`;
    copy.textContent = turn?.isHuman
      ? "Play a legal card. Only the trick leader may Toep before leading."
      : "Bots play the same rules: follow suit, save strength, and bluff sometimes.";
  } else {
    title.textContent = "Table";
    copy.textContent = "The cards are moving.";
  }

  els.actionBox.append(title, copy, stack);
}

function renderSchwimmenActionBox() {
  els.actionBox.innerHTML = "";
  const title = document.createElement("h3");
  const copy = document.createElement("p");
  const stack = document.createElement("div");
  stack.className = "action-stack";
  const human = getHuman();
  const turn = getPlayer(state.turnPlayerId);

  if (state.phase === "roundOver") {
    title.textContent = "Round settled";
    copy.textContent = "Lowest score lost a life. Deal again when the table is ready.";
    stack.append(actionButton("Deal next round", "primary-action", beginSchwimmenRound));
  } else if (state.phase === "gameOver") {
    const winner = getPlayer(state.winnerId);
    title.textContent = `${winner?.name || "No one"} wins`;
    copy.textContent = "Final hands are open on the felt.";
    stack.append(actionButton("New table", "primary-action", showMenu));
  } else if (!human || human.eliminated) {
    title.textContent = "Out";
    copy.textContent = "You are out of this table.";
  } else if (canHumanSchwimmenAct()) {
    const score = schwimmenHandValue(human.hand);
    const selected = human.hand.find((card) => card.id === selectedSwimHandCardId);
    title.textContent = "Your turn";
    copy.textContent = selected
      ? `${cardLabel(selected)} is ready. Choose a center card to swap, or take another action.`
      : `Your best score is ${formatSchwimmenScore(score)}. Trade one card, swap all, pass, knock, or call 31.`;
    stack.append(
      actionButton("Swap all", "primary-action", humanSchwimmenSwapAll),
      actionButton("Pass", "table-action", humanSchwimmenPass),
    );
    if (!state.knockerId) {
      stack.append(actionButton("Knock", "danger-action", humanSchwimmenKnock));
    }
    if (score === 31) {
      stack.append(actionButton("Schnautz 31", "danger-action", humanSchwimmenSchnautz));
    }
  } else {
    title.textContent = turn?.isHuman ? "Your move" : `${turn?.name || "Player"} thinks`;
    copy.textContent = state.knockerId
      ? `${getPlayer(state.knockerId)?.name || "A player"} knocked. Remaining players get one last turn.`
      : "Players trade with the center, pass, or knock when their hand feels strong enough.";
  }

  els.actionBox.append(title, copy, stack);
}

function renderLog() {
  els.logList.innerHTML = "";
  for (const entry of state.log.slice(0, 12)) {
    const item = document.createElement("div");
    item.className = "log-item";
    item.textContent = entry;
    els.logList.append(item);
  }
}

function renderButtons() {
  if (isSchwimmenState()) {
    els.toepBtn.classList.add("hidden");
    renderFullscreenButton();
    return;
  }
  els.toepBtn.classList.remove("hidden");
  els.toepBtn.disabled = !canHumanToep();
  renderFullscreenButton();
}

function renderDealAnimation() {
  if (!els.dealOverlay || !state?.dealAnimationId || lastDealAnimationId === state.dealAnimationId) return;
  lastDealAnimationId = state.dealAnimationId;
  const dealer = getPlayer(state.dealerId);
  const starter = getPlayer(state.nextLeaderId);
  els.dealerName.textContent = dealer?.name || "Dealer";
  els.dealText.textContent = `${dealer?.name || "Dealer"} deals. ${starter?.name || "Next seat"} starts.`;
  els.dealOverlay.classList.remove("hidden", "dealing");
  void els.dealOverlay.offsetWidth;
  els.dealOverlay.classList.add("dealing");
  clearDealTimer();
  dealTimer = window.setTimeout(hideDealAnimation, DEAL_ANIMATION_MS);
}

function hideDealAnimation() {
  clearDealTimer();
  if (!els.dealOverlay) return;
  els.dealOverlay.classList.add("hidden");
  els.dealOverlay.classList.remove("dealing");
}

function setupMobilePanels() {
  if (!els.logPanel) return;
  if (window.matchMedia("(max-width: 780px), (max-height: 540px)").matches) {
    els.logPanel.open = false;
  } else {
    els.logPanel.open = true;
  }
}

async function toggleFullscreen() {
  const isAppFullscreen = getFullscreenElement() || document.body.classList.contains("app-fullscreen");
  try {
    if (!isAppFullscreen) {
      document.body.classList.add("app-fullscreen");
      syncViewportSize();
      await requestGameFullscreen().catch(() => {
        document.body.classList.add("fullscreen-fallback");
      });
      await lockLandscapeWhenPossible();
      window.scrollTo?.(0, 0);
    } else {
      await exitGameFullscreen();
      document.body.classList.remove("app-fullscreen", "fullscreen-fallback");
    }
  } catch (_error) {
    document.body.classList.add("app-fullscreen", "fullscreen-fallback");
  } finally {
    syncViewportSize();
    renderFullscreenButton();
  }
}

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function requestGameFullscreen() {
  const targets = [els.gameScreen, document.documentElement, document.body].filter(Boolean);
  for (const target of targets) {
    const request =
      target.requestFullscreen ||
      target.webkitRequestFullscreen ||
      target.mozRequestFullScreen ||
      target.msRequestFullscreen;
    if (request) return request.call(target);
  }
  return Promise.reject(new Error("Fullscreen unavailable"));
}

function exitGameFullscreen() {
  const exit =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.mozCancelFullScreen ||
    document.msExitFullscreen;
  return getFullscreenElement() && exit ? exit.call(document) : Promise.resolve();
}

async function lockLandscapeWhenPossible() {
  const orientation = window.screen?.orientation;
  if (!orientation?.lock) return;

  try {
    await orientation.lock("landscape");
  } catch (_error) {
    // Some browsers allow fullscreen but refuse orientation lock.
  }
}

function renderFullscreenButton() {
  if (!els.fullscreenBtn) return;
  const isFull = getFullscreenElement() || document.body.classList.contains("app-fullscreen");
  els.fullscreenBtn.textContent = isFull ? "Exit full" : "Fullscreen";
  els.fullscreenBtn.setAttribute("aria-pressed", String(Boolean(isFull)));
}

function syncViewportSize() {
  const viewport = window.visualViewport;
  const height = viewport?.height || window.innerHeight || document.documentElement.clientHeight;
  const width = viewport?.width || window.innerWidth || document.documentElement.clientWidth;
  document.documentElement.style.setProperty("--app-height", `${height}px`);
  document.documentElement.style.setProperty("--app-width", `${width}px`);
}

function createOnlineGame(roster, roomId, maxPlayers, handSize = 4) {
  const safeMaxPlayers = Number(maxPlayers) || roster.length || 4;
  const safeHandSize = safeMaxPlayers === 2 && Number(handSize) === 8 ? 8 : 4;
  const players = roster.map((seat, index) => ({
    id: `p${index}`,
    uid: seat.uid,
    name: seat.name || `Player ${index + 1}`,
    isHuman: false,
    lives: 10,
    hand: [],
    active: true,
    folded: false,
    eliminated: false,
    raises: 0,
    playedCards: [],
  }));

  const game = {
    gameType: "toepen",
    mode: "online",
    roomId,
    maxPlayers: safeMaxPlayers,
    handSize: safeHandSize,
    tricksPerRound: safeHandSize,
    players,
    deck: [],
    round: 0,
    stake: 1,
    previousStake: 1,
    trickIndex: 0,
    currentTrick: emptyTrick(),
    turnPlayerId: players[0]?.id || "p0",
    nextLeaderId: players[0]?.id || "p0",
    roundStarterId: players[0]?.id || "p0",
    dealerId: null,
    dealAnimationId: 0,
    lastTrickWinnerId: null,
    dirtyQueue: [],
    dirtyPointer: 0,
    phase: "roundOver",
    pendingDirtyClaim: null,
    dirtyClaimedIds: [],
    pendingToep: null,
    toepCooldownPlays: -1,
    log: ["Online table is full. Cards are being dealt."],
    winnerId: null,
  };

  return onlineBeginRound(game);
}

function createOnlineSchwimmenGame(roster, roomId, maxPlayers, swimLives = 3) {
  const safeMaxPlayers = Number(maxPlayers) || roster.length || 4;
  const startingLives = Number(swimLives) === 4 ? 4 : 3;
  const players = roster.map((seat, index) => ({
    id: `p${index}`,
    uid: seat.uid,
    name: seat.name || `Player ${index + 1}`,
    isHuman: false,
    lives: startingLives,
    swimming: false,
    hand: [],
    active: true,
    folded: false,
    eliminated: false,
    playedCards: [],
  }));

  const game = {
    gameType: "schwimmen",
    mode: "online",
    roomId,
    maxPlayers: safeMaxPlayers,
    swimLives: startingLives,
    players,
    deck: [],
    discard: [],
    centerCards: [],
    round: 0,
    turnPlayerId: players[0]?.id || "p0",
    nextLeaderId: players[0]?.id || "p0",
    dealerId: null,
    dealAnimationId: 0,
    phase: "roundOver",
    knockerId: null,
    knockRemainingIds: [],
    passStreak: 0,
    lastRoundScores: [],
    log: ["Online Schnautz table is full. Cards are being dealt."],
    winnerId: null,
  };

  return onlineSchwimmenBeginRound(game);
}

function loadOnlineGame(roomId, uid, game, room = {}) {
  clearTimer();
  const previousRoomId = onlineContext.roomId;
  onlineContext = { roomId, uid };
  if (previousRoomId !== roomId) {
    lastToastSerial = null;
    lastToastMessage = null;
  }
  state = normalizeOnlineGame(game, uid);
  document.body.classList.add("game-active");
  els.menuScreen.classList.add("hidden");

  if (state.phase === "gameOver") {
    if (isSchwimmenState()) {
      els.endScreen.classList.add("hidden");
      els.gameScreen.classList.remove("hidden");
      render();
      return;
    }
    const winner = getPlayer(state.winnerId);
    els.gameScreen.classList.add("hidden");
    els.endScreen.classList.remove("hidden");
    document.body.classList.remove("game-active");
    els.endTitle.textContent = `${winner?.name || "No one"} wins`;
    els.endCopy.textContent = room.code
      ? `Online room ${room.code} is finished.`
      : "Online room is finished.";
    return;
  }

  els.endScreen.classList.add("hidden");
  els.gameScreen.classList.remove("hidden");
  render();
}

function normalizeOnlineGame(game, uid) {
  const copy = cloneData(game);
  copy.gameType = copy.gameType || "toepen";
  copy.mode = "online";
  copy.players = toList(copy.players);
  if (copy.gameType === "schwimmen") {
    return normalizeOnlineSchwimmenGame(copy, uid);
  }
  copy.maxPlayers = Number(copy.maxPlayers) || copy.players.length || 4;
  copy.handSize = copy.maxPlayers === 2 && Number(copy.handSize || copy.tricksPerRound) === 8 ? 8 : 4;
  copy.tricksPerRound = copy.handSize;
  copy.localPlayerId = copy.players?.find((player) => player.uid === uid)?.id || null;
  copy.players = copy.players.map((player) => ({
    ...player,
    isHuman: player.uid === uid,
    hand: toList(player.hand),
    playedCards: toList(player.playedCards),
    active: Boolean(player.active),
    folded: Boolean(player.folded),
    eliminated: Boolean(player.eliminated),
    raises: player.raises || 0,
  }));
  copy.currentTrick = normalizeTrick(copy.currentTrick);
  copy.dirtyQueue = toList(copy.dirtyQueue);
  copy.dirtyClaimedIds = toList(copy.dirtyClaimedIds);
  copy.log = toList(copy.log);
  copy.logSerial = Number(copy.logSerial) || 0;
  copy.pendingToep = normalizePendingResponses(copy.pendingToep);
  copy.pendingDirtyClaim = normalizePendingResponses(copy.pendingDirtyClaim);
  copy.dealerId = copy.dealerId || null;
  copy.roundStarterId = copy.roundStarterId || copy.nextLeaderId || null;
  copy.dealAnimationId = Number(copy.dealAnimationId) || 0;
  copy.toepCooldownPlays = Number.isFinite(Number(copy.toepCooldownPlays)) ? Number(copy.toepCooldownPlays) : -1;
  return copy;
}

function normalizeOnlineSchwimmenGame(copy, uid) {
  copy.maxPlayers = Number(copy.maxPlayers) || copy.players.length || 4;
  copy.swimLives = Number(copy.swimLives) === 4 ? 4 : 3;
  copy.localPlayerId = copy.players?.find((player) => player.uid === uid)?.id || null;
  copy.players = copy.players.map((player) => ({
    ...player,
    isHuman: player.uid === uid,
    lives: Number.isFinite(Number(player.lives)) ? Number(player.lives) : copy.swimLives,
    swimming: Boolean(player.swimming),
    hand: toList(player.hand),
    playedCards: toList(player.playedCards),
    active: player.active !== false,
    folded: false,
    eliminated: Boolean(player.eliminated),
  }));
  copy.centerCards = toList(copy.centerCards);
  copy.discard = toList(copy.discard);
  copy.deck = toList(copy.deck);
  copy.knockRemainingIds = toList(copy.knockRemainingIds);
  copy.lastRoundScores = toList(copy.lastRoundScores);
  copy.log = toList(copy.log);
  copy.logSerial = Number(copy.logSerial) || 0;
  copy.dealerId = copy.dealerId || null;
  copy.nextLeaderId = copy.nextLeaderId || copy.players[0]?.id || null;
  copy.turnPlayerId = copy.turnPlayerId || copy.nextLeaderId;
  copy.dealAnimationId = Number(copy.dealAnimationId) || 0;
  copy.passStreak = Number(copy.passStreak) || 0;
  return copy;
}

function reduceOnlineAction(game, action) {
  if (!game || !action?.uid) return game;
  if ((game.gameType || "toepen") === "schwimmen") {
    return reduceOnlineSchwimmenAction(game, action);
  }
  const next = normalizeOnlineGame(game, action.uid);
  const player = next.players.find((seat) => seat.uid === action.uid);
  if (!player || player.eliminated) return game;

  if (action.type === "beginRound") {
    if (next.phase !== "roundOver") return game;
    return onlineBeginRound(next);
  }

  if (action.type === "dirtyPass") {
    if (!onlineIsDirtyTurn(next, player)) return game;
    onlineLog(next, `${player.name} keeps their hand.`);
    next.dirtyPointer += 1;
    onlineAdvanceDirty(next);
    return next;
  }

  if (action.type === "dirtyClaim") {
    if (!onlineIsDirtyTurn(next, player)) return game;
    if (onlineHasDirtyClaimed(next, player.id)) return game;
    onlineMarkDirtyClaimed(next, player.id);
    next.phase = "dirtyChallenge";
    next.pendingDirtyClaim = { claimerId: player.id, responses: {} };
    onlineLog(next, `${player.name} claims Dirty Laundry.`);
    return next;
  }

  if (action.type === "dirtyResponse") {
    return onlineDirtyResponse(next, player, Boolean(action.challenge)) || game;
  }

  if (action.type === "toep") {
    return onlineToep(next, player) || game;
  }

  if (action.type === "toepResponse") {
    return onlineToepResponse(next, player, Boolean(action.call)) || game;
  }

  if (action.type === "playCard") {
    return onlinePlayCard(next, player, action.cardId) || game;
  }

  return game;
}

function reduceOnlineSchwimmenAction(game, action) {
  if (!game || !action?.uid) return game;
  const next = normalizeOnlineGame(game, action.uid);
  const player = next.players.find((seat) => seat.uid === action.uid);
  if (!player || player.eliminated) return game;

  if (action.type === "beginRound") {
    if (next.phase !== "roundOver") return game;
    return onlineSchwimmenBeginRound(next);
  }

  if (action.type === "swimSwapOne") {
    if (!onlineCanSchwimmenAct(next, player)) return game;
    const handCard = player.hand.find((card) => card.id === action.handCardId);
    const centerCard = next.centerCards.find((card) => card.id === action.centerCardId);
    if (!handCard || !centerCard) return game;
    performSchwimmenSwapOne(next, player, handCard.id, centerCard.id);
    onlineLog(next, `${player.name} trades ${cardLabel(handCard)} for ${cardLabel(centerCard)}.`);
    onlineSchwimmenAfterAction(next, player, { changed: true });
    return next;
  }

  if (action.type === "swimSwapAll") {
    if (!onlineCanSchwimmenAct(next, player)) return game;
    performSchwimmenSwapAll(next, player);
    onlineLog(next, `${player.name} trades all three cards.`);
    onlineSchwimmenAfterAction(next, player, { changed: true });
    return next;
  }

  if (action.type === "swimPass") {
    if (!onlineCanSchwimmenAct(next, player)) return game;
    onlineLog(next, `${player.name} passes.`);
    onlineSchwimmenAfterAction(next, player, { changed: false });
    return next;
  }

  if (action.type === "swimKnock") {
    if (!onlineCanSchwimmenAct(next, player) || next.knockerId) return game;
    onlineSchwimmenKnock(next, player);
    return next;
  }

  if (action.type === "swimSchnautz") {
    if (!onlineCanSchwimmenAct(next, player) || schwimmenHandValue(player.hand) !== 31) return game;
    onlineSchwimmenFinishRound(next, `${player.name} announces Schnautz with 31.`);
    return next;
  }

  return game;
}

function onlineSchwimmenBeginRound(game) {
  game.round += 1;
  game.deck = shuffle(createDeck());
  game.discard = [];
  game.centerCards = [];
  game.knockerId = null;
  game.knockRemainingIds = [];
  game.passStreak = 0;
  game.lastRoundScores = [];
  game.phase = "swimPlay";

  for (const player of game.players) {
    player.active = !player.eliminated;
    player.folded = false;
    player.playedCards = [];
    player.hand = player.eliminated ? [] : drawFromGameDeck(game, 3);
  }

  game.centerCards = drawFromGameDeck(game, 3);
  onlineSchwimmenAssignDealerForRound(game);
  game.turnPlayerId = firstSchwimmenPlayerIdFrom(game.nextLeaderId, game);
  game.dealAnimationId = (Number(game.dealAnimationId) || 0) + 1;
  onlineLog(
    game,
    `${onlineGetPlayer(game, game.dealerId)?.name || "Dealer"} shuffles and deals. ${
      onlineGetPlayer(game, game.turnPlayerId)?.name || "Next seat"
    } starts.`,
  );
  onlineLog(game, `Schnautz round ${game.round} starts. Trade with the center or knock.`);
  return game;
}

function onlineCanSchwimmenAct(game, player) {
  return Boolean(
    game.phase === "swimPlay" &&
      player &&
      game.turnPlayerId === player.id &&
      !player.eliminated &&
      game.knockerId !== player.id,
  );
}

function onlineSchwimmenKnock(game, player) {
  game.knockerId = player.id;
  game.knockRemainingIds = activeSchwimmenPlayers(game)
    .filter((seat) => seat.id !== player.id)
    .map((seat) => seat.id);
  game.passStreak = 0;
  onlineLog(game, `${player.name} knocks. Everyone else gets one last turn.`);
  if (game.knockRemainingIds.length === 0) {
    onlineSchwimmenFinishRound(game, `${player.name} knocks and stands alone.`);
    return;
  }
  game.turnPlayerId = nextSchwimmenTurnId(player.id, game);
}

function onlineSchwimmenAfterAction(game, player, options = {}) {
  if (options.changed) {
    game.passStreak = 0;
  } else if (!game.knockerId) {
    game.passStreak = (Number(game.passStreak) || 0) + 1;
    if (game.passStreak >= activeSchwimmenPlayers(game).length) {
      onlineSchwimmenReplaceCenter(game);
      game.passStreak = 0;
    }
  }

  const score = schwimmenHandValue(player.hand);
  if (score === 31) {
    onlineSchwimmenFinishRound(game, `${player.name} announces Schnautz with 31.`);
    return;
  }

  if (game.knockerId && player.id !== game.knockerId) {
    game.knockRemainingIds = (game.knockRemainingIds || []).filter((id) => id !== player.id);
    if (game.knockRemainingIds.length === 0) {
      onlineSchwimmenFinishRound(game, `${onlineGetPlayer(game, game.knockerId)?.name || "The knocker"}'s final lap is complete.`);
      return;
    }
  }

  game.turnPlayerId = nextSchwimmenTurnId(player.id, game);
}

function onlineSchwimmenReplaceCenter(game) {
  game.discard = [...(game.discard || []), ...(game.centerCards || [])];
  game.centerCards = drawFromGameDeck(game, 3);
  onlineLog(game, "Everyone passed. The center is washed away and three new cards appear.");
}

function onlineSchwimmenFinishRound(game, reason) {
  if (reason) onlineLog(game, reason);
  const players = activeSchwimmenPlayers(game);
  const scores = players.map((player) => ({
    playerId: player.id,
    name: player.name,
    score: schwimmenHandValue(player.hand),
    lost: false,
  }));
  const lowest = Math.min(...scores.map((entry) => entry.score));
  const losers = scores.filter((entry) => entry.score === lowest);

  for (const result of scores) {
    result.lost = losers.some((loser) => loser.playerId === result.playerId);
  }
  game.lastRoundScores = scores.sort((a, b) => b.score - a.score);

  for (const loser of losers) {
    const player = onlineGetPlayer(game, loser.playerId);
    if (!player || player.eliminated) continue;
    if (player.swimming || player.lives <= 0) {
      player.eliminated = true;
      player.active = false;
      onlineLog(game, `${player.name} loses with ${formatSchwimmenScore(loser.score)} and sinks out.`);
    } else if (player.lives > 1) {
      player.lives -= 1;
      onlineLog(game, `${player.name} loses with ${formatSchwimmenScore(loser.score)} and loses 1 life.`);
    } else {
      player.lives = 0;
      player.swimming = true;
      onlineLog(game, `${player.name} loses with ${formatSchwimmenScore(loser.score)} and starts swimming.`);
    }
  }

  const remaining = activeSchwimmenPlayers(game);
  if (remaining.length <= 1) {
    onlineSchwimmenFinishGame(game, remaining[0]?.id || null);
    return;
  }

  game.phase = "roundOver";
}

function onlineSchwimmenFinishGame(game, winnerId) {
  const winner = onlineGetPlayer(game, winnerId);
  game.phase = "gameOver";
  game.winnerId = winner?.id || null;
  onlineLog(game, `${winner?.name || "The table"} wins the Schnautz match.`);
}

function onlineSchwimmenAssignDealerForRound(game) {
  const active = activeSchwimmenPlayers(game);
  if (active.length === 0) return;
  if (!game.dealerId) {
    game.dealerId = schwimmenSeatIdFrom(active[0].id, -1, game);
  } else {
    game.dealerId = schwimmenSeatIdFrom(game.dealerId, 1, game);
  }
  game.nextLeaderId = schwimmenSeatIdFrom(game.dealerId, 1, game);
}

function onlineBeginRound(game) {
  const tricks = roundTricks(game);
  game.round += 1;
  game.stake = 1;
  game.previousStake = 1;
  game.trickIndex = 0;
  game.lastTrickWinnerId = null;
  game.pendingDirtyClaim = null;
  game.dirtyClaimedIds = [];
  game.pendingToep = null;
  game.toepCooldownPlays = -1;
  game.currentTrick = emptyTrick();
  game.deck = shuffle(createDeck());

  for (const player of game.players) {
    player.eliminated = player.lives <= 0;
    player.active = !player.eliminated;
    player.folded = false;
    player.raises = 0;
    player.playedCards = [];
    player.hand = player.eliminated ? [] : onlineDrawCards(game, tricks);
  }

  onlineAssignDealerForRound(game);
  game.turnPlayerId = game.nextLeaderId;
  game.roundStarterId = game.nextLeaderId;
  game.dirtyQueue = onlineOrderedAliveIdsFrom(game, game.nextLeaderId);
  game.dirtyPointer = 0;
  game.dealAnimationId = (Number(game.dealAnimationId) || 0) + 1;
  onlineLog(
    game,
    `${onlineGetPlayer(game, game.dealerId)?.name || "Dealer"} shuffles and deals. ${
      onlineGetPlayer(game, game.nextLeaderId)?.name || "Next seat"
    } starts.`,
  );
  if (dirtyLaundryEnabled(game)) {
    game.phase = "dirty";
    onlineLog(game, `Round ${game.round} starts. Dirty Laundry phase opens.`);
    onlineAdvanceDirty(game);
  } else {
    onlineLog(game, `Round ${game.round} starts with ${tricks} cards each. Dirty Laundry sits out.`);
    onlineStartPlayPhase(game);
  }
  return game;
}

function onlineDrawCards(game, count) {
  return game.deck.splice(0, count);
}

function onlineAdvanceDirty(game) {
  while (game.dirtyPointer < game.dirtyQueue.length) {
    const player = onlineGetPlayer(game, game.dirtyQueue[game.dirtyPointer]);
    if (player && player.lives > 0) {
      game.phase = "dirty";
      return;
    }
    game.dirtyPointer += 1;
  }
  onlineStartPlayPhase(game);
}

function onlineStartPlayPhase(game) {
  game.phase = "play";
  game.trickIndex = 0;
  game.currentTrick = emptyTrick();
  game.turnPlayerId = onlineFirstActiveIdFrom(game, game.nextLeaderId);
  game.roundStarterId = game.turnPlayerId;
  onlineLog(game, "Cards down. The first trick begins.");
}

function onlineDirtyResponse(game, player, challenge) {
  if (game.phase !== "dirtyChallenge" || !game.pendingDirtyClaim) return null;
  const claimer = onlineGetPlayer(game, game.pendingDirtyClaim.claimerId);
  if (!claimer || claimer.id === player.id || !onlineAlivePlayers(game).some((seat) => seat.id === player.id)) return null;

  if (challenge) {
    onlineSettleDirtyChallenge(game, claimer, player);
    game.pendingDirtyClaim = null;
    game.dirtyPointer += 1;
    onlineAdvanceDirty(game);
    return game;
  }

  game.pendingDirtyClaim.responses = game.pendingDirtyClaim.responses || {};
  game.pendingDirtyClaim.responses[player.id] = true;
  const waiting = onlineAlivePlayers(game).filter(
    (seat) => seat.id !== claimer.id && !game.pendingDirtyClaim.responses[seat.id],
  );
  onlineLog(game, `${player.name} lets ${claimer.name}'s Dirty Laundry pass.`);
  if (waiting.length === 0) {
    onlineLog(game, `${claimer.name}'s Dirty Laundry passes. New cards hit the felt.`);
    onlineExchangeHand(game, claimer);
    game.pendingDirtyClaim = null;
    game.dirtyPointer += 1;
    onlineAdvanceDirty(game);
  }
  return game;
}

function onlineSettleDirtyChallenge(game, claimer, challenger) {
  const valid = isDirtyLaundry(claimer.hand);
  if (valid) {
    challenger.lives = Math.max(0, challenger.lives - 1);
    onlineLog(game, `${challenger.name} challenges ${claimer.name}. Claim is valid; ${challenger.name} loses 1 life.`);
    onlineExchangeHand(game, claimer);
  } else {
    claimer.lives = Math.max(0, claimer.lives - 1);
    onlineLog(game, `${challenger.name} challenges ${claimer.name}. Bluff caught; ${claimer.name} loses 1 life.`);
  }
  onlineMarkEliminations(game);
}

function onlineExchangeHand(game, player) {
  game.deck.push(...player.hand);
  game.deck = shuffle(game.deck);
  player.hand = onlineDrawCards(game, roundTricks(game));
}

function onlineToep(game, player) {
  if (!onlineCanPlayerToep(game, player)) return null;
  game.previousStake = game.stake;
  game.stake += 1;
  player.raises = (player.raises || 0) + 1;
  game.pendingToep = {
    actorId: player.id,
    previousStake: game.previousStake,
    responses: {},
    playCount: totalPlayedCards(game),
    resumeTurnPlayerId: game.turnPlayerId,
  };
  game.phase = "toepResponse";
  onlineLog(game, `${player.name} calls Toep. Stake rises to ${game.stake}.`);
  return game;
}

function onlineCanPlayerToep(game, player) {
  return (
    game.phase === "play" &&
    player &&
    game.turnPlayerId === player.id &&
    player.active &&
    player.lives > 0 &&
    game.stake < 10 &&
    onlineActiveRoundPlayers(game).length > 1 &&
    !game.pendingToep &&
    game.currentTrick.plays.length === 0 &&
    totalPlayedCards(game) !== game.toepCooldownPlays
  );
}

function onlineToepResponse(game, player, call) {
  if (game.phase !== "toepResponse" || !game.pendingToep || !player.active) return null;
  const pending = game.pendingToep;
  const actor = onlineGetPlayer(game, pending.actorId);
  if (!actor || actor.id === player.id) return null;
  pending.responses = pending.responses || {};
  if (pending.responses[player.id]) return null;

  if (call) {
    pending.responses[player.id] = true;
    onlineLog(game, `${player.name} calls.`);
  } else {
    onlineFoldPlayer(player, pending.previousStake);
    onlineLog(game, `${player.name} folds and pays ${pending.previousStake} life.`);
    onlineMarkEliminations(game);
  }

  if (onlineActiveRoundPlayers(game).length <= 1) {
    game.phase = "play";
    onlineEndRoundByFold(game);
    return game;
  }

  const waiting = onlineActiveRoundPlayers(game).filter(
    (seat) => seat.id !== actor.id && !pending.responses[seat.id],
  );
  if (waiting.length === 0) {
    game.pendingToep = null;
    game.toepCooldownPlays = totalPlayedCards(game);
    game.phase = "play";
    onlineRepairTurn(game, pending.resumeTurnPlayerId || game.turnPlayerId);
  }
  return game;
}

function onlinePlayCard(game, player, cardId) {
  onlineRepairTurn(game, player.id);
  if (game.phase !== "play" || game.turnPlayerId !== player.id || !player.active) return null;
  const card = player.hand.find((item) => item.id === cardId);
  if (!card || !onlineIsLegalCard(game, player, card)) return null;

  player.hand = player.hand.filter((item) => item.id !== cardId);
  if (!game.currentTrick.leadSuit) game.currentTrick.leadSuit = card.suit;
  game.currentTrick.plays.push({ playerId: player.id, card });
  player.playedCards.push(card);
  onlineLog(game, `${player.name} plays ${cardLabel(card)}.`);

  if (onlineActiveRoundPlayers(game).length <= 1) {
    onlineEndRoundByFold(game);
    return game;
  }

  if (onlineIsTrickComplete(game)) {
    onlineCompleteTrick(game);
    return game;
  }

  game.turnPlayerId = onlineNextUnplayedActiveId(game, player.id);
  return game;
}

function onlineCompleteTrick(game) {
  const winnerId = onlineTrickWinnerId(game);
  const winner = onlineGetPlayer(game, winnerId);
  game.lastTrickWinnerId = winnerId;
  onlineLog(game, `${winner.name} wins trick ${game.trickIndex + 1}.`);
  game.trickIndex += 1;

  if (game.trickIndex >= roundTricks(game)) {
    onlineLog(game, `${winner.name} takes the ${finalTrickName(game)} and wins the round.`);
    onlineFinishRound(game, winnerId, true);
    return;
  }

  game.currentTrick = emptyTrick();
  game.turnPlayerId = winnerId;
}

function onlineEndRoundByFold(game) {
  const winner = onlineActiveRoundPlayers(game)[0];
  if (!winner) {
    const alive = onlineAlivePlayers(game)[0];
    onlineFinishGame(game, alive?.id);
    return;
  }
  onlineLog(game, `${winner.name} stands alone and wins the round.`);
  onlineFinishRound(game, winner.id, false);
}

function onlineFinishRound(game, winnerId, chargeActiveLosers) {
  if (chargeActiveLosers) {
    for (const player of game.players) {
      if (player.lives <= 0 || player.id === winnerId || player.folded || !player.active) continue;
      player.lives = Math.max(0, player.lives - game.stake);
      onlineLog(game, `${player.name} loses ${game.stake} life${game.stake === 1 ? "" : "s"}.`);
    }
  }
  onlineMarkEliminations(game);
  const alive = onlineAlivePlayers(game);
  if (alive.length <= 1) {
    onlineFinishGame(game, alive[0]?.id || winnerId);
    return;
  }
  game.phase = "roundOver";
}

function onlineFinishGame(game, winnerId) {
  const winner = onlineGetPlayer(game, winnerId);
  game.phase = "gameOver";
  game.winnerId = winner?.id || null;
  onlineLog(game, `${winner?.name || "The table"} wins the match.`);
}

function onlineMarkEliminations(game) {
  for (const player of game.players) {
    if (player.lives <= 0) {
      player.lives = 0;
      player.active = false;
      player.eliminated = true;
      player.hand = [];
    }
  }
}

function onlineFoldPlayer(player, penalty) {
  player.lives = Math.max(0, player.lives - penalty);
  player.active = false;
  player.folded = true;
  if (player.lives <= 0) player.eliminated = true;
}

function onlineLegalCards(game, player) {
  if (!game.currentTrick.leadSuit) return [...player.hand];
  const suited = player.hand.filter((card) => card.suit === game.currentTrick.leadSuit);
  return suited.length > 0 ? suited : [...player.hand];
}

function onlineIsLegalCard(game, player, card) {
  return onlineLegalCards(game, player).some((legal) => legal.id === card.id);
}

function onlineIsTrickComplete(game) {
  const activeIds = onlineActiveRoundPlayers(game).map((player) => player.id);
  const playedActiveIds = game.currentTrick.plays
    .filter((play) => activeIds.includes(play.playerId))
    .map((play) => play.playerId);
  return activeIds.every((id) => playedActiveIds.includes(id));
}

function onlineTrickWinnerId(game) {
  const activeIds = new Set(onlineActiveRoundPlayers(game).map((player) => player.id));
  const candidates = game.currentTrick.plays.filter(
    (play) => activeIds.has(play.playerId) && play.card.suit === game.currentTrick.leadSuit,
  );
  return candidates.reduce((best, play) => (play.card.power > best.card.power ? play : best), candidates[0]).playerId;
}

function onlineNextUnplayedActiveId(game, afterId) {
  const activeIds = onlineActiveRoundPlayers(game).map((player) => player.id);
  const playedIds = new Set(game.currentTrick.plays.map((play) => play.playerId));
  const start = Math.max(0, game.players.findIndex((player) => player.id === afterId));
  for (let offset = 1; offset <= game.players.length; offset += 1) {
    const player = game.players[(start + offset) % game.players.length];
    if (activeIds.includes(player.id) && !playedIds.has(player.id)) return player.id;
  }
  return activeIds.find((id) => !playedIds.has(id)) || activeIds[0];
}

function onlineAssignDealerForRound(game) {
  const alive = onlineAlivePlayers(game);
  if (alive.length === 0) return;

  if (!game.dealerId) {
    game.dealerId = aliveIdFromSeatOffset(game.players, alive[0].id, -1);
  } else {
    game.dealerId = aliveIdFromSeatOffset(game.players, game.dealerId, 1);
  }
  game.nextLeaderId = aliveIdFromSeatOffset(game.players, game.dealerId, 1);
}

function onlineRepairTurn(game, preferredId) {
  if (game.phase !== "play" || onlineIsTrickComplete(game)) return;
  if (onlineCanTakeTurn(game, game.turnPlayerId)) return;
  if (onlineCanTakeTurn(game, preferredId)) {
    game.turnPlayerId = preferredId;
    return;
  }

  const nextId =
    onlineNextUnplayedActiveId(game, preferredId || game.turnPlayerId) ||
    onlineActiveRoundPlayers(game).find((player) => player.hand.length > 0)?.id;
  if (onlineCanTakeTurn(game, nextId)) game.turnPlayerId = nextId;
}

function onlineCanTakeTurn(game, playerId) {
  const player = onlineGetPlayer(game, playerId);
  return Boolean(player?.active && player.lives > 0 && player.hand.length > 0 && !onlineHasPlayedThisTrick(game, playerId));
}

function onlineFirstActiveIdFrom(game, fromId) {
  const activeIds = onlineActiveRoundPlayers(game).map((player) => player.id);
  return activeIds.includes(fromId) ? fromId : activeIds[0];
}

function onlineOrderedAliveIdsFrom(game, fromId) {
  const aliveIds = onlineAlivePlayers(game).map((player) => player.id);
  const start = Math.max(0, game.players.findIndex((player) => player.id === fromId));
  const ordered = [];
  for (let offset = 0; offset < game.players.length; offset += 1) {
    const player = game.players[(start + offset) % game.players.length];
    if (aliveIds.includes(player.id)) ordered.push(player.id);
  }
  return ordered;
}

function onlineHasPlayedThisTrick(game, playerId) {
  return game.currentTrick.plays.some((play) => play.playerId === playerId);
}

function onlineHasDirtyClaimed(game, playerId) {
  return (game.dirtyClaimedIds || []).includes(playerId);
}

function onlineMarkDirtyClaimed(game, playerId) {
  if (!playerId) return;
  game.dirtyClaimedIds = game.dirtyClaimedIds || [];
  if (!game.dirtyClaimedIds.includes(playerId)) game.dirtyClaimedIds.push(playerId);
}

function onlineIsDirtyTurn(game, player) {
  return game.phase === "dirty" && game.dirtyQueue[game.dirtyPointer] === player.id;
}

function onlineActiveRoundPlayers(game) {
  return game.players.filter((player) => player.lives > 0 && player.active && !player.folded);
}

function onlineAlivePlayers(game) {
  return game.players.filter((player) => player.lives > 0);
}

function onlineGetPlayer(game, id) {
  return game.players.find((player) => player.id === id);
}

function onlineLog(game, message) {
  game.logSerial = (Number(game.logSerial) || 0) + 1;
  game.log = [message, ...(game.log || [])].slice(0, 40);
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function toList(value) {
  if (Array.isArray(value)) return value.filter((item) => item != null);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, item]) => item)
    .filter((item) => item != null);
}

function normalizeTrick(trick) {
  return {
    leadSuit: trick?.leadSuit || null,
    plays: toList(trick?.plays),
  };
}

function normalizePendingResponses(pending) {
  if (!pending || typeof pending !== "object") return null;
  return {
    ...pending,
    responses: pending.responses || {},
  };
}

function actionButton(text, className, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.addEventListener("click", handler);
  return button;
}

function canHumanToep() {
  const human = getHuman();
  return canPlayerToep(human);
}

function canPlayerToep(player) {
  return (
    state?.phase === "play" &&
    player &&
    state.turnPlayerId === player.id &&
    player.active &&
    player.lives > 0 &&
    state.stake < 10 &&
    activeRoundPlayers().length > 1 &&
    !state.pendingToep &&
    state.currentTrick.plays.length === 0 &&
    totalPlayedCards() !== state.toepCooldownPlays
  );
}

function isHumanDirtyTurn() {
  const human = getHuman();
  return (
    state?.phase === "dirty" &&
    human &&
    human.lives > 0 &&
    state.dirtyQueue[state.dirtyPointer] === human.id
  );
}

function legalCards(player) {
  if (!state.currentTrick.leadSuit) return [...player.hand];
  const suited = player.hand.filter((card) => card.suit === state.currentTrick.leadSuit);
  return suited.length > 0 ? suited : [...player.hand];
}

function isLegalCard(player, card) {
  return legalCards(player).some((legal) => legal.id === card.id);
}

function removeCard(player, cardId) {
  const index = player.hand.findIndex((card) => card.id === cardId);
  if (index >= 0) player.hand.splice(index, 1);
}

function isTrickComplete() {
  const activeIds = activeRoundPlayers().map((player) => player.id);
  const playedActiveIds = state.currentTrick.plays
    .filter((play) => activeIds.includes(play.playerId))
    .map((play) => play.playerId);
  return activeIds.every((id) => playedActiveIds.includes(id));
}

function trickWinnerId() {
  const activeIds = new Set(activeRoundPlayers().map((player) => player.id));
  const candidates = state.currentTrick.plays.filter(
    (play) => activeIds.has(play.playerId) && play.card.suit === state.currentTrick.leadSuit,
  );
  const pool = candidates.length > 0 ? candidates : state.currentTrick.plays.filter((play) => activeIds.has(play.playerId));
  return pool.reduce((best, play) => (play.card.power > best.card.power ? play : best), pool[0]).playerId;
}

function currentWinningPlay() {
  if (!state.currentTrick.leadSuit || state.currentTrick.plays.length === 0) return null;
  const activeIds = new Set(activeRoundPlayers().map((player) => player.id));
  const candidates = state.currentTrick.plays.filter(
    (play) => activeIds.has(play.playerId) && play.card.suit === state.currentTrick.leadSuit,
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((best, play) => (play.card.power > best.card.power ? play : best), candidates[0]);
}

function nextUnplayedActiveId(afterId) {
  const activeIds = activeRoundPlayers().map((player) => player.id);
  const playedIds = new Set(state.currentTrick.plays.map((play) => play.playerId));
  if (activeIds.length === 0) return null;

  const start = Math.max(0, state.players.findIndex((player) => player.id === afterId));
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const player = state.players[(start + offset) % state.players.length];
    if (activeIds.includes(player.id) && !playedIds.has(player.id)) return player.id;
  }
  return activeIds.find((id) => !playedIds.has(id)) || activeIds[0];
}

function repairTurn(preferredId) {
  if (state.phase !== "play" || isTrickComplete()) return;
  if (canTakeTurn(state.turnPlayerId)) return;
  if (canTakeTurn(preferredId)) {
    state.turnPlayerId = preferredId;
    return;
  }

  const nextId =
    nextUnplayedActiveId(preferredId || state.turnPlayerId) ||
    activeRoundPlayers().find((player) => player.hand.length > 0)?.id;
  if (canTakeTurn(nextId)) state.turnPlayerId = nextId;
}

function canTakeTurn(playerId) {
  const player = getPlayer(playerId);
  return Boolean(player?.active && player.lives > 0 && player.hand.length > 0 && !hasPlayedThisTrick(playerId));
}

function firstActiveIdFrom(fromId) {
  const activeIds = activeRoundPlayers().map((player) => player.id);
  if (activeIds.includes(fromId)) return fromId;
  return activeIds[0];
}

function orderedAliveIdsFrom(fromId) {
  const aliveIds = alivePlayers().map((player) => player.id);
  const start = Math.max(0, state.players.findIndex((player) => player.id === fromId));
  const ordered = [];
  for (let offset = 0; offset < state.players.length; offset += 1) {
    const player = state.players[(start + offset) % state.players.length];
    if (aliveIds.includes(player.id)) ordered.push(player.id);
  }
  return ordered;
}

function hasPlayedThisTrick(playerId) {
  return state.currentTrick.plays.some((play) => play.playerId === playerId);
}

function handScore(hand) {
  if (hand.length === 0) return 0;
  const raw = hand.reduce((total, card) => total + card.power, 0) / (hand.length * 8);
  const suitCounts = hand.reduce((counts, card) => {
    counts[card.suit] = (counts[card.suit] || 0) + 1;
    return counts;
  }, {});
  const suitHold = Math.max(...Object.values(suitCounts)) / 8;
  return Math.min(1, raw * 0.78 + suitHold * 0.22);
}

function sortHand(hand) {
  const suitOrder = new Map(SUITS.map((suit, index) => [suit.id, index]));
  return [...hand].sort((a, b) => suitOrder.get(a.suit) - suitOrder.get(b.suit) || b.power - a.power);
}

function activeRoundPlayers() {
  return state.players.filter((player) => player.lives > 0 && player.active && !player.folded);
}

function alivePlayers() {
  return state.players.filter((player) => player.lives > 0);
}

function getPlayer(id) {
  return state?.players.find((player) => player.id === id);
}

function getHuman() {
  if (state?.mode === "online") {
    return state.players.find((player) => player.uid === onlineContext.uid || player.id === state.localPlayerId);
  }
  return state?.players.find((player) => player.isHuman);
}

function suitById(id) {
  return SUITS.find((suit) => suit.id === id);
}

function cardLabel(card) {
  return `${card.rank} of ${card.suitName}`;
}

function playerStateText(player) {
  if (isSchwimmenState()) {
    if (player.eliminated) return "out";
    const visibleScore = player.isHuman || state.phase === "roundOver" || state.phase === "gameOver";
    const scoreText = visibleScore ? `${formatSchwimmenScore(schwimmenHandValue(player.hand))} pts` : `${player.hand.length} cards`;
    const swimText = player.swimming ? " · swimming" : "";
    if (state.phase === "swimPlay" && state.turnPlayerId === player.id) return `turn · ${scoreText}${swimText}`;
    return `${scoreText}${swimText}`;
  }
  if (player.eliminated) return "out";
  if (player.folded) return "folded";
  if (!player.active) return "waiting";
  if (state.phase === "play" && state.turnPlayerId === player.id) return "turn";
  return `${player.hand.length} card${player.hand.length === 1 ? "" : "s"}`;
}

function phaseName() {
  const names = {
    dirty: "Dirty Laundry",
    dirtyChallenge: "Challenge",
    play: "Play",
    toepResponse: "Toep",
    swimPlay: "Schnautz",
    roundOver: "Round over",
    gameOver: "Game over",
  };
  return names[state.phase] || "Table";
}

function log(message) {
  state.logSerial = (Number(state.logSerial) || 0) + 1;
  state.log.unshift(message);
}

function maybeShowLatestToast() {
  const message = preferredToastLogMessage();
  const toastText = toastTextForLog(message);
  if (!toastText) return;

  const serial = Number(state.logSerial) || 0;
  const repeated = serial > 0 ? serial === lastToastSerial : message === lastToastMessage;
  if (repeated) return;

  lastToastSerial = serial;
  lastToastMessage = message;
  showTableToast(toastText);
}

function preferredToastLogMessage() {
  const recent = (state?.log || []).slice(0, 5);
  return recent.find((entry) => /announces Schnautz with 31/i.test(entry)) || recent[0] || "";
}

function toastTextForLog(message) {
  if (!message || !TOAST_PATTERN.test(message)) return "";
  if (/round .*starts|trade with the center|trades?|wins trick/i.test(message)) return "";

  const actor = message.match(/^(.+?)\s+(announces|calls|knocks|passes|folds|loses|sinks|wins|takes|stands|challenges)/i)?.[1];
  if (/announces Schnautz with 31/i.test(message)) return `${actor || "Player"} has Schnautz (31).`;
  if (/calls Toep/i.test(message)) return `${actor || "Player"} calls Toep.`;
  if (/knocks/i.test(message)) return `${actor || "Player"} knocks.`;
  if (/passes/i.test(message)) return `${actor || "Player"} passes.`;
  if (/folds/i.test(message)) return `${actor || "Player"} folds.`;
  if (/starts swimming/i.test(message)) return `${actor || "Player"} is swimming.`;
  if (/sinks out/i.test(message)) return `${actor || "Player"} is out.`;
  if (/loses/i.test(message)) return `${actor || "Player"} loses a life.`;
  return message.replace(/\s+/g, " ").trim();
}

function showTableToast(message) {
  if (!els.tableToast) return;
  if (toastTimer) {
    window.clearTimeout(toastTimer);
    toastTimer = null;
  }

  els.tableToast.textContent = message;
  els.tableToast.classList.remove("hidden", "leaving", "show");
  void els.tableToast.offsetWidth;
  els.tableToast.classList.add("show");

  toastTimer = window.setTimeout(() => {
    els.tableToast.classList.remove("show");
    els.tableToast.classList.add("leaving");
    toastTimer = window.setTimeout(() => {
      els.tableToast.classList.add("hidden");
      els.tableToast.classList.remove("leaving");
      toastTimer = null;
    }, 420);
  }, 2000);
}

function clearTableToast() {
  if (toastTimer) {
    window.clearTimeout(toastTimer);
    toastTimer = null;
  }
  if (!els.tableToast) return;
  els.tableToast.classList.add("hidden");
  els.tableToast.classList.remove("show", "leaving");
}

function schedule(fn, delay) {
  clearTimer();
  timer = window.setTimeout(fn, delay);
}

function clearTimer() {
  if (timer) {
    window.clearTimeout(timer);
    timer = null;
  }
}

function clearDealTimer() {
  if (dealTimer) {
    window.clearTimeout(dealTimer);
    dealTimer = null;
  }
}

window.ToepenGame = {
  createOnlineGame,
  createOnlineSchwimmenGame,
  loadOnlineGame,
  reduceOnlineAction,
  showMenu,
  getSelectedGameType: () => selectedGameType,
  getMenuGameSettings,
  schwimmenHandValue,
};

boot();
