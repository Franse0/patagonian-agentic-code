# Feature: Pantalla de Inicio y Mejoras Generales de UX

## Feature Description
Mejorar la experiencia del usuario con una pantalla de inicio atractiva que presente el juego "Batalla Naval Patagonian", añadir transiciones suaves entre las fases del juego (lobby → colocación → combate → fin), mensajes de estado claros en todo momento, un modal de reglas accesible desde cualquier fase, personalización del nombre del jugador y un spinner de carga mientras se conecta a Firebase.

## User Story
As a jugador nuevo o recurrente
I want ver una pantalla de inicio clara con nombre personalizable, reglas accesibles y transiciones fluidas
So that entender rápidamente el juego, saber en qué fase estoy en todo momento y tener una experiencia visual pulida

## Problem Statement
La pantalla de inicio actual es funcional pero austera: no identifica el juego con un nombre completo, no permite que el jugador ingrese su nombre, no tiene descripción ni reglas visibles, las transiciones entre fases son abruptas (aparecen/desaparecen sin animación) y no hay feedback visual durante la conexión a Firebase.

## Solution Approach
1. **Nombre e identidad**: Actualizar el título principal a "Batalla Naval Patagonian" y añadir una breve descripción del juego en el lobby.
2. **Nombre del jugador**: Añadir un input en el lobby para que el jugador personalice su nombre (default "Jugador 1"), almacenado en `window.Game.playerName`.
3. **Spinner de carga**: Mostrar un spinner animado (CSS puro) mientras las operaciones de Firebase están en curso, reemplazando el mensaje de texto.
4. **Transiciones de fase**: Implementar fade-in/fade-out mediante clases CSS (`.screen--visible`) en lugar de cambio brusco con `hidden`. Usar `requestAnimationFrame` para activar la transición CSS después de mostrar el elemento.
5. **Modal de reglas**: Botón "?" en el header que abre un modal con las reglas del juego y la lista de barcos. Cierra con Escape o clic fuera del modal.

## Relevant Files

- `index.html` — Añadir nombre del jugador input, descripción del lobby, spinner de carga, botón "?" en header y modal de reglas. Actualizar títulos.
- `css/styles.css` — Añadir estilos para: spinner, modal de reglas, transiciones de fase, input de nombre, botón "?", descripción del lobby.
- `js/game.js` — Añadir lógica: leer nombre del jugador, mostrar/ocultar spinner, funciones de transición suave entre secciones, lógica de modal de reglas, mensajes de estado actualizados.

No hay nuevos archivos JS necesarios: toda la lógica cabe en `game.js` siguiendo el patrón existente.

## Implementation Plan

### Phase 1: Foundation
Establecer la estructura HTML completa con los nuevos elementos (sin estilos aún): actualizar h1, añadir description, player name input, loading spinner, botón "?" y modal de reglas. Preparar las clases CSS para transiciones.

### Phase 2: Core Implementation
- **CSS**: Estilos del spinner de carga (keyframe `spin`), modal de reglas (overlay + dialog), input de nombre del jugador, botón "?" en el header, descripción del lobby, clases de transición de fase (`.screen--entering`, `.screen--visible`).
- **JS**: Función `showScreen(el)` / `hideScreen(el)` con fade, función `showSpinner()` / `hideSpinner()`, leer player name, abrir/cerrar modal de reglas.

### Phase 3: Integration
- Reemplazar todas las asignaciones directas de `.hidden` en `game.js` con las funciones `showScreen` / `hideScreen`.
- Pasar `playerName` a `window.Game.playerName` para uso futuro.
- Actualizar mensajes de `#game-status` para indicar claramente la fase actual.
- Mostrar spinner durante `createRoom` / `joinRoom` y ocultarlo al completar (éxito o error).

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Actualizar HTML: título, descripción y nombre del jugador
- En `index.html`: cambiar `<h1>Batalla Naval</h1>` por `<h1>Batalla Naval Patagonian</h1>`
- En `#lobby`: cambiar `.lobby-title` a "Batalla Naval Patagonian" o actualizar el copy de la descripción
- En `#lobby`: añadir `<p class="lobby-description">Hundir la flota enemiga antes de que hundan la tuya. Para dos jugadores en tiempo real.</p>` antes de `#btn-create-room`
- En `#lobby`: añadir `<div class="player-name-group"><label for="input-player-name">Tu nombre</label><input id="input-player-name" type="text" maxlength="20" placeholder="Jugador 1" autocomplete="off"></div>` antes de los botones de acción
- Verificar que el HTML siga siendo semántico y accesible

### 2) Añadir spinner de carga al HTML
- En `#lobby`: añadir `<div id="loading-spinner" hidden aria-label="Conectando..." role="status"><div class="spinner"></div><span class="spinner-text">Conectando...</span></div>` después de `#lobby-status`
- Verificar que `hidden` esté presente en el atributo inicial

### 3) Añadir botón "?" y modal de reglas al HTML
- En `<header>`: añadir `<button id="btn-rules" type="button" class="btn-rules" aria-label="Ver reglas del juego">?</button>` junto al `#game-status`
- Añadir antes de `</body>` el modal:
  ```html
  <div id="rules-modal" hidden role="dialog" aria-modal="true" aria-labelledby="rules-title">
    <div class="rules-overlay"></div>
    <div class="rules-dialog">
      <h2 id="rules-title">Reglas del Juego</h2>
      <button id="btn-close-rules" type="button" aria-label="Cerrar reglas">×</button>
      <section class="rules-section">
        <h3>Objetivo</h3>
        <p>Hundir toda la flota enemiga antes de que hundan la tuya. Los jugadores se turnan para atacar celdas del tablero oponente.</p>
      </section>
      <section class="rules-section">
        <h3>Fases</h3>
        <ol>
          <li><strong>Lobby:</strong> Crear o unirse a una sala con el código de 6 caracteres.</li>
          <li><strong>Colocación:</strong> Colocá tus 5 barcos en el tablero. Podés elegir orientación o usar "Aleatorio".</li>
          <li><strong>Combate:</strong> Por turnos, hacé clic en una celda del tablero enemigo para atacar.</li>
          <li><strong>Fin:</strong> Quien hunda toda la flota enemiga primero, gana.</li>
        </ol>
      </section>
      <section class="rules-section">
        <h3>Barcos</h3>
        <ul class="rules-ships">
          <li><span class="rules-ship-name">Portaaviones</span><span class="rules-ship-size">5 celdas</span></li>
          <li><span class="rules-ship-name">Acorazado</span><span class="rules-ship-size">4 celdas</span></li>
          <li><span class="rules-ship-name">Crucero</span><span class="rules-ship-size">3 celdas</span></li>
          <li><span class="rules-ship-name">Submarino</span><span class="rules-ship-size">3 celdas</span></li>
          <li><span class="rules-ship-name">Destructor</span><span class="rules-ship-size">2 celdas</span></li>
        </ul>
      </section>
    </div>
  </div>
  ```
- Verificar que el modal sea accesible (role, aria-modal, aria-labelledby)

### 4) Añadir CSS: transiciones de fase
- En `styles.css`: añadir las clases de transición de fase:
  ```css
  /* === Phase transitions === */
  .screen-transition {
    transition: opacity 0.3s ease;
  }
  .screen-transition[hidden] {
    display: none !important;
  }
  .screen-entering {
    opacity: 0;
  }
  .screen-visible {
    opacity: 1;
  }
  ```
- Nota: se usará JS para quitar `hidden`, añadir `screen-entering`, forzar reflow, luego añadir `screen-visible`

### 5) Añadir CSS: spinner de carga
- En `styles.css`: añadir estilos del spinner:
  ```css
  /* === Loading spinner === */
  #loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .spinner-text {
    font-size: 0.85rem;
    color: var(--color-text);
    opacity: 0.75;
  }
  ```

### 6) Añadir CSS: input de nombre del jugador
- En `styles.css`, dentro del bloque `/* === Lobby === */`:
  ```css
  .lobby-description {
    font-size: 0.95rem;
    color: var(--color-text);
    opacity: 0.8;
    text-align: center;
    max-width: 380px;
    line-height: 1.5;
  }
  .player-name-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    width: 100%;
    max-width: 280px;
  }
  .player-name-group label {
    font-size: 0.8rem;
    color: var(--color-text);
    opacity: 0.75;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  #input-player-name {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.95rem;
    text-align: center;
    color: var(--color-heading);
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: 5px;
    outline: none;
    transition: border-color 0.15s ease;
  }
  #input-player-name:focus {
    border-color: var(--color-primary);
  }
  ```

### 7) Añadir CSS: botón "?" y modal de reglas
- En `styles.css`: añadir estilos para el botón "?" posicionado en el header:
  ```css
  /* === Rules button === */
  header {
    position: relative; /* needed for absolute positioning of btn-rules */
  }
  .btn-rules {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-heading);
    background: var(--color-btn-bg);
    border: 2px solid var(--color-border);
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .btn-rules:hover {
    background: var(--color-btn-hover);
    border-color: var(--color-btn-hover);
  }
  ```
- Añadir estilos del modal de reglas:
  ```css
  /* === Rules modal === */
  #rules-modal {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rules-overlay {
    position: absolute;
    inset: 0;
    background: rgba(10, 22, 40, 0.88);
  }
  .rules-dialog {
    position: relative;
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: 8px;
    padding: 2rem;
    max-width: 480px;
    width: 90%;
    max-height: 85vh;
    overflow-y: auto;
    z-index: 1;
  }
  .rules-dialog h2 {
    color: var(--color-heading);
    font-size: 1.25rem;
    margin-bottom: 1.25rem;
    padding-right: 2rem;
  }
  #btn-close-rules {
    position: absolute;
    top: 1rem;
    right: 1rem;
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
  #btn-close-rules:hover {
    color: var(--color-heading);
    background: var(--color-btn-bg);
  }
  .rules-section {
    margin-bottom: 1.25rem;
  }
  .rules-section h3 {
    color: var(--color-primary);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 0.5rem;
  }
  .rules-section p,
  .rules-section ol,
  .rules-section li {
    font-size: 0.9rem;
    color: var(--color-text);
    line-height: 1.6;
  }
  .rules-section ol {
    padding-left: 1.25rem;
  }
  .rules-section ol li {
    margin-bottom: 0.3rem;
  }
  .rules-ships {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .rules-ships li {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    padding: 0.25rem 0.5rem;
    background: var(--color-cell-bg);
    border-radius: 4px;
    color: var(--color-text);
  }
  .rules-ship-size {
    color: var(--color-primary);
    font-weight: 600;
  }
  ```

### 8) JS: funciones helper de transición y spinner
- En `game.js`, dentro del IIFE, añadir funciones helper:
  ```js
  function showScreen(el) {
    if (!el) return;
    el.hidden = false;
    el.classList.add('screen-transition', 'screen-entering');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.remove('screen-entering');
        el.classList.add('screen-visible');
      });
    });
  }

  function hideScreen(el) {
    if (!el || el.hidden) return;
    el.classList.add('screen-transition');
    el.classList.remove('screen-visible');
    el.addEventListener('transitionend', function handler() {
      el.removeEventListener('transitionend', handler);
      el.hidden = true;
      el.classList.remove('screen-transition', 'screen-entering');
    }, { once: true });
  }

  function showSpinner() {
    var lobby = document.getElementById('lobby');
    var spinner = document.getElementById('loading-spinner');
    var form = document.getElementById('join-form');
    var btn = document.getElementById('btn-create-room');
    var nameGroup = document.querySelector('.player-name-group');
    var divider = document.querySelector('.lobby-divider');
    if (spinner) spinner.hidden = false;
    if (form) form.hidden = true;
    if (btn) btn.hidden = true;
    if (nameGroup) nameGroup.hidden = true;
    if (divider) divider.hidden = true;
  }

  function hideSpinner() {
    var spinner = document.getElementById('loading-spinner');
    var form = document.getElementById('join-form');
    var btn = document.getElementById('btn-create-room');
    var nameGroup = document.querySelector('.player-name-group');
    var divider = document.querySelector('.lobby-divider');
    if (spinner) spinner.hidden = true;
    if (form) form.hidden = false;
    if (btn) btn.hidden = false;
    if (nameGroup) nameGroup.hidden = false;
    if (divider) divider.hidden = false;
  }
  ```

### 9) JS: leer nombre del jugador
- En `DOMContentLoaded`, antes de los listeners de lobby, añadir:
  ```js
  // Player name
  var playerNameInput = document.getElementById('input-player-name');
  function getPlayerName() {
    return (playerNameInput && playerNameInput.value.trim()) || 'Jugador 1';
  }
  window.Game.playerName = getPlayerName();
  if (playerNameInput) {
    playerNameInput.addEventListener('input', function () {
      window.Game.playerName = getPlayerName();
    });
  }
  ```
- En `window.Game`, añadir `playerName: 'Jugador 1'` al objeto expuesto al final

### 10) JS: actualizar lobby para usar spinner y showScreen/hideScreen
- En el handler de `btn-create-room`:
  - Reemplazar `setLobbyFormEnabled(false)` + `setLobbyStatus(...)` con `showSpinner()`
  - Guardar `window.Game.playerName = getPlayerName()` antes de `createRoom`
  - En caso de error: `hideSpinner()` + `setLobbyStatus(...)`
- En el handler de `join-form submit`:
  - Reemplazar `setLobbyFormEnabled(false)` + `setLobbyStatus(...)` con `showSpinner()`
  - Guardar `window.Game.playerName = getPlayerName()` antes de `joinRoom`
  - En caso de error: `hideSpinner()` + `setLobbyStatus(...)`
- En `handleBothConnected`: reemplazar asignaciones directas de `.hidden` con `hideScreen(lobby)` y `showScreen(gameContainer)`
- En `handleGameFinished`: reemplazar asignaciones directas de `.hidden` con `hideScreen(gameContainer)` y `showScreen(endScreen)`
- Actualizar mensajes de `#game-status` en `handleBothReady`, `handleTurnChange`, `onReady` para ser más descriptivos de la fase

### 11) JS: modal de reglas
- En `DOMContentLoaded`:
  ```js
  var btnRules = document.getElementById('btn-rules');
  var rulesModal = document.getElementById('rules-modal');
  var btnCloseRules = document.getElementById('btn-close-rules');
  var rulesOverlay = document.querySelector('.rules-overlay');

  function openRules() {
    if (!rulesModal) return;
    rulesModal.hidden = false;
    btnCloseRules && btnCloseRules.focus();
  }
  function closeRules() {
    if (!rulesModal) return;
    rulesModal.hidden = true;
    btnRules && btnRules.focus();
  }

  if (btnRules) btnRules.addEventListener('click', openRules);
  if (btnCloseRules) btnCloseRules.addEventListener('click', closeRules);
  if (rulesOverlay) rulesOverlay.addEventListener('click', closeRules);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && rulesModal && !rulesModal.hidden) closeRules();
  });
  ```

### 12) Final Validation
- Ejecutar todos los `Validation Commands` para asegurar cero regresiones.

## Testing Strategy

### Manual Testing
1. **Home screen**: Abrir `localhost:8000` → verificar título "Batalla Naval Patagonian", descripción y input de nombre
2. **Nombre**: Escribir un nombre → crear sala → verificar que `window.Game.playerName` tiene el valor correcto en consola
3. **Spinner**: Hacer clic en "Crear sala" → verificar spinner aparece, formulario desaparece
4. **Transiciones**: Crear sala con dos pestañas → al conectarse el 2do jugador, verificar fade-out del lobby y fade-in del tablero
5. **Reglas**: Hacer clic en "?" → modal aparece con reglas → Escape cierra el modal → clic fuera cierra el modal → Tab navega dentro del modal
6. **Flujo completo**: Partida completa → verificar transición suave a la pantalla de fin
7. **Mensajes de estado**: Verificar mensajes claros en cada fase (lobby, colocación, combate, fin)

### Automated Tests
No hay tests automáticos en el proyecto. La validación es manual con el servidor local.

### Edge Cases
- **Input de nombre vacío**: debe default a "Jugador 1" (nunca enviar string vacío)
- **Modal con Tab**: el foco debe quedar atrapado dentro del modal (o al menos ir al botón cerrar)
- **Transición sin Firebase**: si Firebase falla, el spinner debe ocultarse y mostrar el error en `#lobby-status`, restaurando los controles
- **Doble clic en "Crear sala"**: el spinner ocultará los botones, previniendo doble envío
- **Responsive**: el modal debe ser usable en móvil (max-width: 90%, scroll vertical)
- **Reduced motion**: las transiciones deben respetarse — añadir al bloque `@media (prefers-reduced-motion: reduce)` la propiedad `transition: none` para `.screen-transition`

## Acceptance Criteria
- El título del juego muestra "Batalla Naval Patagonian" en la pantalla de inicio
- Hay una descripción breve del juego visible en la pantalla de inicio
- El jugador puede ingresar su nombre (default "Jugador 1") antes de crear/unirse a una sala
- Un spinner de carga reemplaza el formulario mientras se conecta a Firebase
- Las transiciones entre lobby → juego y juego → fin son suaves (fade de 300ms)
- El botón "?" en el header abre un modal con las reglas del juego
- El modal de reglas cierra con Escape, con el botón "×" o haciendo clic fuera
- Los mensajes de `#game-status` son claros en cada fase del juego
- La funcionalidad existente (crear sala, unirse, colocar barcos, atacar, ganar) sigue funcionando sin regresiones

## Validation Commands
- `python -m http.server 8000` (iniciar servidor de desarrollo en `localhost:8000`)
- Verificar manualmente el flujo completo con dos pestañas del navegador
- Revisar consola del navegador: sin errores JS durante el flujo completo

## Notes
- El spinner usa CSS puro (keyframe `spin`) sin dependencias externas — consistente con el stack sin librerías.
- Las transiciones de fase usan `requestAnimationFrame` doble para forzar reflow entre añadir `.screen-entering` y `.screen-visible`, garantizando que la transición CSS se active.
- `hideScreen` usa `transitionend` para poner `hidden = true` solo después de que la animación termina, evitando saltos visuales.
- El modal de reglas no requiere focus trap completo en esta versión; se priorizó apertura/cierre accesible.
- `window.Game.playerName` queda disponible para features futuras (chat, ranking, etc.).
- No se modifican `firebase-game.js` ni `placement.js`.
