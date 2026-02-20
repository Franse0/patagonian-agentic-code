/* game.js — Main game controller for Batalla Naval */

import { FirebaseGame } from './firebase-game.js';

(function () {
  'use strict';

  var fleetState = null;
  var _isMyTurn = false;
  var playerId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

  function onReady() {
    fleetState = Placement.getFleetState();

    var placementPhase = document.getElementById('placement-phase');
    if (placementPhase) placementPhase.hidden = true;

    var status = document.getElementById('game-status');
    if (status) status.textContent = 'Esperando que el oponente esté listo...';

    FirebaseGame.syncReadyState(window.Game.roomId, window.Game.playerKey, fleetState)
      .then(function () {
        FirebaseGame.listenRoom(window.Game.roomId, {
          onPlayerJoined: function () {},
          onStatusChange: function () {},
          onBothReady: handleBothReady,
          onTurnChange: handleTurnChange,
          onAttacksChange: handleAttacksChange
        });
      })
      .catch(function () {
        if (status) status.textContent = 'Error al conectar con Firebase. Jugando en local.';
      });
  }

  function handleBothReady() {
    var status = document.getElementById('game-status');
    if (status) status.textContent = '¡La partida comenzó!';
    // Only player1 writes the initial game state to avoid race condition
    if (window.Game.playerKey === 'player1') {
      FirebaseGame.startGame(window.Game.roomId);
    }
  }

  function handleTurnChange(currentTurn) {
    _isMyTurn = (currentTurn === window.Game.playerKey);
    var indicator = document.getElementById('turn-indicator');
    if (indicator) {
      indicator.hidden = false;
      indicator.textContent = _isMyTurn ? 'Tu turno' : 'Turno del oponente';
      if (_isMyTurn) {
        indicator.classList.add('turn-indicator--active');
      } else {
        indicator.classList.remove('turn-indicator--active');
      }
    }
    var enemyBoard = document.getElementById('enemy-board');
    if (enemyBoard) {
      if (_isMyTurn) {
        enemyBoard.classList.remove('board--disabled');
      } else {
        enemyBoard.classList.add('board--disabled');
      }
    }
    var status = document.getElementById('game-status');
    if (status) status.textContent = _isMyTurn ? 'Atacá el tablero enemigo' : 'Esperando ataque del oponente...';
  }

  function handleAttacksChange(attacks) {
    var opponentKey = window.Game.playerKey === 'player1' ? 'player2' : 'player1';
    var opponentAttacks = attacks.filter(function (a) { return a.playerId === opponentKey; });
    opponentAttacks.forEach(function (attack) {
      var cellId = 'cell-' + attack.cell;
      var el = document.getElementById(cellId);
      if (!el) return;
      if (el.classList.contains('cell--hit-received') || el.classList.contains('cell--miss-received')) return;
      if (attack.result === 'hit') {
        el.classList.add('cell--hit-received');
      } else {
        el.classList.add('cell--miss-received');
      }
    });
  }

  function getFleetState() {
    return fleetState;
  }

  function handleBothConnected() {
    var lobby = document.getElementById('lobby');
    var gameContainer = document.getElementById('game-container');
    if (lobby) lobby.hidden = true;
    if (gameContainer) gameContainer.hidden = false;
  }

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

    // --- Combat: Enemy board clicks ---
    var enemyBoard = document.getElementById('enemy-board');
    if (enemyBoard) {
      enemyBoard.addEventListener('click', function (e) {
        if (!_isMyTurn) return;
        var cell = e.target.closest('.cell');
        if (!cell) return;
        // Ignore already attacked cells
        if (cell.classList.contains('cell--attacked--hit') || cell.classList.contains('cell--attacked--miss')) return;

        // Extract cellId: 'enemy-cell-A1' → 'A1'
        var rawId = cell.id.replace('enemy-cell-', '');

        // Determine hit/miss by checking opponent's ships
        var roomData = FirebaseGame.getRoomData();
        var opponentKey = window.Game.playerKey === 'player1' ? 'player2' : 'player1';
        var opponentShips = roomData && roomData[opponentKey] && roomData[opponentKey].ships;
        var isHit = false;
        if (opponentShips) {
          Object.values(opponentShips).forEach(function (cellList) {
            if (cellList && cellList.indexOf('cell-' + rawId) !== -1) isHit = true;
          });
        }
        var result = isHit ? 'hit' : 'miss';

        // Immediate local feedback
        cell.classList.add(isHit ? 'cell--attacked--hit' : 'cell--attacked--miss');

        // Disable turn locally until Firebase confirms the change
        _isMyTurn = false;
        enemyBoard.classList.add('board--disabled');

        // Write attack to Firebase and alternate turn
        FirebaseGame.registerAttack(window.Game.roomId, window.Game.playerKey, rawId, result)
          .then(function () {
            var nextTurn = window.Game.playerKey === 'player1' ? 'player2' : 'player1';
            FirebaseGame.setTurn(window.Game.roomId, nextTurn);
          });
      });
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
