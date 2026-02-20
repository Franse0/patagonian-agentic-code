# Fase de Colocación de Barcos

**ADW ID:** ozkwh6i
**Fecha:** 2026-02-20
**Especificación:** specs/feature-002-ship-placement.md

## Resumen

Se implementó la fase de colocación de barcos previa al combate en Batalla Naval. El jugador puede colocar manualmente sus 5 barcos en un tablero de 10×10 usando preview visual en hover, toggle de orientación H/V y colocación aleatoria, antes de iniciar la partida presionando "Listo".

## Screenshots

![Fase inicial de colocación](assets/01_placement_phase_initial.png)

![Preview al seleccionar barco con hover](assets/02_ship_selected_hover_preview.png)

![Preview inválido (posición rechazada)](assets/06_invalid_placement_preview.png)

![Colocación aleatoria de todos los barcos](assets/03_random_placement_all_ships.png)

![Panel oculto tras presionar Listo](assets/04_after_ready_placement_hidden.png)

![Vista mobile](assets/05_mobile_view.png)

## Lo Construido

- Panel lateral `#ship-list` con los 5 barcos disponibles para colocar (Portaaviones 5, Acorazado 4, Crucero 3, Submarino 3, Destructor 2)
- Preview hover: celdas en verde (posición válida) o rojo (posición inválida) antes de confirmar
- Toggle de orientación H/V con botón `#btn-orientation`
- Colocación aleatoria automática con botón `#btn-random`
- Botón `#btn-ready` que se habilita sólo cuando los 5 barcos están colocados
- Al presionar "Listo", el panel se oculta y el estado de la flota queda disponible vía `getFleetState()`
- Soporte responsive para mobile y accesibilidad con atributos `aria-label` y `aria-pressed`

## Implementación Técnica

### Archivos Modificados

- `js/placement.js` *(nuevo)*: módulo IIFE con toda la lógica de colocación — definición de barcos, utilidades de coordenadas, validación pura, preview hover, colocación aleatoria y gestión de estado
- `js/game.js` *(nuevo)*: controlador principal que inicializa `Placement`, conecta el botón "Listo" y expone `Game.getFleetState()` al scope global
- `index.html`: sección `#placement-phase` con `#ship-list`, controles de orientación/aleatorio y `#btn-ready`
- `css/styles.css`: estilos para `.ship-item`, `.ship-item--placed`, `.ship-item--active`, `.cell--ship`, `.cell--preview`, `.cell--invalid`, `.placement-controls` y `#btn-ready:disabled`

### Cambios Clave

- `cellIdToCoords` / `coordsToCellId`: conversión bidireccional entre IDs de celda (`"cell-A1"`) y coordenadas numéricas `{row, col}`
- `getShipCells(startCellId, size, orient)`: calcula el array de celdas que ocuparía un barco; retorna `null` si sale del tablero
- `isValidPlacement(cellIds, excludeShipId)`: valida sin superposición ni salida de límites; soporte para excluir el propio barco al recolocar
- `placeShip` / `removeShip`: actualizan `placedShips` y clases CSS; notifican al callback `onAllPlaced` cuando el conteo cambia
- `randomPlacement()`: algoritmo con hasta 200 intentos por barco y 5 reintentos globales para garantizar una solución válida
- `Placement.init({ onAllPlaced })`: API pública que permite a `game.js` reaccionar al estado de colocación sin acoplamiento directo
- Estado de la flota (`placedShips`) compatible con la estructura Firebase planificada en `rooms/{roomId}/player1.ships`

## Cómo Usar

1. Abrir `index.html` en el navegador
2. En la sección "Colocación de barcos", hacer clic en un barco del panel lateral para seleccionarlo
3. Mover el cursor sobre el tablero propio para ver el preview; usar el botón H/V para cambiar orientación
4. Hacer clic en una celda válida (verde) para colocar el barco
5. Repetir hasta colocar los 5 barcos (o usar "Aleatorio" para colocarlos todos automáticamente)
6. Presionar "Listo" para confirmar la flota e iniciar la espera de oponente

## Configuración

No requiere configuración adicional. El módulo funciona con JS vanilla sin dependencias externas. Compatible con la integración Firebase planificada en Feature 003 sin cambios en la estructura de datos.

## Pruebas

- Seleccionar cada barco manualmente y colocarlo → verificar color distinto en celdas
- Intentar superponer barcos → verificar preview rojo y rechazo de colocación
- Intentar colocar un barco fuera del tablero → verificar que `getShipCells` retorna `null` y no se coloca
- Usar "Aleatorio" varias veces → verificar 5 barcos colocados sin superposición
- Verificar que "Listo" está deshabilitado hasta completar todos los barcos
- Verificar que al presionar "Listo" se oculta el panel y `Game.getFleetState()` retorna el estado correcto
- Probar en pantalla mobile (≤768px) → panel apilado verticalmente sobre el tablero

## Notas

- **Dependencia con Feature 001**: requiere que `index.html` tenga `#player-board` con IDs de celda `cell-{A-J}{1-10}` ya definidos
- **Compatibilidad Firebase**: la estructura `{ [shipId]: cellIds[] }` retornada por `getFleetState()` es la misma que se sincronizará en Feature 003, sin cambios necesarios
- **Sin frameworks**: toda la lógica es JS vanilla; no se agregaron librerías adicionales
- **Mejora futura**: la detección de hit/miss en Feature 006 consumirá directamente `getFleetState()`, por lo que la estructura de datos debe mantenerse estable
