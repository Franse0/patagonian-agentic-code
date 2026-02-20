# Feature: Fase de Colocación de Barcos

## Feature Description
Implementar la fase de colocación de barcos que precede al combate en el juego Batalla Naval. El jugador debe colocar manualmente sus 5 barcos (o usar colocación aleatoria) en su tablero de 10x10 antes de que comience la partida. Esta funcionalidad incluye un panel lateral con los barcos disponibles, preview visual al hacer hover, validación de posiciones y el botón "Listo" que habilita el inicio del juego.

## User Story
As a visitor / player
I want to place my ships on my board before the game starts, choosing their position and orientation
So that I can set up my strategy and begin the battle when ready

## Problem Statement
El juego necesita una fase de preparación donde el jugador define la posición de su flota. Sin esta fase, no hay posiciones de barcos para evaluar los ataques del oponente. La experiencia debe ser intuitiva: ver qué barcos faltan colocar, previsualizar el posicionamiento antes de confirmar y recibir feedback claro sobre errores de validación.

## Solution Approach
Agregar una sección de colocación sobre el tablero del jugador con:
1. Un panel de selección de barcos a la izquierda del tablero
2. Interacción hover para preview y click para confirmar posición
3. Lógica de validación pura (sin efectos secundarios) en un módulo JS separado
4. Botón de orientación toggle (H/V) y botón "Aleatorio"
5. Estado de la fase guardado en un objeto JS plano (compatible con Firebase futuro)

## Relevant Files
- `index.html` — agregar sección de colocación (panel de barcos, botones de control) dentro del tablero del jugador
- `css/styles.css` — agregar estilos para barcos disponibles, preview hover, barcos colocados, botones de colocación
- `js/placement.js` — módulo nuevo con toda la lógica de colocación: validación, preview, colocación aleatoria, estado de la flota
- `js/game.js` — inicializar y conectar el módulo de colocación con la UI; habilitar/deshabilitar botón "Listo"

### New Files
- `js/placement.js` — módulo de lógica de colocación de barcos: funciones puras de validación, generación aleatoria, manejo del estado de la flota y listeners de eventos del tablero

## Implementation Plan
### Phase 1: Foundation
Definir la estructura de datos de los barcos y la API del módulo de colocación. Crear `js/placement.js` con las funciones puras de validación (`isValidPlacement`, `getShipCells`) y el estado inicial de la flota (`SHIPS`, `placedShips`). Agregar al HTML la sección del panel de barcos y los botones de control dentro del tablero del jugador.

### Phase 2: Core Implementation
Implementar la lógica completa en `js/placement.js`:
- `getShipCells(startCell, size, orientation)` — calcula las celdas que ocuparía un barco
- `isValidPlacement(cells, placedShips)` — valida que no haya superposición ni salida del tablero
- `placeShip(ship, cells)` — registra un barco en `placedShips` y actualiza la UI
- `removeShip(ship)` — permite retirar un barco ya colocado (click en barco del panel)
- `randomPlacement()` — genera posiciones válidas para todos los barcos automáticamente
- Preview hover: eventos `mouseenter`/`mouseleave` sobre celdas del tablero propio para mostrar/ocultar celdas de preview
- Agregar estilos CSS: `.cell--ship` (barco colocado), `.cell--preview` (hover válido), `.cell--invalid` (hover inválido), `.ship-item` (en panel), `.ship-item--placed` (ya colocado)

### Phase 3: Integration
Conectar el módulo con `js/game.js`:
- Inicializar el módulo de colocación al cargar la página
- Observar el estado de colocación para habilitar el botón "Listo" cuando `placedShips.length === SHIPS.length`
- El botón "Listo" expone `getFleetState()` al scope del juego para que la fase de juego pueda acceder a las posiciones
- Ocultar la sección de colocación y mostrar el tablero normal al presionar "Listo"
- Accesibilidad: navegación por teclado en el tablero, atributos `aria-label` en celdas, soporte `prefers-reduced-motion`

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Agregar estructura HTML de la fase de colocación
- En `index.html`, dentro de la columna del jugador local, agregar un `<section id="placement-phase">` con:
  - `<div id="ship-list">` con un `<div class="ship-item">` por cada barco (nombre, tamaño, representación visual de celdas)
  - `<div class="placement-controls">` con botón `#btn-orientation` (toggle H/V) y botón `#btn-random`
  - `<button id="btn-ready" disabled>Listo</button>`
- Verificar que el tablero del jugador (`#player-board`) ya existe (de Issue 1)

### 2) Crear `js/placement.js` con definición de barcos y utilidades
- Definir el array `SHIPS` con los 5 barcos: `{ id, name, size }` (Portaaviones 5, Acorazado 4, Crucero 3, Submarino 3, Destructor 2)
- Implementar `cellIdToCoords(cellId)` que convierte `"cell-A1"` → `{ row: 0, col: 0 }`
- Implementar `coordsToCellId(row, col)` como inverso
- Implementar `getShipCells(startCellId, size, orientation)` → array de cellIds o `null` si sale del tablero
- Verificar que `getShipCells("cell-A8", 5, "H")` retorna `null` (sale del tablero)

### 3) Implementar validación y colocación en `js/placement.js`
- Implementar `isValidPlacement(cellIds, placedShips)` → `boolean` (sin overlap, todas las celdas en tablero)
- Implementar `placeShip(shipId, startCellId)` que:
  - Calcula celdas con orientación actual
  - Valida con `isValidPlacement`
  - Si válido: guarda en `placedShips`, actualiza clases CSS de celdas a `.cell--ship`, marca `.ship-item--placed` en panel
  - Si inválido: no hace nada (el hover ya habrá mostrado color rojo)
- Implementar `removeShip(shipId)` que revierte celdas y marca barco como disponible
- Verificar que dos barcos no pueden ocupar la misma celda

### 4) Implementar preview hover
- Al seleccionar un barco del panel (click en `.ship-item` no colocado), marcarlo como activo
- En `mouseenter` de cada celda del tablero propio: calcular celdas del preview con `getShipCells`, agregar `.cell--preview` (válido) o `.cell--invalid`
- En `mouseleave`: remover todas las clases de preview
- En click sobre celda con preview válido: llamar a `placeShip`
- Verificar visualmente que el preview cambia de color cuando la posición es inválida

### 5) Implementar colocación aleatoria
- Implementar `randomPlacement()`:
  - Para cada barco (en orden de mayor a menor): iterar hasta encontrar posición válida aleatoria
  - Intentar máximo 200 veces por barco; si falla, reiniciar todo el proceso (máx 5 reintentos)
  - Usar `Math.random()` para celda inicial y orientación
  - Llamar a `placeShip` para cada barco
- Botón `#btn-random` llama a `randomPlacement()` (limpia colocación previa primero)
- Verificar que tras click en "Aleatorio", los 5 barcos aparecen en el tablero sin superposición

### 6) Habilitar botón "Listo" e integrar con `js/game.js`
- En `js/placement.js`, exponer `getFleetState()` → objeto `{ [shipId]: cellIds[] }` del estado actual
- Observar `placedShips` al final de `placeShip`/`removeShip`: si `placedShips.length === 5`, habilitar `#btn-ready`; si no, deshabilitarlo
- En `js/game.js`: listener en `#btn-ready` que llama a `getFleetState()`, guarda el resultado en el estado global del juego y oculta `#placement-phase` (o lo reemplaza con la vista de combate)
- Botón `#btn-orientation` hace toggle entre `"H"` y `"V"` y actualiza su texto/icono

### 7) Agregar estilos CSS en `css/styles.css`
- `.ship-item` — tarjeta visual del barco en el panel (nombre + bloques de celdas representativos)
- `.ship-item--placed` — opacidad reducida + tachado o ícono ✓
- `.ship-item--active` — borde resaltado del barco seleccionado para colocar
- `.cell--ship` — fondo de color barco (usar `--color-ship` CSS custom property)
- `.cell--preview` — fondo semitransparente verde para preview válido
- `.cell--invalid` — fondo semitransparente rojo para preview inválido
- `.placement-controls` — layout horizontal de botones de control
- `#btn-ready:disabled` — estilos de deshabilitado claros
- Verificar que los estilos respetan la paleta naval existente (azules, grises oscuros)

### 8) Final Validation
- Ejecuta todos los `Validation Commands` para asegurar cero regresiones.

## Testing Strategy
### Manual Testing
- Abrir `index.html` en navegador (sin servidor, file://)
- Seleccionar cada barco del panel y colocarlo manualmente → verificar que aparece en el tablero
- Intentar superponer dos barcos → verificar que el preview se muestra en rojo y la colocación no ocurre
- Intentar colocar un barco fuera del tablero → verificar que `getShipCells` retorna null y no se coloca
- Usar "Aleatorio" varias veces → verificar que siempre coloca los 5 barcos sin error
- Verificar que "Listo" está deshabilitado hasta colocar todos y se habilita al completar
- Verificar que "Listo" oculta el panel de colocación correctamente
- Verificar toggle de orientación H/V afecta el preview correctamente

### Automated Tests
No hay test runner configurado en el proyecto (vanilla JS). Si se agrega Jest en el futuro:
- `isValidPlacement` es una función pura: testeable con casos de overlap, bordes del tablero, tablero vacío
- `getShipCells` con orientaciones H y V en celdas límite (A10, J1, J10)
- `randomPlacement` ejecutado 100 veces siempre debe producir 5 barcos sin superposición

### Edge Cases
- **Mobile / pantallas pequeñas**: el panel de barcos debe apilarse verticalmente sobre el tablero; las celdas deben ser suficientemente grandes para tap
- **Compatibilidad de navegadores**: usar `classList.add/remove`, no `dataset.* = true` para compatibilidad
- **Accesibilidad**: atributos `aria-label="Celda A1"` en cada celda; botón de orientación con `aria-pressed`; soporte de navegación por teclado en el tablero (Tab + Enter/Space para colocar)
- **Barco en esquina**: barco de 5 celdas iniciando en A10 horizontal → inválido; en J6 horizontal → inválido
- **Recolocación**: si el usuario hace click en un barco ya colocado en el panel, se debería poder retirar y recolocar
- **Prefers-reduced-motion**: las transiciones de preview deben respetar `@media (prefers-reduced-motion: reduce)`

## Acceptance Criteria
- Los 5 barcos (Portaaviones 5, Acorazado 4, Crucero 3, Submarino 3, Destructor 2) aparecen en el panel lateral disponibles para colocar
- El jugador puede seleccionar un barco, elegir orientación H/V y hacer click en el tablero para colocarlo; el barco aparece con color distinto en las celdas correspondientes
- El preview hover muestra las celdas que ocuparía el barco en verde (válido) o rojo (inválido) antes de confirmar
- No es posible colocar barcos superpuestos ni parcialmente fuera del tablero (validación activa)
- El botón "Listo" permanece deshabilitado hasta que los 5 barcos estén colocados y se habilita exactamente cuando el último barco es colocado
- El botón "Aleatorio" coloca los 5 barcos en posiciones válidas de forma automática
- Al presionar "Listo", el estado de la flota es accesible mediante `getFleetState()` para las fases subsiguientes del juego
- La interfaz funciona correctamente en desktop y mobile (diseño responsive)

## Validation Commands
- `start chrome index.html` o abrir `index.html` directamente en el navegador para verificar funcionamiento visual
- `npx html-validate index.html` (si disponible) para validar HTML semántico
- Abrir DevTools → Console y verificar que no hay errores JS al cargar y usar la fase de colocación
- Abrir DevTools → Lighthouse → Accessibility para verificar score de accesibilidad

## Notes
- **Dependencia de Issue 1**: este plan asume que `index.html` con el tablero `#player-board` y los IDs de celda `cell-{A-J}{1-10}` ya existen del Issue 1. Si no, Issue 1 debe implementarse primero.
- **Compatibilidad con Firebase (Issue 3)**: el objeto retornado por `getFleetState()` usa la misma estructura que se sincronizará en `rooms/{roomId}/player1.ships`. No requiere cambios al integrar Firebase.
- **No hay frameworks externos**: toda la lógica es JS vanilla. No agregar librerías adicionales en este issue.
- **Mejora futura**: en Issue 6, la detección de hit/miss usará directamente el resultado de `getFleetState()`, por lo que la estructura de datos debe ser estable desde ahora.
