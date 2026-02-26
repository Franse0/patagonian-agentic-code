# Feature: Toggle tablero propio durante el combate

## Feature Description
Durante la fase de combate se muestran dos tableros simultáneos: el propio ("Tu tablero") y
el del enemigo ("Tablero enemigo"). En pantallas pequeñas ambos tableros se apilan
verticalmente, ocupando mucho espacio vertical y obligando al jugador a hacer scroll para
alternar entre atacar y verificar daños recibidos. Esta feature agrega un botón de toggle
que permite al jugador alternar el foco entre "Ver mi tablero" y "Ver tablero enemigo",
ocultando el tablero que no se necesita en ese momento.

## User Story
As a jugador en combate (especialmente en móvil)
I want alternar entre ver mi tablero y el tablero enemigo con un botón
So that pueda revisar el daño recibido en mi flota o planear ataques sin hacer scroll,
teniendo siempre un tablero a la vista de manera cómoda

## Problem Statement
En pantallas pequeñas (≤900px) los dos tableros se apilan verticalmente. Para ver el
tablero propio (y verificar qué barcos han sido golpeados) el jugador debe hacer scroll
hacia arriba, y para atacar debe volver a bajar. No hay forma de cambiar rápidamente de
tablero sin scroll. Esto perjudica la experiencia de juego en dispositivos móviles.

## Solution Approach
1. Agregar un botón `#btn-toggle-board` en `#game-container` (solo visible durante el
   combate, oculto durante la colocación).
2. Al hacer clic, el botón alterna entre dos vistas usando una clase CSS modificadora
   `--showing-own` sobre `#game-container`:
   - **Vista enemiga** (default): `#enemy-column` visible, `#player-column` oculto.
   - **Vista propia**: `#player-column` visible, `#enemy-column` oculto.
3. El texto y `aria-label` del botón se actualizan para reflejar el tablero que se puede
   ver al hacer clic (no el actual).
4. En desktop (>900px) ambos tableros se mantienen visibles y el botón actúa como "foco"
   que acorta la columna opuesta, o bien permanece funcional para usuarios que prefieran
   ver solo uno a la vez.

## Relevant Files

- `index.html` — Aquí se agrega el elemento `<button id="btn-toggle-board">` dentro de
  `#game-container`, oculto (`hidden`) por defecto.
- `js/game.js` — Aquí se implementa la lógica del toggle: mostrar el botón al iniciar
  combate (en `handleTurnChange`), manejar el click, y actualizar clases CSS y texto del
  botón.
- `css/styles.css` — Aquí se agregan los estilos del botón y las reglas de visibilidad
  para `.board-column` cuando `#game-container` tiene la clase `--showing-own`.

## Implementation Plan

### Phase 1: Foundation — Estructura HTML y CSS de ocultamiento
Agregar el botón de toggle en el HTML (oculto por defecto) y las reglas CSS que controlan
la visibilidad de cada columna según el estado del contenedor.

### Phase 2: Core Implementation — Lógica JS del toggle
Implementar en `game.js`: mostrar el botón cuando empieza el combate, manejar el click
para alternar la clase `--showing-own` en `#game-container`, y actualizar el texto y
atributos de accesibilidad del botón.

### Phase 3: Integration — Pulido responsive y accesibilidad
Verificar que en desktop (>900px) el comportamiento es coherente (ambos tableros visibles
no requieren toggle pero el botón puede funcionar). Asegurar que el estado del toggle se
resetea correctamente al terminar la partida (transición a end-screen). Verificar
aria-labels y estado `aria-pressed`.

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Agregar botón `#btn-toggle-board` en `index.html`
- Localizar `<main id="game-container" hidden>` (línea 45)
- Agregar el botón inmediatamente después de la etiqueta `<main id="game-container" hidden>`,
  antes de las secciones de columnas:
  ```html
  <button id="btn-toggle-board" type="button" hidden
          aria-pressed="false"
          aria-label="Ver mi tablero">
    Ver mi tablero
  </button>
  ```
- El atributo `hidden` lo mantiene oculto durante la colocación; se revelará por JS

### 2) Agregar estilos CSS en `css/styles.css`
- Dentro del bloque `/* === Responsive === */` o debajo del bloque de `.board-column`,
  agregar las reglas de toggle y el estilo del botón:

```css
/* === Board toggle button === */
#btn-toggle-board {
  display: none; /* oculto en desktop por defecto */
  padding: 0.5rem 1.1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-heading);
  background: var(--color-btn-bg);
  border: 2px solid var(--color-border);
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
  align-self: center;
}

#btn-toggle-board:hover {
  background: var(--color-btn-hover);
  border-color: var(--color-btn-hover);
}

#btn-toggle-board[aria-pressed="true"] {
  background: var(--color-primary);
  border-color: var(--color-primary);
}
```

- Agregar reglas de visibilidad de columnas dentro del bloque `@media (max-width: 900px)`:

```css
@media (max-width: 900px) {
  /* Mostrar botón de toggle solo en mobile */
  #btn-toggle-board:not([hidden]) {
    display: inline-flex;
  }

  /* Vista por defecto: ocultar tablero propio, mostrar enemigo */
  #player-column {
    display: none;
  }

  /* Al activar el toggle: mostrar tablero propio, ocultar enemigo */
  #game-container.--showing-own #player-column {
    display: flex;
  }

  #game-container.--showing-own #enemy-column {
    display: none;
  }
}
```

### 3) Implementar lógica del toggle en `js/game.js`
- Localizar la función `handleTurnChange` (línea ~245)
- Al inicio del bloque donde se muestra `fleet-status` (línea ~247), agregar código para
  revelar el botón de toggle en el primer cambio de turno (inicio de combate):

```javascript
// Mostrar botón de toggle al iniciar combate
var toggleBtn = document.getElementById('btn-toggle-board');
if (toggleBtn && toggleBtn.hidden) {
  toggleBtn.hidden = false;
  toggleBtn.addEventListener('click', function () {
    var container = document.getElementById('game-container');
    var isShowingOwn = container.classList.toggle('--showing-own');
    toggleBtn.setAttribute('aria-pressed', isShowingOwn ? 'true' : 'false');
    toggleBtn.textContent = isShowingOwn ? 'Ver tablero enemigo' : 'Ver mi tablero';
    toggleBtn.setAttribute('aria-label', isShowingOwn ? 'Ver tablero enemigo' : 'Ver mi tablero');
  });
}
```

- Verificar que el listener se registra solo una vez (condición `toggleBtn.hidden` asegura
  que el bloque se ejecuta solo la primera vez)

### 4) Resetear estado del toggle al terminar la partida
- Localizar la función `handleGameFinished` (línea ~345)
- Antes de llamar a `hideScreen(gameContainer)`, agregar:

```javascript
// Resetear toggle al finalizar partida
var container = document.getElementById('game-container');
if (container) container.classList.remove('--showing-own');
var toggleBtn = document.getElementById('btn-toggle-board');
if (toggleBtn) {
  toggleBtn.hidden = true;
  toggleBtn.setAttribute('aria-pressed', 'false');
  toggleBtn.textContent = 'Ver mi tablero';
}
```

### 5) Final Validation
- Ejecutar todos los `Validation Commands` para asegurar cero regresiones.
- Verificar manualmente en viewport móvil y desktop (ver Testing Strategy).

## Testing Strategy

### Manual Testing
1. Iniciar servidor con `python -m http.server 8000`
2. Abrir dos pestañas en `http://localhost:8000`
3. Crear sala en pestaña A, unirse en pestaña B
4. Colocar todos los barcos en ambas pestañas y presionar "Listo"
5. Al iniciar el combate en **viewport móvil** (DevTools < 900px):
   - Verificar que el botón "Ver mi tablero" aparece en la UI
   - Verificar que por defecto solo se ve "Tablero enemigo"
   - Hacer clic en "Ver mi tablero" → debe mostrar el tablero propio y ocultar el enemigo
   - El botón debe cambiar a "Ver tablero enemigo"
   - Hacer clic en "Ver tablero enemigo" → vuelve a la vista del enemigo
   - El botón debe mostrar "Ver mi tablero" nuevamente
6. En **viewport desktop** (> 900px):
   - Verificar que ambos tableros son visibles simultáneamente
   - Verificar que el botón de toggle no se muestra (display: none)
7. Terminar la partida y verificar que al volver al lobby (o end-screen) el botón desaparece
8. Verificar que el tablero enemigo sigue deshabilitado (`board--disabled`) durante el turno
   del oponente independientemente del estado del toggle

### Automated Tests
No hay suite de tests automatizados en el proyecto. Las verificaciones son manuales.

### Edge Cases
- **Desktop (>900px)**: Ambos tableros siempre visibles; el botón de toggle está oculto
  (`display: none` via CSS) y no interfiere
- **Turno del oponente**: Aunque el tablero enemigo esté oculto por el toggle, la clase
  `board--disabled` se sigue aplicando correctamente; al volver a mostrar el tablero
  enemigo, el estado disabled se mantiene
- **Pantalla pequeña (≤500px)**: El botón debe caber en el layout; verificar con
  `--cell-size: 30px`
- **Re-render de Firebase**: Las clases de celdas (`cell--hit-received`, etc.) se aplican
  por ID independientemente de si la columna está visible; no hay pérdida de datos
- **Fin de partida**: El toggle se resetea y el botón se oculta antes de que se muestre
  `end-screen`, evitando estado residual en una revancha
- **Accesibilidad**: `aria-pressed` refleja el estado actual; `aria-label` describe la
  acción al hacer clic (no el estado actual)

## Acceptance Criteria
- En viewport móvil (≤900px), al iniciar el combate aparece el botón "Ver mi tablero"
- En vista por defecto (combate iniciado), solo se muestra el tablero enemigo en mobile
- Al hacer clic en "Ver mi tablero", se muestra el tablero propio y se oculta el enemigo;
  el botón cambia a "Ver tablero enemigo"
- Al hacer clic en "Ver tablero enemigo", se vuelve a la vista del tablero enemigo; el
  botón vuelve a decir "Ver mi tablero"
- En desktop (>900px), el botón de toggle no se muestra y ambos tableros son visibles
  simultáneamente sin cambios respecto al comportamiento actual
- El estado `board--disabled` del tablero enemigo se preserva correctamente
  independientemente del estado del toggle
- Al finalizar la partida, el botón desaparece y el estado del toggle se resetea

## Validation Commands
- `python -m http.server 8000` — iniciar servidor local y probar en `http://localhost:8000`

## Notes
- El botón usa la misma paleta de colores que los botones existentes (`--color-btn-bg`,
  `--color-primary`, etc.) para mantener consistencia visual.
- La clase `--showing-own` sobre `#game-container` es un modificador BEM-like que solo
  activa reglas dentro del breakpoint mobile, dejando el desktop sin cambios.
- En lugar de ocultar con `display: none` desde JS (que requeriría más lógica), el
  ocultamiento se maneja puramente con CSS según la clase del contenedor. JS solo gestiona
  agregar/quitar la clase y actualizar el texto del botón.
- El listener del toggle se registra en el primer `handleTurnChange` usando la condición
  `toggleBtn.hidden` como guardia, evitando duplicar listeners sin necesitar variables
  de estado adicionales.
- No se modifica `firebase-game.js` ya que el toggle es puramente local (no afecta el
  estado compartido entre jugadores).
