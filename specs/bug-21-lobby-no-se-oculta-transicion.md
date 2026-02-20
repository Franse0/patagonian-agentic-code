# Bug Fix: Lobby no se oculta al transicionar a la pantalla de juego

## Bug Description
Al unirse dos jugadores a una sala, el lobby (`#lobby`) no desaparece correctamente y permanece visible superpuesto al tablero de juego (`#game-container`). La transición de fade-out nunca se completa, dejando ambas pantallas visibles simultáneamente.

**Comportamiento actual:** El lobby queda visible encima del tablero de juego cuando ambos jugadores se conectan.
**Comportamiento esperado:** El lobby hace fade-out y queda oculto (`hidden`), mostrando solo el tablero de juego.

## Steps to Reproduce
1. Abrir el juego en dos pestañas del navegador
2. En la primera pestaña, hacer click en "Crear sala"
3. En la segunda pestaña, ingresar el código y hacer click en "Unirse"
4. Observar la pantalla en ambas pestañas

Result: El lobby permanece visible superpuesto al tablero de juego
Expected: El lobby desaparece con un fade-out y el tablero de juego queda visible

## Root Cause
La función `hideScreen(el)` en `js/game.js` (línea 58) depende del evento `transitionend` para ejecutar `el.hidden = true`. El evento `transitionend` solo se dispara si hay un cambio real en una propiedad CSS que tenga una transición activa.

El problema es que el lobby (`#lobby`) arranca visible en el HTML como elemento estático, **nunca pasa por `showScreen()`**, por lo tanto nunca recibe la clase `screen-visible` (que define `opacity: 1`). Cuando se llama `hideScreen(lobby)`:

1. Se agrega `screen-transition` (activa `transition: opacity 0.3s ease`)
2. Se remueve `screen-visible` — **pero el lobby nunca la tuvo**, así que no hay cambio de valor en `opacity`
3. Sin cambio real de `opacity`, el navegador no dispara `transitionend`
4. El handler nunca se ejecuta → `el.hidden = true` nunca ocurre
5. El lobby queda visible

```js
// game.js:58 — hideScreen depende de transitionend que nunca se dispara
function hideScreen(el) {
  if (!el || el.hidden) return;
  el.classList.add('screen-transition');
  el.classList.remove('screen-visible'); // ← lobby nunca tuvo esta clase
  el.addEventListener('transitionend', function handler() {
    // ← este handler nunca se ejecuta
    el.removeEventListener('transitionend', handler);
    el.hidden = true;
    el.classList.remove('screen-transition', 'screen-entering');
  }, { once: true });
}
```

## Solution Approach
Modificar `hideScreen` para detectar si el elemento tiene la clase `screen-visible` antes de intentar la transición. Si no la tiene (elemento nunca mostrado via `showScreen`), ocultar directamente con `el.hidden = true`. Si la tiene, ejecutar la transición de fade-out normalmente.

Este enfoque es preciso porque:
- Resuelve la causa raíz (el evento que nunca se dispara)
- No introduce timeouts arbitrarios
- No altera el comportamiento de las otras transiciones que sí funcionan (placement → game, game → end)
- Es mínimo: un solo `if` adicional

## Relevant Files
Archivos a modificar para esta corrección de bug:

- **`js/game.js`** — Contiene la función `hideScreen` (línea 58) que es la causa directa del bug. Solo se modifica esta función.

## Implementation Plan
### Phase 1: Investigation
- Confirmar que el lobby no tiene clase `screen-visible` cuando se llama `hideScreen(lobby)`
- Confirmar que `transitionend` nunca se dispara en ese flujo
- Verificar que otras transiciones (game-container → end-screen) sí usan `showScreen` antes de `hideScreen` y por tanto funcionan correctamente

### Phase 2: Fix Implementation
- Modificar `hideScreen` en `js/game.js` para hacer un cortocircuito inmediato si el elemento no tiene `screen-visible`

### Phase 3: Verification
- Simular el flujo completo: crear sala → unirse → verificar que el lobby desaparece
- Verificar que las demás transiciones (fin de partida) siguen funcionando

## Step-by-Step Tasks
IMPORTANTE: Ejecuta cada paso en orden, de arriba a abajo.

### 1) Modificar `hideScreen` en `js/game.js`
- Abrir `js/game.js`
- Localizar `hideScreen` (línea 58)
- Agregar al inicio de `hideScreen`, antes de cualquier operación con clases:
  ```js
  if (!el.classList.contains('screen-visible')) {
    el.hidden = true;
    return;
  }
  ```
- La función completa debe quedar:
  ```js
  function hideScreen(el) {
    if (!el || el.hidden) return;
    if (!el.classList.contains('screen-visible')) {
      el.hidden = true;
      return;
    }
    el.classList.add('screen-transition');
    el.classList.remove('screen-visible');
    el.addEventListener('transitionend', function handler() {
      el.removeEventListener('transitionend', handler);
      el.hidden = true;
      el.classList.remove('screen-transition', 'screen-entering');
    }, { once: true });
  }
  ```
- Verificar que el resto del archivo no se modificó

### 2) Verificar flujo completo de transiciones
- Confirmar que `handleBothConnected` llama correctamente `hideScreen(lobby)` y `showScreen(gameContainer)`
- Confirmar que `handleGameFinished` llama `hideScreen(gameContainer)` y `showScreen(endScreen)` — donde `gameContainer` sí tiene `screen-visible` en ese punto (fue mostrado via `showScreen`)

### 3) Final Validation
- Ejecutar todos los `Validation Commands` para asegurar que el bug está corregido y hay cero regresiones.

## Testing Strategy
### Bug Reproduction Test
Antes del fix, abrir DevTools y confirmar:
```js
// En la consola tras unirse a la sala:
document.getElementById('lobby').hidden  // → false (bug: debería ser true)
document.getElementById('lobby').classList.contains('screen-visible')  // → false (causa raíz)
```

### Fix Verification
Después del fix:
```js
// Tras unirse a la sala y ejecutar handleBothConnected:
document.getElementById('lobby').hidden  // → true (corregido)
document.getElementById('game-container').hidden  // → false (game visible)
```

### Regression Testing
- Verificar transición final (combat → end screen): `hideScreen(gameContainer)` — `gameContainer` sí tiene `screen-visible` en ese momento, así que el flujo `transitionend` debe seguir funcionando
- Verificar que al recargar y volver al lobby, el estado inicial es correcto
- Verificar en mobile (viewport reducido) que no hay superposición

## Acceptance Criteria
- El lobby desaparece cuando ambos jugadores se conectan a la sala
- La transición de fade existe para el game-container al mostrarse (via `showScreen`)
- Las demás transiciones (game → end screen) no se ven afectadas
- No hay elementos superpuestos en ningún estado del juego

## Validation Commands
Ejecuta cada comando para validar que el bug está corregido con cero regresiones.

- `python -m http.server 8000` — iniciar servidor de desarrollo
- Abrir `http://localhost:8000` en dos pestañas, crear sala en una y unirse desde la otra
- Verificar en DevTools: `document.getElementById('lobby').hidden === true` tras la conexión

## Notes
- El fix es de **una sola función** (`hideScreen`) y **3 líneas** de código adicional
- La misma solución cubre ambos jugadores: player1 (que espera `onPlayerJoined`) y player2 (que llama `handleBothConnected` directamente tras `joinRoom`)
- Las demás pantallas (`end-screen`, `game-container`) siempre pasan por `showScreen` antes de `hideScreen`, por lo que tendrán `screen-visible` y el flujo con `transitionend` continuará funcionando correctamente para ellas
