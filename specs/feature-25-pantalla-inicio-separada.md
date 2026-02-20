# Feature: Pantalla de Inicio Separada del Lobby

## Feature Description
Separar la pantalla de inicio (home) del lobby en dos pantallas distintas. Actualmente, el título del juego aparece duplicado (en el `<header>` y dentro del `#lobby`), y el botón "?" de reglas está posicionado de forma absoluta sobre el header, superponiéndose visualmente al título. Esta funcionalidad crea una pantalla de inicio independiente con título, descripción y botón de reglas correctamente posicionado, mientras que el lobby queda limpio con solo los controles de sala.

## User Story
As a visitor
I want to see una pantalla de inicio atractiva antes del lobby
So that pueda entender el juego de un vistazo y navegar a la pantalla de lobby con una transición suave

## Problem Statement
El flujo actual mezcla el título del juego con el formulario del lobby en una sola pantalla, generando duplicación del título (header `<h1>` + `<h2>` dentro del lobby). Además, el botón "?" de reglas usa `position: absolute` relativo al header, superponiéndose al título. No existe una pantalla de inicio dedicada que sirva de punto de entrada claro al juego.

## Solution Approach
1. Añadir una nueva `<section id="home-screen">` visible por defecto que muestre el título, descripción y botón "Jugar".
2. Reubicar el botón "?" al `#home-screen`, posicionado como `absolute` relativo a la sección (no al header) para evitar superposición.
3. Eliminar el `<h1>` y el `btn-rules` del `<header>` — el header queda minimalista con solo `#game-status` y `#turn-indicator`.
4. Eliminar el `<h2 class="lobby-title">` y `<p class="lobby-description">` del `#lobby` y añadir `hidden` inicial al lobby.
5. Conectar el botón "Jugar" mediante `hideScreen(homeScreen)` + `showScreen(lobby)` usando el sistema existente.

## Relevant Files

- `index.html` — Añadir `#home-screen`, retirar `<h1>` y `btn-rules` del header, retirar el título y descripción del lobby, añadir `hidden` al lobby.
- `css/styles.css` — Añadir estilos para `#home-screen` y `#btn-play`; ajustar header sin h1; limpiar `.lobby-title` y `.lobby-description` (ya no aplican al lobby).
- `js/game.js` — Añadir listener para `btn-play` que hace la transición home → lobby; inicializar home screen visible al cargar.

## Implementation Plan

### Phase 1: Foundation
Ajustar la estructura HTML para separar las dos pantallas:
- Nueva sección `#home-screen` con título, descripción, botón "?" y botón "Jugar".
- Header minimalista sin `<h1>` ni `btn-rules`.
- Lobby sin título ni descripción, con `hidden` por defecto.

### Phase 2: Core Implementation
CSS para la nueva pantalla:
- `#home-screen` centrado verticalmente con diseño hero.
- `#btn-play` prominente (estilo similar a `#btn-create-room` pero más grande).
- `.btn-rules` reposicionado como `absolute` dentro de `#home-screen` (esquina superior derecha).
- Header reducido a solo barra de estado.

### Phase 3: Integration
JS para conectar el flujo:
- Al cargar, mostrar `#home-screen` directamente (ya visible por defecto, sin `hidden`).
- Listener en `btn-play` → `hideScreen(homeScreen)` + `showScreen(lobby)`.
- El lobby se oculta y el home-screen se muestra al recargar la página (flujo "Salir" / "Revancha" ya usa `window.location.reload()`).
- Las funciones `showSpinner`/`hideSpinner` hacen `querySelector('.lobby-description')` que devuelve `null` sin el elemento → ya manejado con `if (desc)` existente, sin cambios necesarios.

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Modificar `index.html` — Añadir `#home-screen`
- Antes de `<section id="lobby">`, insertar:
  ```html
  <section id="home-screen">
    <button id="btn-rules" type="button" class="btn-rules" aria-label="Ver reglas del juego">?</button>
    <h1>Batalla Naval Patagonian</h1>
    <p class="home-description">Hundir la flota enemiga antes de que hundan la tuya.<br>Para dos jugadores en tiempo real.</p>
    <button id="btn-play" type="button">Jugar</button>
  </section>
  ```
- Eliminar `<h1>Batalla Naval Patagonian</h1>` del `<header>`.
- Eliminar `<button id="btn-rules" ...>` del `<header>`.
- Añadir atributo `hidden` a `<section id="lobby">`.
- Eliminar `<h2 class="lobby-title">Batalla Naval Patagonian</h2>` del `#lobby`.
- Eliminar `<p class="lobby-description">...</p>` del `#lobby`.
- Verificar que el HTML renderiza correctamente en el navegador.

### 2) Modificar `css/styles.css` — Estilos para home screen
- Añadir estilos para `#home-screen`:
  ```css
  #home-screen {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 80vh;
    gap: 1.5rem;
    padding: 2rem 1rem;
  }
  ```
- Añadir estilos para el `<h1>` dentro de `#home-screen`:
  ```css
  #home-screen h1 {
    color: var(--color-heading);
    font-size: 2.5rem;
    letter-spacing: 0.06em;
    text-align: center;
  }
  ```
- Añadir estilos para `.home-description`:
  ```css
  .home-description {
    color: var(--color-text);
    font-size: 1.05rem;
    text-align: center;
    line-height: 1.6;
  }
  ```
- Añadir estilos para `#btn-play`:
  ```css
  #btn-play {
    padding: 0.85rem 3rem;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--color-heading);
    background: var(--color-primary);
    border: 2px solid var(--color-primary);
    border-radius: 5px;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  #btn-play:hover {
    background: #1a6fbf;
    border-color: #1a6fbf;
  }
  ```
- Ajustar `.btn-rules` para que sea `position: absolute` relativo a `#home-screen` (esquina superior derecha), no al header:
  - La regla de `.btn-rules` ya existe. Verificar que `header { position: relative; }` no interfiere al mover el botón a `#home-screen`.
  - El botón queda dentro de `#home-screen` que tendrá `position: relative`, por lo que `position: absolute; top: 1rem; right: 1rem;` seguirá funcionando correctamente.
- Ajustar el `header`:
  - Eliminar o reducir `header h1` si aún existe (ya no hay `<h1>` en header).
  - Reducir el padding del header si queda muy vacío, por ejemplo a `padding: 0.5rem 1rem`.
- Eliminar o dejar los estilos de `.lobby-title` y `.lobby-description` (ya no hay elementos con esas clases en el HTML, así que no causan daño; se pueden limpiar).
- Verificar que la pantalla se ve correctamente en el navegador.

### 3) Modificar `js/game.js` — Conectar navegación home → lobby
- En el bloque `document.addEventListener('DOMContentLoaded', ...)`, añadir al inicio:
  ```js
  // --- Home screen → Lobby navigation ---
  var homeScreen = document.getElementById('home-screen');
  var lobbyScreen = document.getElementById('lobby');
  var btnPlay = document.getElementById('btn-play');
  if (btnPlay) {
    btnPlay.addEventListener('click', function () {
      hideScreen(homeScreen);
      showScreen(lobbyScreen);
    });
  }
  ```
- Verificar que `showScreen` y `hideScreen` ya son accesibles en el scope donde se añade el código (sí, están en el mismo IIFE de `game.js`).
- Verificar que al hacer clic en "Jugar" aparece el lobby con la transición suave existente.
- Verificar que el botón "?" en `#home-screen` abre correctamente el modal de reglas (el listener usa `document.getElementById('btn-rules')` que ahora apunta al nuevo elemento).

### 4) Validación del flujo completo
- Cargar la página → se muestra `#home-screen` con título grande, descripción y botón "Jugar".
- Botón "?" en home screen → abre modal de reglas sin superponerse al título.
- Botón "Jugar" → transición suave a `#lobby` (sin título duplicado).
- En el lobby: crear sala o unirse → flujo de colocación → combate → fin.
- "Salir" o "Revancha" en pantalla de fin → `window.location.reload()` → vuelve a `#home-screen`.
- Verificar que el header muestra `#game-status` correctamente durante las fases de juego.

### 5) Final Validation
- Ejecutar todos los `Validation Commands` para asegurar cero regresiones.

## Testing Strategy

### Manual Testing
- Abrir `http://localhost:8000` → verificar que aparece `#home-screen` (no el lobby).
- Verificar que el título "Batalla Naval Patagonian" NO aparece duplicado en ninguna pantalla.
- Verificar que el botón "?" está en la esquina superior derecha de la sección home, sin superponerse al `<h1>`.
- Hacer clic en "Jugar" → verificar transición animada de 0.3s hacia el lobby.
- En el lobby verificar que NO aparece el título del juego (solo nombre, crear/unirse).
- Probar con dos pestañas: flujo completo Inicio → Lobby → Colocación → Combate → Fin → Salir → Inicio.
- Verificar que el modal de reglas funciona (abrir/cerrar con "?", con overlay click, con Escape).

### Automated Tests
No hay suite de tests automatizados en el proyecto. La validación es manual.

### Edge Cases
- **Pantallas pequeñas**: verificar que `min-height: 80vh` no causa scroll en móvil; ajustar si es necesario.
- **Teclado**: el botón "Jugar" debe ser focusable y activable con Enter/Space.
- **Sin JavaScript**: el `hidden` en `#lobby` dejará el lobby invisible; aceptable en SPA con JS requerido.
- **Recarga durante juego**: `window.location.reload()` vuelve correctamente a `#home-screen` (visible por defecto).
- **Múltiples clicks en "Jugar"**: si se hace doble-click, `hideScreen` es idempotente (verifica `el.hidden`), no hay side effects.

## Acceptance Criteria
- El header NO muestra el título "Batalla Naval Patagonian" en ninguna fase del juego.
- La pantalla de inicio muestra el título grande, descripción breve y botón "?" correctamente posicionado (no superpuesto al título).
- El botón "Jugar" lleva al lobby con la transición suave existente (`screen-transition`).
- El lobby NO muestra el título "Batalla Naval Patagonian".
- El flujo completo Inicio → Lobby → Colocación → Combate → Fin funciona sin regresiones.
- La transición Inicio → Lobby usa `showScreen`/`hideScreen` consistentemente con el resto de la app.

## Validation Commands
- `python -m http.server 8000` (servidor de desarrollo en `http://localhost:8000`)
- Validación HTML manual en el navegador (no hay linter configurado)
- No hay suite de tests automatizados — verificar flujo completo manualmente con dos pestañas

## Notes
- El `btn-rules` conserva su ID (`btn-rules`) al moverse al home-screen, por lo que el listener JS existente en `game.js` no requiere cambios de selector.
- Las funciones `showSpinner`/`hideSpinner` hacen `querySelector('.lobby-description')` que devolverá `null` tras eliminar el párrafo del lobby — el `if (desc)` existente lo maneja silenciosamente.
- Se mantiene `window.location.reload()` en "Salir" y "Revancha" como comportamiento existente; volver al home sin recargar sería una mejora futura separada.
- No se añaden librerías externas.
