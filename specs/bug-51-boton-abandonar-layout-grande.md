# Bug Fix: Botón Abandonar Ocupa Demasiado Espacio y Rompe el Layout

## Bug Description
El botón "Abandonar partida" (`#btn-abandon`) aparece con un tamaño excesivo en pantalla,
rompiendo el layout del juego. El botón es un hijo directo del flex container `#game-container`
sin reglas de posicionamiento ni restricciones de ancho adecuadas, lo que hace que se
comporte como un flex item estándar que ocupa su propio "row" en el layout, apareciendo
de forma prominente y desproporcionada.

**Comportamiento actual**: El botón ocupa un ancho excesivo como elemento flex dentro de
`#game-container`, interfiriendo visualmente con el layout de los tableros y paneles.

**Comportamiento esperado**: El botón debe ser pequeño y discreto, posicionado en la esquina
superior derecha del `game-container` sin afectar el layout de los tableros.

## Steps to Reproduce
1. Abrir el juego en `http://localhost:8000`
2. Crear una sala y unirse con dos jugadores
3. Observar el área del game-container durante la fase de colocación o combate
Result: El botón "Abandonar partida" aparece demasiado grande, ocupando un ancho excesivo
y rompiendo el layout de los tableros.
Expected: El botón debe aparecer como un botón compacto en la esquina superior derecha
del game-container, sin interferir con el layout.

## Root Cause
`#btn-abandon` es un hijo directo del flex container `#game-container` (que usa
`display: flex; flex-wrap: wrap; justify-content: center`). Sin reglas de posicionamiento:

1. **Falta `align-self`**: El valor por defecto `align-self: stretch` hace que el elemento
   se estire en el eje cruzado. A diferencia de `#btn-toggle-board` que tiene `align-self: center`,
   `#btn-abandon` no tiene esta propiedad, por lo que se estira verticalmente ocupando toda
   la altura disponible de su fila flex.

2. **Posición en el flujo flex**: Como elemento flex sin restricciones de ancho, el botón
   ocupa su propia fila en el layout wrap (ya que los tableros consumen la mayor parte del
   espacio disponible), resultando en una presencia visual desproporcionada.

3. **Sin posicionamiento absoluto**: A diferencia de un botón de acción rápida como éste,
   no está sacado del flujo flex mediante `position: absolute`, por lo que impacta
   directamente el layout.

## Solution Approach
La solución más limpia es sacar `#btn-abandon` del flujo flex usando `position: absolute`,
anclado en la esquina superior derecha del `game-container`. Esto requiere:

1. Agregar `position: relative` a `#game-container` para que sea el contexto de posicionamiento.
2. Aplicar `position: absolute; top: 0.5rem; right: 0.5rem` a `#btn-abandon`.

Este enfoque:
- No rompe el selector hermano CSS `#btn-toggle-board:not([hidden]) ~ #player-column` (mobile)
  porque no cambia el HTML, solo el CSS.
- No afecta el flujo de los tableros, chat y otros paneles.
- Coloca el botón en la esquina superior derecha de forma compacta y discreta.
- Es coherente con la descripción del bug que sugiere esta solución.

## Relevant Files
Archivos a modificar para esta corrección de bug:

- **`css/styles.css`**: Archivo principal a modificar. Se agrega `position: relative` a
  `#game-container` y se actualizan las reglas de `#btn-abandon` con posicionamiento absoluto
  y ajuste de la media query mobile si fuera necesario.
- **`index.html`**: Solo lectura para confirmar la estructura HTML del botón y su relación
  con `#game-container`. No se modifica.

## Implementation Plan

### Phase 1: Investigation
- Verificar la estructura HTML actual: `#btn-abandon` es hijo directo de `#game-container` (líneas 51-54 de `index.html`).
- Verificar el CSS actual: `#game-container` (línea 283) no tiene `position: relative`; `#btn-abandon` (línea 1261) tiene `display: inline-flex` pero no `align-self` ni posicionamiento.
- Confirmar que el selector hermano móvil (`#btn-toggle-board:not([hidden]) ~ #player-column`) en línea 1306 opera sobre HTML directo y no se romperá con el cambio de CSS.

### Phase 2: Fix Implementation
- Agregar `position: relative` a `#game-container` en `css/styles.css`.
- Actualizar `#btn-abandon` con `position: absolute; top: 0.5rem; right: 0.5rem` para sacarlo del flujo flex.
- Verificar que en mobile (flex-direction: column) el botón siga visible y no se superponga con el contenido.

### Phase 3: Verification
- Revisar visualmente el layout con el servidor local en `http://localhost:8000`.
- Confirmar que el botón aparece en la esquina superior derecha del game-container.
- Confirmar que el layout de los tableros no se ve afectado.
- Confirmar que el botón de toggle de tablero (`#btn-toggle-board`) sigue funcionando correctamente.
- Confirmar en viewport mobile que el botón no interfiere con el layout.

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Leer el CSS actual para confirmar el estado antes del cambio
- Leer `css/styles.css` en el bloque `#game-container` (línea ~283) y `#btn-abandon` (línea ~1261).
- Verificar que no exista ya `position: relative` en `#game-container`.
- Verificar que no exista ya `position: absolute` en `#btn-abandon`.

### 2) Agregar `position: relative` a `#game-container`
- En `css/styles.css`, en la regla `#game-container` (línea ~283-289), agregar `position: relative`.
- Verificar que la regla quede: `display: flex; gap: 2.5rem; padding: 1rem; flex-wrap: wrap; justify-content: center; position: relative;`

### 3) Actualizar los estilos de `#btn-abandon` con posicionamiento absoluto
- En `css/styles.css`, en la regla `#btn-abandon` (línea ~1261-1272):
  - Reemplazar `display: inline-flex` por `position: absolute`.
  - Agregar `top: 0.5rem` y `right: 0.5rem`.
  - Mantener el resto del estilo: padding, font-size, font-weight, background, color, border, border-radius, cursor, transition.
- La regla final debe posicionar el botón en la esquina superior derecha sin afectar el flujo flex.

### 4) Verificar comportamiento en mobile
- Revisar la media query `@media (max-width: 900px)` para `#game-container` (línea ~1310).
- Confirmar que con `position: absolute` el botón sigue bien posicionado cuando el container cambia a `flex-direction: column`.
- Si es necesario, ajustar los valores de `top`/`right` en la media query mobile para que no tape el contenido.

### 5) Final Validation
- Ejecutar todos los `Validation Commands` para asegurar que el bug está corregido y hay cero regresiones.

## Testing Strategy

### Bug Reproduction Test
Antes de la corrección:
1. Iniciar el servidor local: `python -m http.server 8000`
2. Abrir `http://localhost:8000` con dos pestañas/ventanas
3. Crear sala en una y unirse con la otra
4. Observar el game-container durante colocación: el botón "Abandonar partida" ocupa
   un ancho excesivo y rompe el layout.

### Fix Verification
Después de la corrección:
1. Verificar que el botón aparece en la esquina superior derecha del game-container.
2. Verificar que el layout de tableros no se desplaza ni rompe.
3. Verificar que el botón tiene el tamaño correcto (compacto, solo el texto + padding).
4. Verificar que el click en el botón muestra el `window.confirm()` de confirmación.
5. Verificar que cancelar el confirm mantiene la partida activa.

### Regression Testing
- Verificar que `#btn-toggle-board` sigue funcionando correctamente (ocultar/mostrar tablero).
- Verificar que el layout de colocación y combate no se ve afectado.
- Verificar que el chat panel sigue visible y alineado correctamente en desktop.
- Verificar el layout en mobile (viewport < 900px): botón posicionado correctamente.
- Verificar que el selector hermano CSS `#btn-toggle-board:not([hidden]) ~ #player-column`
  sigue funcionando en mobile (oculta el tablero propio correctamente).

## Acceptance Criteria
- El botón no rompe ni distorsiona el layout del juego.
- El botón es visualmente pequeño y discreto, posicionado en la esquina superior derecha.
- El layout de tableros y paneles no se ve afectado por la presencia del botón.
- El botón sigue siendo funcional (click → confirm → reload si confirma).
- No se introdujeron regresiones en otras funcionalidades.

## Validation Commands
Ejecuta cada comando para validar que el bug está corregido con cero regresiones.

- `python -m http.server 8000` — Iniciar servidor local para probar visualmente
- Abrir `http://localhost:8000` y probar el flujo completo de dos jugadores
- Inspeccionar `#btn-abandon` con DevTools para confirmar `position: absolute` y coordenadas correctas

## Notes
- No se modifica `index.html` ya que el selector hermano CSS depende de la estructura actual.
- El cambio es solo en `css/styles.css`: dos modificaciones puntuales.
- El `#btn-toggle-board` no necesita cambios ya que ya tiene `align-self: center` y funciona correctamente.
- En mobile, `position: absolute` hace que el botón se posicione relativo al `#game-container`
  que en mobile tiene `flex-direction: column`. El botón seguirá en la esquina superior derecha
  del contenedor, lo cual es correcto.
