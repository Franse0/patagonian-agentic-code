/* firebase-game.js — Firebase lobby & room management for Batalla Naval */

import { db } from './firebase-config.js';
import { ref, set, update, get, onValue, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let _unsubscribe = null;

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
  if (data.player2 !== null) {
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

async function setPlayerReady(roomId, playerKey, ships) {
  await update(ref(db, `rooms/${roomId}/${playerKey}`), { ready: true, ships });
  const snapshot = await get(ref(db, `rooms/${roomId}`));
  const data = snapshot.val();
  if (data.player1?.ready && data.player2?.ready) {
    await update(ref(db, `rooms/${roomId}`), { status: 'playing', currentTurn: 'player1' });
  }
}

async function submitAttack(roomId, attackerKey, cellId, result) {
  await push(ref(db, `rooms/${roomId}/attacks`), { cell: cellId, attackerKey, result });
  const nextTurn = attackerKey === 'player1' ? 'player2' : 'player1';
  await update(ref(db, `rooms/${roomId}`), { currentTurn: nextTurn });
  if (result === 'finished') {
    await update(ref(db, `rooms/${roomId}`), { winner: attackerKey, status: 'finished' });
  }
}

function listenRoom(roomId, callbacks) {
  destroy();
  let _gameStarted = false;
  let _lastTurn = null;
  let _lastAttackCount = 0;
  const roomRef = ref(db, `rooms/${roomId}`);
  _unsubscribe = onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    if (data.player1?.id && data.player2?.id && callbacks.onPlayerJoined) {
      callbacks.onPlayerJoined(data);
    }
    if (callbacks.onStatusChange) {
      callbacks.onStatusChange(data.status);
    }
    if (data.status === 'playing' && !_gameStarted && callbacks.onGameStart) {
      _gameStarted = true;
      callbacks.onGameStart(data);
    }
    if (data.currentTurn && data.currentTurn !== _lastTurn) {
      _lastTurn = data.currentTurn;
      if (callbacks.onTurnChange) callbacks.onTurnChange(data.currentTurn);
    }
    if (data.attacks && callbacks.onAttackReceived) {
      const attackKeys = Object.keys(data.attacks);
      if (attackKeys.length > _lastAttackCount) {
        _lastAttackCount = attackKeys.length;
        callbacks.onAttackReceived(data.attacks);
      }
    }
    if (data.status === 'finished' && data.winner && callbacks.onGameEnd) {
      callbacks.onGameEnd(data.winner);
    }
  });
}

function destroy() {
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
}

export const FirebaseGame = { createRoom, joinRoom, listenRoom, setPlayerReady, submitAttack, destroy };
