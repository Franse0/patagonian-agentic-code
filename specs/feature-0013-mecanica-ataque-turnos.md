# Feature: Mecánica de Ataque y Gestión de Turnos

## Feature Description
Completar la mecánica de ataque en la fase de combate: el jugador activo hace clic en una celda no atacada del tablero enemigo, el ataque se registra en Firebase, se evalúa hit/miss, y el turno pasa automáticamente al oponente. Incluye feedback visual inmediato, indicador de turno en tiempo real y un historial de los últimos 5 ataques visible para ambos jugadores.

La infraestructura base (Firebase `registerAttack`, `setTurn`, `handleTurnChange`, `handleAttacksChange`, indicador de turno, estados CSS de celdas) ya fue implementada en la feature-010. El trabajo pendiente de esta feature es:
1. Re-renderizar los ataques propios en el tablero enemigo desde Firebase (robustez ante re-sincronización del listener).
2. Panel de historial de ataques (últimos 5 movimientos).

## User Story
As a player in the combat phase
I want to click the enemy board to attack and see a live history of recent moves
So that I can track the game progress and know whose turn it is at all times

## Problem Statement
El mecanismo de ataque y turno ya funciona a nivel Firebase pero tiene dos brechas respecto a los criterios de aceptación del issue:

1. **Re-sync de ataques propios**: `handleAttacksChange` solo pinta los ataques del *oponente* en el tablero propio. Los ataques *propios* en el tablero enemigo se pintan solo por feedback local al hacer clic; si el listener se reinicia (por ejemplo al llamar a `listenRoom` de nuevo en `onReady`), las celdas enemigo ya atacadas no se restauran desde Firebase.
2. **Historial de ataques**: No existe panel con los últimos 5 movimientos. El criterio de aceptación lo requiere explícitamente.

## Solution Approach
- Extender `handleAttacksChange` en `game.js` para que también pinte los ataques propios en el tablero enemigo (usando prefijo `enemy-cell-`).
- Agregar un panel `#attack-history` en el HTML dentro de `#game-container`.
- Actualizar `handleAttacksChange` para renderizar el historial de los últimos 5 ataques (de cualquier jugador) en ese panel.
- Agregar estilos CSS mínimos para el historial (alineado al tema naval existente).

## Relevant Files
- `js/game.js` — extender `handleAttacksChange` para re-renderizar ataques propios y actualizar el historial
- `index.html` — agregar `#attack-history` panel dentro de `#game-container`
- `css/styles.css` — agregar estilos para `#attack-history` y sus elementos

### New Files
_(ninguno — todo se agrega a los archivos existentes)_

## Implementation Plan
### Phase 1: Foundation
Agregar la estructura HTML del panel de historial y las variables CSS necesarias. El panel estará oculto hasta que la fase de combate comience.

### Phase 2: Core Implementation
Extender `handleAttacksChange` en `game.js`:
- Re-pintar los ataques propios en el tablero enemigo (desde Firebase, no solo feedback local).
- Calcular los últimos 5 ataques del array completo y renderizarlos en el panel.

### Phase 3: Integration
Agregar estilos CSS para el panel de historial. Verificar que el panel se muestra durante la fase de combate y que los dos jugadores ven los mismos 5 últimos movimientos en tiempo real.

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Agregar panel `#attack-history` en `index.html`
- Dentro de `<main id="game-container">`, después de la sección `#enemy-column`, agregar:
  ```html
  <section id="attack-history" hidden aria-label="Historial de ataques">
    <h3>Últimos movimientos</h3>
    <ol id="attack-history-list"></ol>
  </section>
  ```
- Verificar que el elemento existe en el DOM pero está oculto (`hidden`) al cargar la página.

### 2) Agregar estilos CSS para `#attack-history` en `css/styles.css`
- Agregar al final de la sección `/* === Game container ===*/` (antes de `/* === Board ===*/`):
  ```css
  /* === Attack history panel === */
  #attack-history {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 180px;
    max-width: 220px;
  }

  #attack-history h3 {
    color: var(--color-heading);
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.04em;
  }

  #attack-history-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0;
  }

  .attack-history-item {
    font-size: 0.82rem;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.4rem;
  }

  .attack-history-item--hit .attack-history-result {
    color: var(--color-hit);
    font-weight: 700;
  }

  .attack-history-item--miss .attack-history-result {
    color: var(--color-miss);
  }

  .attack-history-player {
    font-size: 0.75rem;
    opacity: 0.7;
  }
  ```
- Agregar al bloque `@media (max-width: 900px)`:
  ```css
    #attack-history {
      max-width: 100%;
      flex-direction: row;
      flex-wrap: wrap;
      align-items: flex-start;
    }
    #attack-history-list {
      flex-direction: row;
      flex-wrap: wrap;
    }
  ```
- Verificar que las clases existen y que el panel está oculto en la vista inicial.

### 3) Extender `handleAttacksChange` en `js/game.js`
- Localizar la función `handleAttacksChange` actual (líneas 71–85 de `game.js`).
- Reemplazarla con la versión extendida que:
  1. Pinta los ataques del **oponente** en el tablero propio (comportamiento actual, sin cambios).
  2. Pinta los ataques **propios** en el tablero enemigo (re-sync desde Firebase).
  3. Renderiza el historial de los últimos 5 ataques en `#attack-history-list`.
  4. Muestra el panel `#attack-history` si está oculto.

  ```js
  function handleAttacksChange(attacks) {
    var myKey = window.Game.playerKey;
    var opponentKey = myKey === 'player1' ? 'player2' : 'player1';

    attacks.forEach(function (attack) {
      if (attack.playerId === opponentKey) {
        // Ataque recibido: pintar en tablero propio
        var cellId = 'cell-' + attack.cell;
        var el = document.getElementById(cellId);
        if (el && !el.classList.contains('cell--hit-received') && !el.classList.contains('cell--miss-received')) {
          el.classList.add(attack.result === 'hit' ? 'cell--hit-received' : 'cell--miss-received');
        }
      } else if (attack.playerId === myKey) {
        // Ataque propio: re-pintar en tablero enemigo (re-sync desde Firebase)
        var enemyCellId = 'enemy-cell-' + attack.cell;
        var enemyEl = document.getElementById(enemyCellId);
        if (enemyEl && !enemyEl.classList.contains('cell--attacked--hit') && !enemyEl.classList.contains('cell--attacked--miss')) {
          enemyEl.classList.add(attack.result === 'hit' ? 'cell--attacked--hit' : 'cell--attacked--miss');
        }
      }
    });

    // Historial: últimos 5 ataques (más reciente primero)
    var historyPanel = document.getElementById('attack-history');
    var historyList = document.getElementById('attack-history-list');
    if (!historyPanel || !historyList) return;

    // Ordenar por timestamp descendente y tomar los últimos 5
    var sorted = attacks.slice().sort(function (a, b) {
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
    var recent = sorted.slice(0, 5);

    historyList.innerHTML = '';
    recent.forEach(function (attack) {
      var li = document.createElement('li');
      li.className = 'attack-history-item attack-history-item--' + attack.result;

      var playerLabel = attack.playerId === myKey ? 'Tú' : 'Rival';

      var playerSpan = document.createElement('span');
      playerSpan.className = 'attack-history-player';
      playerSpan.textContent = playerLabel + ' → ' + attack.cell;

      var resultSpan = document.createElement('span');
      resultSpan.className = 'attack-history-result';
      resultSpan.textContent = attack.result === 'hit' ? 'Impacto' : 'Agua';

      li.appendChild(playerSpan);
      li.appendChild(resultSpan);
      historyList.appendChild(li);
    });

    if (attacks.length > 0) {
      historyPanel.hidden = false;
    }
  }
  ```
- Verificar que la función actualiza ambos tableros y el panel al recibir ataques desde Firebase.

### 4) Final Validation
- Ejecutar todos los `Validation Commands` para asegurar cero regresiones.

## Testing Strategy
### Manual Testing
- Abrir `http://localhost:8000` en dos pestañas (A = player1, B = player2).
- Pestaña A crea sala, B se une, ambas colocan barcos y presionan "Listo".
- Pestaña A ataca: verificar feedback inmediato en tablero enemigo de A y que el ataque aparece en `#attack-history` de **ambas** pestañas (B también lo ve en tiempo real).
- Pestaña B ataca: verificar que su ataque también aparece en el historial de ambas pestañas.
- Realizar 6 ataques en total: verificar que el historial muestra solo los **5 más recientes**.
- Verificar etiquetas: "Tú" para ataques propios, "Rival" para ataques del oponente (relativo a cada pestaña).
- Verificar que el panel `#attack-history` está oculto en el lobby y en la fase de colocación.

### Automated Tests
No hay test runner configurado (vanilla JS sin build). Candidatos para futuros tests:
- `handleAttacksChange`: dado un array de ataques, verificar que el historial contiene los 5 más recientes ordenados por timestamp.
- Re-sync: dado que una celda enemiga fue atacada en Firebase, verificar que al llamar `handleAttacksChange` se pinta correctamente en el tablero enemigo.

### Edge Cases
- **0 ataques**: el panel permanece oculto (`hidden`).
- **1 solo ataque**: historial muestra exactamente 1 ítem.
- **Más de 5 ataques**: solo los 5 más recientes (por timestamp) son visibles.
- **Ataque sin timestamp**: ordenar al final (timestamp 0); no debe lanzar error.
- **Celdas ya marcadas**: `handleAttacksChange` verifica clases existentes antes de añadir, evitando doble aplicación.
- **Responsive 375px**: el historial pasa a layout horizontal (flex-wrap) para no empujar los tableros.
- **`prefers-reduced-motion`**: no hay transiciones en el historial, por lo que no requiere media query adicional.

## Acceptance Criteria
- Solo el jugador activo (`currentTurn`) puede hacer clic en el tablero enemigo. _(ya implementado en feature-010)_
- Celdas ya atacadas no son clickeables (cursor bloqueado, clases `cell--attacked--hit` / `cell--attacked--miss`). _(ya implementado)_
- Al hacer clic: el ataque se registra en Firebase y se pinta inmediatamente en el tablero enemigo con feedback local. _(ya implementado)_
- Después del ataque, el turno pasa automáticamente al oponente. _(ya implementado)_
- El indicador de turno se actualiza en tiempo real para ambos jugadores. _(ya implementado)_
- Los ataques propios en el tablero enemigo se re-pintan correctamente desde Firebase si el listener se reinicia.
- El panel `#attack-history` muestra los últimos 5 movimientos (de cualquier jugador) ordenados del más reciente al más antiguo.
- Cada ítem del historial indica quién atacó ("Tú" o "Rival"), la celda atacada y el resultado ("Impacto" / "Agua").
- El panel está oculto hasta que ocurra el primer ataque; ambos jugadores lo ven actualizado en tiempo real (< 1 segundo).
- Cero errores en DevTools → Console durante el flujo completo.

## Validation Commands
- `python -m http.server 8000` — iniciar servidor local (requerido para módulos ES6)
- Abrir `http://localhost:8000` en dos pestañas y ejecutar el flujo completo (lobby → colocación → combate → historial)
- DevTools → Console en ambas pestañas: verificar **cero errores JS**
- Firebase Console → Realtime Database → `rooms/{roomId}/attacks`: verificar que cada ataque tiene `cell`, `playerId`, `result`, `timestamp`

## Notes
- **Infraestructura ya lista**: `registerAttack`, `setTurn`, `handleTurnChange`, `handleAttacksChange` (base), indicador de turno, estados CSS de celdas y `board--disabled` fueron implementados en feature-010. Esta feature solo extiende `handleAttacksChange` y agrega el panel HTML/CSS.
- **Re-sync de ataques propios**: se resuelve dentro de `handleAttacksChange` reutilizando el prefijo `enemy-cell-` que ya genera `placement.js`. No se necesita ninguna nueva función de Firebase.
- **Historial client-side**: el ordenamiento y slice se hacen en el cliente con el array de ataques recibido de Firebase; no se agrega ningún nodo extra en la base de datos.
- **Condición de victoria**: fuera del alcance. Se evaluará en una feature posterior.
