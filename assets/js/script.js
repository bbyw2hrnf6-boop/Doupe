const SUITS = [
  { id: "hearts", name: "Hearts", symbol: "\u2665", red: true },
  { id: "diamonds", name: "Diamonds", symbol: "\u2666", red: true },
  { id: "spades", name: "Spades", symbol: "\u2660", red: false },
  { id: "clubs", name: "Clubs", symbol: "\u2663", red: false },
];

const RANKS = ["7", "8", "9", "10", "J", "Q", "K", "A"];
const POWER = { "10": 8, "9": 7, "8": 6, "7": 5, A: 4, K: 3, Q: 2, J: 1 };
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
  dirtyDecision: 1150,
  afterHumanChoice: 750,
  afterClaim: 900,
  botThink: 1250,
  botRecover: 800,
  trickSettle: 1450,
};

const els = {
  menuScreen: document.querySelector("#menuScreen"),
  gameScreen: document.querySelector("#gameScreen"),
  endScreen: document.querySelector("#endScreen"),
  playerPicker: document.querySelector("#playerPicker"),
  botCountLabel: document.querySelector("#botCountLabel"),
  startGameBtn: document.querySelector("#startGameBtn"),
  playAgainBtn: document.querySelector("#playAgainBtn"),
  newGameBtn: document.querySelector("#newGameBtn"),
  fullscreenBtn: document.querySelector("#fullscreenBtn"),
  roundTitle: document.querySelector("#roundTitle"),
  stakeValue: document.querySelector("#stakeValue"),
  trickValue: document.querySelector("#trickValue"),
  leadValue: document.querySelector("#leadValue"),
  centerStake: document.querySelector("#centerStake"),
  activeCount: document.querySelector("#activeCount"),
  scoreboardList: document.querySelector("#scoreboardList"),
  opponentRail: document.querySelector("#opponentRail"),
  trickArea: document.querySelector("#trickArea"),
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
let state = null;
let timer = null;

function boot() {
  syncViewportSize();
  buildPlayerPicker();
  els.startGameBtn.addEventListener("click", () => startGame(selectedBotCount));
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

function showMenu() {
  clearTimer();
  state = null;
  document.body.classList.remove("game-active", "app-fullscreen", "fullscreen-fallback");
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
    players,
    deck: [],
    round: 0,
    stake: 1,
    previousStake: 1,
    trickIndex: 0,
    currentTrick: emptyTrick(),
    turnPlayerId: "p0",
    nextLeaderId: "p0",
    lastTrickWinnerId: null,
    dirtyQueue: [],
    dirtyPointer: 0,
    phase: "play",
    pendingDirtyClaim: null,
    pendingToep: null,
    log: [],
    winnerId: null,
  };

  els.menuScreen.classList.add("hidden");
  els.endScreen.classList.add("hidden");
  els.gameScreen.classList.remove("hidden");
  document.body.classList.add("game-active");
  setupMobilePanels();
  log("Welcome to the table. Ten lives each. Fourth trick rules all.");
  beginRound();
}

function beginRound() {
  clearTimer();
  state.round += 1;
  state.stake = 1;
  state.previousStake = 1;
  state.trickIndex = 0;
  state.lastTrickWinnerId = null;
  state.pendingDirtyClaim = null;
  state.pendingToep = null;
  state.currentTrick = emptyTrick();
  state.deck = shuffle(createDeck());

  for (const player of state.players) {
    player.eliminated = player.lives <= 0;
    player.active = !player.eliminated;
    player.folded = false;
    player.raises = 0;
    player.playedCards = [];
    player.hand = player.eliminated ? [] : drawCards(4);
  }

  const aliveIds = alivePlayers().map((player) => player.id);
  if (!aliveIds.includes(state.nextLeaderId)) {
    state.nextLeaderId = aliveIds[0];
  }

  state.turnPlayerId = state.nextLeaderId;
  state.dirtyQueue = orderedAliveIdsFrom(state.nextLeaderId);
  state.dirtyPointer = 0;
  state.phase = "dirty";
  log(`Round ${state.round} starts. Dirty Laundry phase opens.`);
  render();
  schedule(processDirtyLaundry, DELAYS.dirtyOpen);
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
  if (!isHumanDirtyTurn()) return;
  log("You keep your hand.");
  state.dirtyPointer += 1;
  render();
  schedule(processDirtyLaundry, DELAYS.afterHumanChoice);
}

function humanClaimDirty() {
  if (!isHumanDirtyTurn()) return;
  const human = getHuman();
  const challenger = chooseBotDirtyChallenger(human);
  if (challenger) {
    settleDirtyChallenge(human, challenger);
  } else {
    log("You claim Dirty Laundry. The table lets it pass.");
    exchangeHand(human);
    state.dirtyPointer += 1;
  }
  render();
  schedule(processDirtyLaundry, DELAYS.afterClaim);
}

function resolveBotDirtyClaim(player) {
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
  player.hand = drawCards(4);
}

function isDirtyLaundry(hand) {
  const coreCount = hand.filter((card) => DIRTY_CORE.has(card.rank)).length;
  const sevenCount = hand.filter((card) => card.rank === "7").length;
  return coreCount === 4 || (coreCount === 3 && sevenCount === 1);
}

function botWantsDirtyLaundry(player) {
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
  log("Cards down. The first trick begins.");
  render();
  schedule(maybeBotTurn, DELAYS.botThink);
}

function playHumanCard(cardId) {
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

  if (state.trickIndex >= 4) {
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

  if (botShouldToep(player)) {
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

  if (state.trickIndex === 3) {
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
  const human = getHuman();
  if (!canHumanToep()) return;
  initiateToep(human.id, { type: "human" });
}

function initiateToep(actorId, after) {
  const actor = getPlayer(actorId);
  if (!actor || state.phase !== "play" || state.stake >= 10) return;

  state.previousStake = state.stake;
  state.stake += 1;
  actor.raises += 1;
  log(`${actor.name} calls Toep. Stake rises to ${state.stake}.`);

  const human = getHuman();
  if (human && human.active && human.id !== actorId) {
    state.phase = "toepResponse";
    state.pendingToep = { actorId, previousStake: state.previousStake, after };
    render();
    return;
  }

  finishToepResponses(true, after);
}

function humanToepResponse(call) {
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
  state.pendingToep = null;

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

  if (!getPlayer(state.turnPlayerId)?.active || hasPlayedThisTrick(state.turnPlayerId)) {
    const nextId = nextUnplayedActiveId(actorId || state.turnPlayerId);
    if (nextId) state.turnPlayerId = nextId;
  }

  render();
  if (after?.type === "botTurn" || !getPlayer(state.turnPlayerId)?.isHuman) {
    schedule(maybeBotTurn, DELAYS.botThink);
  }
}

function botShouldToep(player) {
  if (state.stake >= 10 || player.raises >= 2 || activeRoundPlayers().length < 2) return false;
  const score = handScore(player.hand);
  const late = state.trickIndex >= 2 ? 0.06 : 0;
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
  log(`${winner.name} takes the fourth trick and wins the round.`);
  finishRound(winnerId, true);
}

function finishRound(winnerId, chargeActiveLosers) {
  const winner = getPlayer(winnerId);
  state.nextLeaderId = winnerId;

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
  els.roundTitle.textContent = `Round ${state.round}`;
  els.stakeValue.textContent = state.stake;
  els.trickValue.textContent = state.phase === "dirty" ? "Dirty" : `${Math.min(state.trickIndex + 1, 4)} / 4`;
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
}

function renderScoreboard() {
  els.scoreboardList.innerHTML = "";
  for (const player of state.players) {
    const row = document.createElement("div");
    row.className = [
      "player-chip",
      state.turnPlayerId === player.id && state.phase === "play" ? "turn" : "",
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

function renderHumanHand() {
  const human = getHuman();
  els.humanHand.innerHTML = "";
  if (!human || human.hand.length === 0) {
    const note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = human?.eliminated ? "You are out of lives." : "No cards in hand.";
    els.humanHand.append(note);
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
  els.actionBox.innerHTML = "";
  const title = document.createElement("h3");
  const copy = document.createElement("p");
  const stack = document.createElement("div");
  stack.className = "action-stack";

  if (state.phase === "dirtyChallenge") {
    const claimer = getPlayer(state.pendingDirtyClaim?.claimerId);
    title.textContent = "Dirty Laundry claim";
    copy.textContent = `${claimer?.name || "A player"} asks for new cards. Challenge the claim or let the exchange pass.`;
    stack.append(
      actionButton("Challenge", "danger-action", () => humanDirtyChallenge(true)),
      actionButton("Let it pass", "table-action", () => humanDirtyChallenge(false)),
    );
  } else if (isHumanDirtyTurn()) {
    title.textContent = "Your Dirty Laundry";
    copy.textContent = "Claim if your hand is weak, or bluff and dare the table to inspect it.";
    stack.append(
      actionButton("Claim Dirty Laundry", "danger-action", humanClaimDirty),
      actionButton("Keep hand", "table-action", humanPassDirty),
    );
  } else if (state.phase === "toepResponse") {
    const actor = getPlayer(state.pendingToep?.actorId);
    title.textContent = "Toep called";
    copy.textContent = `${actor?.name || "A player"} raised the stake to ${state.stake}. Call or fold for ${state.pendingToep?.previousStake || state.previousStake}.`;
    stack.append(
      actionButton(`Call ${state.stake}`, "danger-action", () => humanToepResponse(true)),
      actionButton(`Fold for ${state.pendingToep?.previousStake || state.previousStake}`, "table-action", () =>
        humanToepResponse(false),
      ),
    );
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
      ? "Play a legal card. You may raise with Toep before you play."
      : "Bots play the same rules: follow suit, save strength, and bluff sometimes.";
  } else {
    title.textContent = "Table";
    copy.textContent = "The cards are moving.";
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
  els.toepBtn.disabled = !canHumanToep();
  renderFullscreenButton();
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
  return (
    state?.phase === "play" &&
    human &&
    human.active &&
    human.lives > 0 &&
    state.stake < 10 &&
    activeRoundPlayers().length > 1
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
  return state?.players.find((player) => player.isHuman);
}

function suitById(id) {
  return SUITS.find((suit) => suit.id === id);
}

function cardLabel(card) {
  return `${card.rank} of ${card.suitName}`;
}

function playerStateText(player) {
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
    roundOver: "Round over",
    gameOver: "Game over",
  };
  return names[state.phase] || "Table";
}

function log(message) {
  state.log.unshift(message);
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

boot();
