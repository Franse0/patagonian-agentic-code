# Feature: Panel de Estado de Flota

## Feature Description
Mostrar en tiempo real el estado de los barcos de ambos jugadores durante la fase de combate. Cada jugador verá dos paneles: "Tu Flota" (debajo de su tablero propio) y "Flota Enemiga" (debajo del tablero enemigo), con indicadores visuales que distinguen barcos intactos (verde) de barcos hundidos (rojo/tachado). Los paneles se actualizan automáticamente con cada ataque y se notifica al jugador cuando hunde un barco enemigo.

## User Story
As a player in the combat phase
I want to see the status of all ships for both myself and my opponent
So that I can track battle progress without having to count hits manually on the boards

## Problem Statement
Durante el combate, no hay una forma clara de saber cuántos y cuáles barcos quedan a flote en cada lado. El jugador debe memorizar o inferir el estado de la flota a partir de los impactos en el tablero, lo cual dificulta la estrategia y reduce la experiencia de juego.

## Solution Approach
Agregar una sección `#fleet-status` con dos paneles (uno por jugador) dentro del `#game-container`, posicionados debajo de los tableros respectivos. Los paneles se inicializan cuando comienza el combate (`handleTurnChange`) y se actualizan en cada llamada a `handleAttacksChange`. La función pura `getSunkShips(attacks, ships)` calcula qué barcos están hundidos comparando los ataques recibidos contra las posiciones de cada barco.

## Relevant Files

- `index.html` — Agregar el HTML del `#fleet-status` dentro de `#game-container`, después de los board columns y antes de `#attack-history`
- `css/styles.css` — Agregar estilos para `#fleet-status`, `.fleet-panel`, `.fleet-list`, `.fleet-item`, `.fleet-item--sunk`
- `js/game.js` — Agregar `getSunkShips()`, `renderFleetPanel()`, `updateFleetPanels()`; llamarlas desde `handleTurnChange` y `handleAttacksChange`

## Implementation Plan

### Phase 1: Foundation
Definir la estructura HTML y los estilos CSS del panel de flota, incluyendo los estados visual de cada barco (intacto vs hundido).

### Phase 2: Core Implementation
Implementar la lógica JS: función pura `getSunkShips`, funciones de renderizado de paneles y detección de nuevos barcos hundidos con notificación en `#game-status`.

### Phase 3: Integration
Conectar el ciclo de vida del juego: mostrar el panel al inicio del combate y actualizarlo en cada cambio de ataques.

## Step-by-Step Tasks

IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Agregar HTML del panel de flota en index.html

- Dentro de `#game-container`, justo antes del `#attack-history` existente, agregar:
  ```html
  <section id="fleet-status" hidden aria-label="Estado de flotas">
    <div id="player-fleet" class="fleet-panel">
      <h3>Tu Flota</h3>
      <ul class="fleet-list" aria-label="Estado de tu flota"></ul>
    </div>
    <div id="enemy-fleet" class="fleet-panel">
      <h3>Flota Enemiga</h3>
      <ul class="fleet-list" aria-label="Estado de la flota enemiga"></ul>
    </div>
  </section>
  ```
- Verificar que `#fleet-status` tenga el atributo `hidden` para que esté oculto en lobby y colocación

### 2) Agregar estilos CSS en styles.css

- Agregar después de los estilos de `#attack-history`:
  ```css
  #fleet-status {
    display: flex;
    flex-direction: row;
    gap: 1rem;
    width: 100%;
    margin-top: 1rem;
  }

  .fleet-panel {
    flex: 1;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.5rem 0.75rem;
  }

  .fleet-panel h3 {
    font-size: 0.82rem;
    color: var(--color-text);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 0.4rem 0;
  }

  .fleet-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .fleet-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    color: var(--color-text);
    padding: 0.15rem 0;
  }

  .fleet-item::before {
    content: '●';
    color: #2ecc71;
    font-size: 0.65rem;
    flex-shrink: 0;
  }

  .fleet-item--sunk {
    color: var(--color-hit);
    text-decoration: line-through;
    opacity: 0.7;
  }

  .fleet-item--sunk::before {
    color: var(--color-hit);
  }
  ```
- En el media query `< 900px`, agregar: `#fleet-status { flex-direction: column; }`

### 3) Implementar getSunkShips en game.js

- Agregar como función pura al inicio del módulo (junto a `checkVictoryCondition`):
  ```js
  function getSunkShips(attacks, ships) {
    // attacks: [{cell, playerId, result}] — cell sin prefijo 'cell-'
    // ships: {shipId: ['cell-A1', ...]} — cellIds CON prefijo 'cell-'
    var hitCells = new Set(
      attacks.filter(function (a) { return a.result === 'hit'; }).map(function (a) { return a.cell; })
    );
    return Object.keys(ships).filter(function (shipId) {
      var cells = ships[shipId] || [];
      return cells.length > 0 && cells.every(function (c) {
        return hitCells.has(c.replace('cell-', ''));
      });
    });
  }
  ```
- Verificar la normalización: los ataques almacenan `cell` sin prefijo (ej: `'A1'`), los barcos en Firebase usan `'cell-A1'`

### 4) Implementar SHIPS, renderFleetPanel y updateFleetPanels en game.js

- Agregar la constante de barcos dentro del IIFE (antes de las variables de estado):
  ```js
  var SHIPS = [
    { id: 'carrier',    name: 'Portaaviones' },
    { id: 'battleship', name: 'Acorazado' },
    { id: 'cruiser',    name: 'Crucero' },
    { id: 'submarine',  name: 'Submarino' },
    { id: 'destroyer',  name: 'Destructor' }
  ];
  ```

- Agregar `renderFleetPanel(panelId, sunkIds)`:
  ```js
  function renderFleetPanel(panelId, sunkIds) {
    var list = document.querySelector('#' + panelId + ' .fleet-list');
    if (!list) return;
    list.innerHTML = '';
    SHIPS.forEach(function (ship) {
      var li = document.createElement('li');
      var isSunk = sunkIds.indexOf(ship.id) !== -1;
      li.className = 'fleet-item' + (isSunk ? ' fleet-item--sunk' : '');
      li.textContent = ship.name;
      list.appendChild(li);
    });
  }
  ```

- Agregar variable de estado `_prevEnemySunkIds` junto a `_isMyTurn`:
  ```js
  var _prevEnemySunkIds = [];
  ```

- Agregar `updateFleetPanels(attacks)`:
  ```js
  function updateFleetPanels(attacks) {
    var myKey = window.Game.playerKey;
    var opponentKey = myKey === 'player1' ? 'player2' : 'player1';
    var roomData = FirebaseGame.getRoomData();
    if (!roomData) return;

    // Tu flota: ataques recibidos del oponente sobre tus barcos
    var opponentAttacks = attacks.filter(function (a) { return a.playerId === opponentKey; });
    var myShips = roomData[myKey] && roomData[myKey].ships;
    if (myShips) {
      var mySunk = getSunkShips(opponentAttacks, myShips);
      renderFleetPanel('player-fleet', mySunk);
    }

    // Flota enemiga: tus ataques sobre los barcos del oponente
    var myAttacks = attacks.filter(function (a) { return a.playerId === myKey; });
    var enemyShips = roomData[opponentKey] && roomData[opponentKey].ships;
    if (enemyShips) {
      var enemySunk = getSunkShips(myAttacks, enemyShips);
      renderFleetPanel('enemy-fleet', enemySunk);

      // Notificación cuando se hunde un nuevo barco enemigo
      var newlySunk = enemySunk.filter(function (id) {
        return _prevEnemySunkIds.indexOf(id) === -1;
      });
      if (newlySunk.length > 0) {
        var sunkShip = SHIPS.filter(function (s) {
          return newlySunk.indexOf(s.id) !== -1;
        })[0];
        if (sunkShip) {
          var status = document.getElementById('game-status');
          if (status) status.textContent = '¡Hundiste el ' + sunkShip.name + '!';
        }
      }
      _prevEnemySunkIds = enemySunk;
    }
  }
  ```

### 5) Integrar en el ciclo de vida del juego

- En `handleTurnChange(currentTurn)`, agregar al inicio de la función (antes de actualizar el indicator):
  ```js
  // Mostrar panel de flota al inicio del combate
  var fleetStatus = document.getElementById('fleet-status');
  if (fleetStatus && fleetStatus.hidden) {
    fleetStatus.hidden = false;
    updateFleetPanels([]); // Renderizado inicial: todos intactos
  }
  ```

- En `handleAttacksChange(attacks)`, agregar al final de la función (después de mostrar el historial):
  ```js
  updateFleetPanels(attacks);
  ```

### 6) Validación Final
- Ejecutar todos los `Validation Commands` para asegurar cero regresiones.

## Testing Strategy

### Manual Testing
- Iniciar partida con dos pestañas del navegador
- Fase de colocación: verificar que `#fleet-status` está oculto
- Al comenzar el combate: verificar que aparecen ambos paneles con los 5 barcos en verde
- Realizar ataques hasta hundir un barco: verificar que el barco aparece en rojo y tachado en "Flota Enemiga" del atacante
- Verificar que "Tu Flota" del defensor también refleja el barco hundido
- Verificar que aparece el mensaje "¡Hundiste el [nombre]!" en `#game-status`
- Verificar que el panel se oculta al llegar a la pantalla de fin de partida (ya que `#game-container` se oculta)

### Automated Tests
No hay tests automatizados en este proyecto. El reviewer simula el estado del DOM directamente:
```js
// Mostrar el panel para captura de screenshot
document.getElementById('fleet-status').hidden = false;
```

### Edge Cases
- **Sin datos de barcos en roomData**: `updateFleetPanels` no debe lanzar error si `roomData[key].ships` es undefined → verificar con `if (myShips)` y `if (enemyShips)`
- **Ataques vacíos en initialización**: `getSunkShips([], ships)` debe retornar `[]` → todos los barcos intactos
- **Múltiples barcos hundidos en una sesión**: `_prevEnemySunkIds` acumula correctamente y solo notifica novedades
- **Pantalla mobile (< 900px)**: los paneles se apilan verticalmente en lugar de estar en fila
- **Reconexión**: `handleAttacksChange` recibe el historial completo al reconectar → paneles se actualizan correctamente

## Acceptance Criteria
- Panel "Tu Flota" visible debajo del tablero propio durante el combate con los 5 barcos listados
- Panel "Flota Enemiga" visible debajo del tablero enemigo durante el combate con los 5 barcos listados
- Los barcos a flote se muestran con punto verde (●) y texto normal
- Los barcos hundidos se muestran con punto rojo (●), texto tachado y opacidad reducida
- Al hundir un barco enemigo, aparece el mensaje "¡Hundiste el [nombre]!" en `#game-status`
- Los paneles están ocultos durante el lobby y la fase de colocación
- `document.getElementById('fleet-status').hidden = false` revela ambos paneles correctamente
- El estado de flota se actualiza automáticamente sin recargar la página

## Validation Commands

- `python -m http.server 8000` — Iniciar servidor de desarrollo y verificar en `http://localhost:8000`

## Notes
- `getSunkShips` es una función pura: toma `attacks` y `ships`, retorna array de IDs hundidos. No tiene efectos secundarios ni accede al DOM/Firebase.
- La normalización de cells es necesaria: Firebase almacena `'cell-A1'` pero los ataques almacenan `'A1'`. La función `getSunkShips` aplica `.replace('cell-', '')` al comparar.
- `_prevEnemySunkIds` evita mostrar la misma notificación múltiples veces cuando `handleAttacksChange` recibe el historial completo.
- No se necesitan archivos nuevos: todo cabe en los 3 archivos existentes.
