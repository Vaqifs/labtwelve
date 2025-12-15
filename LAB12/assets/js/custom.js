(() => {
  const ITEMS = ["🍓","🍋","🍇","🍉","🍒","🥝","🍍","🍑","🍎","🍌","🥥","🍊"];

  const DIFFICULTY = {
    easy: { cols: 4, rows: 3 },
    hard: { cols: 6, rows: 4 },
  };

  const boardEl = document.getElementById("mg-board");
  const difficultyEl = document.getElementById("mg-difficulty");
  const startBtn = document.getElementById("mg-start");
  const restartBtn = document.getElementById("mg-restart");
  const movesEl = document.getElementById("mg-moves");
  const matchesEl = document.getElementById("mg-matches");
  const winEl = document.getElementById("mg-win");

  const timeEl = document.getElementById("mg-time");
  const bestEasyEl = document.getElementById("mg-best-easy");
  const bestHardEl = document.getElementById("mg-best-hard");

  if (!boardEl || !difficultyEl || !startBtn || !restartBtn) return;

  let gameActive = false;
  let lock = false;
  let firstCard = null;
  let secondCard = null;
  let moves = 0;
  let matches = 0;

  let timerId = null;
  let elapsedSec = 0;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function pad2(n) { return String(n).padStart(2, "0"); }

  function renderTime() {
    if (!timeEl) return;
    const m = Math.floor(elapsedSec / 60);
    const s = elapsedSec % 60;
    timeEl.textContent = `${pad2(m)}:${pad2(s)}`;
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  function resetTimer() {
    stopTimer();
    elapsedSec = 0;
    renderTime();
  }

  function startTimer() {
    if (!timeEl) return;
    stopTimer();
    timerId = setInterval(() => {
      elapsedSec += 1;
      renderTime();
    }, 1000);
  }

  function getPairsCount(diffKey) {
    const { cols, rows } = DIFFICULTY[diffKey];
    return (cols * rows) / 2;
  }

  function getBestKey(diffKey) {
    return `mg_best_moves_${diffKey}`;
  }

  function loadBest() {
    if (!bestEasyEl || !bestHardEl) return;
    const be = localStorage.getItem(getBestKey("easy"));
    const bh = localStorage.getItem(getBestKey("hard"));
    bestEasyEl.textContent = be ? be : "—";
    bestHardEl.textContent = bh ? bh : "—";
  }

  function maybeSaveBest(diffKey, currentMoves) {
    const key = getBestKey(diffKey);
    const prev = localStorage.getItem(key);
    const prevNum = prev ? Number(prev) : null;
    if (!prev || (Number.isFinite(prevNum) && currentMoves < prevNum)) {
      localStorage.setItem(key, String(currentMoves));
    }
    loadBest();
  }

  function setStats() {
    movesEl.textContent = String(moves);
    matchesEl.textContent = String(matches);
  }

  function clearSelection() {
    firstCard = null;
    secondCard = null;
  }

  function setWinMessage(text) {
    winEl.textContent = text || "";
  }

  function buildDeck(diffKey) {
    const pairs = getPairsCount(diffKey);
    const source = ITEMS.slice(0);
    shuffle(source);
    const chosen = source.slice(0, pairs);
    const deck = shuffle([...chosen, ...chosen]).map((value, idx) => ({
      id: `${diffKey}-${idx}-${value}`,
      value,
    }));
    return deck;
  }

  function setGrid(diffKey) {
    const { cols } = DIFFICULTY[diffKey];
    boardEl.style.setProperty("--mg-cols", cols);
  }

  function renderBoard(deck) {
    boardEl.innerHTML = "";
    const frag = document.createDocumentFragment();

    deck.forEach((card) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mg-card";
      btn.dataset.value = card.value;
      btn.dataset.id = card.id;
      btn.setAttribute("aria-pressed", "false");

      btn.innerHTML = `
        <span class="mg-card-inner">
          <span class="mg-card-face mg-card-front">?</span>
          <span class="mg-card-face mg-card-back">${card.value}</span>
        </span>
      `;
      frag.appendChild(btn);
    });

    boardEl.appendChild(frag);
  }

  let currentDiff = "easy";
  let currentDeck = [];

  function resetState() {
    gameActive = false;
    lock = false;
    firstCard = null;
    secondCard = null;
    moves = 0;
    matches = 0;
    setStats();
    setWinMessage("");
    resetTimer();
    restartBtn.disabled = true;
  }

  function initBoard(diffKey) {
    currentDiff = diffKey;
    setGrid(diffKey);
    currentDeck = buildDeck(diffKey);
    renderBoard(currentDeck);
    boardEl.classList.add("mg-inactive");
    resetState();
    loadBest();
  }

  function startGame() {
    if (gameActive) return;
    gameActive = true;
    boardEl.classList.remove("mg-inactive");
    restartBtn.disabled = false;
    setWinMessage("");
    resetTimer();
    startTimer();
  }

  function restartGame() {
    initBoard(currentDiff);
    startGame();
  }

  function flipCard(cardEl) {
    cardEl.classList.add("is-flipped");
    cardEl.setAttribute("aria-pressed", "true");
  }

  function unflipCard(cardEl) {
    cardEl.classList.remove("is-flipped");
    cardEl.setAttribute("aria-pressed", "false");
  }

  function disableCard(cardEl) {
    cardEl.classList.add("is-matched");
    cardEl.disabled = true;
  }

  function handleMatch() {
    const v1 = firstCard.dataset.value;
    const v2 = secondCard.dataset.value;

    if (v1 === v2) {
      matches += 1;
      setStats();
      disableCard(firstCard);
      disableCard(secondCard);
      clearSelection();

      const totalPairs = getPairsCount(currentDiff);
      if (matches === totalPairs) {
        stopTimer();
        setWinMessage(`You win! 🎉 Moves: ${moves} | Time: ${timeEl ? timeEl.textContent : "—"}`);
        maybeSaveBest(currentDiff, moves);
        gameActive = false;
        boardEl.classList.add("mg-inactive");
      }
    } else {
      lock = true;
      setTimeout(() => {
        unflipCard(firstCard);
        unflipCard(secondCard);
        clearSelection();
        lock = false;
      }, 1000);
    }
  }

  function onBoardClick(e) {
    const cardEl = e.target.closest(".mg-card");
    if (!cardEl) return;
    if (!gameActive) return;
    if (lock) return;
    if (cardEl.disabled) return;
    if (cardEl === firstCard) return;

    flipCard(cardEl);

    if (!firstCard) {
      firstCard = cardEl;
      return;
    }

    secondCard = cardEl;
    moves += 1;
    setStats();
    handleMatch();
  }

  difficultyEl.addEventListener("change", () => initBoard(difficultyEl.value));
  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", restartGame);
  boardEl.addEventListener("click", onBoardClick);

  initBoard(difficultyEl.value);
})();
