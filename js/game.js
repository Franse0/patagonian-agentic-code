/* game.js — Main game controller for Batalla Naval */

import { FirebaseGame } from './firebase-game.js';

function getSunkShips(attacks, ships) {
  // attacks: [{cell, playerId, result}] — cell sin prefijo 'cell-'
  // ships: {shipId: ['cell-A1', ...]} — cellIds CON prefijo 'cell-'
  var hitCells = new Set(
    attacks.filter(function (a) { return a.result === 'hit'; }).map(function (a) { return a.cell; })
  );
  return Object.keys(ships).filter(function (shipId) {
    var cells = ships[shipId] || [];
    return cells.length > 0 && cells.every(function (c) {
      return hitCells.has(c.replace('cell-', ''));
    });
  });
}

function checkVictoryCondition(myAttacks, opponentShips) {
  var hitCells = new Set(
    myAttacks.filter(function (a) { return a.result === 'hit'; }).map(function (a) { return a.cell; })
  );
  return Object.values(opponentShips).every(function (cells) {
    return cells.every(function (cell) { return hitCells.has(cell); });
  });
}

(function () {
  'use strict';

  var SHIPS = [
    { id: 'carrier',    name: 'Portaaviones' },
    { id: 'battleship', name: 'Acorazado' },
    { id: 'cruiser',    name: 'Crucero' },
    { id: 'submarine',  name: 'Submarino' },
    { id: 'destroyer',  name: 'Destructor' }
  ];

  var fleetState = null;
  var _isMyTurn = false;
  var _prevEnemySunkIds = [];
  var playerId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

  function showScreen(el) {
    if (!el) return;
    el.hidden = false;
    el.classList.add('screen-transition', 'screen-entering');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.remove('screen-entering');
        el.classList.add('screen-visible');
      });
    });
  }

  function hideScreen(el) {
    if (!el || el.hidden) return;
    if (!el.classList.contains('screen-visible')) {
      el.hidden = true;
      return;
    }
    el.classList.add('screen-transition');
    el.classList.remove('screen-visible');
    el.addEventListener('transitionend', function handler() {
      el.removeEventListener('transitionend', handler);
      el.hidden = true;
      el.classList.remove('screen-transition', 'screen-entering');
    }, { once: true });
  }

  function showSpinner() {
    var spinner = document.getElementById('loading-spinner');
    var form = document.getElementById('join-form');
    var btn = document.getElementById('btn-create-room');
    var nameGroup = document.querySelector('.player-name-group');
    var divider = document.querySelector('.lobby-divider');
    var desc = document.querySelector('.lobby-description');
    if (spinner) spinner.hidden = false;
    if (form) form.hidden = true;
    if (btn) btn.hidden = true;
    if (nameGroup) nameGroup.hidden = true;
    if (divider) divider.hidden = true;
    if (desc) desc.hidden = true;
  }

  function hideSpinner() {
    var spinner = document.getElementById('loading-spinner');
    var form = document.getElementById('join-form');
    var btn = document.getElementById('btn-create-room');
    var nameGroup = document.querySelector('.player-name-group');
    var divider = document.querySelector('.lobby-divider');
    var desc = document.querySelector('.lobby-description');
    if (spinner) spinner.hidden = true;
    if (form) form.hidden = false;
    if (btn) btn.hidden = false;
    if (nameGroup) nameGroup.hidden = false;
    if (divider) divider.hidden = false;
    if (desc) desc.hidden = false;
  }

  function popStatus(message) {
    var el = document.getElementById('game-status');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('status--pop');
    void el.offsetWidth; // reflow to re-trigger animation
    el.classList.add('status--pop');
    el.addEventListener('animationend', function h() {
      el.classList.remove('status--pop');
      el.removeEventListener('animationend', h);
    });
  }

  function onReady() {
    fleetState = Placement.getFleetState();

    var placementPhase = document.getElementById('placement-phase');
    if (placementPhase) placementPhase.hidden = true;

    var status = document.getElementById('game-status');
    if (status) status.textContent = 'Fase de colocación completa — esperando al oponente...';

    FirebaseGame.syncReadyState(window.Game.roomId, window.Game.playerKey, fleetState)
      .then(function () {
        FirebaseGame.listenRoom(window.Game.roomId, {
          onPlayerJoined: function () {},
          onStatusChange: function () {},
          onBothReady: handleBothReady,
          onTurnChange: handleTurnChange,
          onAttacksChange: handleAttacksChange,
          onGameFinished: function (winnerKey) { handleGameFinished(winnerKey); }
        });
      })
      .catch(function () {
        if (status) status.textContent = 'Error al conectar con Firebase. Jugando en local.';
      });
  }

  function handleBothReady() {
    var status = document.getElementById('game-status');
    if (status) status.textContent = '¡Combate iniciado! Preparate para atacar.';
    // Only player1 writes the initial game state to avoid race condition
    if (window.Game.playerKey === 'player1') {
      FirebaseGame.startGame(window.Game.roomId);
    }
  }

  function renderFleetPanel(panelId, sunkIds) {
    var list = document.querySelector('#' + panelId + ' .fleet-list');
    if (!list) return;
    list.innerHTML = '';
    SHIPS.forEach(function (ship) {
      var li = document.createElement('li');
      var isSunk = sunkIds.indexOf(ship.id) !== -1;
      li.className = 'fleet-item' + (isSunk ? ' fleet-item--sunk' : '');
      li.textContent = ship.name;
      list.appendChild(li);
    });
  }

  function updateFleetPanels(attacks) {
    var myKey = window.Game.playerKey;
    var opponentKey = myKey === 'player1' ? 'player2' : 'player1';
    var roomData = FirebaseGame.getRoomData();
    if (!roomData) return;

    // Tu flota: ataques recibidos del oponente sobre tus barcos
    var opponentAttacks = attacks.filter(function (a) { return a.playerId === opponentKey; });
    var myShips = roomData[myKey] && roomData[myKey].ships;
    if (myShips) {
      var mySunk = getSunkShips(opponentAttacks, myShips);
      renderFleetPanel('player-fleet', mySunk);
    }

    // Flota enemiga: tus ataques sobre los barcos del oponente
    var myAttacks = attacks.filter(function (a) { return a.playerId === myKey; });
    var enemyShips = roomData[opponentKey] && roomData[opponentKey].ships;
    if (enemyShips) {
      var enemySunk = getSunkShips(myAttacks, enemyShips);
      renderFleetPanel('enemy-fleet', enemySunk);

      // Notificación cuando se hunde un nuevo barco enemigo
      var newlySunk = enemySunk.filter(function (id) {
        return _prevEnemySunkIds.indexOf(id) === -1;
      });
      if (newlySunk.length > 0) {
        var sunkShip = SHIPS.filter(function (s) {
          return newlySunk.indexOf(s.id) !== -1;
        })[0];
        if (sunkShip) {
          popStatus('¡Hundiste el ' + sunkShip.name + '!');
        }
        // Animate sunk ship cells on enemy board
        newlySunk.forEach(function (shipId) {
          var shipCells = enemyShips[shipId] || [];
          shipCells.forEach(function (cellId) {
            var rawId = cellId.replace('cell-', '');
            var el = document.getElementById('enemy-cell-' + rawId);
            if (el) {
              el.classList.add('cell--anim-sunk');
              setTimeout(function () { el.classList.remove('cell--anim-sunk'); }, 700);
            }
          });
        });
      }
      _prevEnemySunkIds = enemySunk;
    }
  }

  function handleTurnChange(currentTurn) {
    // Mostrar panel de flota al inicio del combate
    var fleetStatus = document.getElementById('fleet-status');
    if (fleetStatus && fleetStatus.hidden) {
      fleetStatus.hidden = false;
      updateFleetPanels([]); // Renderizado inicial: todos intactos
    }

    _isMyTurn = (currentTurn === window.Game.playerKey);
    var indicator = document.getElementById('turn-indicator');
    if (indicator) {
      indicator.hidden = false;
      indicator.classList.remove('turn-indicator--pulse');
      indicator.textContent = _isMyTurn ? 'Tu turno' : 'Turno del oponente';
      if (_isMyTurn) {
        indicator.classList.add('turn-indicator--active');
        requestAnimationFrame(function () {
          indicator.classList.add('turn-indicator--pulse');
        });
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
    popStatus(_isMyTurn ? 'Atacá el tablero enemigo' : 'Esperando ataque del oponente...');
  }

  function handleAttacksChange(attacks) {
    var myKey = window.Game.playerKey;
    var opponentKey = myKey === 'player1' ? 'player2' : 'player1';

    attacks.forEach(function (attack) {
      if (attack.playerId === opponentKey) {
        // Ataque recibido: pintar en tablero propio
        var cellId = 'cell-' + attack.cell;
        var el = document.getElementById(cellId);
        if (el && !el.classList.contains('cell--hit-received') && !el.classList.contains('cell--miss-received')) {
          el.classList.add(attack.result === 'hit' ? 'cell--hit-received' : 'cell--miss-received');
          var animClass = attack.result === 'hit' ? 'cell--anim-hit' : 'cell--anim-miss';
          el.classList.add(animClass);
          setTimeout(function () { el.classList.remove(animClass); }, 500);
        }
      } else if (attack.playerId === myKey) {
        // Ataque propio: re-pintar en tablero enemigo (re-sync desde Firebase)
        var enemyCellId = 'enemy-cell-' + attack.cell;
        var enemyEl = document.getElementById(enemyCellId);
        if (enemyEl && !enemyEl.classList.contains('cell--attacked--hit') && !enemyEl.classList.contains('cell--attacked--miss')) {
          enemyEl.classList.add(attack.result === 'hit' ? 'cell--attacked--hit' : 'cell--attacked--miss');
          var enemyAnimClass = attack.result === 'hit' ? 'cell--anim-hit' : 'cell--anim-miss';
          enemyEl.classList.add(enemyAnimClass);
          setTimeout(function () { enemyEl.classList.remove(enemyAnimClass); }, 500);
        }
      }
    });

    // Historial: últimos 5 ataques (más reciente primero)
    var historyPanel = document.getElementById('attack-history');
    var historyList = document.getElementById('attack-history-list');
    if (!historyPanel || !historyList) return;

    var sorted = attacks.slice().sort(function (a, b) {
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
    var recent = sorted.slice(0, 5);

    historyList.innerHTML = '';
    recent.forEach(function (attack, index) {
      var li = document.createElement('li');
      li.className = 'attack-history-item attack-history-item--' + attack.result;
      if (index === 0) li.classList.add('attack-history-item--new');

      var playerLabel = attack.playerId === myKey ? 'Tú' : 'Rival';

      var playerSpan = document.createElement('span');
      playerSpan.className = 'attack-history-player';
      playerSpan.textContent = playerLabel + ' → ' + attack.cell;

      var resultSpan = document.createElement('span');
      resultSpan.className = 'attack-history-result';
      resultSpan.textContent = attack.result === 'hit' ? 'Impacto' : 'Agua';

      li.appendChild(playerSpan);
      li.appendChild(resultSpan);
      historyList.appendChild(li);
    });

    if (attacks.length > 0) {
      historyPanel.hidden = false;
    }

    updateFleetPanels(attacks);
  }

  function handleGameFinished(winnerKey) {
    var gameContainer = document.getElementById('game-container');
    var endScreen = document.getElementById('end-screen');
    hideScreen(gameContainer);
    showScreen(endScreen);

    if (endScreen) {
      endScreen.classList.add('end-screen--enter');
      endScreen.addEventListener('animationend', function h() {
        endScreen.classList.remove('end-screen--enter');
        endScreen.removeEventListener('animationend', h);
      });
    }

    var isWinner = (winnerKey === window.Game.playerKey);
    var resultEl = document.getElementById('end-result');
    if (resultEl) {
      resultEl.textContent = isWinner ? '¡Ganaste! 🏆' : 'Perdiste... 💀';
      resultEl.className = isWinner ? '--win' : '--lose';
    }

    // Calculate stats from room data
    var roomData = FirebaseGame.getRoomData();
    var attacks = roomData && roomData.attacks ? Object.values(roomData.attacks) : [];
    var myAttacks = attacks.filter(function (a) { return a.playerId === window.Game.playerKey; });
    var totalAttacks = myAttacks.length;
    var hits = myAttacks.filter(function (a) { return a.result === 'hit'; }).length;
    var accuracy = totalAttacks > 0 ? (hits / totalAttacks * 100).toFixed(1) : '0.0';

    // Duration from first to last attack (any player)
    var timestamps = attacks.map(function (a) { return a.timestamp || 0; }).filter(function (t) { return t > 0; });
    var durationSec = 0;
    if (timestamps.length >= 2) {
      var first = Math.min.apply(null, timestamps);
      var last = Math.max.apply(null, timestamps);
      durationSec = Math.floor((last - first) / 1000);
    }
    var minutes = Math.floor(durationSec / 60);
    var seconds = durationSec % 60;
    var durationStr = minutes + 'm ' + seconds + 's';

    var statAttacks = document.getElementById('stat-attacks');
    var statAccuracy = document.getElementById('stat-accuracy');
    var statDuration = document.getElementById('stat-duration');
    if (statAttacks) statAttacks.innerHTML = '<strong>Ataques</strong>' + totalAttacks;
    if (statAccuracy) statAccuracy.innerHTML = '<strong>Precisión</strong>' + accuracy + '%';
    if (statDuration) statDuration.innerHTML = '<strong>Duración</strong>' + durationStr;

    // Buttons
    var btnRematch = document.getElementById('btn-rematch');
    var btnExit = document.getElementById('btn-exit');
    if (btnRematch) {
      btnRematch.addEventListener('click', function () {
        window.location.reload();
      });
    }
    if (btnExit) {
      btnExit.addEventListener('click', function () {
        window.location.reload();
      });
    }
  }

  function getFleetState() {
    return fleetState;
  }

  function handleBothConnected() {
    var lobby = document.getElementById('lobby');
    var gameContainer = document.getElementById('game-container');
    hideScreen(lobby);
    showScreen(gameContainer);
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
    // --- Home screen → Lobby navigation ---
    var homeScreen = document.getElementById('home-screen');
    var lobbyScreen = document.getElementById('lobby');
    var btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
      btnPlay.addEventListener('click', function () {
        hideScreen(homeScreen);
        showScreen(lobbyScreen);
      });
    }

    // --- Player name ---
    var playerNameInput = document.getElementById('input-player-name');
    function getPlayerName() {
      return (playerNameInput && playerNameInput.value.trim()) || 'Jugador 1';
    }
    window.Game.playerName = getPlayerName();
    if (playerNameInput) {
      playerNameInput.addEventListener('input', function () {
        window.Game.playerName = getPlayerName();
      });
    }

    // --- Rules modal ---
    var btnRules = document.getElementById('btn-rules');
    var rulesModal = document.getElementById('rules-modal');
    var btnCloseRules = document.getElementById('btn-close-rules');
    var rulesOverlay = document.querySelector('.rules-overlay');

    function openRules() {
      if (!rulesModal) return;
      rulesModal.hidden = false;
      var dialog = rulesModal.querySelector('.rules-dialog');
      if (dialog) {
        dialog.classList.add('rules-dialog--enter');
        dialog.addEventListener('animationend', function h() {
          dialog.classList.remove('rules-dialog--enter');
          dialog.removeEventListener('animationend', h);
        });
      }
      btnCloseRules && btnCloseRules.focus();
    }
    function closeRules() {
      if (!rulesModal) return;
      rulesModal.hidden = true;
      btnRules && btnRules.focus();
    }

    if (btnRules) btnRules.addEventListener('click', openRules);
    if (btnCloseRules) btnCloseRules.addEventListener('click', closeRules);
    if (rulesOverlay) rulesOverlay.addEventListener('click', closeRules);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && rulesModal && !rulesModal.hidden) closeRules();
    });

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

        // Write attack to Firebase, then check victory or alternate turn
        FirebaseGame.registerAttack(window.Game.roomId, window.Game.playerKey, rawId, result)
          .then(function () {
            if (result === 'hit' && opponentShips) {
              // Build full list of my attacks from roomData + current attack
              var roomDataNow = FirebaseGame.getRoomData();
              var allAttacks = roomDataNow && roomDataNow.attacks ? Object.values(roomDataNow.attacks) : [];
              var myAttacks = allAttacks.filter(function (a) { return a.playerId === window.Game.playerKey; });
              // Normalize opponent ship cells: remove 'cell-' prefix for comparison
              var normalizedShips = {};
              Object.keys(opponentShips).forEach(function (key) {
                normalizedShips[key] = opponentShips[key].map(function (c) {
                  return c.replace('cell-', '');
                });
              });
              if (checkVictoryCondition(myAttacks, normalizedShips)) {
                FirebaseGame.setWinner(window.Game.roomId, window.Game.playerKey);
                return;
              }
            }
            var nextTurn = window.Game.playerKey === 'player1' ? 'player2' : 'player1';
            FirebaseGame.setTurn(window.Game.roomId, nextTurn);
          });
      });
    }

    // --- Lobby: Create room ---
    var btnCreate = document.getElementById('btn-create-room');
    if (btnCreate) {
      btnCreate.addEventListener('click', async function () {
        window.Game.playerName = getPlayerName();
        showSpinner();
        setLobbyStatus('', false);
        try {
          var result = await FirebaseGame.createRoom(playerId);
          window.Game.roomId = result.roomId;
          window.Game.playerKey = result.playerKey;

          hideSpinner();

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
          hideSpinner();
          setLobbyStatus('Error de conexión, intenta de nuevo', true);
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

        window.Game.playerName = getPlayerName();
        showSpinner();
        setLobbyStatus('', false);
        try {
          var result = await FirebaseGame.joinRoom(code, playerId);
          window.Game.roomId = result.roomId;
          window.Game.playerKey = result.playerKey;
          handleBothConnected();
        } catch (e) {
          hideSpinner();
          setLobbyStatus(e.message, true);
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
    playerName: 'Jugador 1',
  };
})();
