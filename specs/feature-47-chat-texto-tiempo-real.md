# Feature: Chat de Texto en Tiempo Real entre Jugadores

## Feature Description
Agregar un panel de chat simple para que ambos jugadores puedan enviarse mensajes de texto durante la partida. El chat se sincroniza en tiempo real via Firebase Realtime Database y está disponible desde que ambos jugadores se conectan (fase de colocación en adelante) hasta que alguien presiona "Salir" o "Revancha".

En desktop, el panel es una tercera columna siempre visible a la derecha del tablero enemigo. En mobile, es un botón flotante (FAB) en la esquina inferior derecha con un badge numérico de mensajes no leídos; al tocarlo se abre un panel deslizante.

## User Story
As a player
I want to send and receive text messages with my opponent in real time
So that I can communicate, taunt, or chat during the game without leaving the browser tab

## Problem Statement
Actualmente los jugadores no tienen ninguna forma de comunicarse dentro de la aplicación durante la partida. Agregar un chat en tiempo real mejora la experiencia social del juego y aumenta el engagement sin requerir librerías externas.

## Solution Approach
Usar `push()` de Firebase para escritura sin race conditions y `onValue` para escucha en tiempo real del nodo `rooms/{roomId}/messages`. La UI del chat vive en `index.html` y se activa en `game.js` cuando ambos jugadores se conectan. El layout de desktop agrega una tercera columna al flex container existente; en mobile se usa un FAB con panel overlay.

## Relevant Files
- **`js/firebase-game.js`** — Agregar `sendMessage()`, `listenMessages()`, `destroyMessages()` y actualizar `resetRoom()` para limpiar mensajes.
- **`js/game.js`** — Iniciar y detener el listener de chat, renderizar mensajes, manejar envío, rastrear mensajes no leídos en mobile y limpiar la UI del chat en revancha.
- **`index.html`** — Agregar el panel de chat (`#chat-panel`) dentro de `#game-container` y el FAB (`#chat-fab`) para mobile.
- **`css/styles.css`** — Estilos del panel de chat, columna desktop, FAB mobile con badge, panel overlay mobile, y ajustes en media queries.

## Implementation Plan

### Phase 1: Foundation
Extender Firebase con las funciones de mensajería y actualizar `resetRoom()` para limpiar el nodo de mensajes. Esto es la base sin afectar nada de la UI existente.

### Phase 2: Core Implementation
Agregar la estructura HTML del chat en `index.html` (panel desktop + FAB mobile) y todos los estilos CSS necesarios (layout 3 columnas en desktop, FAB + overlay en mobile).

### Phase 3: Integration
Conectar la lógica en `game.js`: iniciar el listener al conectarse ambos jugadores, renderizar mensajes entrantes, manejar el formulario de envío, gestionar el badge de no leídos en mobile y limpiar la UI del chat al reiniciar la partida (revancha).

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Extender `firebase-game.js` con funciones de mensajería

- Agregar variable privada `_unsubscribeMessages = null` al inicio del módulo.
- Agregar función `sendMessage(roomId, playerKey, text)`:
  ```js
  async function sendMessage(roomId, playerKey, text) {
    const msgRef = ref(db, `rooms/${roomId}/messages`);
    await push(msgRef, { playerKey, text, timestamp: Date.now() });
  }
  ```
- Agregar función `listenMessages(roomId, callback)`:
  ```js
  function listenMessages(roomId, callback) {
    destroyMessages();
    const msgRef = ref(db, `rooms/${roomId}/messages`);
    _unsubscribeMessages = onValue(msgRef, (snapshot) => {
      const data = snapshot.val();
      const messages = data ? Object.values(data) : [];
      // Ordenar por timestamp ascendente
      messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      callback(messages);
    });
  }
  ```
- Agregar función `destroyMessages()`:
  ```js
  function destroyMessages() {
    if (_unsubscribeMessages) {
      _unsubscribeMessages();
      _unsubscribeMessages = null;
    }
  }
  ```
- En `resetRoom()`, agregar antes del `update()`:
  ```js
  updates[`rooms/${roomId}/messages`] = null;
  ```
- Exportar las nuevas funciones en el objeto `FirebaseGame`.
- Verificar: las nuevas funciones se exportan correctamente y `resetRoom` incluye la limpieza de mensajes.

### 2) Agregar estructura HTML del chat en `index.html`

- Dentro de `<main id="game-container">`, después del bloque `<section class="board-column" id="enemy-column">` y antes de `<section id="fleet-status">`, agregar el panel de chat:
  ```html
  <!-- Chat panel (visible en desktop; oculto inicialmente en ambas vistas) -->
  <section id="chat-panel" class="chat-column" hidden aria-label="Chat con el oponente">
    <h2 class="chat-heading">Chat</h2>
    <div id="chat-messages" class="chat-messages" role="log" aria-live="polite" aria-label="Mensajes del chat"></div>
    <form id="chat-form" class="chat-form" autocomplete="off">
      <input id="chat-input" type="text" maxlength="200" placeholder="Escribí un mensaje..." aria-label="Mensaje de chat">
      <button type="submit" aria-label="Enviar mensaje">Enviar</button>
    </form>
  </section>
  ```
- Agregar el FAB mobile justo antes del cierre de `</body>` (después de los `<script>`):
  ```html
  <!-- Chat FAB (solo mobile, visible en combate/colocación cuando ambos conectados) -->
  <button id="chat-fab" type="button" hidden
          aria-label="Abrir chat"
          aria-haspopup="dialog">
    💬
    <span id="chat-badge" class="chat-badge" hidden aria-label="mensajes no leídos">0</span>
  </button>

  <!-- Chat overlay panel (mobile) -->
  <div id="chat-overlay" class="chat-overlay" hidden role="dialog" aria-modal="true" aria-labelledby="chat-overlay-title">
    <div class="chat-overlay-panel">
      <div class="chat-overlay-header">
        <h2 id="chat-overlay-title">Chat</h2>
        <button id="btn-close-chat" type="button" aria-label="Cerrar chat">&times;</button>
      </div>
      <div id="chat-overlay-messages" class="chat-messages" role="log" aria-live="polite" aria-label="Mensajes del chat"></div>
      <form id="chat-overlay-form" class="chat-form" autocomplete="off">
        <input id="chat-overlay-input" type="text" maxlength="200" placeholder="Escribí un mensaje..." aria-label="Mensaje de chat">
        <button type="submit" aria-label="Enviar mensaje">Enviar</button>
      </form>
    </div>
  </div>
  ```
- Verificar: la estructura HTML es semánticamente correcta y no interfiere con los elementos existentes.

### 3) Agregar estilos CSS del chat en `styles.css`

- Agregar variable CSS para el ancho del panel de chat al bloque `:root`:
  ```css
  --chat-width: 220px;
  ```
- Estilos del panel desktop `.chat-column`:
  ```css
  /* === Chat panel (desktop) === */
  .chat-column {
    display: flex;
    flex-direction: column;
    width: var(--chat-width);
    min-height: 420px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .chat-heading {
    color: var(--color-heading);
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-cell-bg);
  }
  ```
- Estilos compartidos de mensajes `.chat-messages`:
  ```css
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    scroll-behavior: smooth;
  }

  .chat-msg {
    font-size: 0.8rem;
    line-height: 1.4;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    max-width: 90%;
    word-break: break-word;
  }

  .chat-msg--own {
    align-self: flex-end;
    background: var(--color-primary);
    color: #fff;
  }

  .chat-msg--rival {
    align-self: flex-start;
    background: var(--color-btn-bg);
    color: var(--color-text);
  }

  .chat-msg-sender {
    font-size: 0.68rem;
    opacity: 0.7;
    font-weight: 600;
    display: block;
    margin-bottom: 0.1rem;
  }
  ```
- Estilos del formulario de chat `.chat-form`:
  ```css
  .chat-form {
    display: flex;
    gap: 0.3rem;
    padding: 0.5rem 0.6rem;
    border-top: 1px solid var(--color-border);
    background: var(--color-cell-bg);
  }

  .chat-form input {
    flex: 1;
    min-width: 0;
    padding: 0.4rem 0.5rem;
    font-size: 0.82rem;
    color: var(--color-heading);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    outline: none;
    transition: border-color 0.15s ease;
  }

  .chat-form input:focus {
    border-color: var(--color-primary);
  }

  .chat-form button[type="submit"] {
    padding: 0.4rem 0.6rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-heading);
    background: var(--color-primary);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s ease;
    white-space: nowrap;
  }

  .chat-form button[type="submit"]:hover {
    background: #1a6fbf;
  }
  ```
- Estilos del FAB mobile `#chat-fab`:
  ```css
  /* === Chat FAB (mobile only) === */
  #chat-fab {
    display: none; /* visible via JS y media query */
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    font-size: 1.3rem;
    background: var(--color-primary);
    color: #fff;
    border: none;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    align-items: center;
    justify-content: center;
    z-index: 50;
    transition: background 0.15s ease, transform 0.15s ease;
  }

  #chat-fab:hover {
    background: #1a6fbf;
    transform: scale(1.08);
  }

  .chat-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
    background: #e74c3c;
    color: #fff;
    font-size: 0.65rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  ```
- Estilos del overlay mobile `.chat-overlay`:
  ```css
  /* === Chat overlay (mobile panel) === */
  .chat-overlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: flex-end;
    background: rgba(10, 22, 40, 0.7);
  }

  .chat-overlay-panel {
    width: 100%;
    max-height: 60vh;
    background: var(--color-surface);
    border-top: 2px solid var(--color-border);
    border-radius: 12px 12px 0 0;
    display: flex;
    flex-direction: column;
    animation: slide-up 0.22s ease-out;
  }

  @keyframes slide-up {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }

  .chat-overlay-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
  }

  .chat-overlay-header h2 {
    color: var(--color-heading);
    font-size: 0.95rem;
    font-weight: 600;
  }

  #btn-close-chat {
    width: 28px;
    height: 28px;
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-text);
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 4px;
  }

  #btn-close-chat:hover {
    color: var(--color-heading);
    background: var(--color-btn-bg);
  }

  #chat-overlay-messages {
    min-height: 120px;
  }
  ```
- Ajuste de responsive para el chat:
  ```css
  /* Desktop: mostrar panel de chat en game-container */
  @media (min-width: 901px) {
    /* El panel de chat desktop se muestra inline en el flex */
    #chat-panel:not([hidden]) {
      display: flex;
    }
    /* FAB nunca visible en desktop */
    #chat-fab {
      display: none !important;
    }
  }

  @media (max-width: 900px) {
    /* Panel desktop oculto en mobile */
    #chat-panel {
      display: none !important;
    }
    /* FAB visible cuando esté activo */
    #chat-fab:not([hidden]) {
      display: flex;
    }
  }
  ```
- En `@media (prefers-reduced-motion: reduce)`, agregar `.chat-overlay-panel` a la lista de elementos sin animación.
- Verificar: el layout en desktop tiene 3 columnas (tablero propio, tablero enemigo, chat) y en mobile solo se muestra el FAB.

### 4) Conectar lógica del chat en `game.js`

- Agregar al import de `firebase-game.js` las nuevas funciones (ya exportadas en el paso 1).
- Agregar variables privadas al IIFE:
  ```js
  var _chatUnreadCount = 0;
  var _chatPanelOpen = false; // true cuando overlay mobile está abierto
  ```
- Crear función `initChat(roomId, myPlayerKey)` que:
  1. Llama a `FirebaseGame.listenMessages(roomId, handleMessagesUpdate)`
  2. Registra el evento submit del `#chat-form` (desktop) llamando a `sendChatMessage()`
  3. Registra el evento submit del `#chat-overlay-form` (mobile) llamando a `sendChatMessage()`
  4. Registra el click en `#chat-fab` para abrir el overlay y limpiar badge
  5. Registra el click en `#btn-close-chat` para cerrar el overlay
  6. Muestra el `#chat-panel` (desktop) quitándole `hidden`
  7. Muestra el `#chat-fab` (mobile) quitándole `hidden`

- Crear función `handleMessagesUpdate(messages)`:
  - Renderizar todos los mensajes en `#chat-messages` (desktop) y `#chat-overlay-messages` (mobile)
  - Si `messages` es vacío: limpiar ambos contenedores y resetear badge
  - Para cada mensaje, crear un `.chat-msg` con clase `.chat-msg--own` si `msg.playerKey === myPlayerKey`, sino `.chat-msg--rival`
  - Texto del sender: "Vos" (own) o "Rival" (rival)
  - Hacer scroll al fondo del contenedor de mensajes
  - Si el overlay mobile está cerrado (`!_chatPanelOpen`) y hay mensajes nuevos: incrementar `_chatUnreadCount` y actualizar `#chat-badge`

  Para detectar mensajes nuevos vs el re-render completo: comparar `messages.length` con el count previo (agregar `var _prevMsgCount = 0;`). Si `messages.length > _prevMsgCount` y `!_chatPanelOpen`, incrementar badge por la diferencia.

- Crear función `sendChatMessage(inputEl)`:
  ```js
  function sendChatMessage(inputEl) {
    var text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    FirebaseGame.sendMessage(window.Game.roomId, window.Game.playerKey, text);
  }
  ```

- En `handleBothConnected()`, agregar al final: `initChat(window.Game.roomId, window.Game.playerKey)`.

- En `handleReturnToPlacing()`, agregar:
  - Limpiar `#chat-messages` y `#chat-overlay-messages` (vaciar innerHTML)
  - Resetear `_chatUnreadCount = 0`, `_prevMsgCount = 0`
  - Ocultar `#chat-badge`
  - El panel y FAB permanecen visibles (los jugadores siguen conectados)

- En `restoreGamePhase()` para los casos `'placing'` y `'playing'`: llamar `initChat(roomId, playerKey)` después de `handleBothConnected()`.

- Verificar: el chat funciona en la fase de colocación y en la fase de combate; los mensajes se sincronizan en tiempo real; el badge funciona en mobile.

### 5) Validación Final
- Ejecutar todos los `Validation Commands` para asegurar cero regresiones.

## Testing Strategy

### Manual Testing
- Abrir el juego en dos pestañas del mismo navegador (o dos dispositivos).
- Verificar que el panel de chat aparece en desktop una vez que ambos jugadores se conectan.
- Enviar mensajes desde cada pestaña y comprobar que se sincronizan.
- Verificar que "Vos" / "Rival" se asignan correctamente según el remitente.
- Verificar que al redimensionar a ancho < 900px aparece el FAB y desaparece el panel.
- Verificar que el badge se incrementa con mensajes no leídos cuando el overlay está cerrado.
- Verificar que el badge desaparece al abrir el overlay.
- Presionar "Revancha" y verificar que los mensajes se borran.
- Recargar la página y verificar que la reconexión restaura el chat (mensajes que aún están en Firebase).

### Automated Tests
No aplica (el proyecto no tiene tests automatizados configurados).

### Edge Cases
- **Mensaje vacío**: no enviar si el input está vacío (ya validado en `sendChatMessage`).
- **Mensaje muy largo**: limitado a 200 caracteres por `maxlength` en el HTML.
- **Scroll automático**: al recibir un nuevo mensaje, hacer scroll al fondo del contenedor.
- **Mobile pantalla pequeña**: el panel overlay ocupa máximo 60vh para no bloquear toda la pantalla.
- **Reconexión post-refresh**: al restaurar la sesión, los mensajes existentes en Firebase se cargan via el listener.
- **Revancha**: `resetRoom()` limpia el nodo `messages` en Firebase; el listener recibe array vacío y limpia la UI.
- **Revancha con overlay abierto en mobile**: cerrar el overlay automáticamente o simplemente limpiar los mensajes.
- **Accesibilidad**: `role="log"` y `aria-live="polite"` en contenedor de mensajes para lectores de pantalla.
- **Compatibilidad**: el emoji 💬 del FAB puede no renderizarse en algunos navegadores; alternativa: usar texto "Chat".

## Acceptance Criteria
- El chat es visible desde que ambos jugadores están conectados (fase de colocación en adelante).
- Cada mensaje se identifica con "Vos" o "Rival" según el remitente.
- Los mensajes se sincronizan en tiempo real entre ambos jugadores via Firebase.
- En desktop (>900px): panel siempre visible como tercera columna a la derecha del tablero enemigo.
- En mobile (≤900px): FAB flotante en la esquina inferior derecha; al tocarlo se abre el panel overlay.
- El badge numérico se incrementa con mensajes no leídos cuando el panel mobile está cerrado.
- El badge desaparece al abrir el panel mobile.
- Los mensajes desaparecen al presionar "Revancha" (limpiados en Firebase por `resetRoom()`).
- Los mensajes desaparecen al presionar "Salir" (recarga de página).
- El chat no interfiere con la mecánica del juego ni con el layout existente.

## Validation Commands
- `python -m http.server 8000` — Iniciar servidor local y probar manualmente en `http://localhost:8000`

## Notes
- No se usa ninguna librería externa; solo Firebase SDK ya importado.
- Los mensajes se ordenan por `timestamp` en el cliente; Firebase `push()` garantiza keys ordenadas pero se ordena explícitamente para seguridad.
- El panel de chat desktop comparte el mismo listener y estado que el overlay mobile para mantener consistencia.
- En la función `handleMessagesUpdate`, siempre se re-renderiza la lista completa (en vez de append incremental) para simplificar la lógica y evitar duplicados al reconectar.
- El `#chat-fab` usa `display: flex` (no `display: block`) para centrar el emoji; la visibilidad se controla combinando `hidden` (JS) con media queries (CSS).
- Se optó por **no** sincronizar el estado oculto/visible del chat con Firebase (solo local), igual que el toggle del tablero propio.
