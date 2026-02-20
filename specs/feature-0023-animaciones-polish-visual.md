# Feature: Animaciones y Polish Visual

## Feature Description
Añade animaciones CSS y mejoras visuales a lo largo del juego para hacer la experiencia más fluida, expresiva y satisfactoria. El foco está en feedback inmediato en los eventos más importantes del juego (ataque, hundimiento, cambio de turno, victoria/derrota) sin añadir complejidad ni librerías externas. Todas las animaciones respetan `prefers-reduced-motion`.

## User Story
As a player
I want visual animations and feedback when I attack, sink ships, or win/lose
So that the game feels alive, responsive, and emotionally satisfying

## Problem Statement
Actualmente el juego es funcional pero visualmente plano: los ataques solo cambian el color de celda, el cambio de turno es un cambio de texto, y la pantalla de fin de juego aparece sin dramatismo. El jugador no recibe refuerzo visual que haga sentir el peso de cada decisión.

## Solution Approach
Añadir animaciones puramente con CSS `@keyframes` y clases JS aplicadas temporalmente. No se agrega ninguna librería. Se sigue el patrón existente de clases utilitarias (`.screen-transition`, `.spinner`, etc.) y se extiende `styles.css`. Los disparadores de animación se aplican en `game.js` (donde ocurre la lógica de ataque, victoria, turno).

Las animaciones propuestas:
1. **Impacto en celda**: pulso rojo al hacer `hit`, ondulación azul-gris al hacer `miss`
2. **Barco hundido**: flash + animación secuencial en las celdas del barco hundido en ambos tableros
3. **Cambio de turno**: el `#turn-indicator` realiza un glow-pulse cuando es tu turno
4. **Pantalla de fin**: el contenido de `#end-screen` hace fade-in + scale desde abajo
5. **Modal de reglas**: la `.rules-dialog` anima con slide-fade al abrir
6. **Toast de notificación**: el `#game-status` realiza un breve "pop" al cambiar de mensaje importante
7. **Historial de ataques**: nuevos ítems hacen slide-in desde arriba

## Relevant Files

- `css/styles.css` — Donde se agregan todos los `@keyframes` y clases de animación nuevas. Ya tiene la media query `prefers-reduced-motion`.
- `js/game.js` — Donde se disparan los eventos de ataque (`handleAttacksChange`), turno (`handleTurnChange`), victoria (`handleGameFinished`), y hundimiento de barcos. Es el único lugar donde se aplican clases de animación en JS.
- `index.html` — Sin cambios estructurales. Solo se verifica que los elementos objetivo ya existan.

### New Files
_(ninguno — todo se añade sobre los archivos existentes)_

## Implementation Plan

### Phase 1: Foundation — Keyframes CSS
Definir todos los `@keyframes` y clases de animación utilitarias en `styles.css`. No se toca ningún JS todavía.

### Phase 2: Core Implementation — Conectar JS
En `game.js`, aplicar las clases de animación en los momentos correctos:
- Al registrar ataque (`handleAttacksChange`): clase `cell--anim-hit` o `cell--anim-miss`
- Al hundir barco: clase `cell--anim-sunk` en las celdas del barco
- Al cambiar turno (`handleTurnChange`): clase `turn-indicator--pulse`
- Al terminar el juego (`handleGameFinished`): clase `end-screen--enter` en `#end-screen`
- Al actualizar `#game-status` con mensajes importantes: clase temporal `status--pop`

### Phase 3: Integration — Modal y Historial
- Animar `.rules-dialog` al abrir/cerrar con clases controladas en `game.js`
- Animar nuevos ítems de `#attack-history-list` con clase `attack-history-item--new`
- Verificar que `prefers-reduced-motion` supprime todas las animaciones

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Añadir @keyframes en styles.css
- Añadir `@keyframes cell-hit-pulse`: escala 1→1.3→1 con fondo rojo brillante, 0.4s
- Añadir `@keyframes cell-miss-ripple`: ondulación con sombra interna, 0.4s
- Añadir `@keyframes cell-sunk-flash`: parpadeo rojo intenso → rojo apagado, 0.6s
- Añadir `@keyframes turn-glow-pulse`: box-shadow creciente en color primario, 1.2s infinite
- Añadir `@keyframes end-screen-enter`: translateY(30px) opacity(0) → translateY(0) opacity(1), 0.5s
- Añadir `@keyframes status-pop`: escala 1→1.08→1, 0.25s
- Añadir `@keyframes slide-in-down`: translateY(-12px) opacity(0) → translateY(0) opacity(1), 0.2s
- Añadir `@keyframes dialog-enter`: translateY(-20px) opacity(0) → translateY(0) opacity(1), 0.25s ease-out
- Verificar que **ninguna** clase nueva rompe estilos existentes

### 2) Añadir clases CSS utilitarias en styles.css
- `.cell--anim-hit` → aplica `animation: cell-hit-pulse 0.4s ease-out`
- `.cell--anim-miss` → aplica `animation: cell-miss-ripple 0.4s ease-out`
- `.cell--anim-sunk` → aplica `animation: cell-sunk-flash 0.6s ease-out`
- `.turn-indicator--pulse` → aplica `animation: turn-glow-pulse 1.2s ease-in-out infinite`; se quita cuando termina el turno
- `.end-screen--enter > *` → aplica `animation: end-screen-enter 0.5s ease-out both`
- `.status--pop` → aplica `animation: status-pop 0.25s ease-out`
- `.attack-history-item--new` → aplica `animation: slide-in-down 0.2s ease-out`
- `.rules-dialog--enter` → aplica `animation: dialog-enter 0.25s ease-out`
- Añadir dentro de `@media (prefers-reduced-motion: reduce)` la supresión de todas estas clases: `animation: none !important`

### 3) Animación de ataque en game.js — handleAttacksChange
- En el bloque donde se aplica `cell--attacked--hit` o `cell--attacked--miss` (ataque propio, línea ~235): añadir clase `cell--anim-hit` o `cell--anim-miss` y removerla con `setTimeout` de 500ms
- En el bloque donde se aplica `cell--hit-received` o `cell--miss-received` (ataque recibido, línea ~228): misma lógica de clase temporal
- Verificar: no se añade la clase si el elemento ya tiene el estado de ataque aplicado (para evitar re-animación en re-sync)

### 4) Animación de barco hundido en game.js — updateFleetPanels
- Cuando se detecta un `newlySunk.length > 0` (línea ~172), obtener las celdas del barco hundido de `roomData`
- Buscar cada celda del barco en el tablero enemigo (prefijo `enemy-cell-`) y aplicar `cell--anim-sunk`
- Remover la clase con `setTimeout` de 700ms
- Si el barco es del jugador local (hundido por el oponente), aplicar en el tablero propio (sin prefijo)

### 5) Animación de turno en game.js — handleTurnChange
- Al inicio de `handleTurnChange`: remover `turn-indicator--pulse` del indicator (limpieza)
- Si `_isMyTurn === true`: añadir `turn-indicator--pulse` tras un `requestAnimationFrame`
- Si `_isMyTurn === false`: no añadir la clase (oponente atacando, no hay glow)

### 6) Animación de pantalla de fin en game.js — handleGameFinished
- Después de `showScreen(endScreen)` (línea ~281): añadir clase `end-screen--enter` a `endScreen`
- Remover la clase con `setTimeout` de 600ms (o tras `animationend` listener)

### 7) Animación de status pop en game.js
- Crear helper `popStatus(message)`:
  ```js
  function popStatus(message) {
    var el = document.getElementById('game-status');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('status--pop');
    void el.offsetWidth; // reflow para re-trigger
    el.classList.add('status--pop');
    el.addEventListener('animationend', function h() {
      el.classList.remove('status--pop');
      el.removeEventListener('animationend', h);
    });
  }
  ```
- Reemplazar los `status.textContent = ...` en `handleTurnChange` y la notificación de barco hundido con `popStatus(message)`

### 8) Animación de ítems de historial en game.js — handleAttacksChange
- Al crear cada `<li>` en `historyList` (línea ~252): añadir clase `attack-history-item--new` solo al primer elemento de `recent` (el más nuevo)
- El CSS anima con `slide-in-down`, la clase persiste (no necesita removerse, la animación no se repite)

### 9) Animación de modal de reglas en game.js
- En `openRules()` (línea ~386): tras `rulesModal.hidden = false`, añadir `rules-dialog--enter` a `.rules-dialog`
- Remover la clase en `animationend`
- En `closeRules()`: no animar salida (complejidad innecesaria, el hidden es inmediato y funcional)

### 10) Final Validation
- Ejecutar todos los `Validation Commands` para asegurar cero regresiones

## Testing Strategy

### Manual Testing
- Atacar una celda enemiga → verificar pulso rojo (hit) u ondulación gris (miss) visible
- Hundir un barco → verificar flash en celdas del barco en tablero enemigo
- Cambiar turno → verificar glow-pulse en `#turn-indicator` solo cuando es tu turno
- Terminar partida → verificar que `#end-screen` hace fade-in animado
- Abrir modal de reglas → verificar slide-fade de `.rules-dialog`
- Nuevo ítem en historial → verificar slide-in del ítem más reciente
- Mensaje de barco hundido → verificar pop en `#game-status`

### Automated Tests
No aplica — el proyecto no tiene test runner configurado.

### Edge Cases
- **prefers-reduced-motion**: activar en OS y verificar que todas las animaciones están suprimidas y el juego sigue siendo funcional
- **Re-sync de Firebase**: `handleAttacksChange` puede llamarse varias veces con los mismos ataques; verificar que la animación de hit/miss no se re-dispara para celdas ya procesadas (condición `if (!el.classList.contains(...))` ya existente)
- **Celda hundida rápida**: si dos barcos se hunden en rápida sucesión, las clases `cell--anim-sunk` deben ser independientes por celda
- **Móviles**: las animaciones CSS son performantes (solo `transform` y `opacity` en GPU salvo background), verificar en viewport estrecho
- **Turno inicial**: el primer `handleTurnChange` puede ocurrir antes de que el jugador vea el tablero — verificar que la clase `turn-indicator--pulse` se aplica correctamente tras `requestAnimationFrame`

## Acceptance Criteria
- Al hacer `hit` en celda enemiga, se ve un pulso visual antes de que quede el color rojo permanente
- Al hacer `miss`, se ve una ondulación antes de que quede el color gris permanente
- Al hundirse un barco, las celdas del barco parpadean durante ~600ms
- El `#turn-indicator` pulsa con glow cuando es el turno del jugador local
- La pantalla de fin (`#end-screen`) aparece con animación de entrada (fade + translate)
- El modal de reglas anima al abrirse
- Los mensajes de estado importantes (turno, barco hundido) hacen "pop"
- Con `prefers-reduced-motion: reduce`, ninguna animación se reproduce; el juego es 100% funcional
- No se introducen regresiones en la lógica existente (colocación, ataques, victoria)

## Validation Commands
- `python -m http.server 8000` — Iniciar servidor y verificar en `http://localhost:8000`
- Abrir devtools → pestaña Performance → grabar 5 ataques → verificar que no hay layout thrashing (sin reflows costosos)
- Activar `prefers-reduced-motion` en OS o devtools → verificar ausencia de animaciones

## Notes
- Todas las animaciones usan solo `transform` y `opacity` donde es posible, para aprovechar la aceleración GPU y evitar reflows. Las que modifican `background` (hit pulse, sunk flash) son aceptables ya que son de corta duración y el elemento es pequeño.
- El helper `popStatus` usa el patrón `void el.offsetWidth` (reflow intencional y mínimo) para garantizar que la animación CSS se re-dispara correctamente cuando el mensaje cambia rápido.
- No se añaden librerías externas. Todo CSS puro + manipulación de clases JS.
- La animación de salida del modal de reglas se omite intencionalmente para mantener la simplicidad; el cierre inmediato es preferible a una animación que el usuario puede no llegar a ver si hace click rápido.
