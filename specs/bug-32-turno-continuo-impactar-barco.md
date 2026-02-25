# Bug Fix: Turno continuo al impactar un barco

## Bug Description
Actualmente, después de cada ataque el turno siempre pasa al oponente, sin importar si el resultado fue un impacto (hit) o un fallo (miss). El comportamiento correcto de Batalla Naval es que un impacto (hit) premia al jugador con turno adicional, y el turno solo se cede al oponente cuando el disparo cae en agua (miss).

**Comportamiento actual:** El turno siempre alterna tras cada disparo.
**Comportamiento esperado:** Hit → el jugador conserva el turno; Miss → el turno pasa al oponente.

## Steps to Reproduce
1. Dos jugadores se conectan a una sala y colocan sus barcos
2. El jugador activo hace click en una celda del tablero enemigo que contiene un barco
3. El ataque resulta en hit (impacto)
Result: El turno pasa al oponente después del hit.
Expected: El jugador activo conserva el turno y puede seguir atacando.

## Root Cause
En `js/game.js` líneas 534–535, dentro del `.then()` de `registerAttack`, el código siempre calcula el `nextTurn` como el jugador opuesto y llama `FirebaseGame.setTurn()` independientemente del resultado:

```js
// game.js:534-535
var nextTurn = window.Game.playerKey === 'player1' ? 'player2' : 'player1';
FirebaseGame.setTurn(window.Game.roomId, nextTurn);
```

Este bloque se ejecuta siempre que no haya victoria, sin distinción entre hit y miss.

Adicionalmente, al hacer click en una celda (líneas 511–512), el board se deshabilita localmente de forma optimista:
```js
_isMyTurn = false;
enemyBoard.classList.add('board--disabled');
```

Si el resultado es hit y no hay victoria, la lógica actual nunca restaura el board ni `_isMyTurn`, dejando al jugador bloqueado incluso cuando debería conservar el turno.

## Solution Approach
Agregar una condición en el bloque `.then()` de `registerAttack` para distinguir entre hit y miss:

- **Miss:** comportamiento actual — llamar `setTurn` con el jugador opuesto.
- **Hit sin victoria:** NO llamar `setTurn` (Firebase mantiene el turno actual), restaurar `_isMyTurn = true`, remover la clase `board--disabled`, y mostrar mensaje "¡Impacto! Seguís atacando." con `popStatus()`.
- **Hit con victoria:** llamar `setWinner` como actualmente (sin tocar el turno).

Este enfoque es correcto porque:
1. No modifica `currentTurn` en Firebase → los listeners de `onValue` no disparan `onTurnChange` innecesariamente.
2. La re-habilitación es local e inmediata, sin esperar round-trip a Firebase.
3. El oponente nunca ve un cambio de turno cuando se hace hit → su UI permanece en "Esperando ataque del oponente..." correctamente.

## Relevant Files
Archivos a modificar para esta corrección de bug:

- **`js/game.js`** — Contiene el handler de click en el tablero enemigo (líneas 482–537) donde vive la lógica de `setTurn`. Es el único archivo que necesita cambios.
- **`js/firebase-game.js`** — Solo lectura para entender la API (`setTurn`, `registerAttack`, `onTurnChange`). No requiere modificaciones.
- **`css/styles.css`** — Solo lectura para verificar las clases CSS existentes. No requiere modificaciones.

## Implementation Plan
### Phase 1: Investigation
Verificar el código actual en `js/game.js` para confirmar la causa raíz y entender el flujo completo del handler de ataque.

### Phase 2: Fix Implementation
Modificar el handler de click en el tablero enemigo en `js/game.js` para:
1. Solo llamar `setTurn` con el oponente cuando el resultado es 'miss'.
2. Al hacer hit sin victoria: restaurar `_isMyTurn = true`, quitar `board--disabled`, mostrar "¡Impacto! Seguís atacando." con `popStatus()`.

### Phase 3: Verification
Probar manualmente ambos flujos (hit y miss) con dos navegadores o pestañas para confirmar que el turno se comporta correctamente en ambos clientes.

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Confirmar causa raíz en game.js
- Leer `js/game.js` líneas 482–537 (handler de click en enemy-board)
- Confirmar que `setTurn` se llama incondicionalmente en línea ~535
- Confirmar que `_isMyTurn = false` y `board--disabled` se aplican en líneas 511–512

### 2) Implementar la corrección en game.js
- En el bloque `.then()` de `registerAttack` (línea ~516), reemplazar la llamada incondicional a `setTurn` con una condición:
  ```js
  // Antes (incorrecto):
  var nextTurn = window.Game.playerKey === 'player1' ? 'player2' : 'player1';
  FirebaseGame.setTurn(window.Game.roomId, nextTurn);

  // Después (correcto):
  if (result === 'miss') {
    var nextTurn = window.Game.playerKey === 'player1' ? 'player2' : 'player1';
    FirebaseGame.setTurn(window.Game.roomId, nextTurn);
  } else {
    // Hit sin victoria: el jugador conserva el turno
    _isMyTurn = true;
    if (enemyBoard) enemyBoard.classList.remove('board--disabled');
    popStatus('¡Impacto! Seguís atacando.');
  }
  ```
- Verificar que el bloque de victoria (`setWinner`) sigue usando `return` para evitar ejecutar el código de turno

### 3) Verificar mensajes de feedback existentes
- Confirmar que `handleTurnChange` ya muestra "Atacá el tablero enemigo" / "Esperando ataque del oponente..." para cambios de turno normales
- El nuevo mensaje "¡Impacto! Seguís atacando." solo aplica cuando se mantiene el turno por hit, es apropiado y no colisiona con los mensajes de turno normales

### 4) Final Validation
- Ejecutar todos los `Validation Commands` para asegurar que el bug está corregido y hay cero regresiones.

## Testing Strategy
### Bug Reproduction Test
**Antes del fix:** Con dos pestañas del navegador, atacar una celda que contiene un barco enemigo → el turno pasa al oponente (incorrecto).

### Fix Verification
**Después del fix:**
1. Atacar una celda con barco → el tablero permanece habilitado, el indicador de turno no cambia, se muestra "¡Impacto! Seguís atacando."
2. Atacar una celda vacía → el turno pasa al oponente, el indicador de turno cambia a "Esperando ataque del oponente..." en el cliente local y "Tu turno" en el oponente.
3. En el cliente oponente: después de un hit del rival, el indicador permanece en "Tu turno" (no cambia).

### Regression Testing
- Verificar que la condición de victoria sigue funcionando: hundir el último barco enemigo termina la partida correctamente.
- Verificar que el flujo miss→ cambio de turno→ ataque del oponente funciona correctamente.
- Verificar que el flujo de múltiples hits consecutivos funciona: el jugador puede atacar varias veces seguidas mientras siga haciendo hit.
- Verificar que el historial de ataques y el panel de flota se actualizan correctamente en ambos escenarios.

## Acceptance Criteria
- Si el ataque resulta en hit, el turno sigue siendo del jugador activo y el tablero enemigo permanece clickeable.
- Si el ataque resulta en miss, el turno pasa al oponente y el tablero enemigo se deshabilita.
- El indicador de turno ("Tu turno" / "Turno del oponente") refleja el estado correcto en ambos clientes.
- Se muestra mensaje diferenciado: "¡Impacto! Seguís atacando." vs el cambio de turno normal.
- La condición de victoria sigue funcionando correctamente (hundir el último barco termina la partida).
- No se introdujeron regresiones en el flujo de miss ni en el historial de ataques.

## Validation Commands
Ejecuta cada comando para validar que el bug está corregido con cero regresiones.

- `python -m http.server 8000` (abrir `http://localhost:8000` en dos pestañas para simular dos jugadores)

## Notes
- El fix es mínimo y quirúrgico: solo modifica el bloque condicional dentro del `.then()` de `registerAttack` en `js/game.js`.
- No es necesario modificar `firebase-game.js` ya que `setTurn` y `registerAttack` funcionan correctamente; solo cambia cuándo se llama a `setTurn`.
- El listener `onTurnChange` en `firebase-game.js` (línea 75) ya tiene una guarda `data.currentTurn !== _lastTurn`, lo que significa que si el turno no cambia en Firebase, `handleTurnChange` no se llama — esto es correcto para el caso hit.
