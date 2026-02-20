# Feature: Detección de Condición de Victoria y Fin de Partida

## Feature Description
Implementar la lógica de detección de victoria al final de cada ataque: verificar si el jugador actual hundió todos los barcos del oponente, actualizar Firebase con el ganador y el estado `finished`, y mostrar una pantalla de fin de partida a ambos jugadores con el resultado, estadísticas finales y opciones de revancha o salida.

## User Story
As a player in the combat phase
I want to be notified immediately when all enemy ships are sunk
So that I know the game is over and can see my final stats or request a rematch

## Problem Statement
La mecánica de ataque y turnos funciona correctamente (feature-0013), pero nunca se declara un ganador. Los jugadores no tienen forma de saber cuándo la partida terminó, ni pueden reiniciar la partida. El campo `winner` existe en Firebase pero nunca se escribe; el campo `status` nunca alcanza el valor `"finished"`.

## Solution Approach
1. **Función pura de victoria** (`checkVictoryCondition`) en `game.js`: dada la lista de ataques y los barcos del oponente, retorna `true` si cada celda de cada barco fue alcanzada.
2. **Trigger en el flujo de ataque** (`game.js`): después de registrar un hit, llamar a `checkVictoryCondition`. Si es `true`, llamar a `FirebaseGame.setWinner()`.
3. **`setWinner()` en `firebase-game.js`**: escribe `winner` y cambia `status` a `"finished"` en Firebase.
4. **Callback `onGameFinished`** en `listenRoom`: detectar cuando `status === 'finished'` y disparar el callback con el ganador.
5. **Pantalla de fin de partida** (`index.html` + `css/styles.css`): sección `#end-screen` con anuncio, estadísticas (ataques, precisión, duración) y botones de revancha/salida.
6. **Handler de fin de partida** (`game.js`): mostrar `#end-screen`, calcular y renderizar estadísticas, manejar botones.

## Relevant Files
- `js/game.js` — agregar `checkVictoryCondition()`, integrar en el handler de ataque, agregar `handleGameFinished()`, manejar botones de revancha y salida
- `js/firebase-game.js` — agregar `setWinner()`, extender `listenRoom` con callback `onGameFinished`
- `index.html` — agregar sección `#end-screen` con estructura de resultado, stats y botones
- `css/styles.css` — estilos para `#end-screen`, anuncio de victoria/derrota, stats y botones

## Implementation Plan
### Phase 1: Foundation
- Diseñar y agregar la sección `#end-screen` en el HTML (oculta inicialmente).
- Agregar estilos CSS para la pantalla de fin de partida.

### Phase 2: Core Implementation
- Implementar `checkVictoryCondition(myAttacks, opponentShips)` en `game.js`.
- Implementar `FirebaseGame.setWinner(roomId, winnerKey)` en `firebase-game.js`.
- Extender `listenRoom` con callback `onGameFinished(winnerKey)`.

### Phase 3: Integration
- Integrar `checkVictoryCondition` en el handler de ataque de `game.js`.
- Implementar `handleGameFinished(winnerKey)` en `game.js`: mostrar `#end-screen`, calcular stats, manejar botones.
- Suscribir `onGameFinished` en la llamada a `listenRoom`.

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Agregar HTML de pantalla de fin de partida
- En `index.html`, agregar sección `#end-screen` con `[hidden]` después de `#game-container`:
  ```html
  <section id="end-screen" hidden>
    <div id="end-result"></div>       <!-- "¡Ganaste! 🏆" o "Perdiste... 💀" -->
    <div id="end-stats">
      <span id="stat-attacks"></span>   <!-- Total de ataques realizados -->
      <span id="stat-accuracy"></span>  <!-- Precisión: hits / ataques * 100 -->
      <span id="stat-duration"></span>  <!-- Duración: tiempo desde primer ataque -->
    </div>
    <div id="end-buttons">
      <button id="btn-rematch">Revancha</button>
      <button id="btn-exit">Salir</button>
    </div>
  </section>
  ```
- Verificar que `[hidden]` oculta correctamente la sección (ver patrón de `#game-container`).

### 2) Agregar estilos CSS para la pantalla de fin de partida
- En `css/styles.css`, agregar al final:
  - `#end-screen`: layout centrado, full viewport, fondo semitransparente oscuro (overlay) sobre el juego.
  - `#end-result`: texto grande, fuente bold; colores variables según clase `--win` (dorado) y `--lose` (rojo).
  - `#end-stats`: grid de 3 columnas con etiqueta + valor; tipografía monospace.
  - Botones `#btn-rematch`, `#btn-exit`: estilos alineados al tema naval existente (reutilizar variables CSS del proyecto).

### 3) Implementar `checkVictoryCondition` en `game.js`
- Agregar función pura exportable:
  ```js
  function checkVictoryCondition(myAttacks, opponentShips) {
    // myAttacks: array de {cell, playerId, result}
    // opponentShips: { shipId: [cellId, ...], ... }
    const hitCells = new Set(
      myAttacks.filter(a => a.result === 'hit').map(a => a.cell)
    );
    return Object.values(opponentShips).every(
      cells => cells.every(cell => hitCells.has(cell))
    );
  }
  ```
- La función no modifica estado ni accede a Firebase: es pura y testeable.

### 4) Implementar `FirebaseGame.setWinner()` en `firebase-game.js`
- Agregar función:
  ```js
  async function setWinner(roomId, winnerKey) {
    const roomRef = ref(db, `rooms/${roomId}`);
    await update(roomRef, { winner: winnerKey, status: 'finished' });
  }
  ```
- Importar `update` desde Firebase SDK si no está ya importado.
- Exportar `setWinner` en el objeto de exportaciones del módulo.

### 5) Extender `listenRoom` con callback `onGameFinished`
- En `firebase-game.js`, dentro del handler de `onValue`:
  - Detectar cuando `data.status === 'finished'` y `data.winner` es no nulo.
  - Llamar `callbacks.onGameFinished?.(data.winner)` una sola vez (usar flag `_gameFinished` análogo a `_lastTurn`).

### 6) Integrar detección de victoria en el handler de ataque (`game.js`)
- En el handler de clic del tablero enemigo, después de `FirebaseGame.registerAttack()`:
  - Si `result === 'hit'`, recuperar los barcos del oponente desde `_roomData`.
  - Filtrar `attacks` para obtener solo los ataques del jugador actual.
  - Llamar `checkVictoryCondition(myAttacks, opponentShips)`.
  - Si retorna `true`: llamar `FirebaseGame.setWinner(roomId, myPlayerKey)`.
  - No llamar `FirebaseGame.setTurn()` si hay victoria (la partida termina).

### 7) Implementar `handleGameFinished(winnerKey)` en `game.js`
- Ocultar `#game-container`, mostrar `#end-screen`.
- Determinar si el jugador local es ganador: `winnerKey === myPlayerKey`.
- Establecer `#end-result` con texto y clase CSS según resultado.
- Calcular estadísticas desde el array de ataques en `_roomData`:
  - **Ataques totales**: cantidad de ataques del jugador local.
  - **Precisión**: `(hits / totalAttacks * 100).toFixed(1)%`.
  - **Duración**: `(lastAttackTimestamp - firstAttackTimestamp) / 1000` segundos → formatear como `Xm Ys`.
- Actualizar `#stat-attacks`, `#stat-accuracy`, `#stat-duration`.
- Botón `#btn-rematch`: resetear Firebase room y reiniciar flujo (redirigir a lobby o recargar página).
- Botón `#btn-exit`: `window.location.reload()`.

### 8) Suscribir `onGameFinished` en la llamada a `listenRoom`
- En `game.js`, en la llamada a `FirebaseGame.listenRoom()`, agregar:
  ```js
  onGameFinished: (winnerKey) => handleGameFinished(winnerKey),
  ```
- Asegurarse de que `handleGameFinished` se llame en **ambos** clientes (el ganador y el perdedor).

### 9) Validación Final
- Ejecutar todos los `Validation Commands` para asegurar cero regresiones.

## Testing Strategy
### Manual Testing
- **Escenario de victoria normal**: Jugador A hunde todos los barcos de B → aparece `#end-screen` en ambos navegadores con resultado correcto.
- **Jugador B gana**: Validar que el perdedor también ve la pantalla de derrota correctamente.
- **Estadísticas**: Verificar que ataques, precisión y duración son correctos numéricamente.
- **Botón Revancha**: Ambos jugadores vuelven al estado inicial sin recargar la URL compartida.
- **Botón Salir**: Recarga la página y vuelve al lobby vacío.
- **Reconexión**: Si un jugador se desconecta y reconecta durante fase `finished`, debe ver la pantalla de fin de partida (Firebase snapshot detecta `status === 'finished'` inmediatamente).

### Automated Tests
No hay framework de tests en este proyecto; la validación es manual.

### Edge Cases
- **Ataque simultáneo** (race condition): Si dos hits llegan casi al mismo tiempo, `setWinner` puede llamarse dos veces. Mitigar con el flag `_gameFinished` en el listener para que `onGameFinished` solo se emita una vez por sala.
- **Barcos sin colocar**: `opponentShips` puede ser `null` si el oponente no terminó de colocar (no debería ocurrir en fase `playing`, verificar `opponentShips` no nulo antes de `checkVictoryCondition`).
- **Historial de ataques**: La pantalla de fin no debe romper el historial previo; asegurarse de no modificar `_roomData.attacks` al calcular stats.
- **Red lenta**: El overlay de fin de partida debe aparecer igualmente aunque la escritura a Firebase demore; el cliente que realizó el último ataque verá la pantalla inmediatamente (por el `onGameFinished` local), y el oponente la verá cuando Firebase propague el cambio.
- **Móviles**: `#end-screen` debe ser responsive; usar `flex-direction: column` en pantallas < 600px.

## Acceptance Criteria
- Cuando un jugador hunde el último barco del oponente, `rooms/{roomId}/status` pasa a `"finished"` y `rooms/{roomId}/winner` se establece con la clave del ganador.
- Ambos jugadores ven la pantalla `#end-screen` sin recargar la página.
- El ganador ve "¡Ganaste! 🏆" y el perdedor ve "Perdiste... 💀".
- Las estadísticas (ataques, precisión, duración) se calculan correctamente y se muestran en la pantalla.
- El botón "Revancha" permite iniciar una nueva partida.
- El botón "Salir" recarga la página y regresa al lobby.
- Si un jugador se reconecta con la sala en estado `finished`, ve inmediatamente la pantalla de fin de partida.

## Validation Commands
- `python -m http.server 8000` — servidor de desarrollo en `http://localhost:8000`
- Abrir dos pestañas/navegadores, crear sala y jugar hasta que un jugador hunda todos los barcos del otro.
- Verificar Firebase Realtime Database Console: `rooms/{roomId}/status === "finished"`, `winner` establecido.
- Verificar que `#end-screen` aparece en ambos clientes con el resultado correcto.

## Notes
- `update()` de Firebase SDK v9 modular permite escribir múltiples campos atómicamente; importar desde `https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js`.
- El botón "Revancha" puede implementarse como un simple `window.location.reload()` en esta fase; una revancha en sala compartida requeriría resetear el estado Firebase y sería una mejora futura.
- No se agrega lógica de "barco hundido" (animación o indicador por barco) en esta feature; eso sería una mejora futura independiente.
- La función `checkVictoryCondition` es pura y podría moverse a un módulo `utils.js` en el futuro si crece la cantidad de funciones puras, pero por ahora se mantiene en `game.js` para no aumentar la complejidad de imports.
