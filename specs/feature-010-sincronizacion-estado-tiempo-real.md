# Feature: Sincronización de Estado en Tiempo Real

## Feature Description
Conectar ambos clientes del juego a través de Firebase Realtime Database para sincronizar las fases de "Listo", el inicio automático de la partida, los turnos de ataque y los impactos recibidos. Cuando un jugador presiona "Listo", su flota se escribe en Firebase. Cuando ambos están listos, la partida arranca sola. Cada ataque del oponente aparece en el tablero propio en menos de 1 segundo, y el indicador de turno se actualiza en tiempo real sin recargar la página.

## User Story
As a player connected to a room
I want the game state (ready status, attacks, turn changes) to sync automatically with my opponent's browser
So that I can play a full game in real time without any manual refresh

## Problem Statement
Actualmente `game.js` guarda el estado de la flota solo en memoria local. `onReady()` oculta el panel de colocación pero no escribe nada en Firebase, por lo que el oponente no se entera de que el jugador está listo. No existe mecanismo para arrancar la partida, alternar turnos ni reflejar ataques del oponente en el tablero propio. Sin esta sincronización el juego es solo local.

## Solution Approach
Extender el módulo `firebase-game.js` ya existente con tres nuevas funciones:
1. `syncReadyState(ships)` — escribe flota y flag `ready` del jugador local en Firebase
2. `listenRoom(callbacks)` extendido — detecta `onBothReady`, `onTurnChange` y `onAttacksChange` además del `onPlayerJoined` ya existente
3. `registerAttack(cellId, result)` — escribe un ataque del jugador local en Firebase

Conectar estas funciones desde `game.js`: al presionar "Listo" se llama a `syncReadyState`, el listener detecta cuando ambos están listos y arranca el juego, los clics en el tablero enemigo llaman a `registerAttack`, y los ataques recibidos se pintan en el tablero propio.

## Relevant Files
- `js/firebase-game.js` — módulo Firebase ya existente; se le agregan `syncReadyState`, `registerAttack` y se extiende `listenRoom` con los nuevos callbacks
- `js/game.js` — controlador principal; se extiende `onReady()` con la llamada a Firebase y se añaden los handlers `handleBothReady`, `handleTurnChange`, `handleAttacksChange` y el listener de clics en el tablero enemigo
- `index.html` — agregar `#turn-indicator` en el header y habilitar tabindex/aria en las celdas del tablero enemigo para soporte de teclado durante el combate
- `css/styles.css` — agregar estilos para `#turn-indicator`, `.turn-indicator--active`, `.cell--hit-received`, `.cell--miss-received`, `.cell--attacked` (ataque propio: hit/miss en tablero enemigo) y el estado deshabilitado del tablero enemigo

## Implementation Plan
### Phase 1: Foundation
Agregar el elemento `#turn-indicator` al HTML y preparar las custom CSS properties para los colores de combate. Verificar que `window.Game.roomId`, `window.Game.playerKey` y `window.Game.playerId` están disponibles antes de que se necesiten (ya expuestos por game.js).

### Phase 2: Core Implementation
Implementar en `firebase-game.js`:
- `syncReadyState(ships)`: escribe `player{N}/ships` y `player{N}/ready: true` con `update()` en Firebase
- Extender `listenRoom()`: dentro del `onValue` existente, despachar `onBothReady`, `onTurnChange`, `onAttacksChange` según el snapshot recibido; mantener estado local (`_lastStatus`, `_lastTurn`, `_lastAttacksLen`) para evitar disparos redundantes
- `registerAttack(cellId, result)`: hace `push()` a `rooms/{roomId}/attacks` con `{ cell, playerId: _playerKey, result, timestamp }`
- Lógica de arranque: solo `player1` escribe `status: "playing"` y `currentTurn: "player1"` cuando detecta `onBothReady` (evita race condition)

### Phase 3: Integration
En `game.js`:
- `onReady()`: llama `FirebaseGame.syncReadyState(fleetState)` y luego `FirebaseGame.listenRoom({onBothReady, onTurnChange, onAttacksChange})`
- `handleBothReady()`: actualiza `#game-status` a "¡La partida comenzó!"
- `handleTurnChange(isMyTurn)`: muestra `#turn-indicator`, habilita/deshabilita el tablero enemigo, actualiza clase `.turn-indicator--active`
- `handleAttacksChange(attacks)`: filtra ataques del oponente, pinta `.cell--hit-received` / `.cell--miss-received` en `#player-board`
- Listener de clics en `#enemy-board`: solo activo cuando es el turno del jugador; determina hit/miss comparando `cellId` con los ships del oponente (disponibles en el snapshot de Firebase vía variable de cierre `_roomData`), llama `FirebaseGame.registerAttack(cellId, result)` y pinta `.cell--attacked--hit` / `.cell--attacked--miss` en el tablero enemigo localmente

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Agregar `#turn-indicator` al HTML y custom properties CSS
- En `index.html`, dentro de `<header>`, después de `#game-status`, agregar:
  ```html
  <div id="turn-indicator" role="status" aria-live="polite" hidden></div>
  ```
- En `css/styles.css`, bajo `:root`, agregar las custom properties de combate:
  ```css
  --color-hit: #e74c3c;
  --color-miss: #5d6d7e;
  --color-hit-received: rgba(231, 76, 60, 0.6);
  --color-miss-received: rgba(93, 109, 126, 0.45);
  ```
- Verificar en el navegador que el elemento existe pero está oculto (sin afectar el layout del header)

### 2) Agregar estilos CSS de combate
- En `css/styles.css`, agregar las reglas de combate:
  ```css
  /* Turn indicator */
  #turn-indicator {
    margin-top: 0.35rem;
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--color-text);
    transition: color 0.2s;
  }
  #turn-indicator.turn-indicator--active {
    color: var(--color-primary);
  }

  /* Combat cell states — enemy board (attacker's view) */
  .cell--attacked--hit  { background: var(--color-hit);  cursor: default; }
  .cell--attacked--miss { background: var(--color-miss); cursor: default; }

  /* Combat cell states — player board (defender's view) */
  .cell--hit-received  { background: var(--color-hit-received);  }
  .cell--miss-received { background: var(--color-miss-received); }

  /* Enemy board disabled during opponent's turn */
  #enemy-board.board--disabled { pointer-events: none; opacity: 0.6; }

  @media (prefers-reduced-motion: reduce) {
    #turn-indicator { transition: none; }
  }
  ```
- Verificar que no hay colisiones de nombres con clases existentes (`.cell--preview`, `.cell--invalid`, `.cell--ship`)

### 3) Implementar `syncReadyState` en `firebase-game.js`
- Añadir import de `update` (ya importado) y `push` desde Firebase SDK — actualizar la línea de imports:
  ```js
  import { ref, set, update, get, onValue, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
  ```
- Agregar variable de módulo `_playerKey` (string: `"player1"` o `"player2"`) y `_roomId`; serán seteadas por una nueva función `init(roomId, playerKey)` o recibidas como parámetros
- Implementar `syncReadyState(roomId, playerKey, ships)`:
  ```js
  async function syncReadyState(roomId, playerKey, ships) {
    const updates = {};
    updates[`rooms/${roomId}/${playerKey}/ships`] = ships;
    updates[`rooms/${roomId}/${playerKey}/ready`] = true;
    await update(ref(db), updates);
  }
  ```
- Verificar en Firebase Console tras presionar "Listo" que aparecen `ships` y `ready: true` bajo el nodo del jugador

### 4) Extender `listenRoom` con callbacks adicionales
- Agregar variables de estado local para detectar cambios reales y evitar disparos innecesarios:
  ```js
  let _lastStatus = null;
  let _lastTurn = null;
  let _lastAttacksLen = -1;
  ```
- Dentro del callback de `onValue` en `listenRoom`, tras el `onPlayerJoined` existente, agregar:
  ```js
  // onBothReady — solo si ambos ready y status aún "placing"
  if (data.player1?.ready && data.player2?.ready && data.status === 'placing') {
    if (callbacks.onBothReady) callbacks.onBothReady(data);
  }
  // onTurnChange — solo cuando cambia currentTurn
  if (data.currentTurn && data.currentTurn !== _lastTurn) {
    _lastTurn = data.currentTurn;
    if (callbacks.onTurnChange) callbacks.onTurnChange(data.currentTurn);
  }
  // onAttacksChange — solo cuando crece el array
  const attacksArr = data.attacks ? Object.values(data.attacks) : [];
  if (attacksArr.length !== _lastAttacksLen) {
    _lastAttacksLen = attacksArr.length;
    if (callbacks.onAttacksChange) callbacks.onAttacksChange(attacksArr);
  }
  // Guardar roomData para acceso externo (ataques)
  _roomData = data;
  ```
- Agregar variable de módulo `let _roomData = null;` y función pública `getRoomData()` que la retorna
- Verificar con dos pestañas que los callbacks se disparan al hacer cambios manuales en Firebase Console

### 5) Implementar `registerAttack` en `firebase-game.js`
- Agregar función:
  ```js
  async function registerAttack(roomId, playerKey, cellId, result) {
    const attacksRef = ref(db, `rooms/${roomId}/attacks`);
    await push(attacksRef, {
      cell: cellId,
      playerId: playerKey,
      result: result,
      timestamp: Date.now()
    });
  }
  ```
- Actualizar la exportación del módulo: `export const FirebaseGame = { createRoom, joinRoom, listenRoom, destroy, syncReadyState, registerAttack, getRoomData };`
- Verificar en Firebase Console que al llamar `FirebaseGame.registerAttack(...)` desde DevTools aparece el ataque bajo `rooms/{roomId}/attacks`

### 6) Lógica de arranque automático en `game.js` — `handleBothReady`
- En `game.js`, añadir función `handleBothReady(data)`:
  ```js
  function handleBothReady(data) {
    var status = document.getElementById('game-status');
    if (status) status.textContent = '¡La partida comenzó!';
    // Solo player1 escribe el estado inicial para evitar race condition
    if (window.Game.playerKey === 'player1') {
      var updates = {};
      updates['rooms/' + window.Game.roomId + '/status'] = 'playing';
      updates['rooms/' + window.Game.roomId + '/currentTurn'] = 'player1';
      // Importar update desde firebase-game.js no es posible directamente;
      // exponer una función startGame() desde firebase-game.js en su lugar
      FirebaseGame.startGame(window.Game.roomId);
    }
  }
  ```
- Agregar `startGame(roomId)` en `firebase-game.js`:
  ```js
  async function startGame(roomId) {
    const updates = {};
    updates[`rooms/${roomId}/status`] = 'playing';
    updates[`rooms/${roomId}/currentTurn`] = 'player1';
    await update(ref(db), updates);
  }
  ```
- Verificar que cuando ambos presionan "Listo", Firebase muestra `status: "playing"` y `currentTurn: "player1"` una sola vez

### 7) Indicador de turno — `handleTurnChange` en `game.js`
- Añadir variable de módulo `var _isMyTurn = false;`
- Añadir función `handleTurnChange(currentTurn)`:
  ```js
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
  ```
- Verificar alternando `currentTurn` en Firebase Console que el indicador cambia en ambas pestañas

### 8) Reflejar ataques recibidos — `handleAttacksChange` en `game.js`
- Añadir función `handleAttacksChange(attacks)`:
  ```js
  function handleAttacksChange(attacks) {
    var opponentKey = window.Game.playerKey === 'player1' ? 'player2' : 'player1';
    var opponentAttacks = attacks.filter(function(a) { return a.playerId === opponentKey; });
    opponentAttacks.forEach(function(attack) {
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
  ```
- Verificar escribiendo un ataque manualmente en Firebase Console que la celda correspondiente del tablero propio cambia de color

### 9) Listener de clics en tablero enemigo — combate en `game.js`
- En `DOMContentLoaded`, añadir listener en el tablero enemigo (después del init de placement):
  ```js
  var enemyBoard = document.getElementById('enemy-board');
  if (enemyBoard) {
    enemyBoard.addEventListener('click', function(e) {
      if (!_isMyTurn) return;
      var cell = e.target.closest('.cell');
      if (!cell) return;
      // Ignorar celdas ya atacadas
      if (cell.classList.contains('cell--attacked--hit') || cell.classList.contains('cell--attacked--miss')) return;

      // Extraer cellId: 'enemy-cell-A1' → 'A1'
      var rawId = cell.id.replace('enemy-cell-', ''); // rawId = 'A1'

      // Determinar hit/miss: buscar en ships del oponente
      var roomData = FirebaseGame.getRoomData();
      var opponentKey = window.Game.playerKey === 'player1' ? 'player2' : 'player1';
      var opponentShips = roomData && roomData[opponentKey] && roomData[opponentKey].ships;
      var isHit = false;
      if (opponentShips) {
        Object.values(opponentShips).forEach(function(cellList) {
          if (cellList && cellList.indexOf('cell-' + rawId) !== -1) isHit = true;
        });
      }
      var result = isHit ? 'hit' : 'miss';

      // Pintar celda localmente (feedback inmediato)
      cell.classList.add(isHit ? 'cell--attacked--hit' : 'cell--attacked--miss');

      // Deshabilitar turno local hasta que Firebase confirme el cambio
      _isMyTurn = false;
      enemyBoard.classList.add('board--disabled');

      // Escribir ataque en Firebase
      FirebaseGame.registerAttack(window.Game.roomId, window.Game.playerKey, rawId, result)
        .then(function() {
          // Alternar turno en Firebase: solo el atacante escribe el siguiente turno
          var nextTurn = window.Game.playerKey === 'player1' ? 'player2' : 'player1';
          FirebaseGame.setTurn(window.Game.roomId, nextTurn);
        });
    });
  }
  ```
- Agregar `setTurn(roomId, nextTurn)` en `firebase-game.js`:
  ```js
  async function setTurn(roomId, nextTurn) {
    await update(ref(db), { [`rooms/${roomId}/currentTurn`]: nextTurn });
  }
  ```
- Actualizar el export de `FirebaseGame` para incluir `startGame`, `setTurn`, `getRoomData`
- Verificar con dos pestañas que al hacer clic en el tablero enemigo, el ataque aparece en Firebase y el turno cambia

### 10) Conectar todo en `onReady()` de `game.js`
- Reemplazar el cuerpo de `onReady()`:
  ```js
  function onReady() {
    fleetState = Placement.getFleetState();
    var placementPhase = document.getElementById('placement-phase');
    if (placementPhase) placementPhase.hidden = true;
    var status = document.getElementById('game-status');
    if (status) status.textContent = 'Esperando que el oponente esté listo...';

    FirebaseGame.syncReadyState(window.Game.roomId, window.Game.playerKey, fleetState)
      .then(function() {
        FirebaseGame.listenRoom(window.Game.roomId, {
          onPlayerJoined: function() {},   // ya manejado en lobby; no-op aquí
          onStatusChange: function() {},
          onBothReady: handleBothReady,
          onTurnChange: handleTurnChange,
          onAttacksChange: handleAttacksChange
        });
      })
      .catch(function() {
        if (status) status.textContent = 'Error al conectar con Firebase. Jugando en local.';
      });
  }
  ```
- Verificar el flujo completo con dos pestañas: lobby → colocación → ambos "Listo" → partida arranca → turnos → ataques reflejados

### 11) Final Validation
- Ejecutar todos los `Validation Commands` para asegurar cero regresiones.

## Testing Strategy
### Manual Testing
- Abrir `http://localhost:8000` en dos pestañas
- Pestaña A crea sala, pestaña B se une → ambas muestran `#game-container`
- Ambas colocan barcos (manual o "Aleatorio") → presionan "Listo"
- Verificar en Firebase Console: `player1/ready: true`, `player1/ships: {...}`, ídem para player2
- Verificar que `status` cambia a `"playing"` y `currentTurn: "player1"` exactamente una vez
- Pestaña A (player1) hace clic en celda del tablero enemigo → celda se pinta inmediatamente → Firebase muestra el ataque → pestaña B pinta la celda correspondiente en su tablero propio
- Pestaña B puede atacar solo después de que turno cambia a player2
- Alternar `currentTurn` manualmente en Firebase Console → indicador cambia en tiempo real en ambas pestañas
- Verificar que el tablero enemigo queda deshabilitado (`board--disabled`) cuando no es el turno

### Automated Tests
No hay test runner configurado (vanilla JS sin build). Funciones puras candidatas para futuros tests:
- Hit/miss detection: dada una celda y un objeto `ships`, determinar `'hit'` o `'miss'`
- `handleAttacksChange`: verificar que no repite clases en celdas ya marcadas

### Edge Cases
- **Firebase no configurado**: `syncReadyState` lanza excepción → capturada en `.catch()` de `onReady()`; el flujo local (placement) sigue sin errores
- **Clic doble en celda**: verificar que la segunda llamada es ignorada (la celda ya tiene `.cell--attacked--hit` o `--miss`)
- **Race condition en arranque**: solo `player1` escribe `status: "playing"`; si ambos llegan a `onBothReady` simultáneamente, Firebase aplica la escritura una sola vez
- **Pestaña cerrada antes del arranque**: el listener queda huérfano; `destroy()` debe limpiarlo si se rehúsa el lobby (`onDisconnect` queda como mejora futura)
- **Ataques fuera de orden en Firebase**: ordenar `attacks` por `timestamp` antes de aplicar `handleAttacksChange`
- **`attacks` en Firebase como objeto, no array**: Firebase convierte arrays con `push()` a objetos con claves autogeneradas → usar `Object.values(data.attacks)` consistentemente
- **Mobile (375px)**: `#turn-indicator` debe ser legible; verificar en DevTools → responsive mode
- **`prefers-reduced-motion`**: ya cubierto en el CSS del paso 2

## Acceptance Criteria
- Al presionar "Listo", `player{N}/ready: true` y `player{N}/ships: {...}` aparecen en Firebase en menos de 2 segundos
- Cuando ambos jugadores están listos, ambas UIs muestran "¡La partida comenzó!" sin recargar la página y `status` cambia a `"playing"` exactamente una vez
- `#turn-indicator` muestra "Tu turno" o "Turno del oponente" en tiempo real, actualizándose cada vez que `currentTurn` cambia en Firebase
- El tablero enemigo solo responde a clics cuando es el turno del jugador local; en turno ajeno tiene clase `board--disabled`
- Un ataque del oponente se refleja en el tablero propio como `.cell--hit-received` (rojo) o `.cell--miss-received` (gris) en menos de 1 segundo
- Un ataque propio en el tablero enemigo pinta `.cell--attacked--hit` (rojo) o `.cell--attacked--miss` (gris) con feedback inmediato antes de la confirmación de Firebase
- `FirebaseGame.destroy()` cancela el listener sin dejar conexiones abiertas (verificable en DevTools → Network → WS)
- Cero errores en DevTools → Console durante el flujo completo (lobby → placement → combat)

## Validation Commands
- `python -m http.server 8000` — servidor local requerido para módulos ES6
- Abrir `http://localhost:8000` en dos pestañas y ejecutar el flujo completo (lobby → colocación → listo → combate)
- DevTools → Console en ambas pestañas: verificar **cero errores JS** durante todo el flujo
- Firebase Console → Realtime Database → `rooms/{roomId}`: verificar estructura `status: "playing"`, `currentTurn`, `attacks`
- DevTools → Network → WS: verificar que cada pestaña tiene **una sola conexión Firebase activa**

## Notes
- **`firebase-game.js` ya existe**: el plan extiende el módulo existente, no lo reemplaza. Las funciones `createRoom`, `joinRoom`, `listenRoom` y `destroy` se mantienen sin cambios excepto por la extensión del callback de `onValue` en `listenRoom`.
- **`attacks` como objeto en Firebase**: `push()` genera claves tipo `-OPqrs...`; siempre usar `Object.values(data.attacks || {})` para convertir a array antes de procesar.
- **`playerKey` disponible en `window.Game`**: `game.js` ya expone `window.Game.playerKey` y `window.Game.roomId` desde la fase de lobby; estos valores se usan directamente en los handlers de combate.
- **Race condition mitigada**: solo `player1` escribe `status: "playing"` y el primer turno. Si se necesita robustez adicional, una Firebase Transaction es la mejora futura correcta.
- **Condición de victoria**: queda fuera del alcance de esta feature. Se evaluará en una feature posterior comparando el total de ataques acertados con el tamaño de la flota enemiga.
- **`onDisconnect`**: no implementado aquí. Si un jugador cierra la pestaña durante el combate, la sala queda en estado inconsistente; se resuelve en una issue de manejo de desconexiones.
- **SDK Firebase v10.7.1**: mismo CDN que el resto de los módulos; agregar `push` al import existente en `firebase-game.js`.
