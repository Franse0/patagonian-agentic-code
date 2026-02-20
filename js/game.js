/* game.js — Main game controller for Batalla Naval */

import { FirebaseGame } from './firebase-game.js';

(function () {
  'use strict';

  var fleetState = null;
  var playerId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

  function onReady() {
    fleetState = Placement.getFleetState();

    var placementPhase = document.getElementById('placement-phase');
    if (placementPhase) placementPhase.hidden = true;

    var status = document.getElementById('game-status');
    if (status) status.textContent = 'Barcos colocados. Esperando oponente...';
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
