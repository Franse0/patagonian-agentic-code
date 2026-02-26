# Feature: Botón ocultar/mostrar tablero propio en todas las pantallas

## Feature Description
Extender el botón de toggle introducido en la feature #39 para que funcione en **todos los
tamaños de pantalla** (desktop y mobile) y cambiar su semántica de "toggle exclusivo entre
tableros" a "ocultar/mostrar el tablero propio mientras el tablero enemigo permanece siempre
visible". En desktop (>900px), actualmente ambos tableros son siempre visibles; esta feature
agrega la posibilidad de colapsar el panel del jugador propio para concentrar toda la
atención en el tablero enemigo. En mobile (≤900px) se mantiene el comportamiento de ocultar
el tablero propio por defecto y mostrarlo al pulsar el botón, pero el tablero enemigo nunca
desaparece.

## User Story
As a jugador durante el combate
I want un botón que oculte o muestre mi tablero propio independientemente del tablero enemigo
So that pueda concentrarme en atacar al enemigo sin que mi tablero ocupe espacio, y volver a
verlo cuando quiera comprobar los daños recibidos en mi flota

## Problem Statement
La implementación actual (feature #39) oculta el tablero enemigo cuando el jugador quiere ver
el propio, creando una vista exclusiva en mobile. En desktop el botón no aparece en absoluto.
Esto genera dos problemas:
1. En desktop no hay forma de ganar espacio horizontal ocultando el propio tablero para ver
   mejor el enemigo.
2. En mobile, si el jugador quiere comprobar daños recibidos mientras recuerda las coordenadas
   del enemigo, pierde de vista ambos tableros alternativamente, en lugar de poder tener el
   enemigo siempre visible.

## Solution Approach
1. Hacer visible el botón `#btn-toggle-board` en **todos** los tamaños (quitar el
   `display: none` del selector base y adaptar la regla `@media`).
2. Cambiar la semántica del toggle: en lugar de alternar "mostrar propio / mostrar enemigo",
   el botón ahora **oculta o muestra únicamente `#player-column`**, manteniendo
   `#enemy-column` siempre visible.
3. Actualizar textos y `aria-label` para reflejar la nueva semántica: "Ocultar mi tablero" /
   "Mostrar mi tablero".
4. En desktop (>900px) la clase `--hiding-own` sobre `#game-container` colapsa
   `#player-column` a `display: none` y permite que `#enemy-column` crezca para llenar el
   espacio disponible.
5. En mobile (≤900px) el comportamiento por defecto (tablero propio oculto) se mantiene pero
   el enemigo nunca se oculta.
6. Eliminar la clase `--showing-own` y la regla que ocultaba `#enemy-column` (ya no necesaria).
7. Resetear el estado al terminar la partida.

## Relevant Files

- `index.html` — Actualizar texto inicial del botón `#btn-toggle-board` de "Ver mi tablero"
  a "Ocultar mi tablero" (nuevo estado por defecto cuando el tablero propio está visible).
- `css/styles.css` — Refactorizar reglas del botón y columnas:
  - Hacer `#btn-toggle-board` visible en desktop (quitar `display: none` del selector base).
  - Reemplazar clase `--showing-own` por `--hiding-own` con semántica correcta.
  - En mobile: tablero propio oculto por defecto; botón muestra "Mostrar mi tablero" → al
    pulsar aparece el tablero propio y cambia a "Ocultar mi tablero".
  - En desktop: por defecto ambos tableros visibles; botón muestra "Ocultar mi tablero" → al
    pulsar se oculta `#player-column` y el enemigo expande.
- `js/game.js` — Actualizar lógica del toggle en `handleTurnChange` y `handleGameFinished`:
  - Inicializar botón con texto/aria correcto según breakpoint actual.
  - Reemplazar clase `--showing-own` por `--hiding-own`.
  - Actualizar textos: "Ocultar mi tablero" / "Mostrar mi tablero".

## Implementation Plan

### Phase 1: Foundation — Rediseño CSS
Refactorizar las reglas CSS del botón y columnas para la nueva semántica
"ocultar/mostrar propio" en todos los breakpoints. Asegurar que el botón sea visible en
desktop y que su comportamiento en mobile sea correcto sin tocar el JS todavía.

### Phase 2: Core Implementation — Lógica JS actualizada
Actualizar `handleTurnChange` en `game.js` para inicializar el botón con el texto correcto
(`--hiding-own` clase, textos actualizados) y `handleGameFinished` para resetear
correctamente.

### Phase 3: Integration — Ajuste HTML y validación responsive
Actualizar el texto/estado inicial del botón en `index.html`. Verificar que en desktop el
`#enemy-column` crece cuando se colapsa el propio, y que en mobile el tablero enemigo nunca
desaparece. Verificar accesibilidad y edge cases.

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Actualizar texto inicial del botón en `index.html`
- Localizar `<button id="btn-toggle-board" ...>` (línea 46–50)
- Cambiar `aria-label` de `"Ver mi tablero"` a `"Ocultar mi tablero"`
- Cambiar `textContent` de `Ver mi tablero` a `Ocultar mi tablero`
- Dejar `aria-pressed="false"` sin cambios (el tablero propio empieza visible)
- Verificar que el `hidden` permanece para que el botón se revele solo al iniciar combate

### 2) Refactorizar CSS en `css/styles.css`
- Localizar el bloque `/* === Board toggle button === */` (línea ~1018)
- **Quitar** `display: none;` del selector `#btn-toggle-board` (ahora visible en desktop)
- Agregar `display: inline-flex;` como valor por defecto en el selector base para que
  el botón sea visible cuando no está `[hidden]`
- En el bloque `@media (max-width: 900px)`:
  - **Eliminar** la regla `#btn-toggle-board:not([hidden]) { display: inline-flex; }` (ya
    está en el selector base)
  - **Mantener** la regla que oculta `#player-column` por defecto en mobile:
    `#btn-toggle-board:not([hidden]) ~ #player-column { display: none; }`
  - **Reemplazar** las reglas de clase `--showing-own` por `--hiding-own`:
    ```css
    /* Mobile: mostrar tablero propio al activar el toggle */
    #game-container.--hiding-own #player-column {
      display: none;
    }
    /* (Regla para ocultar enemy-column se elimina — enemigo siempre visible) */
    ```
- En el selector base (fuera de media query), agregar regla desktop:
  ```css
  /* Desktop: ocultar tablero propio cuando toggle activo */
  #game-container.--hiding-own #player-column {
    display: none;
  }
  ```
- Verificar que `#enemy-column` no tiene regla de ocultamiento en ningún estado
- Verificar que en desktop `#game-container` con `flex-wrap: wrap; justify-content: center;`
  ya hace que `#enemy-column` ocupe el espacio al colapsar `#player-column`

### 3) Actualizar lógica JS en `js/game.js`
- Localizar el bloque del toggle en `handleTurnChange` (líneas ~253–264)
- Al revelar el botón, determinar el estado inicial correcto:
  - En **mobile** (≤900px): el tablero propio está oculto por CSS → el botón debe mostrar
    "Mostrar mi tablero" y `aria-pressed="false"` (botón no activo = propio oculto por CSS)
  - En **desktop** (>900px): el tablero propio es visible → el botón debe mostrar
    "Ocultar mi tablero" y `aria-pressed="false"` (no se ha ocultado aún)
- Reemplazar el listener click con nueva lógica:
  ```javascript
  var toggleBtn = document.getElementById('btn-toggle-board');
  if (toggleBtn && toggleBtn.hidden) {
    var isMobile = window.matchMedia('(max-width: 900px)').matches;
    // En mobile el tablero propio empieza oculto por CSS; botón invita a mostrarlo
    toggleBtn.textContent = isMobile ? 'Mostrar mi tablero' : 'Ocultar mi tablero';
    toggleBtn.setAttribute('aria-label', isMobile ? 'Mostrar mi tablero' : 'Ocultar mi tablero');
    toggleBtn.hidden = false;
    toggleBtn.addEventListener('click', function () {
      var container = document.getElementById('game-container');
      var isHiding = container.classList.toggle('--hiding-own');
      toggleBtn.setAttribute('aria-pressed', isHiding ? 'true' : 'false');
      toggleBtn.textContent = isHiding ? 'Mostrar mi tablero' : 'Ocultar mi tablero';
      toggleBtn.setAttribute('aria-label', isHiding ? 'Mostrar mi tablero' : 'Ocultar mi tablero');
    });
  }
  ```
- **Nota**: En mobile, la clase `--hiding-own` sobre `#game-container` oculta `#player-column`
  (mismo efecto que la regla CSS por defecto) mientras que en desktop activa el colapso que
  de otro modo no ocurriría.

### 4) Resetear estado en `handleGameFinished` en `js/game.js`
- Localizar el bloque de reset del toggle (líneas ~362–369)
- Reemplazar `classList.remove('--showing-own')` por `classList.remove('--hiding-own')`
- Actualizar el `textContent` de reseteo a `'Ocultar mi tablero'`
- Mantener `toggleBtn.hidden = true` y `aria-pressed="false"` sin cambios

### 5) Final Validation
- Ejecutar todos los `Validation Commands` para asegurar cero regresiones.
- Verificar manualmente en viewport mobile y desktop (ver Testing Strategy).

## Testing Strategy

### Manual Testing
1. Iniciar servidor con `python -m http.server 8000`
2. Abrir dos pestañas en `http://localhost:8000`
3. Crear sala en pestaña A, unirse en pestaña B
4. Colocar todos los barcos en ambas pestañas y presionar "Listo"
5. Al iniciar el combate en **viewport desktop** (DevTools > 900px):
   - Verificar que el botón "Ocultar mi tablero" aparece en la UI
   - Verificar que por defecto ambos tableros son visibles
   - Hacer clic → solo el tablero enemigo debe permanecer visible; el botón cambia a "Mostrar
     mi tablero"
   - Hacer clic de nuevo → el tablero propio reaparece; el botón vuelve a "Ocultar mi tablero"
6. En **viewport mobile** (DevTools ≤ 900px):
   - Verificar que el botón "Mostrar mi tablero" aparece al iniciar el combate
   - Verificar que por defecto solo se ve el tablero enemigo (comportamiento #39 conservado)
   - Hacer clic → el tablero propio aparece; el botón cambia a "Ocultar mi tablero"
   - Verificar que el **tablero enemigo sigue visible** (no desaparece)
   - Hacer clic de nuevo → el tablero propio desaparece; botón vuelve a "Mostrar mi tablero"
7. Terminar la partida y verificar que el botón desaparece y el estado se resetea
8. Verificar que `board--disabled` en el tablero enemigo se preserva en todos los estados

### Automated Tests
No hay suite de tests automatizados en el proyecto. Las verificaciones son manuales.

### Edge Cases
- **Desktop (>900px)**: Al colapsar el tablero propio, `#enemy-column` debe crecer y
  centrarse; verificar que `flex-wrap` y `justify-content: center` lo logran sin CSS extra
- **Mobile (≤900px) con tablero propio visible**: Ambos tableros apilados pueden requerir
  scroll; es aceptable dado que el usuario eligió ver ambos
- **Cambio de breakpoint** (resize de ventana): Si el usuario redimensiona de mobile a
  desktop con `--hiding-own` activo, el efecto se aplica en ambos breakpoints por la misma
  clase; verificar que la transición es coherente
- **Re-render Firebase**: Las clases de celdas se aplican por ID independientemente de la
  visibilidad de la columna; no hay pérdida de estado
- **Fin de partida → revancha**: El reset garantiza que la nueva partida empieza sin la
  clase `--hiding-own` y con el botón oculto
- **Accesibilidad**: `aria-pressed="true"` cuando el tablero propio está oculto (toggle
  activo); `aria-label` describe la acción al hacer clic, no el estado actual

## Acceptance Criteria
- En viewport desktop (>900px), al iniciar el combate aparece el botón "Ocultar mi tablero"
- En desktop, al hacer clic en "Ocultar mi tablero", el panel del jugador desaparece y el
  tablero enemigo ocupa el espacio; el botón cambia a "Mostrar mi tablero"
- Al hacer clic en "Mostrar mi tablero" (desktop), el panel del jugador reaparece; botón
  vuelve a "Ocultar mi tablero"
- En viewport mobile (≤900px), al iniciar el combate aparece el botón "Mostrar mi tablero"
  y solo se ve el tablero enemigo (igual que antes)
- En mobile, al hacer clic en "Mostrar mi tablero", el tablero propio aparece SIN ocultar
  el tablero enemigo; el botón cambia a "Ocultar mi tablero"
- El tablero enemigo **nunca se oculta** en ningún estado del toggle en ningún breakpoint
- El estado `board--disabled` del tablero enemigo se preserva independientemente del toggle
- Al finalizar la partida, el botón desaparece y el estado `--hiding-own` se elimina

## Validation Commands
- `python -m http.server 8000` — iniciar servidor local y probar en `http://localhost:8000`

## Notes
- Se elimina la regla CSS que ocultaba `#enemy-column` (era parte de `--showing-own` en
  feature #39); el tablero enemigo ahora es siempre visible en combate.
- La clase modificadora cambia de `--showing-own` (semántica positiva: "estoy viendo el
  propio") a `--hiding-own` (semántica negativa: "estoy ocultando el propio"), lo que
  simplifica la lógica: `aria-pressed="true"` cuando el tablero está oculto.
- En mobile la regla CSS por defecto ya oculta `#player-column` (usando el selector
  hermano `#btn-toggle-board:not([hidden]) ~ #player-column`). La clase `--hiding-own` en
  mobile añade la misma regla explícitamente, pero ambas tienen el mismo efecto. Lo que
  cambia es que `--hiding-own` no oculta `#enemy-column`.
- No se modifica `firebase-game.js` ya que el toggle sigue siendo puramente local.
- `window.matchMedia` se usa solo para inicializar el texto del botón; el comportamiento
  diferenciado por breakpoint en el click se logra únicamente con CSS.
