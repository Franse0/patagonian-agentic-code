/* firebase-game.js — Firebase lobby & room management for Batalla Naval */

import { db } from './firebase-config.js';
import { ref, set, update, get, onValue, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let _unsubscribe = null;
let _lastTurn = null;
let _lastAttacksLen = -1;
let _roomData = null;

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
  const roomRef = ref(db, `rooms/${roomId}`);
  _unsubscribe = onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    _roomData = data;
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

async function setTurn(roomId, nextTurn) {
  await update(ref(db), { [`rooms/${roomId}/currentTurn`]: nextTurn });
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

export const FirebaseGame = { createRoom, joinRoom, listenRoom, destroy, syncReadyState, registerAttack, startGame, setTurn, getRoomData };
