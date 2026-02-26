# Bug Fix: Botón Revancha No Reinicia La Partida

## Bug Description
Al terminar una partida, el botón "Revancha" ejecuta `window.location.reload()`, comportamiento idéntico al botón "Salir". Ambos jugadores regresan al lobby de forma independiente sin mantener su sala compartida. La revancha real debe reiniciar el estado de la sala en Firebase para que ambos jugadores puedan colocar sus barcos nuevamente sin abandonar la sala.

## Steps to Reproduce
1. Dos jugadores se conectan a la misma sala y completan una partida hasta la pantalla de fin
2. Uno (o ambos) jugadores presionan "Revancha" en la pantalla de fin
Result: La página se recarga, el jugador vuelve al lobby solo, pierde la conexión con su oponente
Expected: Ambos jugadores regresan a la fase de colocación de barcos en la misma sala sin recargar la página

## Root Cause
En `js/game.js` (función `handleGameFinished`), el handler de `btn-rematch` llama a `window.location.reload()`, idéntico al handler de `btn-exit`:

```js
if (btnRematch) {
  btnRematch.addEventListener('click', function () {
    window.location.reload(); // ← BUG: igual que salir
  });
}
```

Adicionalmente:
1. No existe `resetRoom()` en `js/firebase-game.js` para reiniciar el estado de la sala en Firebase
2. El callback `onStatusChange` en el listener configurado por `onReady()` es una función vacía (`function () {}`), por lo que el oponente (quien no presionó "Revancha") nunca detecta el cambio de estado `"finished"` → `"placing"`
3. El estado interno del listener en `listenRoom` (`_gameFinished`, `_lastTurn`, `_lastAttacksLen`) no se reinicia para la nueva partida cuando la sala vuelve a `"placing"`

## Solution Approach
1. Agregar `resetRoom(roomId)` en `firebase-game.js` que escribe el estado de sala reseteado en Firebase con `update` atómico
2. En `listenRoom`, detectar la transición `"finished"` → `"placing"` y reiniciar el estado interno del listener para que la siguiente partida funcione correctamente
3. En `game.js`, agregar `handleReturnToPlacing()` que transiciona ambos clientes de vuelta a la fase de colocación limpiando el DOM de combate sin rellamar `bindEvents()` (evitando duplicado de listeners)
4. Conectar todo: `btnRematch` llama a `resetRoom()`; `onStatusChange` del listener existente detecta el status `"placing"` cuando `end-screen` es visible y llama a `handleReturnToPlacing()`

Este enfoque resuelve la causa raíz porque: el jugador que presiona Revancha resetea Firebase; ambos clientes detectan el cambio vía sus listeners activos (ya configurados por `onReady()`); y ambos transicionan a colocación de forma independiente sin recargar la página.

## Relevant Files
Archivos a modificar para esta corrección de bug:

- **`js/firebase-game.js`**: Agregar función `resetRoom()` y lógica de reset interno en `listenRoom` para manejar la transición revancha
- **`js/game.js`**: Cambiar handler de `btnRematch`, agregar `handleReturnToPlacing()`, actualizar `onStatusChange` en el listener de `onReady()`

## Implementation Plan
### Phase 1: Investigation
Verificar el bug leyendo el código afectado y trazando el flujo completo:
- `handleGameFinished` en `game.js`
- `listenRoom` en `firebase-game.js`
- Estado interno del listener: `_gameFinished`, `_lastTurn`, `_lastAttacksLen`
- El módulo `Placement` y su función `clearAllPlacements()` para el reset del tablero

### Phase 2: Fix Implementation
Implementar los cambios en el orden correcto: primero Firebase, luego la lógica del juego.

### Phase 3: Verification
Simular el flujo de revancha verificando que:
- El estado de Firebase se resetea correctamente
- Ambos clientes transicionan a colocación
- La segunda partida funciona completa sin problemas
- El botón "Salir" conserva su comportamiento original

## Step-by-Step Tasks
IMPORTANTE: Ejecutar cada paso en orden, de arriba a abajo.

### 1) Agregar `resetRoom()` a `firebase-game.js`

- Agregar la siguiente función `async` antes de `getRoomData`:
  ```js
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
  ```
- Agregar `resetRoom` al objeto exportado `FirebaseGame` al final del archivo
- Verificar que `update` y `ref` ya están importados en la línea 4

### 2) Actualizar `listenRoom` para manejar estado de revancha

- Al inicio del callback `onValue`, antes de los checks existentes, agregar la detección de revancha:
  ```js
  // Revancha: si el juego terminó y el status vuelve a 'placing', reiniciar estado interno
  if (_gameFinished && data.status === 'placing') {
    _gameFinished = false;
    _lastTurn = null;
    _lastAttacksLen = -1;
  }
  ```
- Verificar que el bloque va ANTES de los checks de `onBothReady`, `onTurnChange`, `onAttacksChange` y `onGameFinished`

### 3) Agregar `handleReturnToPlacing()` en `game.js`

- Agregar la función antes de `handleGameFinished`:
  ```js
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

    // Mensaje de estado
    var status = document.getElementById('game-status');
    if (status) status.textContent = 'Colocá tus barcos para comenzar';
  }
  ```

### 4) Actualizar `handleGameFinished()` — reemplazar handler de `btnRematch`

- En `handleGameFinished`, reemplazar el handler de `btnRematch` (actualmente `window.location.reload()`) por llamada a `resetRoom`:
  ```js
  if (btnRematch) {
    btnRematch.addEventListener('click', function () {
      FirebaseGame.resetRoom(window.Game.roomId);
    }, { once: true });
  }
  ```
- Agregar también `{ once: true }` al handler de `btnExit` para evitar acumulación de listeners en múltiples partidas:
  ```js
  if (btnExit) {
    btnExit.addEventListener('click', function () {
      window.location.reload();
    }, { once: true });
  }
  ```

### 5) Actualizar `onStatusChange` en el listener de `onReady()`

- En la función `onReady()`, dentro de la llamada a `FirebaseGame.listenRoom(...)`, cambiar el callback `onStatusChange` de función vacía a:
  ```js
  onStatusChange: function (status) {
    if (status === 'placing') {
      var endScreen = document.getElementById('end-screen');
      if (endScreen && !endScreen.hidden) {
        handleReturnToPlacing();
      }
    }
  },
  ```
- El guard `!endScreen.hidden` asegura que esto solo se ejecuta cuando estamos en la pantalla de fin (revancha), no en la transición inicial de "waiting" → "placing"

### 6) Final Validation
- Ejecutar todos los `Validation Commands` para asegurar que el bug está corregido y hay cero regresiones.

## Testing Strategy
### Bug Reproduction Test
Antes de aplicar la corrección, verificar el comportamiento actual:
- Abrir el juego en dos pestañas, completar una partida, presionar "Revancha" → ambas pestañas recargan la página y vuelven al lobby separadas

### Fix Verification
Después de los cambios, verificar el flujo completo:
1. Dos jugadores completan una partida
2. Jugador 1 presiona "Revancha"
3. Verificar en Firebase console que el estado de la sala se resetea (`status: "placing"`, `attacks: null`, etc.)
4. Verificar que ambas pestañas transicionan a la fase de colocación sin recargar
5. Ambos jugadores colocan sus barcos y presionan "Listo"
6. El combate inicia correctamente como una nueva partida
7. Verificar que se puede jugar la segunda partida completa incluyendo nueva pantalla de fin

### Regression Testing
- Verificar que el botón "Salir" sigue recargando la página
- Verificar que el flujo completo de una partida nueva (sin revancha) sigue funcionando normalmente
- Verificar que la mecánica de ataques, turnos y victoria funciona en la segunda partida
- Verificar que el historial de ataques y paneles de flota se muestran correctamente en la segunda partida (sin datos de la primera)

## Acceptance Criteria
- Al presionar "Revancha", el estado de la sala en Firebase se resetea a `status: "placing"` con ships, attacks, winner y currentTurn limpiados
- Ambos clientes (quien presionó Revancha y su oponente) transicionan automáticamente a la fase de colocación
- El tablero propio no muestra hit/miss/sunk de la partida anterior
- El tablero enemigo no muestra ataques de la partida anterior
- Los paneles de flota, historial, indicador de turno se ocultan correctamente
- La segunda partida funciona completa: colocación → combate → victoria → pantalla de fin
- El botón "Salir" mantiene su comportamiento actual (`window.location.reload()`)
- No se acumulan event listeners duplicados al jugar múltiples revancha seguidas

## Validation Commands
Ejecutar cada comando para validar que el bug está corregido con cero regresiones.

- `python -m http.server 8000` — iniciar servidor de desarrollo en localhost:8000
- Abrir `http://localhost:8000` en dos pestañas/ventanas para simular dos jugadores
- Jugar una partida completa y verificar el flujo de "Revancha" manualmente

## Notes
- La función `handleReturnToPlacing()` limpia las clases de combate del DOM directamente en vez de llamar `Placement.init()` para evitar el problema de listeners duplicados: `bindEvents()` agrega listeners a `btn-orientation`, `btn-random` y `.ship-item` que persisten entre partidas
- `{ once: true }` en los handlers de `btnRematch` y `btnExit` previene que se acumulen listeners adicionales si `handleGameFinished` se llama múltiples veces
- Si solo un jugador presiona "Revancha" y el otro ya salió, la sala queda en estado `"placing"` sin consecuencias: no hay oponente que escuche, y la sala eventualmente queda huérfana
- La detección de revancha en `onStatusChange` usa el guard `!endScreen.hidden` para diferenciarlo de la transición inicial `"waiting"` → `"placing"` (cuando player2 se une por primera vez)
- La implementación ya está en los archivos modificados `js/firebase-game.js` y `js/game.js`
