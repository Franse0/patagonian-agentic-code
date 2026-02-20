/* ui.js — DOM manipulation for combat phase in Batalla Naval */

export const UI = {
  setTurnIndicator(isMyTurn) {
    const el = document.getElementById('turn-indicator');
    if (!el) return;
    el.hidden = false;
    el.textContent = isMyTurn ? 'Tu turno' : 'Turno del oponente';
    el.classList.remove('turn--mine', 'turn--opponent');
    el.classList.add(isMyTurn ? 'turn--mine' : 'turn--opponent');
  },

  markCell(boardPrefix, cellId, result) {
    // boardPrefix: "" for player board, "enemy-" for enemy board
    const elId = boardPrefix + cellId;
    const el = document.getElementById(elId);
    if (!el) return;
    el.classList.remove('cell--hit', 'cell--miss', 'cell--sunk');
    if (result === 'hit') el.classList.add('cell--hit');
    else if (result === 'miss') el.classList.add('cell--miss');
    else if (result === 'sunk') el.classList.add('cell--sunk');
  },

  setEnemyBoardInteractive(enabled) {
    const board = document.getElementById('enemy-board');
    if (!board) return;
    if (enabled) {
      board.classList.add('board--interactive');
    } else {
      board.classList.remove('board--interactive');
    }
  },

  showGameOver(didWin) {
    const overlay = document.getElementById('game-over-overlay');
    const title = document.getElementById('game-over-title');
    const subtitle = document.getElementById('game-over-subtitle');
    if (!overlay) return;
    if (title) title.textContent = didWin ? '¡Victoria!' : 'Derrota';
    if (subtitle) subtitle.textContent = didWin
      ? '¡Hundiste toda la flota enemiga!'
      : 'Tu flota ha sido hundida.';
    overlay.hidden = false;
  },

  hideGameOver() {
    const overlay = document.getElementById('game-over-overlay');
    if (overlay) overlay.hidden = true;
  }
};
