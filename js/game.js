/* game.js — Main game controller for Batalla Naval */

import { FirebaseGame } from './firebase-game.js';
import { saveSession, loadSession, clearSession } from './session.js';

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
    { id: 'carrier',    name: 'Portaaviones', size: 5 },
    { id: 'battleship', name: 'Acorazado',    size: 4 },
    { id: 'cruiser',    name: 'Crucero',       size: 3 },
    { id: 'submarine',  name: 'Submarino',     size: 3 },
    { id: 'destroyer',  name: 'Destructor',    size: 2 }
  ];

  var fleetState = null;
  var _isMyTurn = false;
  var _prevEnemySunkIds = [];
  var _chatUnreadCount = 0;
  var _chatPanelOpen = false;
  var _prevMsgCount = 0;
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
          onStatusChange: function (status) {
            if (status === 'placing') {
              var endScreen = document.getElementById('end-screen');
              if (endScreen && !endScreen.hidden) {
                handleReturnToPlacing();
              }
            }
          },
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

      var nameSpan = document.createElement('span');
      nameSpan.className = 'fleet-item-name';
      nameSpan.textContent = ship.name;
      li.appendChild(nameSpan);

      var blocksSpan = document.createElement('span');
      blocksSpan.className = 'fleet-item-blocks';
      for (var i = 0; i < ship.size; i++) {
        var block = document.createElement('span');
        block.className = 'fleet-item-block';
        blocksSpan.appendChild(block);
      }
      li.appendChild(blocksSpan);

      list.appendChild(li);
    });
  }

  function markSunkCells(sunkIds, ships, boardPrefix, sunkClass) {
    // sunkIds: array of ship IDs that are fully sunk
    // ships: { shipId: ['cell-A1', ...] }
    // boardPrefix: '' for player board, 'enemy-' for enemy board
    // sunkClass: 'cell--sunk' or 'cell--sunk-received'
    sunkIds.forEach(function (shipId) {
      var cells = ships[shipId] || [];
      cells.forEach(function (cellId) {
        var rawId = cellId.replace('cell-', '');
        var el = document.getElementById(boardPrefix + 'cell-' + rawId);
        if (el) {
          el.classList.add(sunkClass);
        }
      });
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
      markSunkCells(mySunk, myShips, '', 'cell--sunk-received');
    }

    // Flota enemiga: tus ataques sobre los barcos del oponente
    var myAttacks = attacks.filter(function (a) { return a.playerId === myKey; });
    var enemyShips = roomData[opponentKey] && roomData[opponentKey].ships;
    if (enemyShips) {
      var enemySunk = getSunkShips(myAttacks, enemyShips);
      renderFleetPanel('enemy-fleet', enemySunk);
      markSunkCells(enemySunk, enemyShips, 'enemy-', 'cell--sunk');

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

    // Mostrar botón de toggle al iniciar combate
    var toggleBtn = document.getElementById('btn-toggle-board');
    if (toggleBtn && toggleBtn.hidden) {
      var isMobile = window.matchMedia('(max-width: 900px)').matches;
      // En mobile el tablero propio empieza oculto por CSS; botón invita a mostrarlo
      toggleBtn.textContent = isMobile ? 'Mostrar mi tablero' : 'Ocultar mi tablero';
      toggleBtn.setAttribute('aria-label', isMobile ? 'Mostrar mi tablero' : 'Ocultar mi tablero');
      toggleBtn.hidden = false;
      toggleBtn.addEventListener('click', function () {
        var container = document.getElementById('game-container');
        var isHiding = container.classList.toggle('--hiding-own');
        toggleBtn.setAttribute('aria-pressed', isHiding ? 'true' : 'false');
        toggleBtn.textContent = isHiding ? 'Mostrar mi tablero' : 'Ocultar mi tablero';
        toggleBtn.setAttribute('aria-label', isHiding ? 'Mostrar mi tablero' : 'Ocultar mi tablero');
      });
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

  function handleReturnToPlacing() {
    // Resetear estado interno del juego
    fleetState = null;
    _isMyTurn = false;
    _prevEnemySunkIds = [];

    // Transición de pantalla
    var endScreen = document.getElementById('end-screen');
    var gameContainer = document.getElementById('game-container');
    hideScreen(endScreen);
    showScreen(gameContainer);

    // Mostrar fase de colocación nuevamente
    var placementPhase = document.getElementById('placement-phase');
    if (placementPhase) placementPhase.hidden = false;

    // Ocultar UI de combate
    var fleetStatus = document.getElementById('fleet-status');
    if (fleetStatus) fleetStatus.hidden = true;
    var attackHistory = document.getElementById('attack-history');
    if (attackHistory) attackHistory.hidden = true;
    var turnIndicator = document.getElementById('turn-indicator');
    if (turnIndicator) turnIndicator.hidden = true;

    // Resetear botón toggle
    var toggleBtn = document.getElementById('btn-toggle-board');
    if (toggleBtn) {
      toggleBtn.hidden = true;
      toggleBtn.setAttribute('aria-pressed', 'false');
      toggleBtn.textContent = 'Ocultar mi tablero';
    }
    if (gameContainer) gameContainer.classList.remove('--hiding-own');

    // Limpiar clases de combate del tablero propio
    var playerBoard = document.getElementById('player-board');
    if (playerBoard) {
      playerBoard.querySelectorAll('.cell').forEach(function (cell) {
        cell.classList.remove('cell--hit-received', 'cell--miss-received', 'cell--sunk-received');
      });
    }

    // Limpiar clases de combate del tablero enemigo
    var enemyBoard = document.getElementById('enemy-board');
    if (enemyBoard) {
      enemyBoard.querySelectorAll('.cell').forEach(function (cell) {
        cell.classList.remove('cell--attacked--hit', 'cell--attacked--miss', 'cell--sunk');
      });
    }

    // Resetear barcos colocados (sin rellamar bindEvents para evitar listeners duplicados)
    Placement.clearAllPlacements();
    var btnReady = document.getElementById('btn-ready');
    if (btnReady) btnReady.disabled = true;

    // Limpiar UI del chat (los mensajes se limpian via Firebase resetRoom)
    var chatMessages = document.getElementById('chat-messages');
    if (chatMessages) chatMessages.innerHTML = '';
    var chatOverlayMessages = document.getElementById('chat-overlay-messages');
    if (chatOverlayMessages) chatOverlayMessages.innerHTML = '';
    _chatUnreadCount = 0;
    _prevMsgCount = 0;
    var chatBadge = document.getElementById('chat-badge');
    if (chatBadge) { chatBadge.textContent = '0'; chatBadge.hidden = true; }

    // Mensaje de estado
    var status = document.getElementById('game-status');
    if (status) status.textContent = 'Colocá tus barcos para comenzar';
  }

  function handleGameFinished(winnerKey) {
    var gameContainer = document.getElementById('game-container');
    var endScreen = document.getElementById('end-screen');

    // Resetear toggle al finalizar partida
    if (gameContainer) gameContainer.classList.remove('--hiding-own');
    var toggleBtn = document.getElementById('btn-toggle-board');
    if (toggleBtn) {
      toggleBtn.hidden = true;
      toggleBtn.setAttribute('aria-pressed', 'false');
      toggleBtn.textContent = 'Ocultar mi tablero';
    }

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
        FirebaseGame.resetRoom(window.Game.roomId);
      }, { once: true });
    }
    if (btnExit) {
      btnExit.addEventListener('click', function () {
        clearSession();
        window.location.reload();
      }, { once: true });
    }
  }

  async function restoreGamePhase(data) {
    var homeScreen = document.getElementById('home-screen');
    var lobbyScreen = document.getElementById('lobby');
    var roomId = window.Game.roomId;
    var playerKey = window.Game.playerKey;

    if (data.status === 'waiting') {
      // Player1 waiting for player2
      hideScreen(homeScreen);
      showScreen(lobbyScreen);
      var codeDisplay = document.getElementById('room-code-display');
      var codeValue = document.getElementById('room-code-value');
      if (codeValue) codeValue.textContent = roomId;
      if (codeDisplay) codeDisplay.hidden = false;
      setLobbyStatus('Esperando oponente...', false);
      // Hide lobby form elements since we're already in a room
      var form = document.getElementById('join-form');
      var btn = document.getElementById('btn-create-room');
      var nameGroup = document.querySelector('.player-name-group');
      var divider = document.querySelector('.lobby-divider');
      var desc = document.querySelector('.lobby-description');
      if (form) form.hidden = true;
      if (btn) btn.hidden = true;
      if (nameGroup) nameGroup.hidden = true;
      if (divider) divider.hidden = true;
      if (desc) desc.hidden = true;
      FirebaseGame.listenRoom(roomId, {
        onPlayerJoined: function () {
          handleBothConnected();
        },
        onStatusChange: function () {}
      });

    } else if (data.status === 'placing') {
      hideScreen(homeScreen);
      handleBothConnected();
      if (data[playerKey] && data[playerKey].ready === true) {
        // Player already marked ready — hide placement, show waiting
        var placementPhase = document.getElementById('placement-phase');
        if (placementPhase) placementPhase.hidden = true;
        var status = document.getElementById('game-status');
        if (status) status.textContent = 'Fase de colocación completa — esperando al oponente...';
        FirebaseGame.listenRoom(roomId, {
          onPlayerJoined: function () {},
          onStatusChange: function (s) {
            if (s === 'placing') {
              var endScreen = document.getElementById('end-screen');
              if (endScreen && !endScreen.hidden) {
                handleReturnToPlacing();
              }
            }
          },
          onBothReady: handleBothReady,
          onTurnChange: handleTurnChange,
          onAttacksChange: handleAttacksChange,
          onGameFinished: function (winnerKey) { handleGameFinished(winnerKey); }
        });
      } else {
        // Player needs to re-place ships
        FirebaseGame.listenRoom(roomId, {
          onPlayerJoined: function () {},
          onStatusChange: function (s) {
            if (s === 'placing') {
              var endScreen = document.getElementById('end-screen');
              if (endScreen && !endScreen.hidden) {
                handleReturnToPlacing();
              }
            }
          },
          onBothReady: handleBothReady,
          onTurnChange: handleTurnChange,
          onAttacksChange: handleAttacksChange,
          onGameFinished: function (winnerKey) { handleGameFinished(winnerKey); }
        });
      }

    } else if (data.status === 'playing') {
      hideScreen(homeScreen);
      handleBothConnected();
      var placementPhase = document.getElementById('placement-phase');
      if (placementPhase) placementPhase.hidden = true;

      // Restore fleet state from Firebase
      if (data[playerKey] && data[playerKey].ships) {
        fleetState = data[playerKey].ships;
        Placement.renderShipsOnBoard(data[playerKey].ships);
      }

      // Process all existing attacks
      var attacksArr = data.attacks ? Object.values(data.attacks) : [];
      handleAttacksChange(attacksArr);

      // Show fleet status
      var fleetStatus = document.getElementById('fleet-status');
      if (fleetStatus) {
        fleetStatus.hidden = false;
        updateFleetPanels(attacksArr);
      }

      // Show turn indicator
      if (data.currentTurn) {
        handleTurnChange(data.currentTurn);
      }

      // Show toggle button
      var toggleBtn = document.getElementById('btn-toggle-board');
      if (toggleBtn && toggleBtn.hidden) {
        var isMobile = window.matchMedia('(max-width: 900px)').matches;
        toggleBtn.textContent = isMobile ? 'Mostrar mi tablero' : 'Ocultar mi tablero';
        toggleBtn.setAttribute('aria-label', isMobile ? 'Mostrar mi tablero' : 'Ocultar mi tablero');
        toggleBtn.hidden = false;
        toggleBtn.addEventListener('click', function () {
          var container = document.getElementById('game-container');
          var isHiding = container.classList.toggle('--hiding-own');
          toggleBtn.setAttribute('aria-pressed', isHiding ? 'true' : 'false');
          toggleBtn.textContent = isHiding ? 'Mostrar mi tablero' : 'Ocultar mi tablero';
          toggleBtn.setAttribute('aria-label', isHiding ? 'Mostrar mi tablero' : 'Ocultar mi tablero');
        });
      }

      // Register listener for ongoing game
      FirebaseGame.listenRoom(roomId, {
        onPlayerJoined: function () {},
        onStatusChange: function (s) {
          if (s === 'placing') {
            var endScreen = document.getElementById('end-screen');
            if (endScreen && !endScreen.hidden) {
              handleReturnToPlacing();
            }
          }
        },
        onBothReady: handleBothReady,
        onTurnChange: handleTurnChange,
        onAttacksChange: handleAttacksChange,
        onGameFinished: function (winnerKey) { handleGameFinished(winnerKey); }
      });

    } else if (data.status === 'finished') {
      hideScreen(homeScreen);
      handleBothConnected();

      // Restore fleet state and attacks for stats
      if (data[playerKey] && data[playerKey].ships) {
        fleetState = data[playerKey].ships;
      }

      handleGameFinished(data.winner);

      // Register listener for rematch — use no-op for onGameFinished
      // since we already called handleGameFinished above.
      // When rematch triggers, onReady registers a fresh listener with real callbacks.
      FirebaseGame.listenRoom(roomId, {
        onPlayerJoined: function () {},
        onStatusChange: function (s) {
          if (s === 'placing') {
            var endScreen = document.getElementById('end-screen');
            if (endScreen && !endScreen.hidden) {
              handleReturnToPlacing();
            }
          }
        },
        onBothReady: handleBothReady,
        onTurnChange: handleTurnChange,
        onAttacksChange: handleAttacksChange,
        onGameFinished: function () {}
      });
    }
  }

  function getFleetState() {
    return fleetState;
  }

  function initChat(roomId, myPlayerKey) {
    FirebaseGame.listenMessages(roomId, function (messages) {
      handleMessagesUpdate(messages, myPlayerKey);
    });

    var chatForm = document.getElementById('chat-form');
    if (chatForm) {
      chatForm.addEventListener('submit', function (e) {
        e.preventDefault();
        sendChatMessage(document.getElementById('chat-input'));
      });
    }

    var chatOverlayForm = document.getElementById('chat-overlay-form');
    if (chatOverlayForm) {
      chatOverlayForm.addEventListener('submit', function (e) {
        e.preventDefault();
        sendChatMessage(document.getElementById('chat-overlay-input'));
      });
    }

    var chatFab = document.getElementById('chat-fab');
    if (chatFab) {
      chatFab.addEventListener('click', function () {
        var overlay = document.getElementById('chat-overlay');
        if (overlay) overlay.hidden = false;
        _chatPanelOpen = true;
        _chatUnreadCount = 0;
        var badge = document.getElementById('chat-badge');
        if (badge) { badge.textContent = '0'; badge.hidden = true; }
        var overlayInput = document.getElementById('chat-overlay-input');
        if (overlayInput) overlayInput.focus();
      });
    }

    var btnCloseChat = document.getElementById('btn-close-chat');
    if (btnCloseChat) {
      btnCloseChat.addEventListener('click', function () {
        var overlay = document.getElementById('chat-overlay');
        if (overlay) overlay.hidden = true;
        _chatPanelOpen = false;
      });
    }

    var chatPanel = document.getElementById('chat-panel');
    if (chatPanel) chatPanel.hidden = false;

    var fab = document.getElementById('chat-fab');
    if (fab) fab.hidden = false;
  }

  function handleMessagesUpdate(messages, myPlayerKey) {
    var desktopContainer = document.getElementById('chat-messages');
    var mobileContainer = document.getElementById('chat-overlay-messages');

    if (!messages || messages.length === 0) {
      if (desktopContainer) desktopContainer.innerHTML = '';
      if (mobileContainer) mobileContainer.innerHTML = '';
      _chatUnreadCount = 0;
      _prevMsgCount = 0;
      var badge = document.getElementById('chat-badge');
      if (badge) { badge.textContent = '0'; badge.hidden = true; }
      return;
    }

    var html = '';
    messages.forEach(function (msg) {
      var isOwn = msg.playerKey === myPlayerKey;
      var senderText = isOwn ? 'Vos' : 'Rival';
      var msgClass = isOwn ? 'chat-msg chat-msg--own' : 'chat-msg chat-msg--rival';
      html += '<div class="' + msgClass + '">';
      html += '<span class="chat-msg-sender">' + senderText + '</span>';
      html += escapeHtml(msg.text);
      html += '</div>';
    });

    if (desktopContainer) {
      desktopContainer.innerHTML = html;
      desktopContainer.scrollTop = desktopContainer.scrollHeight;
    }
    if (mobileContainer) {
      mobileContainer.innerHTML = html;
      mobileContainer.scrollTop = mobileContainer.scrollHeight;
    }

    // Badge logic for mobile
    if (messages.length > _prevMsgCount && !_chatPanelOpen) {
      _chatUnreadCount += messages.length - _prevMsgCount;
      var badge = document.getElementById('chat-badge');
      if (badge) {
        badge.textContent = String(_chatUnreadCount);
        badge.hidden = false;
      }
    }
    _prevMsgCount = messages.length;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function sendChatMessage(inputEl) {
    var text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    FirebaseGame.sendMessage(window.Game.roomId, window.Game.playerKey, text);
  }

  function handleBothConnected() {
    var lobby = document.getElementById('lobby');
    var gameContainer = document.getElementById('game-container');
    hideScreen(lobby);
    showScreen(gameContainer);
    initChat(window.Game.roomId, window.Game.playerKey);
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

  document.addEventListener('DOMContentLoaded', async function () {
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

    // --- Reconnection: restore session after refresh ---
    var savedSession = loadSession();
    if (savedSession) {
      showSpinner();
      hideScreen(homeScreen);
      showScreen(lobbyScreen);
      try {
        var sess = savedSession;
        var reconnectResult = await FirebaseGame.reconnectRoom(sess.roomId, sess.playerId);

        // Restore identity
        window.Game.roomId = sess.roomId;
        window.Game.playerKey = reconnectResult.playerKey;
        window.Game.playerId = sess.playerId;
        window.Game.playerName = sess.playerName;
        if (playerNameInput) playerNameInput.value = sess.playerName || '';

        hideSpinner();
        await restoreGamePhase(reconnectResult.data);
      } catch (err) {
        clearSession();
        hideSpinner();
        // Show home screen normally
        hideScreen(lobbyScreen);
        showScreen(homeScreen);
      }
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
            if (result === 'miss') {
              var nextTurn = window.Game.playerKey === 'player1' ? 'player2' : 'player1';
              FirebaseGame.setTurn(window.Game.roomId, nextTurn);
            } else {
              // Hit sin victoria: el jugador conserva el turno
              _isMyTurn = true;
              if (enemyBoard) enemyBoard.classList.remove('board--disabled');
              popStatus('¡Impacto! Seguís atacando.');
            }
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
          saveSession(result.roomId, result.playerKey, playerId, window.Game.playerName);

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
          saveSession(result.roomId, result.playerKey, playerId, window.Game.playerName);
          hideSpinner();
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
