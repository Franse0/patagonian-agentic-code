/* firebase-game.js — Firebase lobby & room management for Batalla Naval */

import { db } from './firebase-config.js';
import { ref, set, update, get, onValue, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let _unsubscribe = null;
let _lastTurn = null;
let _lastAttacksLen = -1;
let _roomData = null;
let _gameFinished = false;

function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

async function createRoom(playerId) {
  const roomId = generateRoomId();
  await set(ref(db, `rooms/${roomId}`), {
    status: 'waiting',
    player1: { id: playerId, ready: false, ships: null },
    player2: null,
    currentTurn: null,
    attacks: [],
    winner: null
  });
  return { roomId, playerKey: 'player1' };
}

async function joinRoom(roomId, playerId) {
  const snapshot = await get(ref(db, `rooms/${roomId}`));
  if (!snapshot.exists()) {
    throw new Error('Sala no encontrada');
  }
  const data = snapshot.val();
  if (data.status !== 'waiting') {
    throw new Error('La sala no está disponible');
  }
  if (data.player2 && data.player2.id) {
    throw new Error('La sala ya está completa');
  }
  await update(ref(db, `rooms/${roomId}`), {
    'player2/id': playerId,
    'player2/ready': false,
    'player2/ships': null,
    status: 'placing'
  });
  return { roomId, playerKey: 'player2' };
}

function listenRoom(roomId, callbacks) {
  destroy();
  _lastTurn = null;
  _lastAttacksLen = -1;
  _roomData = null;
  _gameFinished = false;
  const roomRef = ref(db, `rooms/${roomId}`);
  _unsubscribe = onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    _roomData = data;
    // Revancha: si el juego terminó y el status vuelve a 'placing', reiniciar estado interno
    if (_gameFinished && data.status === 'placing') {
      _gameFinished = false;
      _lastTurn = null;
      _lastAttacksLen = -1;
    }
    if (data.player1?.id && data.player2?.id && callbacks.onPlayerJoined) {
      callbacks.onPlayerJoined(data);
    }
    if (callbacks.onStatusChange) {
      callbacks.onStatusChange(data.status);
    }
    // onBothReady — only when both ready and status is still "placing"
    if (data.player1?.ready && data.player2?.ready && data.status === 'placing') {
      if (callbacks.onBothReady) callbacks.onBothReady(data);
    }
    // onTurnChange — only when currentTurn actually changes
    if (data.currentTurn && data.currentTurn !== _lastTurn) {
      _lastTurn = data.currentTurn;
      if (callbacks.onTurnChange) callbacks.onTurnChange(data.currentTurn);
    }
    // onAttacksChange — only when attacks array grows
    const attacksArr = data.attacks ? Object.values(data.attacks) : [];
    if (attacksArr.length !== _lastAttacksLen) {
      _lastAttacksLen = attacksArr.length;
      if (callbacks.onAttacksChange) callbacks.onAttacksChange(attacksArr);
    }
    // onGameFinished — only once when status becomes 'finished'
    if (data.status === 'finished' && data.winner && !_gameFinished) {
      _gameFinished = true;
      if (callbacks.onGameFinished) callbacks.onGameFinished(data.winner);
    }
  });
}

async function syncReadyState(roomId, playerKey, ships) {
  const updates = {};
  updates[`rooms/${roomId}/${playerKey}/ships`] = ships;
  updates[`rooms/${roomId}/${playerKey}/ready`] = true;
  await update(ref(db), updates);
}

async function startGame(roomId) {
  const updates = {};
  updates[`rooms/${roomId}/status`] = 'playing';
  updates[`rooms/${roomId}/currentTurn`] = 'player1';
  await update(ref(db), updates);
}

async function registerAttack(roomId, playerKey, cellId, result) {
  const attacksRef = ref(db, `rooms/${roomId}/attacks`);
  await push(attacksRef, {
    cell: cellId,
    playerId: playerKey,
    result: result,
    timestamp: Date.now()
  });
}

async function setWinner(roomId, winnerKey) {
  const roomRef = ref(db, `rooms/${roomId}`);
  await update(roomRef, { winner: winnerKey, status: 'finished' });
}

async function setTurn(roomId, nextTurn) {
  await update(ref(db), { [`rooms/${roomId}/currentTurn`]: nextTurn });
}

async function resetRoom(roomId) {
  const updates = {};
  updates[`rooms/${roomId}/status`] = 'placing';
  updates[`rooms/${roomId}/attacks`] = null;
  updates[`rooms/${roomId}/winner`] = null;
  updates[`rooms/${roomId}/currentTurn`] = null;
  updates[`rooms/${roomId}/player1/ready`] = false;
  updates[`rooms/${roomId}/player2/ready`] = false;
  updates[`rooms/${roomId}/player1/ships`] = null;
  updates[`rooms/${roomId}/player2/ships`] = null;
  await update(ref(db), updates);
}

async function reconnectRoom(roomId, playerId) {
  const snapshot = await get(ref(db, `rooms/${roomId}`));
  if (!snapshot.exists()) {
    throw new Error('Sala no encontrada');
  }
  const data = snapshot.val();
  let playerKey;
  if (data.player1 && data.player1.id === playerId) {
    playerKey = 'player1';
  } else if (data.player2 && data.player2.id === playerId) {
    playerKey = 'player2';
  } else {
    throw new Error('Jugador no encontrado en la sala');
  }
  return { roomId, playerKey, data };
}

function getRoomData() {
  return _roomData;
}

function destroy() {
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
}

export const FirebaseGame = { createRoom, joinRoom, listenRoom, destroy, syncReadyState, registerAttack, startGame, setTurn, setWinner, getRoomData, resetRoom, reconnectRoom };
