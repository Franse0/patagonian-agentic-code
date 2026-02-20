# Feature: Sincronización de Estado en Tiempo Real via Firebase

## Feature Description
Sincronizar el estado del juego entre ambos jugadores en tiempo real usando Firebase Realtime Database. Cuando el jugador local presiona "Listo" tras colocar sus barcos, la posición de su flota se escribe en Firebase. Cada cliente escucha cambios con `onValue` y reacciona: cuando ambos jugadores están listos la partida inicia sola, el indicador de turno se actualiza en vivo, y los ataques recibidos del oponente se reflejan automáticamente en el tablero propio. Toda la lógica de Firebase vive en un módulo separado `js/firebase-game.js` para mantener las responsabilidades claras.

## User Story
As a player connected to a room
I want the game state to sync automatically between my browser and my opponent's
So that I see their actions (ready status, attacks) in real-time without refreshing

## Problem Statement
Actualmente `game.js` guarda el estado de la flota solo en memoria local. No hay mecanismo para notificar al oponente que el jugador local está listo, iniciar la partida cuando ambos confirman, ni reflejar los ataques del oponente en el tablero propio. Sin esta sincronización, el juego no puede ser multijugador real.

## Solution Approach
Crear `js/firebase-game.js` que encapsula toda la interacción con Firebase Realtime Database:
1. Escribir en Firebase cuando el jugador local presiona "Listo" (ships + ready flag)
2. Escuchar la sala completa con un único `onValue` en `rooms/{roomId}` y despachar actualizaciones a la UI según el estado detectado
3. Actualizar el indicador de turno en tiempo real al detectar cambios en `currentTurn`
4. Reflejar ataques recibidos del oponente en el tablero propio al detectar cambios en `attacks[]`
5. Conectar el módulo con `game.js` sin alterar la API existente de `Placement`

## Relevant Files
- `js/game.js` — extender `onReady()` para llamar al nuevo módulo Firebase; actualmente solo oculta el panel y actualiza el texto de estado (líneas 8-16)
- `js/firebase-config.js` — exporta `db` (instancia de Firebase Realtime Database); ya existe pero está en `.gitignore` (las credenciales las provee el dev)
- `js/firebase-config.example.js` — referencia de la estructura de exportación de `db`
- `index.html` — agregar elemento de indicador de turno y sección de ataques recibidos; actualmente tiene `#game-status` (línea 8) y los dos tableros
- `css/styles.css` — agregar estilos para indicador de turno activo/inactivo, celdas atacadas recibidas (hit/miss en tablero propio), y estado de espera

### New Files
- `js/firebase-game.js` — módulo IIFE que encapsula toda la lógica Firebase: escribir estado del jugador al presionar "Listo", escuchar cambios en la sala, actualizar UI de turno, y aplicar ataques recibidos al tablero propio

## Implementation Plan
### Phase 1: Foundation
Definir la estructura de datos Firebase que usará este módulo (compatible con la sala creada en Issue 3). Crear `js/firebase-game.js` como módulo IIFE con la API pública mínima: `init(roomId, playerId, fleetState)` y `onAttackReceived(callback)`. Agregar al HTML los elementos visuales nuevos: indicador de turno (`#turn-indicator`) y contenedor de mensajes de estado ya existente (`#game-status`). Agregar el `<script>` de `firebase-game.js` en `index.html`.

### Phase 2: Core Implementation
Implementar en `firebase-game.js`:
- `syncReadyState(roomId, playerId, ships)` — escribe `player{N}/ready: true` y `player{N}/ships: {...}` en Firebase
- `listenRoom(roomId, playerId, callbacks)` — suscripción única a `rooms/{roomId}` con `onValue`; dentro del listener, despachar a:
  - `onBothReady()` — cuando ambos `player1.ready` y `player2.ready` son `true` y `status === "placing"`: actualizar `status → "playing"` y `currentTurn → "player1"` (solo lo escribe el jugador con menor `playerId` para evitar escrituras dobles)
  - `onTurnChange(isMyTurn)` — cuando `currentTurn` cambia, emitir si es el turno del jugador local
  - `onAttacksChange(attacks)` — cuando cambia el array `attacks`, filtrar los ataques del oponente y marcar las celdas del tablero propio

### Phase 3: Integration
Conectar `firebase-game.js` con `game.js`:
- En `onReady()` de `game.js`: llamar a `FirebaseGame.syncReadyState(roomId, playerId, fleetState)` y luego `FirebaseGame.listenRoom(roomId, playerId, callbacks)`
- Los `callbacks` actualizan el DOM: turno activo/inactivo en `#turn-indicator`, mensaje en `#game-status`, y celdas `cell--hit-received` / `cell--miss-received` en `#player-board`
- Agregar CSS para los nuevos estados visuales respetando la paleta naval existente
- Accesibilidad: el indicador de turno usa `aria-live="polite"` para lectores de pantalla

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Definir estructura de datos Firebase y agregar HTML de indicador de turno
- En `index.html`, dentro del `<header>`, agregar `<div id="turn-indicator" aria-live="polite" hidden></div>` para mostrar "Tu turno" / "Turno del oponente"
- Asegurarse de que `#game-status` tenga `aria-live="polite"` para anunciar transiciones de estado
- Agregar `<script src="js/firebase-game.js"></script>` en `index.html` después de `firebase-config.js` y antes de `game.js`
- Verificar que la estructura de sala esperada es:
  ```
  rooms/{roomId}/
    status: "waiting" | "placing" | "playing" | "finished"
    player1: { id, ready, ships }
    player2: { id, ready, ships }
    currentTurn: "player1" | "player2"
    attacks: []
  ```

### 2) Crear `js/firebase-game.js` con esqueleto del módulo
- Crear el archivo como módulo IIFE: `const FirebaseGame = (function() { ... })()`
- Declarar variables privadas: `_roomId`, `_playerId`, `_playerKey` ("player1" o "player2"), `_unsubscribe` (función para cancelar el listener)
- Exponer API pública: `{ init, syncReadyState, listenRoom, destroy }`
- `init(roomId, playerId)` — guarda roomId y playerId; determina `_playerKey` consultando Firebase para saber si el jugador es player1 o player2
- Verificar que `window.FirebaseGame` existe al cargar la página con DevTools

### 3) Implementar `syncReadyState` en `firebase-game.js`
- Importar `ref`, `update` desde Firebase Database SDK (mismo CDN que `firebase-config.js`)
- `syncReadyState(ships)` — construye el objeto de actualización:
  ```js
  {
    [`rooms/${_roomId}/${_playerKey}/ready`]: true,
    [`rooms/${_roomId}/${_playerKey}/ships`]: ships
  }
  ```
- Llamar a `update(ref(db), updateObj)` y retornar la Promise
- Verificar en Firebase Console que los datos aparecen correctamente tras presionar "Listo"

### 4) Implementar `listenRoom` con `onValue`
- `listenRoom(callbacks)` — usar `onValue(ref(db, \`rooms/${_roomId}\`), snapshot => { ... })`
- Guardar la función de cancelación retornada en `_unsubscribe`
- Dentro del callback: extraer `data = snapshot.val()`; si `data` es null, ignorar
- Llamar a `callbacks.onBothReady(data)` si `data.player1?.ready && data.player2?.ready && data.status === "placing"`
- Llamar a `callbacks.onTurnChange(data.currentTurn === _playerKey)` cuando `currentTurn` cambia
- Llamar a `callbacks.onAttacksChange(data.attacks || [])` cuando `attacks` cambia
- Implementar `destroy()` que llama a `_unsubscribe()` para limpiar el listener
- Verificar con dos pestañas del navegador que el listener se dispara en ambas al hacer cambios en Firebase Console

### 5) Implementar lógica de inicio automático al estar ambos listos
- Dentro del callback de `onBothReady`: solo el jugador que sea `_playerKey === "player1"` ejecuta la escritura (evitar race condition)
- `update(ref(db), { \`rooms/${_roomId}/status\`: "playing", \`rooms/${_roomId}/currentTurn\`: "player1" })`
- Verificar con dos pestañas que la partida inicia sola cuando ambos presionan "Listo"

### 6) Implementar `onTurnChange` — actualizar indicador visual de turno
- En `game.js`, definir el callback `onTurnChange(isMyTurn)`:
  - Obtener `#turn-indicator` y mostrarlo (`hidden = false`)
  - Si `isMyTurn`: `textContent = "Tu turno"`, agregar clase `turn-indicator--active`
  - Si no: `textContent = "Turno del oponente"`, quitar clase `turn-indicator--active`
  - Actualizar `#game-status` con mensaje apropiado
- En `css/styles.css`, agregar `.turn-indicator--active` con borde o fondo resaltado en `--color-primary`
- Verificar alternando `currentTurn` manualmente en Firebase Console que el indicador cambia en tiempo real

### 7) Implementar `onAttacksChange` — reflejar ataques del oponente en tablero propio
- En `game.js`, definir el callback `onAttacksChange(attacks)`:
  - Filtrar ataques del oponente: `attacks.filter(a => a.player !== _playerKey)`
  - Para cada ataque: obtener celda `cell-{attack.cell}` en `#player-board`
  - Evaluar hit/miss: comparar `attack.cell` con las celdas de `fleetState`
  - Agregar clase `cell--hit-received` (impacto enemigo en barco propio) o `cell--miss-received` (fallo enemigo)
- En `css/styles.css`:
  - `.cell--hit-received` — fondo rojo (usar nueva custom property `--color-hit: #e74c3c`)
  - `.cell--miss-received` — fondo gris (`--color-miss: #5d6d7e`)
- Verificar que al escribir un ataque manualmente en Firebase Console aparece reflejado en el tablero propio

### 8) Integrar `firebase-game.js` con `game.js` en `onReady()`
- En `game.js`, extender `onReady()`:
  ```js
  function onReady() {
    fleetState = Placement.getFleetState();
    var placementPhase = document.getElementById('placement-phase');
    if (placementPhase) placementPhase.hidden = true;
    // Nuevo: sincronizar con Firebase
    FirebaseGame.syncReadyState(fleetState)
      .then(function() {
        FirebaseGame.listenRoom({
          onBothReady: handleBothReady,
          onTurnChange: handleTurnChange,
          onAttacksChange: handleAttacksChange
        });
      });
    var status = document.getElementById('game-status');
    if (status) status.textContent = 'Esperando que el oponente esté listo...';
  }
  ```
- `handleBothReady()` — actualizar `#game-status` a "¡La partida comenzó!"
- Verificar flujo completo con dos pestañas: ambos colocan barcos → presionan "Listo" → partida inicia → indicador de turno aparece

### 9) Final Validation
- Ejecuta todos los `Validation Commands` para asegurar cero regresiones.

## Testing Strategy
### Manual Testing
- Abrir `index.html` en dos pestañas del mismo navegador (o dos navegadores distintos) con la misma `roomId`
- Pestaña A presiona "Listo": verificar en Firebase Console que `player1/ready: true` y `player1/ships: {...}` aparecen
- Pestaña B presiona "Listo": verificar que en ambas pestañas `#game-status` cambia a "¡La partida comenzó!" y aparece el indicador de turno
- Alternar `currentTurn` manualmente en Firebase Console entre "player1" y "player2": verificar que el indicador cambia en tiempo real en ambas pestañas
- Escribir un ataque en `attacks[]` manualmente en Firebase Console: verificar que la celda correspondiente del tablero propio se colorea en la pestaña del jugador atacado

### Automated Tests
No hay test runner configurado (vanilla JS). Funciones puras testeables en el futuro:
- `evaluateAttack(cell, ships)` — determina hit/miss; testeable sin Firebase
- `determinePlayerKey(roomData, playerId)` — retorna "player1" o "player2"; testeable con datos mock

### Edge Cases
- **Sin Firebase configurado**: si `firebase-config.js` no existe o `db` es undefined, `firebase-game.js` debe fallar silenciosamente sin romper el flujo de colocación local
- **Desconexión durante espera**: si el oponente se desconecta antes de presionar "Listo", mostrar "Oponente desconectado" usando `onDisconnect`
- **Escritura doble de inicio**: solo `player1` escribe el inicio de la partida; `player2` solo escucha → evita race condition
- **Orden de ataques**: `attacks` en Firebase puede llegar desordenado; ordenar por `timestamp` antes de aplicar
- **Celdas ya marcadas**: antes de agregar clase hit/miss, verificar que la celda no tenga ya esa clase → evitar parpadeo
- **Mobile**: el indicador de turno debe ser visible en pantallas pequeñas; verificar en 375px de ancho
- **`prefers-reduced-motion`**: el cambio de turno no debe usar animaciones si el usuario lo prefiere

## Acceptance Criteria
- Al presionar "Listo", `player{N}/ready: true` y `player{N}/ships: {...}` se escriben en Firebase Realtime Database dentro de los 2 segundos
- Cuando ambos jugadores están listos, la UI de ambos clientes muestra "¡La partida comenzó!" sin que ninguno recargue la página
- El elemento `#turn-indicator` muestra "Tu turno" o "Turno del oponente" en tiempo real, actualizándose cada vez que `currentTurn` cambia en Firebase
- Los ataques del oponente escritos en `rooms/{roomId}/attacks` se reflejan en el tablero propio del jugador atacado en menos de 1 segundo
- Las celdas impactadas por el oponente se colorean en rojo (`cell--hit-received`) y los fallos en gris (`cell--miss-received`) en el tablero propio
- El módulo `firebase-game.js` puede destruirse (`FirebaseGame.destroy()`) sin dejar listeners activos (verificable con DevTools → Network)
- Si `firebase-config.js` no está disponible, el flujo local de colocación de barcos sigue funcionando sin errores en consola

## Validation Commands
- Abrir `index.html` directamente en el navegador (file://) con `firebase-config.js` configurado y verificar flujo completo con dos pestañas
- Abrir DevTools → Console y verificar cero errores JS durante todo el flujo (colocación → listo → espera → inicio de partida → ataques)
- En Firebase Console → Realtime Database: verificar que la estructura de datos coincide con el esquema definido en este spec
- Abrir DevTools → Network → WS (WebSocket): verificar que solo hay una conexión Firebase activa por pestaña
- `npx html-validate index.html` para verificar que el nuevo HTML de `#turn-indicator` es semánticamente válido
- Abrir DevTools → Lighthouse → Accessibility y verificar que `aria-live` en `#turn-indicator` no regresiona el score

## Notes
- **Dependencia de Issue 3**: este plan asume que `rooms/{roomId}/` ya existe en Firebase con `player1.id` y `player2.id` asignados (creado por Issue 3). Sin esa sala, `syncReadyState` no tendrá a qué sala escribir. Issue 3 debe implementarse antes.
- **`firebase-config.js` en `.gitignore`**: los desarrolladores deben copiar `firebase-config.example.js` como `firebase-config.js` con sus credenciales reales antes de probar.
- **SDK de Firebase**: usar Firebase v10.7.1 (misma versión que `firebase-config.js`) via CDN con módulos ES. Importar solo `ref`, `update`, `onValue` desde `firebase-database.js` para minimizar la superficie.
- **Race condition en inicio de partida**: solo `player1` escribe el cambio `status → "playing"`. `player2` solo lo detecta con `onValue`. Esto evita escrituras simultáneas que podrían corromperse.
- **Mejora futura (Issue 5)**: cuando se implementen los ataques, el array `attacks` se escribirá desde `firebase-game.js` o un módulo de ataque dedicado. La función `onAttacksChange` ya está diseñada para manejarlo sin cambios.
- **Mejora futura (Issue 7)**: la condición de victoria se evalúa localmente comparando `attacks` con `ships`; `firebase-game.js` solo escucha el evento y delega la evaluación a una función pura.
