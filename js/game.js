/* game.js — Main game controller for Batalla Naval */

import { FirebaseGame } from './firebase-game.js';
import { UI } from './ui.js';

(function () {
  'use strict';

  var fleetState = null;
  var playerId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

  // Combat state
  var _roomState = null;
  var _currentTurn = null;
  var _attackedCells = new Set();
  var _processedAttackKeys = new Set();
  var _enemyCellListenersAttached = false;

  // --- Step 7: onReady with Firebase sync ---
  async function onReady() {
    fleetState = Placement.getFleetState();

    var btnReady = document.getElementById('btn-ready');
    if (btnReady) btnReady.disabled = true;

    var status = document.getElementById('game-status');
    if (status) status.textContent = 'Barcos sincronizados. Esperando al oponente...';

    var waitingMsg = document.getElementById('waiting-opponent-msg');
    if (waitingMsg) waitingMsg.hidden = false;

    try {
      await FirebaseGame.setPlayerReady(window.Game.roomId, window.Game.playerKey, fleetState);
    } catch (err) {
      if (status) status.textContent = 'Error al sincronizar barcos. Intenta de nuevo.';
      if (btnReady) btnReady.disabled = false;
      if (waitingMsg) waitingMsg.hidden = true;
    }
  }

  function getFleetState() {
    return fleetState;
  }

  // --- Step 8: handleBothConnected with full listener ---
  function handleBothConnected() {
    var lobby = document.getElementById('lobby');
    var gameContainer = document.getElementById('game-container');
    if (lobby) lobby.hidden = true;
    if (gameContainer) gameContainer.hidden = false;

    installCombatListener();
  }

  function installCombatListener() {
    FirebaseGame.listenRoom(window.Game.roomId, {
      onPlayerJoined: function () {},
      onStatusChange: function () {},
      onGameStart: function (data) {
        startPlayingPhase(data);
      },
      onTurnChange: function (currentTurn) {
        handleTurnChange(currentTurn);
      },
      onAttackReceived: function (attacks) {
        handleAttackReceived(attacks);
      },
      onGameEnd: function (winner) {
        handleGameEnd(winner);
      }
    });
  }

  // --- Step 9: startPlayingPhase ---
  function startPlayingPhase(data) {
    var placementPhase = document.getElementById('placement-phase');
    if (placementPhase) placementPhase.hidden = true;

    var waitingMsg = document.getElementById('waiting-opponent-msg');
    if (waitingMsg) waitingMsg.hidden = true;

    var status = document.getElementById('game-status');
    if (status) status.textContent = '¡Combate en curso!';

    _roomState = data;
    _currentTurn = data.currentTurn;

    UI.setTurnIndicator(data.currentTurn === window.Game.playerKey);
    UI.setEnemyBoardInteractive(data.currentTurn === window.Game.playerKey);

    // Attach click listeners to enemy board cells (only once)
    if (!_enemyCellListenersAttached) {
      _enemyCellListenersAttached = true;
      var enemyCells = document.querySelectorAll('#enemy-board .cell');
      enemyCells.forEach(function (cell) {
        cell.addEventListener('click', function () {
          // enemy cell IDs are "enemy-cell-A1", extract "cell-A1"
          var cellId = cell.id.replace('enemy-', '');
          onEnemyCellClick(cellId);
        });
      });
    }
  }

  // --- Step 10: onEnemyCellClick ---
  async function onEnemyCellClick(cellId) {
    if (_currentTurn !== window.Game.playerKey) return;
    if (_attackedCells.has(cellId)) return;

    var enemyKey = window.Game.playerKey === 'player1' ? 'player2' : 'player1';
    var enemyShips = _roomState[enemyKey].ships;

    // Determine result
    var result = 'miss';
    var allSunk = true;

    for (var shipId in enemyShips) {
      var shipCells = enemyShips[shipId];
      var hitIndex = shipCells.indexOf(cellId);

      if (hitIndex !== -1) {
        result = 'hit';
        // Check if this ship is fully sunk after this hit
        var allCellsHit = true;
        for (var i = 0; i < shipCells.length; i++) {
          if (shipCells[i] !== cellId && !_attackedCells.has(shipCells[i])) {
            allCellsHit = false;
            break;
          }
        }
        if (allCellsHit) {
          result = 'sunk';
        }
      }
    }

    // Check if ALL enemy ships are sunk after this attack
    if (result === 'hit' || result === 'sunk') {
      allSunk = true;
      for (var sid in enemyShips) {
        var sCells = enemyShips[sid];
        for (var j = 0; j < sCells.length; j++) {
          if (sCells[j] !== cellId && !_attackedCells.has(sCells[j])) {
            allSunk = false;
            break;
          }
        }
        if (!allSunk) break;
      }
      if (allSunk) {
        result = 'finished';
      }
    }

    _attackedCells.add(cellId);
    UI.setEnemyBoardInteractive(false);

    await FirebaseGame.submitAttack(window.Game.roomId, window.Game.playerKey, cellId, result);
  }

  // --- Step 11: handleAttackReceived ---
  function handleAttackReceived(attacks) {
    if (!attacks) return;

    var entries = Object.entries(attacks);
    for (var i = 0; i < entries.length; i++) {
      var key = entries[i][0];
      var attack = entries[i][1];

      if (_processedAttackKeys.has(key)) continue;
      _processedAttackKeys.add(key);

      var displayResult = (attack.result === 'finished') ? 'hit' : attack.result;

      if (attack.attackerKey === window.Game.playerKey) {
        // My attack — mark on enemy board
        UI.markCell('enemy-', attack.cell, displayResult);
      } else {
        // Opponent's attack — mark on my board
        UI.markCell('', attack.cell, displayResult);
      }
    }
  }

  // --- Step 12: handleTurnChange & handleGameEnd ---
  function handleTurnChange(currentTurn) {
    _currentTurn = currentTurn;
    UI.setTurnIndicator(currentTurn === window.Game.playerKey);
    UI.setEnemyBoardInteractive(currentTurn === window.Game.playerKey);
  }

  function handleGameEnd(winner) {
    UI.setEnemyBoardInteractive(false);
    UI.showGameOver(winner === window.Game.playerKey);
  }

  // --- Lobby helpers (unchanged) ---
  function setLobbyStatus(message, isError) {
    var el = document.getElementById('lobby-status');
    if (!el) return;
    el.textContent = message;
    if (isError) {
      el.classList.add('lobby-status--error');
    } else {
      el.classList.remove('lobby-status--error');
    }
  }

  function setLobbyFormEnabled(enabled) {
    var btn = document.getElementById('btn-create-room');
    var form = document.getElementById('join-form');
    if (btn) btn.disabled = !enabled;
    if (form) {
      var input = form.querySelector('input');
      var submit = form.querySelector('button[type="submit"]');
      if (input) input.disabled = !enabled;
      if (submit) submit.disabled = !enabled;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    // --- Placement init ---
    Placement.init({
      onAllPlaced: function (allPlaced) {
        var status = document.getElementById('game-status');
        if (status) {
          status.textContent = allPlaced
            ? 'Todos los barcos colocados. Presioná "Listo" para continuar.'
            : 'Colocá tus barcos para comenzar';
        }
      },
    });

    var btnReady = document.getElementById('btn-ready');
    if (btnReady) {
      btnReady.addEventListener('click', onReady);
    }

    // --- Lobby: Create room ---
    var btnCreate = document.getElementById('btn-create-room');
    if (btnCreate) {
      btnCreate.addEventListener('click', async function () {
        setLobbyFormEnabled(false);
        setLobbyStatus('Creando sala...', false);
        try {
          var result = await FirebaseGame.createRoom(playerId);
          window.Game.roomId = result.roomId;
          window.Game.playerKey = result.playerKey;

          var codeDisplay = document.getElementById('room-code-display');
          var codeValue = document.getElementById('room-code-value');
          if (codeValue) codeValue.textContent = result.roomId;
          if (codeDisplay) codeDisplay.hidden = false;

          setLobbyStatus('Esperando oponente...', false);

          FirebaseGame.listenRoom(result.roomId, {
            onPlayerJoined: function () {
              handleBothConnected();
            },
            onStatusChange: function () {}
          });
        } catch (e) {
          setLobbyStatus('Error de conexión, intenta de nuevo', true);
          setLobbyFormEnabled(true);
        }
      });
    }

    // --- Lobby: Join room ---
    var joinForm = document.getElementById('join-form');
    if (joinForm) {
      joinForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var input = document.getElementById('input-room-code');
        var code = (input.value || '').trim().toUpperCase();
        if (!code) return;

        setLobbyFormEnabled(false);
        setLobbyStatus('Uniéndose...', false);
        try {
          var result = await FirebaseGame.joinRoom(code, playerId);
          window.Game.roomId = result.roomId;
          window.Game.playerKey = result.playerKey;
          handleBothConnected();
        } catch (e) {
          setLobbyStatus(e.message, true);
          setLobbyFormEnabled(true);
        }
      });
    }

    // --- Lobby: Copy code ---
    var btnCopy = document.getElementById('btn-copy-code');
    if (btnCopy) {
      btnCopy.addEventListener('click', function () {
        var codeValue = document.getElementById('room-code-value');
        if (codeValue && navigator.clipboard) {
          navigator.clipboard.writeText(codeValue.textContent);
        }
      });
    }
  });

  // Expose for future phases
  window.Game = {
    getFleetState: getFleetState,
    roomId: null,
    playerKey: null,
    playerId: playerId,
  };
})();
