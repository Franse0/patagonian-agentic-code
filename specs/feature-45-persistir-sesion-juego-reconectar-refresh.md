# Feature: Persistir sesión del juego y reconectar tras refresh

## Feature Description
Actualmente, cuando un jugador recarga la pestaña del navegador durante una partida, pierde completamente su sesión: se genera un nuevo `playerId` aleatorio, `window.Game.roomId` y `window.Game.playerKey` quedan en `null`, y el jugador es devuelto a la pantalla de inicio sin posibilidad de recuperar la partida. Esta feature implementa la persistencia de sesión mediante `localStorage` y la lógica de reconexión automática al cargar la página, de modo que el jugador pueda continuar exactamente donde lo dejó.

## User Story
As a jugador activo en una partida
I want que al recargar el navegador la página me reconecte automáticamente a mi sala
So that no pierda el progreso de la partida ni tenga que recordar y reingresar el código de sala manualmente

## Problem Statement
La sesión del juego es completamente volátil (almacenada solo en `window.Game`). Un refresh o cierre accidental de la pestaña destruye la identidad del jugador (`playerId`), la referencia a la sala (`roomId`) y su rol en ella (`playerKey`). No existe ningún mecanismo de reconexión.

## Solution Approach
1. **Persistir la sesión en `localStorage`** al momento de crear o unirse a una sala, guardando `{ roomId, playerKey, playerId, playerName }`.
2. **Al cargar la página** (`DOMContentLoaded`), verificar si existe una sesión guardada y, si existe, intentar reconectarse silenciosamente a Firebase.
3. **Validar la sesión** contra Firebase: la sala debe existir y el `playerId` almacenado debe coincidir con el `id` del slot (`player1` o `player2`) en la base de datos.
4. **Restaurar la fase correcta** según el `status` actual de la sala en Firebase: lobby de espera, colocación, combate o pantalla de fin de juego.
5. **Limpiar la sesión** cuando el jugador sale voluntariamente (botón "Salir").

## Relevant Files
- `js/firebase-game.js` — Se agrega la función `reconnectRoom(roomId, playerId)` que valida que el jugador pertenece a la sala y devuelve la snapshot del estado actual.
- `js/game.js` — Se agrega la orquestación de reconexión en `DOMContentLoaded`, los handlers de restauración de fase, y las llamadas para guardar/limpiar la sesión.
- `index.html` — Se agrega el `<script type="module">` para importar `session.js`.

### New Files
- `js/session.js` — Módulo con `saveSession()`, `loadSession()` y `clearSession()` que encapsulan el acceso a `localStorage`.

## Implementation Plan
### Phase 1: Foundation
Crear la capa de persistencia (`session.js`) y la función Firebase de reconexión (`reconnectRoom`).

### Phase 2: Core Implementation
Implementar la lógica de reconexión en `game.js`: detectar sesión guardada al iniciar, validarla contra Firebase, y restaurar la UI según la fase del juego.

### Phase 3: Integration
Conectar la reconexión con los flujos existentes: guardar sesión al crear/unirse a sala, limpiar al salir, y asegurar que los listeners de Firebase se registren correctamente tras reconexión.

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Crear js/session.js — módulo de persistencia

- Crear `js/session.js` con la clave de localStorage `'batallaNaval_session'`.
- Exportar `saveSession(roomId, playerKey, playerId, playerName)` que guarda un objeto JSON.
- Exportar `loadSession()` que parsea y devuelve el objeto guardado o `null` si no existe o está malformado.
- Exportar `clearSession()` que elimina la clave de localStorage.

```js
// js/session.js
const SESSION_KEY = 'batallaNaval_session';

export function saveSession(roomId, playerKey, playerId, playerName) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId, playerKey, playerId, playerName }));
  } catch (_) {}
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && s.roomId && s.playerKey && s.playerId) return s;
    return null;
  } catch (_) { return null; }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
}
```

- Verificar que el módulo no tiene dependencias circulares.

### 2) Agregar reconnectRoom a firebase-game.js

- Importar `get` y `ref` desde Firebase SDK (ya están importados, verificar).
- Agregar la función `async function reconnectRoom(roomId, playerId)`:
  - Hacer `get` de `rooms/${roomId}`.
  - Si el snapshot no existe: lanzar `Error('Sala no encontrada')`.
  - Determinar `playerKey`: si `data.player1?.id === playerId` → `'player1'`, si `data.player2?.id === playerId` → `'player2'`, si no coincide → lanzar `Error('Jugador no encontrado en la sala')`.
  - Retornar `{ roomId, playerKey, data }` (incluir la snapshot completa para restaurar fase).
- Agregar `reconnectRoom` al objeto exportado `FirebaseGame`.

### 3) Importar session.js en game.js

- En la sección de imports al inicio de `game.js`, agregar:
  ```js
  import { saveSession, loadSession, clearSession } from './session.js';
  ```
- Verificar que el archivo usa `type="module"` (ya lo hace, confirmado en `index.html`).

### 4) Guardar sesión al crear o unirse a sala

- En el handler del botón `btn-create-room` (game.js ~línea 676), tras setear `window.Game.roomId` y `window.Game.playerKey`, llamar:
  ```js
  saveSession(window.Game.roomId, window.Game.playerKey, window.Game.playerId, window.Game.playerName);
  ```
- En el handler del formulario `join-form` (game.js ~línea 710), tras setear `window.Game.roomId` y `window.Game.playerKey`, llamar igualmente a `saveSession(...)`.

### 5) Limpiar sesión al salir

- En el listener del botón `btn-exit` (game.js ~línea 494), antes de `window.location.reload()`:
  ```js
  clearSession();
  window.location.reload();
  ```

### 6) Implementar lógica de reconexión en DOMContentLoaded

Añadir al inicio de `DOMContentLoaded` (antes de la navegación de home→lobby) un bloque de reconexión asíncrona:

```js
// --- Reconexión automática ---
const savedSession = loadSession();
if (savedSession) {
  showSpinner(); // reutilizar spinner existente
  try {
    const { roomId, playerKey, playerId: savedPlayerId, playerName } = savedSession;
    const { data } = await FirebaseGame.reconnectRoom(roomId, savedPlayerId);

    // Restaurar identidad
    window.Game.roomId = roomId;
    window.Game.playerKey = playerKey;
    window.Game.playerId = savedPlayerId;  // usar el playerId guardado
    window.Game.playerName = playerName;
    if (playerNameInput) playerNameInput.value = playerName || '';

    hideSpinner();
    await restoreGamePhase(data);
  } catch (err) {
    clearSession();
    hideSpinner();
    // Mostrar home screen normalmente
  }
}
```

**Nota importante sobre `playerId`:** La variable `playerId` se genera al inicio de `game.js` (línea ~42). Para que la reconexión funcione, se debe sobrescribir `window.Game.playerId` con el valor guardado, de modo que la identidad sea consistente con Firebase.

### 7) Implementar restoreGamePhase(data)

Agregar la función `async function restoreGamePhase(data)` en game.js con el siguiente árbol de decisión:

#### status === 'waiting' (player1 esperando a player2)
- Mostrar lobby (`showScreen(lobbyScreen)`, `hideScreen(homeScreen)`).
- Mostrar el código de sala en `#room-code-display` y `#room-code-value`.
- Mostrar mensaje "Esperando oponente...".
- Registrar listener `FirebaseGame.listenRoom(roomId, { onPlayerJoined: handleBothConnected, ... })`.

#### status === 'placing' (fase de colocación)
- Llamar `handleBothConnected()` para ir al game-container.
- Si `data[playerKey].ready === false`: mostrar placement-phase normalmente; el jugador deberá re-colocar sus barcos (ships en Firebase ya es null en este estado).
- Si `data[playerKey].ready === true`: ocultar placement-phase, mostrar mensaje "Esperando al oponente...". Registrar listener completo con `onBothReady`, `onTurnChange`, `onAttacksChange`, `onGameFinished`.

#### status === 'playing' (combate en curso)
- Llamar `handleBothConnected()`.
- Ocultar `#placement-phase`.
- Restaurar `fleetState` desde `data[playerKey].ships`.
- Renderizar barcos propios en `#player-board` llamando a `Placement.renderShipsOnBoard(data[playerKey].ships)` (ver nota abajo).
- Mostrar `#fleet-status` con `updateFleetPanels(attacksArr)`.
- Procesar todos los ataques: recorrer `data.attacks` y aplicar clases CSS en ambos tableros (`handleAttacksChange(attacksArr)`).
- Mostrar `#turn-indicator` y configurar `_isMyTurn` vía `handleTurnChange(data.currentTurn)`.
- Mostrar `#btn-toggle-board`.
- Registrar listener `FirebaseGame.listenRoom(...)` con todos los callbacks activos.

#### status === 'finished' (partida terminada)
- Llamar `handleBothConnected()` para entrar al game-container.
- Luego llamar `handleGameFinished(data.winner)` para mostrar la end-screen con las estadísticas correctas.
- No limpiar la sesión aquí (el jugador puede querer hacer revancha).
- Limpiar sesión en el listener de "Salir".

### 8) Agregar Placement.renderShipsOnBoard (si no existe)

En `js/game.js` o `js/placement.js`, verificar si existe una función que dibuje barcos en el tablero del jugador a partir de un mapa de ships `{ shipId: ['cell-A1', ...] }`. Si no existe, agregar en el módulo Placement:

```js
function renderShipsOnBoard(ships) {
  if (!ships) return;
  Object.values(ships).forEach(function (cellList) {
    cellList.forEach(function (cellId) {
      var el = document.getElementById(cellId.replace('cell-', 'cell-'));
      // El ID en el HTML es 'cell-A1', así que cellId ya tiene ese formato
      var cellEl = document.getElementById(cellId);
      if (cellEl) cellEl.classList.add('cell--ship');
    });
  });
}
```

Exponer como `Placement.renderShipsOnBoard`.

### 9) Importar session.js en index.html

- Verificar que `index.html` carga los módulos JS. El módulo `game.js` ya lo importa, y `session.js` se importará desde `game.js`, así que no se necesita agregar un tag extra en index.html.
- (Solo si el bundler/browser requiere importación explícita, agregar `<script type="module" src="js/session.js"></script>` como precaución).

### 10) Final Validation
- Ejecutar todos los `Validation Commands` para asegurar cero regresiones.

## Testing Strategy
### Manual Testing

**Escenario 1 — Refresh en lobby de espera (player1):**
1. Abrir juego, ingresar nombre, crear sala → aparece código.
2. Recargar la pestaña.
3. Verificar que la página muestra el lobby con el mismo código de sala y "Esperando oponente...".
4. Unir player2 desde otra pestaña → la partida debe continuar normalmente a fase de colocación.

**Escenario 2 — Refresh en fase de colocación (antes de "Listo"):**
1. Ambos jugadores en sala. Player1 está colocando barcos.
2. Player1 recarga.
3. Verificar que player1 ve el game-container con placement-phase visible y puede re-colocar barcos.
4. Ambos hacen "Listo" → combate normal.

**Escenario 3 — Refresh en fase de colocación (después de "Listo"):**
1. Player1 hace clic en "Listo". Player2 no ha terminado.
2. Player1 recarga.
3. Verificar que player1 ve game-container sin placement-phase, con mensaje "Esperando al oponente...".
4. Player2 hace "Listo" → combate comienza para ambos.

**Escenario 4 — Refresh durante combate:**
1. Partida en curso, varios ataques realizados.
2. Player que no es su turno recarga.
3. Verificar que: tableros tienen todos los ataques marcados correctamente, panel de flota refleja estado real, indicador de turno es correcto, puede seguir jugando normalmente.

**Escenario 5 — Refresh en pantalla de fin de juego:**
1. Partida terminada, se muestra end-screen.
2. Un jugador recarga.
3. Verificar que se muestra la end-screen con resultado correcto.
4. Hacer revancha → placement funciona normal.

**Escenario 6 — Salir y volver:**
1. Jugador hace clic en "Salir" (que hace reload).
2. Verificar que la sesión fue limpiada y se muestra la home screen (sin reconexión).

**Escenario 7 — Sala expirada:**
1. Jugador tiene sesión guardada de una sala que ya no existe en Firebase.
2. Recargar.
3. Verificar que se muestra la home screen normalmente (sin error visible al usuario).

### Automated Tests
No aplica (proyecto sin suite de tests automatizados).

### Edge Cases
- **Sala expirada o borrada**: `reconnectRoom` lanza error → `clearSession()` → home screen.
- **playerId no coincide** (intento de robo de sesión): `reconnectRoom` lanza error → `clearSession()` → home screen.
- **localStorage no disponible** (modo privado extremo): el `try/catch` en session.js evita crash; la app funciona normalmente sin persistencia.
- **Dos tabs abiertas con el mismo jugador**: el listener de Firebase es el mismo; actualizar en una tab se reflejará en la otra. No se requiere acción adicional.
- **Refresh justo cuando se hace revancha** (status='placing' por segunda vez): el flujo de reconexión detecta 'placing' y actúa igual que en el escenario 2 o 3 según el `ready` del jugador.
- **Red lenta**: el spinner debe mantenerse visible hasta que `reconnectRoom` resuelva o falle.

## Acceptance Criteria
- Al recargar durante la fase de **espera en lobby**, el jugador vuelve al lobby con su código de sala visible.
- Al recargar durante la fase de **colocación** (ready=false), el jugador vuelve a la fase de colocación y puede re-colocar sus barcos.
- Al recargar durante la fase de **colocación** (ready=true), el jugador vuelve al estado "esperando oponente" sin placement-phase.
- Al recargar durante el **combate**, todos los ataques previos se muestran en los tableros, el turno es correcto y el jugador puede continuar jugando.
- Al recargar en la **pantalla de fin de juego**, se muestra la end-screen con el resultado correcto.
- Al hacer clic en **"Salir"**, la sesión se limpia y el reload lleva a la home screen (sin reconexión).
- Si la sesión guardada es **inválida** (sala inexistente o playerId erróneo), la app muestra la home screen normalmente sin errores visibles.
- No hay regresiones en los flujos existentes: crear sala, unirse a sala, colocación, combate, fin de juego, revancha.

## Validation Commands
```bash
# Iniciar servidor de desarrollo
python -m http.server 8000

# Abrir en navegador:
# http://localhost:8000

# Prueba de reconexión:
# Abrir DevTools → Application → Local Storage
# Verificar que 'batallaNaval_session' se crea al unirse/crear sala
# Verificar que se elimina al hacer clic en "Salir"
# Verificar reconexión en cada fase del juego (ver Testing Strategy)
```

## Notes
- **No se persisten los barcos pre-colocación** (antes de "Listo"): si el jugador refresh antes de marcar ready, debe re-colocar sus barcos. Esto es aceptable porque sus barcos no han sido enviados a Firebase aún.
- **`playerId` guardado vs generado**: al reconectar, `window.Game.playerId` se sobreescribe con el valor guardado. La variable local `playerId` en el closure de game.js sigue siendo el valor generado en la carga, pero `window.Game.playerId` (que es el que se usa en los handlers de Firebase) tendrá el valor correcto.
- **Sin nuevas dependencias**: solo se usa `localStorage` nativo.
- **Mejora futura posible**: agregar expiración de sesión (TTL) para evitar reconectar a salas muy antiguas. Por ahora, Firebase lanza error si la sala no existe y eso es suficiente.
