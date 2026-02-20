# Feature: Integración Firebase — Sistema de Salas (Lobby)

## Feature Description
Implementar el sistema de lobby con Firebase Realtime Database que permite a dos jugadores conectarse a una sala compartida antes de comenzar la partida. El primer jugador crea una sala (genera un código de 6 caracteres) y se asigna como `player1`. El segundo jugador ingresa el código y se une como `player2`. Cuando ambos están conectados, la sala transiciona automáticamente al estado `"placing"` y ambos clientes pasan a la fase de colocación de barcos.

Esta funcionalidad es la base de la que dependen `firebase-game.js` (feature-004) y las fases posteriores del juego multijugador.

## User Story
As a player
I want to create or join a room using a 6-character code
So that I can play Batalla Naval against another player in real time

## Problem Statement
Actualmente el juego arranca directamente en la fase de colocación de barcos sin ningún contexto multijugador. No existe forma de que dos jugadores se conecten a la misma partida: no hay lobby, no hay generación de código de sala, no hay asignación de `player1`/`player2` y no se escribe ningún dato en Firebase. Sin este sistema, todas las fases online son imposibles.

## Solution Approach
Agregar una pantalla de lobby (`#lobby`) que aparece al cargar la página y oculta el `#game-container` (tableros y fase de colocación). El lobby presenta dos acciones:

1. **Crear sala** — genera un código aleatorio de 6 caracteres alfanuméricos, escribe `rooms/{roomId}` en Firebase con `status: "waiting"` y `player1: { id }`, muestra el código al jugador y espera al segundo jugador con `onValue`.
2. **Unirse a sala** — recibe el código introducido, verifica que la sala exista en Firebase con `status: "waiting"` y sin `player2.id`, escribe `player2: { id }` y actualiza `status: "placing"`.

`firebase-game.js` centraliza toda la comunicación con Firebase. `game.js` orquesta la transición de pantallas y pasa los parámetros (`roomId`, `playerId`, `playerKey`) a `firebase-game.js`.

## Relevant Files

- `index.html` — agregar `#lobby` antes de `#game-container`; ocultar `#game-container` con `hidden` al cargar; añadir `<script type="module">` para cargar `firebase-game.js` con ES6 imports
- `css/styles.css` — agregar estilos para el lobby (pantalla centrada, inputs, botones, código de sala en tipografía monospace)
- `js/game.js` — extender para manejar el flujo lobby → colocación: inicializar `firebase-game.js`, recibir callbacks de sala y realizar las transiciones de pantalla
- `js/firebase-config.js` — ya existe con credenciales reales; exporta `db`; **no modificar**
- `js/firebase-config.example.js` — plantilla de referencia; no modificar

### New Files
- `js/firebase-game.js` — módulo ES6 que encapsula toda la lógica Firebase del lobby: `createRoom`, `joinRoom`, `listenRoom`, `destroy`. Exportado como `export const FirebaseGame`.

## Implementation Plan

### Phase 1: Foundation
Agregar el HTML de la pantalla de lobby (`#lobby`) con los dos flujos (crear / unirse). Ocultar `#game-container` al inicio. Crear el esqueleto de `js/firebase-game.js` como módulo ES6 con la API pública mínima. Convertir los `<script>` de `index.html` a `type="module"` para poder usar `import`.

### Phase 2: Core Implementation
Implementar en `firebase-game.js`:
- `generateRoomId()` — genera un string de 6 caracteres alfanuméricos mayúsculas
- `createRoom(playerId)` — escribe la sala en Firebase y retorna `{ roomId, playerKey: "player1" }`
- `joinRoom(roomId, playerId)` — valida y actualiza Firebase; retorna `{ playerKey: "player2" }`
- `listenRoom(roomId, callbacks)` — `onValue` con callbacks `onPlayerJoined` y `onStatusChange`
- `destroy()` — cancela el listener activo

Agregar estilos CSS para el lobby: pantalla centrada en la ventana, campo de entrada con foco bien visible, botón de copiar código de sala, estado de espera animado.

### Phase 3: Integration
Conectar `firebase-game.js` con `game.js`:
- Al crear sala: mostrar el código en `#room-code-display` y escuchar con `onPlayerJoined` — cuando el segundo jugador llega, ocultar `#lobby` y mostrar `#game-container` en ambos clientes
- Al unirse: validar código → ocultar `#lobby` y mostrar `#game-container` → pasar `roomId` y `playerKey` al módulo de colocación para uso futuro

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Agregar pantalla de lobby en `index.html`
- Antes de `<main id="game-container">`, agregar `<section id="lobby">` con:
  - `<h2>Batalla Naval Multijugador</h2>`
  - Botón `#btn-create-room` ("Crear sala")
  - Separador visual "— o —"
  - `<form id="join-form">` con `<input id="input-room-code" type="text" maxlength="6" placeholder="Código de sala">` y botón de submit "Unirse"
  - `<div id="room-code-display" hidden>` — muestra código + instrucción "Comparte este código con tu oponente"
  - `<div id="lobby-status" aria-live="polite">` — mensajes de estado ("Esperando oponente...", errores)
- Agregar `hidden` a `<main id="game-container">` para ocultarlo al inicio
- Verificar que al abrir `index.html` solo se ve la pantalla de lobby

### 2) Convertir scripts a `type="module"` en `index.html`
- Cambiar `<script src="js/placement.js">` → `<script type="module" src="js/placement.js"></script>`
- Cambiar `<script src="js/game.js">` → `<script type="module" src="js/game.js"></script>`
- Agregar `<script type="module" src="js/firebase-game.js"></script>` después de `firebase-config.js` y antes de `game.js`
- Verificar en DevTools → Console que no hay errores de importación al cargar la página

### 3) Crear `js/firebase-game.js` con esqueleto del módulo
- Crear el archivo como módulo ES6 con imports al inicio:
  ```js
  import { db } from './firebase-config.js';
  import { ref, set, update, get, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
  ```
- Declarar variables privadas: `_unsubscribe` (función para cancelar el listener activo)
- Implementar `generateRoomId()` — genera 6 chars alfanuméricos en mayúsculas:
  ```js
  function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }
  ```
- Exportar la API pública: `export const FirebaseGame = { createRoom, joinRoom, listenRoom, destroy }`
- Verificar en DevTools que `FirebaseGame` está definido al cargar la página

### 4) Implementar `createRoom` en `firebase-game.js`
- `createRoom(playerId)` — async function:
  1. Generar `roomId = generateRoomId()`
  2. Escribir en Firebase con `set(ref(db, \`rooms/${roomId}\`), { status: "waiting", player1: { id: playerId, ready: false, ships: null }, player2: null, currentTurn: null, attacks: [] })`
  3. Retornar `{ roomId, playerKey: "player1" }`
- Verificar en Firebase Console que la sala se crea con la estructura correcta al hacer click en "Crear sala"

### 5) Implementar `joinRoom` en `firebase-game.js`
- `joinRoom(roomId, playerId)` — async function:
  1. `const snapshot = await get(ref(db, \`rooms/${roomId}\`))`
  2. Si no existe: `throw new Error("Sala no encontrada")`
  3. Si `data.status !== "waiting"`: `throw new Error("La sala no está disponible")`
  4. Si `data.player2 !== null`: `throw new Error("La sala ya está completa")`
  5. `await update(ref(db, \`rooms/${roomId}\`), { "player2/id": playerId, "player2/ready": false, "player2/ships": null, status: "placing" })`
  6. Retornar `{ roomId, playerKey: "player2" }`
- Verificar en Firebase Console que `player2.id` y `status: "placing"` se escriben correctamente

### 6) Implementar `listenRoom` en `firebase-game.js`
- `listenRoom(roomId, callbacks)`:
  - Usar `onValue(ref(db, \`rooms/${roomId}\`), snapshot => { ... })`
  - Guardar la función de cancelación en `_unsubscribe`
  - Dentro del callback: extraer `data = snapshot.val()`; si `null`, ignorar
  - Llamar `callbacks.onPlayerJoined(data)` si `data.player1?.id && data.player2?.id`
  - Llamar `callbacks.onStatusChange(data.status)` cuando `data.status` cambia
- `destroy()` — llama a `_unsubscribe()` si existe
- Verificar con dos pestañas que el listener de player1 detecta cuando player2 se une

### 7) Integrar lobby con `game.js`
- En `game.js`, importar `FirebaseGame`:
  ```js
  import { FirebaseGame } from './firebase-game.js';
  ```
- Generar un `playerId` único al cargar: `const playerId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)`
- Listener en `#btn-create-room`:
  1. Deshabilitar botón y mostrar "Creando sala..." en `#lobby-status`
  2. `const { roomId, playerKey } = await FirebaseGame.createRoom(playerId)`
  3. Mostrar `roomId` en `#room-code-display` (remover `hidden`)
  4. Actualizar `#lobby-status` a "Esperando oponente..."
  5. `FirebaseGame.listenRoom(roomId, { onPlayerJoined: handleBothConnected, onStatusChange: () => {} })`
- Listener en `#join-form` submit:
  1. Leer valor de `#input-room-code` (normalizar a mayúsculas, trim)
  2. Deshabilitar form y mostrar "Uniéndose..." en `#lobby-status`
  3. `try { const { roomId, playerKey } = await FirebaseGame.joinRoom(code, playerId); handleBothConnected(roomId, playerKey); }`
  4. `catch (e) { mostrar e.message en #lobby-status; re-habilitar form }`
- `handleBothConnected(roomId, playerKey)`: ocultar `#lobby`, mostrar `#game-container` (quitar `hidden`)
- Guardar `roomId` y `playerKey` en `window.Game` para uso en fases posteriores

### 8) Agregar estilos CSS en `css/styles.css`
- `#lobby` — pantalla centrada: `display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 1.5rem`
- `.lobby-title` — tipografía coherente con la paleta naval existente
- `.lobby-divider` — separador "— o —" con `color: var(--color-border)`
- `#btn-create-room` — botón primario usando `--color-primary`; mismo estilo que los botones existentes
- `#join-form` — flex row con input + botón
- `#input-room-code` — `font-family: monospace; font-size: 1.5rem; text-transform: uppercase; letter-spacing: 0.2em; width: 8ch` con foco resaltado usando `--color-primary`
- `#room-code-display` — código de sala en tipografía monospace grande, con botón de copiar
- `#lobby-status` — texto de estado en `--color-text` con opacidad reducida; clase `.lobby-status--error` para errores en rojo
- Verificar que el lobby se ve correcto en 375px (mobile) y 1024px (desktop)

### 9) Final Validation
- Ejecuta todos los `Validation Commands` para asegurar cero regresiones.

## Testing Strategy
### Manual Testing
- **Crear sala**: abrir `index.html` → click "Crear sala" → verificar código de 6 chars en pantalla y en Firebase Console → verificar mensaje "Esperando oponente..."
- **Unirse a sala**: abrir segunda pestaña → ingresar código → verificar que ambas pestañas transicionan a `#game-container` (tableros visibles)
- **Error código inválido**: ingresar código que no existe → verificar mensaje de error en `#lobby-status`
- **Sala llena**: intentar unirse a sala con `status: "placing"` → verificar mensaje "La sala ya está completa"
- **Flujo completo**: pestaña A crea sala → pestaña B se une → ambas ven `#game-container` con `placement-phase` → flujo de colocación funciona igual que antes

### Automated Tests
No hay test runner configurado. Funciones puras testeables en el futuro:
- `generateRoomId()` — siempre retorna exactamente 6 chars del conjunto alfanumérico en mayúsculas
- Validación del código de sala en `joinRoom` — testeable con mocks de Firebase

### Edge Cases
- **`crypto.randomUUID` no disponible** (HTTP sin TLS): fallback a `Math.random().toString(36).slice(2)` para generar `playerId`
- **Colisión de `roomId`**: poco probable con 36^6 = 2.1B combinaciones; si ocurre, `createRoom` podría reintentar (mejora futura)
- **Red lenta / Firebase no disponible**: mostrar error genérico "Error de conexión, intenta de nuevo" en `#lobby-status`; no romper el flujo local de colocación
- **Tab cerrada durante espera**: el listener de player1 queda huérfano en Firebase; implementar `onDisconnect` es mejora futura (Issue posterior)
- **Código en minúsculas**: normalizar a mayúsculas con `.toUpperCase()` en el input antes de enviar a Firebase
- **Mobile / pantalla pequeña**: el lobby debe verse correcto en 375px; el input de código debe ser suficientemente grande para tocar con dedo

## Acceptance Criteria
- Al hacer click en "Crear sala", se genera un código de 6 caracteres, se escribe `rooms/{roomId}` en Firebase con `status: "waiting"` y `player1.id`, y el código es visible en pantalla
- Al ingresar un código válido en otra pestaña y hacer click en "Unirse", Firebase se actualiza con `player2.id` y `status: "placing"` en menos de 2 segundos
- Cuando ambos jugadores están conectados, ambas pestañas transicionan automáticamente a la fase de colocación (`#game-container` visible, `#lobby` oculto)
- Si se ingresa un código inexistente, se muestra "Sala no encontrada" en `#lobby-status` sin recargar la página
- Si se intenta unirse a una sala ya completa (`player2` existente), se muestra "La sala ya está completa"
- `roomId` y `playerKey` quedan disponibles en `window.Game` para las fases posteriores (colocación, combate)
- El flujo de colocación de barcos existente sigue funcionando sin regresiones después de transicionar desde el lobby
- La pantalla de lobby es usable en mobile (375px) y desktop (1024px)

## Validation Commands
- `python -m http.server 8000` — iniciar servidor local (requerido para módulos ES6)
- Abrir `http://localhost:8000` en dos pestañas y ejecutar el flujo completo crear/unirse
- DevTools → Console: verificar cero errores JS durante todo el flujo (lobby → transición → colocación)
- Firebase Console → Realtime Database: verificar estructura de sala `rooms/{roomId}` tras crear y unirse
- DevTools → Network → WS: verificar solo una conexión Firebase activa por pestaña
- `npx html-validate index.html` — validar HTML semántico del nuevo `#lobby`

## Notes
- **Dependencia de `firebase-config.js`**: el archivo con credenciales reales debe existir localmente (está en `.gitignore`). Copiar de `firebase-config.example.js` y completar.
- **`type="module"` requerido**: la conversión de scripts a módulos ES6 es necesaria para usar `import`. Esto implica que la página **debe** servirse desde un servidor HTTP (`localhost:8000`), no con `file://`.
- **`playerId` sin autenticación**: en esta versión se usa `crypto.randomUUID()` como identificador anónimo. No se implementa Firebase Auth para mantener la simplicidad.
- **Feature-004 depende de este issue**: la spec `feature-004-sincronizacion-firebase.md` asume que `rooms/{roomId}` existe con `player1.id` y `player2.id` ya asignados. Este issue es su prerequisito directo.
- **Sin lobby visible antes**: la pantalla de lobby reemplaza el comportamiento actual donde el juego arrancaba directo en la fase de colocación. Tras este issue, el flujo completo es: lobby → colocación → combate.
