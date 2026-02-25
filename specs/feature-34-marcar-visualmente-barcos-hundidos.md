# Feature: Marcar visualmente barcos hundidos en el tablero

## Feature Description
Cuando un barco es completamente hundido, sus celdas deben recibir un estilo visual
permanente y distintivo (`cell--sunk`) que las diferencie de un hit simple. Este marcado
debe aplicarse tanto en el tablero enemigo (vista del atacante) como en el tablero propio
(vista del defensor), y debe ser persistente ante re-renders del listener de Firebase.

## User Story
As a jugador en combate
I want ver claramente qué barcos enemigos (y propios) han sido hundidos en el tablero
So that pueda identificar de un vistazo qué barcos ya completé de atacar y cuáles quedan vivos

## Problem Statement
Actualmente, cuando se hunde un barco completo, sus celdas lucen idénticas a un hit normal
(fondo rojo `--color-hit`). El jugador no puede distinguir visualmente en el tablero si un
grupo de celdas pertenece a un barco ya hundido o son hits aislados. La única referencia
visual está en el panel de flota (lateral), no en el tablero en sí.

## Solution Approach
1. Añadir dos variables CSS y clases permanentes: `cell--sunk` (tablero enemigo) y
   `cell--sunk-received` (tablero propio), con color y pseudo-elemento distintos al rojo de hit.
2. En `updateFleetPanels` (que ya llama a `getSunkShips` y tiene acceso a `roomData`),
   después de detectar los barcos hundidos, aplicar las nuevas clases CSS a las celdas
   correspondientes en ambos tableros.
3. La aplicación de clases es idempotente: se puede llamar múltiples veces sin efectos
   secundarios, ya que `classList.add` no duplica clases.

## Relevant Files

- `js/game.js` - Contiene `getSunkShips`, `handleAttacksChange` y `updateFleetPanels`.
  Aquí se añade la lógica para marcar celdas como hundidas en ambos tableros.
- `css/styles.css` - Se añaden las variables CSS `--color-sunk` / `--color-sunk-received`
  y las clases `.cell--sunk` / `.cell--sunk-received` con su pseudo-elemento decorativo.

## Implementation Plan

### Phase 1: Foundation — CSS
Añadir variables de color y clases CSS permanentes para celdas de barcos hundidos,
visualmente distintas al hit simple.

### Phase 2: Core Implementation — JS
Modificar `updateFleetPanels` para que, después de calcular los barcos hundidos,
aplique las clases CSS a las celdas reales de ambos tableros.

### Phase 3: Integration
Verificar que el marcado sea persistente (re-renders de Firebase no lo borran) y que
las celdas sigan siendo no-clickeables (las clases existentes ya garantizan `cursor: default`
y `pointer-events: none` en el tablero enemigo deshabilitado).

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Añadir variables CSS para color de barco hundido
En `css/styles.css`, dentro de `:root` (junto a `--color-hit` y `--color-miss`), agregar:
- `--color-sunk: #8b3a2a;` — rojo oscuro/marrón, distinto al rojo brillante de hit
- `--color-sunk-received: rgba(139, 58, 42, 0.7);` — variante semitransparente para el tablero propio

### 2) Añadir clases CSS `.cell--sunk` y `.cell--sunk-received`
En `css/styles.css`, después del bloque `/* === Combat cell states === */` (línea ~605),
agregar:

```css
/* === Sunk ship cells (persistent, overrides hit color) === */
.cell--sunk {
  background: var(--color-sunk) !important;
  cursor: default;
  position: relative;
}
.cell--sunk::after {
  content: '✕';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  pointer-events: none;
}

.cell--sunk-received {
  background: var(--color-sunk-received) !important;
  position: relative;
}
.cell--sunk-received::after {
  content: '✕';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.55);
  pointer-events: none;
}
```

Nota: `!important` es necesario para que `cell--sunk` sobreescriba el `background` de
`cell--attacked--hit` o `cell--hit-received` que ya están aplicadas.

### 3) Añadir función `markSunkCells` en `js/game.js`
Después de la función `renderFleetPanel` (línea ~161), agregar una nueva función privada
que aplica las clases de hundido a las celdas del DOM:

```js
function markSunkCells(sunkIds, ships, boardPrefix, sunkClass) {
  // sunkIds: array of ship IDs that are fully sunk
  // ships: { shipId: ['cell-A1', ...] }
  // boardPrefix: '' for player board, 'enemy-' for enemy board
  // sunkClass: 'cell--sunk' or 'cell--sunk-received'
  sunkIds.forEach(function (shipId) {
    var cells = ships[shipId] || [];
    cells.forEach(function (cellId) {
      var rawId = cellId.replace('cell-', '');
      var el = document.getElementById(boardPrefix + 'cell-' + rawId);
      if (el) {
        el.classList.add(sunkClass);
      }
    });
  });
}
```

### 4) Llamar `markSunkCells` desde `updateFleetPanels`
En `updateFleetPanels` (línea ~163), después de cada llamada a `renderFleetPanel`,
agregar las llamadas a `markSunkCells`:

- Después de `renderFleetPanel('player-fleet', mySunk)` (línea ~174):
  ```js
  markSunkCells(mySunk, myShips, '', 'cell--sunk-received');
  ```

- Después de `renderFleetPanel('enemy-fleet', enemySunk)` (línea ~182):
  ```js
  markSunkCells(enemySunk, enemyShips, 'enemy-', 'cell--sunk');
  ```

### 5) Verificar persistencia con re-renders de Firebase
Confirmar que `handleAttacksChange` se llama con todos los ataques acumulados (no solo
los nuevos), y que `markSunkCells` se aplica en cada llamada (idempotente por naturaleza
de `classList.add`). Verificar leyendo el flujo:
- `handleAttacksChange(attacks)` → al final llama `updateFleetPanels(attacks)` → que
  llama `getSunkShips` y luego `markSunkCells` para todos los hundidos.

### 6) Final Validation
- Ejecutar servidor local y probar en dos ventanas/pestañas
- Hundir un barco completo y verificar que todas sus celdas cambian a color oscuro con ✕
- Verificar que el cambio aplica en el tablero enemigo (atacante) y en el tablero propio (defensor)
- Verificar que al recargar una pestaña (re-sync Firebase) el estilo persiste
- Ejecutar los `Validation Commands`

## Testing Strategy

### Manual Testing
1. Abrir dos ventanas del navegador en `http://localhost:8000`
2. Crear sala en ventana A, unirse en ventana B
3. Colocar todos los barcos en ambas ventanas
4. Atacar un barco completo (ej. destructor de 2 celdas)
5. Verificar que, al hundir el barco:
   - Las 2 celdas en el tablero enemigo del atacante cambian de rojo brillante a rojo oscuro con ✕
   - Las 2 celdas en el tablero propio del defensor cambian de rojo semitransparente a oscuro con ✕
6. Verificar que las celdas de hits no hundidos siguen con el color rojo normal
7. Recargar la pestaña del atacante y verificar que el estilo de hundido se mantiene

### Automated Tests
No hay suite de tests automatizados en el proyecto. Las verificaciones son manuales.

### Edge Cases
- **Re-sync Firebase**: El listener de Firebase puede reenviar todos los ataques; la
  lógica debe ser idempotente (classList.add es seguro de llamar múltiples veces).
- **Barco hundido al final del juego**: Verificar que el marcado aplica incluso si se
  hunde el último barco (triggering `gameFinished`).
- **Ambos jugadores ven el cambio**: El defensor también debe ver sus propias celdas
  marcadas como hundidas (tablero propio).
- **Móvil / pantalla pequeña**: El pseudo-elemento ✕ debe ser legible en celdas de
  tamaño reducido (el font-size es relativo, 0.75rem ≈ 12px).
- **Celdas ya con clase hit**: El `!important` en background asegura que `cell--sunk`
  sobreescriba `cell--attacked--hit` y `cell--sunk-received` sobreescriba `cell--hit-received`.

## Acceptance Criteria
- Al hundir un barco, todas sus celdas en el tablero enemigo reciben la clase `cell--sunk`
  con fondo visualmente distinto (rojo oscuro) y marcador ✕
- Al hundir un barco, todas sus celdas en el tablero propio reciben la clase `cell--sunk-received`
  con fondo distinto al hit normal
- El marcado es persistente: si el listener de Firebase re-procesa los ataques, las clases
  `cell--sunk` / `cell--sunk-received` permanecen en las celdas
- Las celdas hundidas siguen siendo no-clickeables (heredado de las clases `cell--attacked--hit`
  y `cursor: default`)
- Las celdas de hits simples (barco no hundido aún) conservan su estilo original sin cambios

## Validation Commands
- `python -m http.server 8000` — iniciar servidor local y probar en `http://localhost:8000`

## Notes
- Se usa `!important` en `background` para que las clases de hundido sobreescriban las de
  hit ya aplicadas. Alternativa: aplicar `cell--sunk` en lugar de `cell--attacked--hit`
  (requeriría más cambios en la lógica de renderizado). El `!important` es la solución
  mínima que no rompe el flujo existente.
- El pseudo-elemento `::after` con `content: '✕'` requiere `position: relative` en la
  celda. El `position: absolute` y `inset: 0` del `::after` cubre toda la celda.
- No se modifica la animación temporal `cell--anim-sunk` (que ya existe para el flash al
  hundir); esta feature agrega el estado visual *permanente* post-animación.
- El marcado en el tablero propio del defensor es una mejora de UX: el defensor puede ver
  qué barcos suyos ya perdió, no solo cuáles tienen hits parciales.
