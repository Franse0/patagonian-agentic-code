# Feature: Sincronización de Estado en Tiempo Real via Firebase

## Feature Description
Implementar la sincronización completa del estado de juego entre ambos jugadores usando Firebase Realtime Database. Cuando un jugador marca "Listo" (con sus barcos colocados), el estado se escribe en Firebase; cuando ambos están listos, la partida inicia automáticamente en ambos clientes. Durante el combate, cada ataque se sincroniza en tiempo real: el tablero propio refleja los impactos recibidos y el tablero enemigo refleja los disparos propios. Un indicador visual claro muestra de quién es el turno. Al hundir toda la flota enemiga, el juego finaliza con pantalla de victoria/derrota.

## User Story
As a player
I want the game state to sync automatically with my opponent in real time
So that we can play Batalla Naval together without any manual refresh or coordination

## Problem Statement
Actualmente `onReady()` en `game.js` solo oculta la pantalla de colocación localmente pero **no escribe nada en Firebase**. Los barcos no se sincronizan, no hay detección de "ambos listos", no hay lógica de turnos, y los ataques no se transmiten. El juego es efectivamente unijugador después del lobby.

## Solution Approach
Extender `firebase-game.js` con tres funciones nuevas (`setPlayerReady`, `submitAttack`, callback extendido en `listenRoom`). Crear `js/ui.js` para encapsular la manipulación del DOM de la fase de combate. Actualizar `game.js` para orquestar la transición colocación → combate → fin. Agregar al HTML un indicador de turno y un overlay de fin de partida. Agregar al CSS los estilos de celdas impactadas, fallidas y hundidas.

El flujo completo:
1. Jugador presiona "Listo" → `setPlayerReady()` escribe ships + ready en Firebase
2. `listenRoom` detecta `status: "playing"` → ambos clientes inician fase de combate
3. Jugador en turno hace clic en celda enemiga → `submitAttack()` escribe ataque + voltea `currentTurn`
4. `onValue` dispara en ambos clientes → cada uno aplica el marcador (hit/miss) en el tablero correspondiente
5. Si todos los barcos del enemigo están hundidos → se escribe `winner` + `status: "finished"` → overlay de fin de partida

## Relevant Files

- `js/firebase-game.js` — agregar `setPlayerReady`, `submitAttack`; extender `listenRoom` con callbacks `onGameStart`, `onTurnChange`, `onAttackReceived`, `onGameEnd`; agregar import de `push`
- `js/game.js` — actualizar `onReady()` para llamar a Firebase; agregar `startPlayingPhase`, `handleAttackReceived`, `handleGameEnd`; agregar listeners de clics en tablero enemigo; llamar a `listenRoom` en `handleBothConnected`
- `index.html` — agregar `#turn-indicator`, `#waiting-opponent-msg`, `#game-over-overlay`
- `css/styles.css` — agregar `.cell--hit`, `.cell--miss`, `.cell--sunk`, `#turn-indicator`, `#game-over-overlay`, `.board--interactive`

### New Files
- `js/ui.js` — módulo ES6 con funciones de manipulación DOM para la fase de combate: `setTurnIndicator`, `markCell`, `setEnemyBoardInteractive`, `showGameOver`, `hideGameOver`

## Implementation Plan

### Phase 1: Foundation
Agregar los elementos HTML necesarios para el combate (indicador de turno, mensaje de espera, overlay de fin de partida). Agregar las clases CSS para estados de celdas impactadas/fallidas/hundidas, el indicador de turno y el overlay. Crear el esqueleto de `js/ui.js` con las funciones exportadas.

### Phase 2: Core Implementation
Extender `firebase-game.js`:
- `setPlayerReady(roomId, playerKey, ships)` — escribe `{playerKey}/ships` y `{playerKey}/ready: true`; luego lee el estado de la sala para verificar si ambos jugadores están listos; si es así, escribe `status: "playing"` y `currentTurn: "player1"`
- `submitAttack(roomId, attackerKey, cellId, result)` — hace `push` a `rooms/{roomId}/attacks` con `{ cell, attackerKey, result }`; escribe el nuevo `currentTurn` (el jugador contrario); si `result === "sunk-all"`, escribe `winner` y `status: "finished"`
- `listenRoom` extendido — el callback único de `onValue` detecta cambios en `status`, `currentTurn` y `attacks` y dispara las callbacks correspondientes: `onGameStart(data)`, `onTurnChange(currentTurn)`, `onAttackReceived(newAttacks)`, `onGameEnd(winner)`

Implementar `js/ui.js`:
- `setTurnIndicator(isMyTurn)` — cambia el texto e la clase del `#turn-indicator`
- `markCell(boardPrefix, cellId, result)` — agrega clase `.cell--hit`, `.cell--miss` o `.cell--sunk` a la celda correspondiente; `boardPrefix` es `""` para el tablero propio, `"enemy-"` para el tablero enemigo
- `setEnemyBoardInteractive(enabled)` — agrega/quita clase `.board--interactive` en `#enemy-board`
- `showGameOver(didWin)` — muestra el overlay `#game-over-overlay` con texto de victoria o derrota
- `hideGameOver()` — oculta el overlay

### Phase 3: Integration
Actualizar `game.js`:
- `onReady()` — llamar a `FirebaseGame.setPlayerReady(roomId, playerKey, fleetState)`; deshabilitar botón "Listo"; mostrar `#waiting-opponent-msg`
- `handleBothConnected()` — después de la transición de pantallas, instalar listener completo con todos los callbacks de la fase de combate (reemplaza el listener de lobby)
- `startPlayingPhase(data)` — ocultar `#placement-phase` y `#waiting-opponent-msg`; mostrar indicador de turno; llamar `UI.setEnemyBoardInteractive(currentTurn === playerKey)`; adjuntar listeners de clic a celdas del tablero enemigo
- `onEnemyCellClick(cellId)` — verificar que es el turno del jugador y que la celda no fue atacada; determinar resultado (hit/miss/sunk) comparando `cellId` contra `cachedEnemyShips`; llamar `FirebaseGame.submitAttack()`
- `handleAttackReceived(attacks)` — procesar solo ataques nuevos (usando un `Set` de claves ya procesadas); si el atacante es el jugador local, marcar celda en tablero enemigo; si el atacante es el oponente, marcar celda en tablero propio; verificar si todos los barcos del jugador local están hundidos
- `handleGameEnd(winner)` — llamar `UI.showGameOver(winner === playerKey)`

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Agregar HTML: indicador de turno, mensaje de espera y overlay de fin
- En `index.html`, dentro de `<header>`, agregar después de `#game-status`:
  ```html
  <div id="turn-indicator" hidden></div>
  ```
- En `#player-column`, después de `#placement-phase`, agregar:
  ```html
  <div id="waiting-opponent-msg" hidden>Esperando al oponente...</div>
  ```
- Antes de `</body>`, agregar el overlay:
  ```html
  <div id="game-over-overlay" hidden>
    <div class="game-over-card">
      <h2 id="game-over-title"></h2>
      <p id="game-over-subtitle"></p>
    </div>
  </div>
  ```
- Agregar `<script type="module" src="js/ui.js"></script>` antes del cierre de `<body>`
- Verificar que el HTML es válido visualmente en el navegador

### 2) Agregar CSS: celdas impactadas, indicador de turno, overlay
- En `css/styles.css`, agregar las variables CSS nuevas en `:root`:
  ```css
  --color-hit: rgba(231, 76, 60, 0.85);
  --color-miss: rgba(200, 214, 229, 0.35);
  --color-sunk: rgba(192, 57, 43, 1);
  ```
- Agregar clases de celda:
  ```css
  .cell--hit { background: var(--color-hit); }
  .cell--miss { background: var(--color-miss); }
  .cell--sunk { background: var(--color-sunk); }
  ```
- Agregar estilos para el indicador de turno (`#turn-indicator`) con variantes `.turn--mine` (color primary, negrita) y `.turn--opponent` (color text, opacidad reducida)
- Agregar estilos para `.board--interactive .cell:hover` (feedback visual cuando es el turno)
- Agregar `pointer-events: none` a `.board:not(.board--interactive) .cell` para bloquear clics
- Agregar estilos para `#game-over-overlay` (overlay oscuro fullscreen) y `.game-over-card` (tarjeta centrada)
- Agregar estilo para `#waiting-opponent-msg` (texto en color primario, animación pulse opcional)
- Verificar estilos en el navegador: hit/miss deben ser visibles

### 3) Crear `js/ui.js`
- Crear módulo ES6 vacío con `export const UI = { ... }`
- Implementar `setTurnIndicator(isMyTurn)`:
  - Obtiene `#turn-indicator`; si `hidden`, lo muestra
  - Establece `textContent`: "Tu turno" o "Turno del oponente"
  - Alterna clases `.turn--mine` / `.turn--opponent`
- Implementar `markCell(boardPrefix, cellId, result)`:
  - Construye el ID del elemento: `boardPrefix + cellId` (ej: `"enemy-cell-A1"`)
  - Quita clases anteriores `.cell--hit`, `.cell--miss`, `.cell--sunk`
  - Agrega la clase correspondiente al `result`
- Implementar `setEnemyBoardInteractive(enabled)`:
  - Obtiene `#enemy-board`
  - Si `enabled`: agrega `.board--interactive`; si no: quita `.board--interactive`
- Implementar `showGameOver(didWin)`:
  - Obtiene `#game-over-overlay`, `#game-over-title`, `#game-over-subtitle`
  - Establece texto según `didWin`; quita `hidden`
- Implementar `hideGameOver()`: agrega `hidden` al overlay
- Verificar que el módulo no genera errores en consola al cargar

### 4) Extender `firebase-game.js`: `setPlayerReady`
- Agregar import de `push` en la línea de importaciones firebase
- Implementar `async function setPlayerReady(roomId, playerKey, ships)`:
  - `update(ref(db, rooms/${roomId}/${playerKey}), { ready: true, ships })`
  - Luego `get(ref(db, rooms/${roomId}))` para leer el estado actual
  - Si `data.player1.ready && data.player2.ready`:
    - `update(ref(db, rooms/${roomId}), { status: 'playing', currentTurn: 'player1' })`
- Exportar en `FirebaseGame`
- Verificar en Firebase console que los campos `ready` y `ships` aparecen al marcar "Listo"

### 5) Extender `firebase-game.js`: `submitAttack`
- Implementar `async function submitAttack(roomId, attackerKey, cellId, result)`:
  - `push(ref(db, rooms/${roomId}/attacks), { cell: cellId, attackerKey, result })`
  - Determinar el otro jugador: `const nextTurn = attackerKey === 'player1' ? 'player2' : 'player1'`
  - `update(ref(db, rooms/${roomId}), { currentTurn: nextTurn })`
  - Si `result === 'finished'`: `update(ref(db, rooms/${roomId}), { winner: attackerKey, status: 'finished' })`
- Exportar en `FirebaseGame`
- Verificar en Firebase console que los ataques se escriben como nodos con pushId

### 6) Extender `firebase-game.js`: callbacks de fase de combate en `listenRoom`
- Modificar `listenRoom(roomId, callbacks)` para que el handler de `onValue` también dispare:
  - `callbacks.onGameStart(data)` cuando `data.status === 'playing'` y `callbacks.onGameStart` existe (solo una vez, agregar flag `_gameStarted`)
  - `callbacks.onTurnChange(data.currentTurn)` cuando `data.currentTurn` cambia (usar variable local `_lastTurn`)
  - `callbacks.onAttackReceived(data.attacks)` cuando `data.attacks` existe y tiene claves nuevas
  - `callbacks.onGameEnd(data.winner)` cuando `data.status === 'finished'` y `callbacks.onGameEnd` existe
- Reset de las variables de estado (`_gameStarted`, `_lastTurn`) dentro de `destroy()` y al inicio de `listenRoom`
- Verificar que los callbacks no se disparan múltiples veces innecesariamente

### 7) Actualizar `game.js`: `onReady()` con Firebase sync
- En `onReady()`, después de obtener `fleetState`:
  - Llamar `await FirebaseGame.setPlayerReady(window.Game.roomId, window.Game.playerKey, fleetState)`
  - Mostrar `#waiting-opponent-msg` (quitar `hidden`)
  - Deshabilitar el botón `#btn-ready`
  - Actualizar `#game-status` con "Barcos sincronizados. Esperando al oponente..."
- Manejar errores de Firebase con un mensaje en `#game-status`

### 8) Actualizar `game.js`: instalar listener completo en `handleBothConnected`
- En `handleBothConnected()`, después de mostrar `#game-container`, llamar a `FirebaseGame.listenRoom(window.Game.roomId, { ... })` con todos los callbacks:
  - `onPlayerJoined`: no-op (ya están conectados)
  - `onStatusChange`: no-op (reemplazado por los callbacks específicos)
  - `onGameStart(data)`: llama a `startPlayingPhase(data)`
  - `onTurnChange(currentTurn)`: llama a `handleTurnChange(currentTurn)`
  - `onAttackReceived(attacks)`: llama a `handleAttackReceived(attacks)`
  - `onGameEnd(winner)`: llama a `handleGameEnd(winner)`
- Notar que para player2, `handleBothConnected` se llama en el `try` del join; ahí también debe instalarse el listener

### 9) Implementar `startPlayingPhase` en `game.js`
- Función `startPlayingPhase(data)`:
  - Ocultar `#placement-phase` (`hidden = true`)
  - Ocultar `#waiting-opponent-msg` (`hidden = true`)
  - Cachear el estado de la sala en una variable local `_roomState = data`
  - Llamar `UI.setTurnIndicator(data.currentTurn === window.Game.playerKey)`
  - Llamar `UI.setEnemyBoardInteractive(data.currentTurn === window.Game.playerKey)`
  - Adjuntar listeners de clic a todas las celdas del tablero enemigo (excepto las de label): `document.querySelectorAll('#enemy-board .cell').forEach(cell => cell.addEventListener('click', () => onEnemyCellClick(cell.id.replace('enemy-', ''))))`
- Guardar conjunto `_attackedCells = new Set()` y `_processedAttackKeys = new Set()` en el scope del módulo

### 10) Implementar `onEnemyCellClick` en `game.js`
- Función `onEnemyCellClick(cellId)`:
  - Si `_currentTurn !== window.Game.playerKey`, return (no es mi turno)
  - Si `_attackedCells.has(cellId)`, return (ya atacada)
  - Determinar la clave del enemigo: `const enemyKey = window.Game.playerKey === 'player1' ? 'player2' : 'player1'`
  - Obtener barcos del enemigo desde `_roomState[enemyKey].ships`
  - Determinar resultado: iterar los barcos; si `cellId` está en las celdas del barco, `result = 'hit'`; si no, `result = 'miss'`
  - Verificar si el barco está completamente hundido: si todos sus celdas han sido atacadas + este hit
  - Si todos los barcos enemigos están hundidos: `result = 'finished'`
  - Agregar `cellId` a `_attackedCells`
  - Llamar `await FirebaseGame.submitAttack(roomId, playerKey, cellId, result)`
  - Deshabilitar inmediatamente el tablero enemigo (`UI.setEnemyBoardInteractive(false)`) para evitar doble clic

### 11) Implementar `handleAttackReceived` en `game.js`
- Función `handleAttackReceived(attacks)`:
  - Si `attacks` es null/undefined, return
  - Iterar las entradas de `attacks` (es un objeto Firebase con pushIds como claves)
  - Para cada entrada cuya clave NO esté en `_processedAttackKeys`:
    - Agregar la clave a `_processedAttackKeys`
    - Si `attack.attackerKey === window.Game.playerKey`:
      - Marcar celda en tablero enemigo: `UI.markCell('enemy-', attack.cell, attack.result === 'finished' ? 'hit' : attack.result)`
    - Si `attack.attackerKey !== window.Game.playerKey`:
      - Marcar celda en tablero propio: `UI.markCell('', attack.cell, attack.result === 'finished' ? 'hit' : attack.result)`
      - Agregar `attack.cell` a `_attackedCells` (para que el jugador sepa qué fue atacado)

### 12) Implementar `handleTurnChange` y `handleGameEnd` en `game.js`
- Función `handleTurnChange(currentTurn)`:
  - Actualizar `_currentTurn = currentTurn`
  - `UI.setTurnIndicator(currentTurn === window.Game.playerKey)`
  - `UI.setEnemyBoardInteractive(currentTurn === window.Game.playerKey)`
- Función `handleGameEnd(winner)`:
  - `UI.setEnemyBoardInteractive(false)`
  - `UI.showGameOver(winner === window.Game.playerKey)`

### 13) Final Validation
- Ejecutar todos los `Validation Commands` para asegurar cero regresiones.

## Testing Strategy

### Manual Testing
1. **Flujo completo**: Abrir dos pestañas del navegador → crear sala en una, unirse en la otra → ambas colocan barcos → ambas presionan "Listo" → verificar que la partida inicia automáticamente en ambas pestañas
2. **Indicador de turno**: Verificar que "Tu turno" aparece solo en la pestaña correcta; verificar que las celdas del tablero enemigo solo son clickeables cuando es el turno del jugador
3. **Ataques**: Hacer clic en celda del enemigo → verificar marcador en tablero enemigo de la pestaña atacante Y marcador en tablero propio de la pestaña defensora; verificar que el turno cambia
4. **Hit vs Miss**: Atacar celda con barco (hit) → debe aparecer en rojo; atacar celda vacía (miss) → debe aparecer en blanco/gris
5. **Fin de partida**: Hundir todos los barcos del oponente → verificar overlay de victoria en la pestaña ganadora y overlay de derrota en la pestaña perdedora
6. **Reconexión**: Cerrar y reabrir una pestaña durante el juego → verificar que el estado se restaura desde Firebase

### Automated Tests
No aplica: el proyecto no usa un framework de testing. Las pruebas son manuales.

### Edge Cases
- **Doble clic**: El mismo jugador intenta atacar dos veces antes de que Firebase responda → `_attackedCells` previene el doble ataque
- **Clic en turno ajeno**: El tablero enemigo no debe responder → validación de `_currentTurn` en `onEnemyCellClick`
- **Player2 sin listener**: Player2 no llama `listenRoom` en el flujo actual → asegurarse de llamarlo en `handleBothConnected`
- **Firebase race condition en `setPlayerReady`**: Ambos jugadores presionan "Listo" simultáneamente → ambos leen "un solo listo", ambos escriben `status: "playing"`; como Firebase es transaccional en escrituras simples, el segundo update es idempotente
- **Red lenta**: Los ataques pueden llegar con delay; la UI solo actualiza cuando Firebase confirma, no de forma optimista
- **Barcos en Firebase**: Verificar que el formato de `getFleetState()` (de `placement.js`) es serializable a JSON y que las celdas se pueden comparar por string con los `cellId` del tablero

## Acceptance Criteria
- Al presionar "Listo", los barcos y el estado `ready: true` aparecen en Firebase Realtime Database
- Cuando ambos jugadores presionan "Listo", la partida inicia automáticamente en ambas pestañas sin recarga
- El campo `currentTurn` en Firebase determina quién puede atacar; el tablero enemigo es interactivo solo en el turno correcto
- Los ataques aparecen en tiempo real en ambos tableros (menos de 2 segundos en red local)
- El indicador de turno muestra "Tu turno" / "Turno del oponente" correctamente
- Al hundir todos los barcos del oponente, aparece el overlay de fin de partida en ambas pestañas
- No hay regresiones en el flujo de lobby (crear sala, unirse, mostrar código)

## Validation Commands
- `python -m http.server 8000` — iniciar servidor de desarrollo en http://localhost:8000
- Abrir http://localhost:8000 en dos pestañas del navegador y ejecutar el flujo completo manualmente

## Notes
- `getFleetState()` de `placement.js` retorna un objeto; verificar su estructura exacta antes de escribirlo en Firebase y antes de comparar celdas en `onEnemyCellClick`. Si las celdas están en formato `{ carrier: { cells: ['A1', ...] } }` o similar, adaptar la lógica de hit/miss.
- El campo `attacks` en Firebase es un nodo de lista (objeto con pushIds como claves), no un array JS. Iterar con `Object.entries(attacks)` en el listener.
- No usar transacciones Firebase para `setPlayerReady`; la race condition es benigna (el segundo write de `status: "playing"` es idempotente).
- `ui.js` se carga como módulo ES6; importarlo desde `game.js` con `import { UI } from './ui.js'`.
- No modificar `js/firebase-config.js`.
